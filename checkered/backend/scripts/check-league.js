/**
 * One-off: enumerate seasons + sessions for a given iRacing league.
 * Surfaces real HTTP status codes (does not swallow non-200s).
 * Usage: node scripts/check-league.js [leagueId]
 */
require("dotenv").config();
const { iRacingAuth } = require("../src/iracing-api");

const leagueId = Number(process.argv[2] || 132296);

async function rawFetch(path) {
  const token = await iRacingAuth();
  const linkRes = await fetch(`https://members-ng.iracing.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!linkRes.ok) {
    const body = await linkRes.text().catch(() => "");
    return { error: true, status: linkRes.status, body: body.slice(0, 300) };
  }
  const link = await linkRes.json();
  if (!link.link) return { error: false, data: link }; // some endpoints return inline
  const dataRes = await fetch(link.link);
  if (!dataRes.ok) {
    return { error: true, status: dataRes.status, body: "(s3 fetch failed)" };
  }
  return { error: false, data: await dataRes.json() };
}

async function main() {
  console.log(`\n=== League ${leagueId} ===`);

  await iRacingAuth();
  console.log("auth: OK");

  const league = await rawFetch(`/data/league/get?league_id=${leagueId}`);
  if (league.error) {
    console.log(`league/get -> HTTP ${league.status}: ${league.body}`);
  } else {
    const l = league.data;
    console.log(`Name: ${l.league_name}`);
    console.log(`Owner: ${l.owner_display_name || "?"}`);
    console.log(`Members: ${l.roster_count ?? "?"}`);
  }

  const seasons = await rawFetch(`/data/league/seasons?league_id=${leagueId}&retired=true`);
  if (seasons.error) {
    console.log(`league/seasons -> HTTP ${seasons.status}: ${seasons.body}`);
    return;
  }
  const list = seasons.data?.seasons || [];
  console.log(`\nSeasons (${list.length}):`);
  for (const s of list) {
    console.log(`  - season_id=${s.season_id}  "${s.season_name}"  active=${s.active}`);
  }

  for (const s of list) {
    const sess = await rawFetch(`/data/league/season_sessions?league_id=${leagueId}&season_id=${s.season_id}`);
    if (sess.error) {
      console.log(`  season ${s.season_id} -> HTTP ${sess.status}`);
      continue;
    }
    const sessions = sess.data?.sessions || [];
    if (!sessions.length) continue;
    console.log(`\n  Sessions in season ${s.season_id} "${s.season_name}" (${sessions.length}):`);
    for (const x of sessions) {
      console.log(
        `    subsession_id=${x.subsession_id}  has_results=${x.has_results}  launch_at=${x.launch_at}  track=${x.track?.track_name || "?"}`
      );
    }
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
