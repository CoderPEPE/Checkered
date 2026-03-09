/**
 * iRacing Data API Integration
 * 
 * Authentication uses cookie-based auth with SHA-256 password hashing.
 * API docs: https://members-ng.iracing.com/data/doc
 */
const crypto = require("crypto");

let authCookie = null;
let cookieExpiry = null;

/**
 * Authenticate with iRacing Data API
 * @returns {string} Auth cookie for subsequent requests
 */
async function iRacingAuth() {
  // Return cached cookie if still valid
  if (authCookie && cookieExpiry && Date.now() < cookieExpiry) {
    return authCookie;
  }

  const email = process.env.IRACING_EMAIL;
  const password = process.env.IRACING_PASSWORD;

  if (!email || !password) {
    throw new Error("IRACING_EMAIL and IRACING_PASSWORD must be set");
  }

  // iRacing requires SHA-256(password + email.toLowerCase())
  const hashInput = password + email.toLowerCase();
  const hash = crypto.createHash("sha256").update(hashInput).digest("base64");

  const response = await fetch("https://members-ng.iracing.com/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: hash }),
  });

  if (!response.ok) {
    throw new Error(`iRacing auth failed: ${response.status} ${response.statusText}`);
  }

  // Extract session cookie
  const cookies = response.headers.get("set-cookie");
  if (!cookies) {
    throw new Error("No auth cookie received from iRacing");
  }

  authCookie = cookies.split(";")[0];
  cookieExpiry = Date.now() + 3600000; // Refresh after 1 hour

  return authCookie;
}

/**
 * Fetch race results for a specific subsession
 * @param {number} subsessionId iRacing subsession ID
 * @returns {Array} Array of driver results sorted by finish position
 */
async function fetchSubsessionResults(subsessionId) {
  // Validate subsession ID before constructing URL (Milestone 10)
  if (!Number.isInteger(subsessionId) || subsessionId <= 0) {
    throw new Error(`Invalid subsession ID: ${subsessionId}`);
  }

  const cookie = await iRacingAuth();

  // Step 1: Get the results link
  const linkResponse = await fetch(
    `https://members-ng.iracing.com/data/results/get?subsession_id=${subsessionId}`,
    { headers: { Cookie: cookie } }
  );

  if (!linkResponse.ok) {
    if (linkResponse.status === 404) {
      return null; // Race not yet complete
    }
    throw new Error(`iRacing results link failed: ${linkResponse.status}`);
  }

  const linkData = await linkResponse.json();

  // Step 2: Fetch actual data from the link
  const dataResponse = await fetch(linkData.link);
  if (!dataResponse.ok) {
    throw new Error(`iRacing results data failed: ${dataResponse.status}`);
  }

  const resultsData = await dataResponse.json();

  // Extract driver results from session results
  // iRacing returns nested structure: session_results → results[]
  const raceSession = resultsData.session_results?.find(
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

module.exports = { iRacingAuth, fetchSubsessionResults };
