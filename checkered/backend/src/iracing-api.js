/**
 * iRacing Data API Integration
 *
 * As of December 2025, iRacing retired legacy cookie-based auth.
 * All access now requires OAuth2 via https://oauth.iracing.com
 *
 * Two flows supported:
 *   1. "password_limited" grant — server-to-server (needs client_id + client_secret)
 *   2. Manual token — paste an access_token from browser OAuth flow
 *
 * Required env vars for password_limited:
 *   IRACING_CLIENT_ID, IRACING_CLIENT_SECRET, IRACING_EMAIL, IRACING_PASSWORD
 *
 * Or for manual token:
 *   IRACING_ACCESS_TOKEN (and optionally IRACING_REFRESH_TOKEN)
 *
 * API docs: https://oauth.iracing.com/oauth2/book/data_api_workflow.html
 */
const crypto = require("crypto");

// Token cache
let accessToken = null;
let refreshToken = null;
let tokenExpiry = null;

/**
 * Authenticate with iRacing Data API using OAuth2.
 * Returns a Bearer token string for the Authorization header.
 */
async function iRacingAuth() {
  // 1. If we have a valid cached token, reuse it
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  // 2. If a manual access token is set in env, use it directly
  if (process.env.IRACING_ACCESS_TOKEN) {
    accessToken = process.env.IRACING_ACCESS_TOKEN;
    tokenExpiry = Date.now() + 3600000; // assume 1 hour
    return accessToken;
  }

  // 3. If we have a refresh token, try refreshing first
  if (refreshToken && process.env.IRACING_CLIENT_ID) {
    try {
      const refreshed = await refreshAccessToken();
      if (refreshed) return accessToken;
    } catch (err) {
      // Refresh failed — fall through to full auth
    }
  }

  // 4. Password Limited grant (server-to-server OAuth2)
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  const email = process.env.IRACING_EMAIL;
  const password = process.env.IRACING_PASSWORD;

  if (!clientId || !clientSecret) {
    throw new Error(
      "iRacing OAuth2 credentials not configured.\n" +
      "Set IRACING_CLIENT_ID and IRACING_CLIENT_SECRET in .env\n" +
      "Register at: https://oauth.iracing.com/oauth2/book/client_registration.html\n" +
      "Or set IRACING_ACCESS_TOKEN for manual token usage."
    );
  }

  if (!email || !password) {
    throw new Error("IRACING_EMAIL and IRACING_PASSWORD must be set");
  }

  // Mask the password: SHA-256(password + lowercase email), base64 encoded
  const maskedPassword = crypto
    .createHash("sha256")
    .update(password + email.toLowerCase())
    .digest("base64");

  // Mask the client secret: SHA-256(client_secret + client_id), base64 encoded
  const maskedSecret = crypto
    .createHash("sha256")
    .update(clientSecret + clientId)
    .digest("base64");

  const body = new URLSearchParams({
    grant_type: "password_limited",
    client_id: clientId,
    client_secret: maskedSecret,
    username: email,
    password: maskedPassword,
    scope: "iracing.auth",
  });

  const response = await fetch("https://oauth.iracing.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`iRacing OAuth2 auth failed: ${response.status} — ${errBody}`);
  }

  const tokenData = await response.json();
  accessToken = tokenData.access_token;
  refreshToken = tokenData.refresh_token || null;

  // Token expiry: use expires_in from response, default to 1 hour
  const expiresIn = tokenData.expires_in || 3600;
  tokenExpiry = Date.now() + (expiresIn * 1000) - 60000; // refresh 1 min early

  return accessToken;
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken() {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;

  const maskedSecret = crypto
    .createHash("sha256")
    .update(clientSecret + clientId)
    .digest("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: maskedSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth.iracing.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    accessToken = null;
    refreshToken = null;
    tokenExpiry = null;
    return false;
  }

  const tokenData = await response.json();
  accessToken = tokenData.access_token;
  refreshToken = tokenData.refresh_token || refreshToken;
  const expiresIn = tokenData.expires_in || 3600;
  tokenExpiry = Date.now() + (expiresIn * 1000) - 60000;

  return true;
}

/**
 * Make an authenticated request to the iRacing Data API.
 * Handles the two-step link-then-fetch pattern iRacing uses.
 */
async function iRacingFetch(path) {
  const token = await iRacingAuth();

  // Step 1: Get the redirect link from the /data endpoint
  const linkResponse = await fetch(`https://members-ng.iracing.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!linkResponse.ok) {
    if (linkResponse.status === 401) {
      // Token may have expired — clear cache and retry once
      accessToken = null;
      tokenExpiry = null;
      const newToken = await iRacingAuth();
      const retryResponse = await fetch(`https://members-ng.iracing.com${path}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
      if (!retryResponse.ok) {
        throw new Error(`iRacing API failed after retry: ${retryResponse.status}`);
      }
      const retryLink = await retryResponse.json();
      const retryData = await fetch(retryLink.link);
      return retryData.json();
    }
    return null; // 404 = not found, etc.
  }

  const linkData = await linkResponse.json();

  // Step 2: Fetch actual data from the S3/CDN link
  const dataResponse = await fetch(linkData.link);
  if (!dataResponse.ok) {
    throw new Error(`iRacing data fetch failed: ${dataResponse.status}`);
  }

  return dataResponse.json();
}

/**
 * Fetch race results for a specific subsession.
 * @param {number} subsessionId iRacing subsession ID
 * @returns {Array|null} Array of driver results sorted by finish position, or null if not found
 */
async function fetchSubsessionResults(subsessionId) {
  // Validate subsession ID before constructing URL
  if (!Number.isInteger(subsessionId) || subsessionId <= 0) {
    throw new Error(`Invalid subsession ID: ${subsessionId}`);
  }

  const data = await iRacingFetch(`/data/results/get?subsession_id=${subsessionId}`);
  if (!data) return null;

  // Extract driver results from session results
  // iRacing returns nested structure: session_results → results[]
  const raceSession = data.session_results?.find(
    (s) => s.simsession_type_name === "Race"
  );

  if (!raceSession || !raceSession.results) {
    return null;
  }

  // Map to our format
  return raceSession.results.map((r) => ({
    custId: r.cust_id,
    displayName: r.display_name,
    finishPosition: r.finish_position + 1, // iRacing is 0-indexed
    startPosition: r.starting_position + 1,
    lapsComplete: r.laps_complete,
    lapsLed: r.laps_led,
    incidents: r.incidents,
    averageLap: r.average_lap,
    bestLapTime: r.best_lap_time,
    reasonOut: r.reason_out,
    interval: r.interval,
  }));
}

/**
 * Fetch member info for the authenticated user (or a specific cust_id).
 * @param {number} [custId] Optional customer ID
 */
async function fetchMemberInfo(custId) {
  const path = custId
    ? `/data/member/info?cust_ids=${custId}`
    : "/data/member/info";
  return iRacingFetch(path);
}

/**
 * Fetch recent races for a member.
 * @param {number} [custId] Optional customer ID
 */
async function fetchRecentRaces(custId) {
  const path = custId
    ? `/data/stats/member_recent_races?cust_id=${custId}`
    : "/data/stats/member_recent_races";
  return iRacingFetch(path);
}

/**
 * Fetch league season sessions to auto-discover subsession IDs.
 * Returns completed race subsession IDs for the given league season.
 * @param {number} leagueId iRacing league ID
 * @param {number} seasonId iRacing league season ID
 * @returns {Array|null} Array of { subsessionId, launchAt } or null
 */
async function fetchLeagueSeasonSessions(leagueId, seasonId) {
  if (!Number.isInteger(leagueId) || leagueId <= 0) {
    throw new Error(`Invalid league ID: ${leagueId}`);
  }
  if (!Number.isInteger(seasonId) || seasonId <= 0) {
    throw new Error(`Invalid season ID: ${seasonId}`);
  }

  const data = await iRacingFetch(
    `/data/league/season_sessions?league_id=${leagueId}&season_id=${seasonId}`
  );
  if (!data || !data.sessions) return null;

  return data.sessions
    .filter((s) => s.has_results)
    .map((s) => ({
      subsessionId: s.subsession_id,
      launchAt: s.launch_at,
      trackName: s.track?.track_name || "Unknown",
    }))
    .sort((a, b) => new Date(b.launchAt) - new Date(a.launchAt));
}

module.exports = {
  iRacingAuth,
  fetchSubsessionResults,
  fetchMemberInfo,
  fetchRecentRaces,
  fetchLeagueSeasonSessions,
  iRacingFetch,
};
