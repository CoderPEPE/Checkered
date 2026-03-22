/**
 * iRacing Integration Test
 *
 * Tests the complete flow: OAuth2 auth, member info, recent races,
 * subsession results, and backend API endpoints.
 *
 * Usage: node test/iracing-integration.js
 *
 * Set IRACING_MOCK_MODE=true to skip live iRacing API tests.
 * Set IRACING_CLIENT_ID + IRACING_CLIENT_SECRET for OAuth2 tests.
 * Or set IRACING_ACCESS_TOKEN for manual token testing.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;
const API_KEY = process.env.ADMIN_API_KEY;
const MOCK_MODE = process.env.IRACING_MOCK_MODE === "true";

// Track results
let passed = 0;
let failed = 0;
let skipped = 0;
const results = [];

function ok(test, detail) {
  passed++;
  results.push({ test, status: "PASS" });
  console.log(`  ✅ ${test}${detail ? ` — ${detail}` : ""}`);
}
function fail(test, err) {
  failed++;
  results.push({ test, status: "FAIL", error: err });
  console.error(`  ❌ ${test} — ${err}`);
}
function skip(test, reason) {
  skipped++;
  results.push({ test, status: "SKIP" });
  console.log(`  ⏭️  ${test} — ${reason}`);
}

// ════════════════════════════════════════════════════════════
//  1. iRACING OAuth2 TESTS (direct API — requires credentials)
// ════════════════════════════════════════════════════════════

async function testIRacingOAuth() {
  console.log("\n═══ 1. iRACING OAUTH2 AUTHENTICATION ═══");

  if (MOCK_MODE) {
    skip("OAuth2 auth", "IRACING_MOCK_MODE=true — skipping live API tests");
    return null;
  }

  // Check if OAuth2 credentials or manual token are available
  const hasOAuth = process.env.IRACING_CLIENT_ID && process.env.IRACING_CLIENT_SECRET;
  const hasToken = !!process.env.IRACING_ACCESS_TOKEN;

  if (!hasOAuth && !hasToken) {
    console.log("  ⚠️  No OAuth2 credentials configured.");
    console.log("  ⚠️  iRacing retired legacy /auth in Dec 2025. OAuth2 is now required.");
    console.log("  ⚠️  Register at: https://oauth.iracing.com/oauth2/book/client_registration.html");
    console.log("  ⚠️  Then set IRACING_CLIENT_ID and IRACING_CLIENT_SECRET in .env");
    console.log("  ⚠️  Or set IRACING_ACCESS_TOKEN with a manually obtained token.");
    skip("OAuth2 auth", "No OAuth2 credentials — set IRACING_CLIENT_ID/SECRET or IRACING_ACCESS_TOKEN");
    return null;
  }

  try {
    // Use the iracing-api module to test auth
    const { iRacingAuth } = require("../src/iracing-api");
    const token = await iRacingAuth();

    if (token) {
      ok("OAuth2 auth", `Token obtained (${token.substring(0, 20)}...)`);
      return token;
    } else {
      fail("OAuth2 auth", "No token returned");
      return null;
    }
  } catch (err) {
    fail("OAuth2 auth", err.message);
    return null;
  }
}

async function testMemberInfo(token) {
  console.log("\n═══ 2. iRACING MEMBER INFO ═══");

  if (!token) {
    skip("Member info", "No auth token available");
    return null;
  }

  try {
    const { fetchMemberInfo } = require("../src/iracing-api");
    const member = await fetchMemberInfo();

    if (!member) {
      fail("Member info", "No data returned");
      return null;
    }

    console.log(`  📋 Customer ID: ${member.cust_id}`);
    console.log(`  📋 Display Name: ${member.display_name}`);
    console.log(`  📋 Member Since: ${member.member_since}`);
    // licenses can be an object keyed by category (oval, sports_car, etc.)
    if (member.licenses && typeof member.licenses === "object") {
      const entries = Array.isArray(member.licenses)
        ? member.licenses
        : Object.values(member.licenses);
      entries.forEach(l => {
        console.log(`  📋 ${l.category_name || l.category}: iRating ${l.irating}, SR ${l.safety_rating}`);
      });
    }
    ok("Member info", `ID: ${member.cust_id}, Name: ${member.display_name}`);
    return member;
  } catch (err) {
    fail("Member info", err.message);
    return null;
  }
}

async function testRecentRaces(token, custId) {
  console.log("\n═══ 3. iRACING RECENT RACES ═══");

  if (!token) {
    skip("Recent races", "No auth token available");
    return [];
  }

  try {
    const { fetchRecentRaces } = require("../src/iracing-api");
    const data = await fetchRecentRaces(custId);
    const races = data?.races || data;

    if (!Array.isArray(races) || races.length === 0) {
      console.log("  ⚠️  No recent races found — account may not have raced yet");
      ok("Recent races API", "Endpoint works, 0 races");
      return [];
    }

    console.log(`  Found ${races.length} recent races:`);
    races.slice(0, 5).forEach((race, i) => {
      console.log(`  ${i + 1}. ${race.series_name || "Unknown"}`);
      console.log(`     Track: ${race.track?.track_name || "N/A"}`);
      console.log(`     Subsession: ${race.subsession_id}`);
      console.log(`     Finish: P${(race.finish_position || 0) + 1}`);
    });

    ok("Recent races", `${races.length} races found`);
    return races;
  } catch (err) {
    fail("Recent races", err.message);
    return [];
  }
}

async function testSubsessionResults(token, subsessionId) {
  console.log("\n═══ 4. iRACING SUBSESSION RESULTS ═══");

  if (!token) {
    skip("Subsession results", "No auth token available");
    return null;
  }
  if (!subsessionId) {
    skip("Subsession results", "No subsession ID from recent races");
    return null;
  }

  console.log(`  Testing subsession: ${subsessionId}`);

  try {
    const { fetchSubsessionResults } = require("../src/iracing-api");
    const results = await fetchSubsessionResults(subsessionId);

    if (!results) {
      console.log("  ⚠️  No race results (may be practice/qualify only)");
      ok("Subsession API", "Endpoint works, no race data");
      return null;
    }

    console.log(`  Race Results (${results.length} drivers):`);
    results.slice(0, 5).forEach(r => {
      console.log(`    P${r.finishPosition}: ${r.displayName} (custId: ${r.custId})`);
    });

    ok("Subsession results", `${results.length} drivers`);
    return results;
  } catch (err) {
    fail("Subsession results", err.message);
    return null;
  }
}

// ════════════════════════════════════════════════════════════
//  5. BACKEND API TESTS (requires backend running on port 3001)
// ════════════════════════════════════════════════════════════

async function testBackendHealth() {
  console.log("\n═══ 5. BACKEND API — HEALTH ═══");

  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    if (!res.ok) {
      fail("Health check", `HTTP ${res.status}`);
      return false;
    }
    const data = await res.json();
    if (data.status === "ok") {
      ok("Health check", "Backend running");
      return true;
    }
    fail("Health check", `Unexpected: ${JSON.stringify(data)}`);
    return false;
  } catch (err) {
    fail("Health check", `Backend not running at ${BASE_URL}`);
    return false;
  }
}

async function testBackendTournaments() {
  console.log("\n═══ 6. BACKEND API — GET TOURNAMENTS ═══");

  try {
    const res = await fetch(`${BASE_URL}/api/tournaments`);
    if (!res.ok) {
      fail("Get tournaments", `HTTP ${res.status}`);
      return;
    }
    const tournaments = await res.json();

    if (!Array.isArray(tournaments)) {
      fail("Get tournaments", "Not an array");
      return;
    }

    console.log(`  Found ${tournaments.length} tournaments on-chain:`);
    tournaments.forEach(t => {
      const fee = Number(t.entryFee) / 1_000_000;
      console.log(`    #${t.id} "${t.name}" — $${fee} USDC, ${t.registeredCount}/${t.maxPlayers}, ${t.statusName}`);
    });

    ok("Get tournaments", `${tournaments.length} tournaments`);

    // Test tournament detail endpoint
    if (tournaments.length > 0) {
      const detailRes = await fetch(`${BASE_URL}/api/tournaments/${tournaments[0].id}`);
      if (detailRes.ok) {
        const d = await detailRes.json();
        console.log(`\n  Detail for #${d.id} "${d.name}":`);
        console.log(`    Prize Pool: ${Number(d.prizePool) / 1_000_000} USDC`);
        console.log(`    Splits: ${d.prizeSplits?.join("/")} (basis points)`);
        console.log(`    Subsession: ${d.iRacingSubsessionId}`);
        console.log(`    Players: ${d.players?.length || 0}`);
        ok("Tournament detail", `ID ${d.id}`);
      } else {
        fail("Tournament detail", `HTTP ${detailRes.status}`);
      }
    }

    // Test invalid ID
    const badRes = await fetch(`${BASE_URL}/api/tournaments/-1`);
    if (badRes.status === 400) {
      ok("Invalid tournament ID", "Returns 400");
    } else {
      fail("Invalid tournament ID", `Expected 400, got ${badRes.status}`);
    }
  } catch (err) {
    fail("Get tournaments", err.message);
  }
}

async function testOracleStatus() {
  console.log("\n═══ 7. BACKEND API — ORACLE STATUS ═══");

  try {
    // Without API key — must return 401
    const noAuth = await fetch(`${BASE_URL}/api/oracle/status`);
    if (noAuth.status === 401) {
      ok("Auth guard (no key)", "Returns 401");
    } else {
      fail("Auth guard (no key)", `Expected 401, got ${noAuth.status}`);
    }

    // Wrong API key — must return 401
    const wrongAuth = await fetch(`${BASE_URL}/api/oracle/status`, {
      headers: { "X-API-Key": "wrong-key" },
    });
    if (wrongAuth.status === 401) {
      ok("Auth guard (wrong key)", "Returns 401");
    } else {
      fail("Auth guard (wrong key)", `Expected 401, got ${wrongAuth.status}`);
    }

    // Correct API key
    const res = await fetch(`${BASE_URL}/api/oracle/status`, {
      headers: { "X-API-Key": API_KEY },
    });
    if (!res.ok) {
      fail("Oracle status", `HTTP ${res.status}`);
      return;
    }
    const status = await res.json();
    console.log(`  Oracle Address: ${status.address}`);
    console.log(`  Contract: ${status.contract}`);
    console.log(`  Mock Mode: ${status.mockMode}`);
    console.log(`  Uptime: ${Math.round(status.uptime)}s`);
    ok("Oracle status", `Address: ${status.address}`);
  } catch (err) {
    fail("Oracle status", err.message);
  }
}

async function testManualPoll() {
  console.log("\n═══ 8. BACKEND API — MANUAL POLL ═══");

  try {
    // Without key — must fail
    const noAuth = await fetch(`${BASE_URL}/api/oracle/poll`, { method: "POST" });
    if (noAuth.status === 401) {
      ok("Poll auth guard", "Returns 401");
    }

    // With key — trigger poll
    const res = await fetch(`${BASE_URL}/api/oracle/poll`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY },
    });
    if (!res.ok) {
      fail("Manual poll", `HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    ok("Manual poll", data.status || "Triggered");
  } catch (err) {
    fail("Manual poll", err.message);
  }
}

// ════════════════════════════════════════════════════════════
//  9. CONTRACT CONNECTIVITY TEST
// ════════════════════════════════════════════════════════════

async function testContractConnection() {
  console.log("\n═══ 9. SMART CONTRACT CONNECTION ═══");

  try {
    const { ethers } = require("ethers");
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);

    // Test RPC connection
    const network = await provider.getNetwork();
    ok("RPC connection", `Chain ID: ${network.chainId}, Name: ${network.name}`);

    // Test contract read
    const ABI = [
      "function tournamentCount() view returns (uint256)",
      "function getTournament(uint256) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt)",
    ];
    const contract = new ethers.Contract(
      process.env.TOURNAMENT_CONTRACT_ADDRESS,
      ABI,
      provider
    );

    const count = await contract.tournamentCount();
    console.log(`  Tournament count: ${Number(count)}`);
    ok("Contract read", `${Number(count)} tournaments on-chain`);

    // Read first tournament if any exist
    if (Number(count) > 0) {
      const t = await contract.getTournament(0);
      const statusNames = ["Created", "RegClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"];
      console.log(`  Tournament #0: "${t.name}" — ${Number(t.entryFee) / 1e6} USDC, ${statusNames[Number(t.status)]}`);
      ok("Read tournament", `"${t.name}"`);
    }

    // Test oracle wallet
    const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    const ethBal = Number(ethers.formatEther(balance));
    console.log(`  Oracle wallet: ${wallet.address}`);
    console.log(`  ETH balance: ${ethBal.toFixed(6)} ETH`);
    if (ethBal < 0.001) {
      console.log("  ⚠️  Low ETH balance — oracle needs gas to submit transactions");
    }
    ok("Oracle wallet", `${ethBal.toFixed(6)} ETH`);
  } catch (err) {
    fail("Contract connection", err.message);
  }
}

// ════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  console.log("═".repeat(60));
  console.log("  CHECKERED — Full Integration Test");
  console.log("═".repeat(60));
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log(`  Backend: ${BASE_URL}`);
  console.log(`  Contract: ${process.env.TOURNAMENT_CONTRACT_ADDRESS}`);
  console.log(`  Mock Mode: ${MOCK_MODE}`);
  console.log(`  RPC: ${process.env.BASE_RPC_URL}`);

  // Part A: Smart contract connectivity (no backend needed)
  await testContractConnection();

  // Part B: iRacing API (skip if mock mode)
  const token = await testIRacingOAuth();
  const member = await testMemberInfo(token);
  const races = await testRecentRaces(token, member?.cust_id);
  const latestSubsession = races.length > 0 ? races[0].subsession_id : null;
  await testSubsessionResults(token, latestSubsession);

  // Part C: Backend API (requires backend running)
  const backendRunning = await testBackendHealth();
  if (backendRunning) {
    await testBackendTournaments();
    await testOracleStatus();
    await testManualPoll();
  } else {
    console.log("\n  ⚠️  Backend not running — skipping API tests");
    console.log("  Start with: cd backend && npm run dev");
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed > 0) {
    console.log("\n  Failed:");
    results.filter(r => r.status === "FAIL").forEach(r => {
      console.log(`    ❌ ${r.test}: ${r.error}`);
    });
  }
  if (skipped > 0) {
    console.log("\n  Skipped:");
    results.filter(r => r.status === "SKIP").forEach(r => {
      console.log(`    ⏭️  ${r.test}`);
    });
  }
  console.log("═".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
