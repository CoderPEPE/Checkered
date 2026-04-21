require("dotenv").config();
const { ethers } = require("ethers");
const winston = require("winston");
require("winston-daily-rotate-file");
const { iRacingAuth, fetchSubsessionResults, fetchMemberInfo, fetchLeagueSeasonSessions, fetchLeagueAllSessions, fetchLeagueSeasons, fetchLeagueSeasonsViaMember, fetchLeagueRosterMember, fetchLeagueOwnerCustId } = require("./iracing-api");
const { createApp } = require("./app");

// ============================================================
//  ENV VALIDATION (Milestone 1)
// ============================================================
const REQUIRED_ENV = ["ADMIN_API_KEY", "ORACLE_PRIVATE_KEY", "TOURNAMENT_CONTRACT_ADDRESS", "BASE_RPC_URL"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ============================================================
//  LOGGER
// ============================================================
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    // Daily rotation: one file per day, 20 MB max per file, keep 14 days (Milestone 7)
    new winston.transports.DailyRotateFile({
      filename: "oracle-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

// ============================================================
//  CONFIG
// ============================================================
const PORT = process.env.PORT || 3001;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const MOCK_MODE = process.env.IRACING_MOCK_MODE === "true";

// ============================================================
//  BLOCKCHAIN CONNECTION
// ============================================================
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const oracleWallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

// Minimal ABI for the functions we call
const TOURNAMENT_ABI = [
  "function createTournament(string, uint256, uint256, uint256[], uint256, uint256, uint256, bool) external returns (uint256)",
  "function getTournament(uint256) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt)",
  "function getTournamentExtra(uint256) view returns (uint256 iRacingLeagueId, uint256 iRacingSeasonId, address paymentToken)",
  "function getTournamentPlayers(uint256) view returns (address[])",
  "function getPlayerRegistration(uint256, address) view returns (uint256 iRacingCustomerId, bool registered, bool refundClaimed)",
  "function submitResultsAndDistribute(uint256, address[], bytes32)",
  "function updateSubsessionId(uint256, uint256)",
  "function tournamentCount() view returns (uint256)",
  "function usdc() view returns (address)",
  "function chex() view returns (address)",
  "event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers)",
  "event PrizesDistributed(uint256 indexed tournamentId, address[] winners, uint256[] amounts)",
  "event SubsessionIdUpdated(uint256 indexed tournamentId, uint256 subsessionId)",
];

const tournamentContract = new ethers.Contract(
  process.env.TOURNAMENT_CONTRACT_ADDRESS,
  TOURNAMENT_ABI,
  oracleWallet
);

// ============================================================
//  IN-MEMORY STATE
// ============================================================
// Tracks tournaments with in-flight submissions to prevent double-submit
const submittingTournaments = new Set();
// Cached cust_id of a league member used for season lookups (auto-discovered from roster)
let cachedLeagueMemberCustId = parseInt(process.env.AUTO_CREATE_MEMBER_CUST_ID || "0");
// Tracks subsession IDs that have already been successfully submitted (prevents re-submission on restart)
const processedSubsessions = new Set();
// Tracks tournaments that failed due to insufficient finishers, with retry count
const insufficientFinisherRetries = new Map();
const MAX_INSUFFICIENT_RETRIES = 10; // After this many polls, log error instead of warn

// ============================================================
//  ORACLE POLLING
// ============================================================
async function pollTournaments() {
  try {
    const count = await tournamentContract.tournamentCount();
    logger.info(`Polling ${count} tournaments...`);

    for (let i = 0; i < count; i++) {
      const t = await tournamentContract.getTournament(i);
      const status = Number(t.status);

      // Status 2 = Racing — check for results
      if (status === 2) {
        // Skip if a submission is already in-flight for this tournament
        if (submittingTournaments.has(i)) {
          logger.info(`Tournament ${i}: Submission already in-flight, skipping`);
          continue;
        }

        // Get league info from the extra view function
        const extra = await tournamentContract.getTournamentExtra(i);
        const leagueId = Number(extra.iRacingLeagueId || 0);
        const seasonId = Number(extra.iRacingSeasonId || 0);
        let subsessionId = Number(t.iRacingSubsessionId);

        // League auto-discovery: if leagueId is set and subsessionId is 0, discover from league
        if (leagueId > 0 && subsessionId === 0 && !MOCK_MODE) {
          try {
            logger.info(`Tournament ${i}: Discovering subsession from league ${leagueId} season ${seasonId}`);
            const sessions = await fetchLeagueSeasonSessions(leagueId, seasonId);
            if (sessions && sessions.length > 0) {
              subsessionId = sessions[0].subsessionId;

              // Skip if this subsession was already processed (prevents double-submit on restart)
              if (processedSubsessions.has(subsessionId)) {
                logger.info(`Tournament ${i}: Subsession ${subsessionId} already processed, skipping`);
                continue;
              }

              logger.info(`Tournament ${i}: Discovered subsession ${subsessionId} (${sessions[0].trackName})`);

              const updateTx = await tournamentContract.updateSubsessionId(i, subsessionId);
              await updateTx.wait();
              logger.info(`Tournament ${i}: Updated on-chain subsessionId to ${subsessionId}`);
            } else {
              logger.info(`Tournament ${i}: No completed sessions found for league ${leagueId}`);
              continue;
            }
          } catch (err) {
            logger.error(`Tournament ${i} league discovery error: ${err.message}`);
            continue;
          }
        }

        // Skip if this subsession was already successfully processed
        if (subsessionId > 0 && processedSubsessions.has(subsessionId)) {
          logger.info(`Tournament ${i}: Subsession ${subsessionId} already processed, skipping`);
          continue;
        }

        logger.info(`Tournament ${i} (${t.name}) is Racing — checking iRacing API for subsession ${subsessionId}`);

        try {
          let results;
          if (MOCK_MODE) {
            results = generateMockResults(i);
          } else {
            results = await fetchSubsessionResults(subsessionId);
          }

          if (results && results.length > 0) {
            await submitResults(i, results, t);
          } else {
            logger.info(`Tournament ${i}: Race not yet complete`);
          }
        } catch (err) {
          logger.error(`Tournament ${i} poll error: ${err.message}`);
        }
      } else {
        // Tournament is no longer Racing — clean up tracking state
        submittingTournaments.delete(i);
        insufficientFinisherRetries.delete(i);
      }
    }
  } catch (err) {
    logger.error(`Poll cycle error: ${err.message}`);
  }
}

async function submitResults(tournamentId, raceResults, tournamentData) {
  // Mark as in-flight to prevent double-submission
  submittingTournaments.add(tournamentId);

  try {
    const players = await tournamentContract.getTournamentPlayers(tournamentId);
    const playerMap = new Map();

    for (const playerAddr of players) {
      const reg = await tournamentContract.getPlayerRegistration(tournamentId, playerAddr);
      playerMap.set(Number(reg.iRacingCustomerId), playerAddr);
    }

    const prizeSplitCount = tournamentData.prizeSplits.length;
    const sortedResults = raceResults
      .filter((r) => playerMap.has(r.custId))
      .sort((a, b) => a.finishPosition - b.finishPosition);

    if (sortedResults.length < prizeSplitCount) {
      // Track retry count so this doesn't poll forever silently
      const retries = (insufficientFinisherRetries.get(tournamentId) || 0) + 1;
      insufficientFinisherRetries.set(tournamentId, retries);

      if (retries >= MAX_INSUFFICIENT_RETRIES) {
        logger.error(`Tournament ${tournamentId}: Only ${sortedResults.length}/${prizeSplitCount} registered finishers after ${retries} polls — may need admin intervention (cancel or manual resolution)`);
      } else {
        logger.warn(`Tournament ${tournamentId}: Only ${sortedResults.length} finishers, need ${prizeSplitCount} (retry ${retries}/${MAX_INSUFFICIENT_RETRIES})`);
      }

      // Allow retry on next poll
      submittingTournaments.delete(tournamentId);
      return;
    }

    const winners = sortedResults
      .slice(0, prizeSplitCount)
      .map((r) => playerMap.get(r.custId));

    // Hash the filtered+sorted results that actually correspond to the winners
    const resultData = JSON.stringify(sortedResults.slice(0, prizeSplitCount));
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultData));

    logger.info(`Tournament ${tournamentId}: Submitting results — Winners: ${winners.join(", ")}`);

    const tx = await tournamentContract.submitResultsAndDistribute(
      tournamentId,
      winners,
      resultHash
    );
    const receipt = await tx.wait();

    logger.info(`Tournament ${tournamentId}: Results submitted! TX: ${receipt.hash}`);
    logger.info(`Gas used: ${receipt.gasUsed.toString()}`);

    // Mark this subsession as processed to prevent re-submission
    const subsessionId = Number(tournamentData.iRacingSubsessionId);
    if (subsessionId > 0) {
      processedSubsessions.add(subsessionId);
      logger.info(`Tournament ${tournamentId}: Subsession ${subsessionId} marked as processed`);
    }

    // Clean up tracking state on success
    insufficientFinisherRetries.delete(tournamentId);
  } catch (err) {
    logger.error(`Submit results error for tournament ${tournamentId}: ${err.message}`);
  } finally {
    // Always clear in-flight flag so next poll can retry if needed
    submittingTournaments.delete(tournamentId);
  }
}

function generateMockResults(tournamentId) {
  return [
    { custId: 100001, finishPosition: 1, displayName: "Test Driver 1" },
    { custId: 100002, finishPosition: 2, displayName: "Test Driver 2" },
    { custId: 100003, finishPosition: 3, displayName: "Test Driver 3" },
  ];
}

// ============================================================
//  AUTO-CREATE TOURNAMENTS FROM IRACING LEAGUE
// ============================================================
// Reads env vars:
//   AUTO_CREATE_LEAGUE_ID      — iRacing league ID to watch (default: 132296)
//   AUTO_CREATE_SEASON_ID      — pin to a specific season ID (0 = auto-discover active seasons)
//   AUTO_CREATE_MEMBER_CUST_ID — cust_id of a league member to use for season lookups when
//                                the oracle account is not in the league (e.g. 1450841)
//   AUTO_CREATE_ENTRY_FEE      — entry fee in CHEX whole tokens (default: 100)
//   AUTO_CREATE_MAX_PLAYERS    — max players per tournament (default: 50)
//   AUTO_CREATE_INTERVAL       — polling interval in ms (default: 3600000 = 1 hour)
async function pollLeagueTournaments() {
  const leagueId = parseInt(process.env.AUTO_CREATE_LEAGUE_ID || "132296");
  if (!leagueId || MOCK_MODE) return;

  try {
    logger.info(`Auto-create: scanning league ${leagueId} for new sessions`);

    // Build a set of subsession IDs that already have a tournament on-chain
    const count = await tournamentContract.tournamentCount();
    const existingSubsessions = new Set();
    for (let i = 0; i < count; i++) {
      const t = await tournamentContract.getTournament(i);
      const sid = Number(t.iRacingSubsessionId);
      if (sid > 0) existingSubsessions.add(sid);
    }

    // Determine which seasons to scan
    const configuredSeasonId = parseInt(process.env.AUTO_CREATE_SEASON_ID || "0");
    let seasons;
    if (configuredSeasonId > 0) {
      seasons = [{ seasonId: configuredSeasonId, seasonName: `season-${configuredSeasonId}` }];
    } else {
      // Try direct seasons endpoint first (works if oracle is a league member)
      let direct = await fetchLeagueSeasons(leagueId);
      seasons = direct.filter((s) => s.active);

      if (seasons.length === 0) {
        // Oracle isn't subscribed — try to find a member via the membership endpoint
        if (cachedLeagueMemberCustId > 0) {
          logger.info(`Auto-create: direct seasons returned empty, trying via member cust_id ${cachedLeagueMemberCustId}`);
          const viaMember = await fetchLeagueSeasonsViaMember(leagueId, cachedLeagueMemberCustId);
          seasons = viaMember.filter((s) => s.active);

          if (seasons.length === 0) {
            // cust_id isn't in the league either — reset and try roster
            logger.info(`Auto-create: cust_id ${cachedLeagueMemberCustId} is not in league ${leagueId}, fetching roster`);
            cachedLeagueMemberCustId = 0;
          }
        }

        if (seasons.length === 0) {
          // Try fetching any member from the league roster
          logger.info(`Auto-create: fetching league ${leagueId} roster to find a member cust_id`);
          const rosterMember = await fetchLeagueRosterMember(leagueId);
          if (rosterMember) {
            cachedLeagueMemberCustId = rosterMember;
            logger.info(`Auto-create: discovered member cust_id ${cachedLeagueMemberCustId} from roster`);
            const viaMember = await fetchLeagueSeasonsViaMember(leagueId, cachedLeagueMemberCustId);
            seasons = viaMember.filter((s) => s.active);
          }
        }

        if (seasons.length === 0) {
          // Last resort: try /data/league/get which exposes the owner cust_id
          logger.info(`Auto-create: trying league/get to find owner cust_id for league ${leagueId}`);
          const ownerCustId = await fetchLeagueOwnerCustId(leagueId);
          if (ownerCustId) {
            cachedLeagueMemberCustId = ownerCustId;
            logger.info(`Auto-create: using league owner cust_id ${cachedLeagueMemberCustId}`);
            const viaMember = await fetchLeagueSeasonsViaMember(leagueId, cachedLeagueMemberCustId);
            seasons = viaMember.filter((s) => s.active);
          }
        }

        if (seasons.length === 0) {
          logger.info(`Auto-create: no active seasons for league ${leagueId} — oracle not subscribed and all member discovery methods failed`);
          return;
        }
      }
    }

    const entryFee = ethers.parseUnits(process.env.AUTO_CREATE_ENTRY_FEE || "100", 18);
    const maxPlayers = parseInt(process.env.AUTO_CREATE_MAX_PLAYERS || "50");
    const prizeSplits = [6000, 3000, 1000]; // 60/30/10

    for (const season of seasons) {
      const sessions = await fetchLeagueAllSessions(leagueId, season.seasonId);
      if (!sessions || sessions.length === 0) continue;

      for (const session of sessions) {
        if (existingSubsessions.has(session.subsessionId)) continue;

        const raceDate = new Date(session.launchAt);
        const dateStr = raceDate.toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric",
        });
        const name = `${session.trackName} — ${dateStr}`;

        logger.info(
          `Auto-create: new session ${session.subsessionId} at "${session.trackName}" on ${dateStr} — creating tournament`
        );

        try {
          // Check balance before sending to surface a clear error (estimateGas returns
          // CALL_EXCEPTION instead of INSUFFICIENT_FUNDS when balance is 0)
          const balance = await provider.getBalance(oracleWallet.address);
          if (balance === 0n) {
            logger.error(`Auto-create: oracle wallet has 0 ETH — fund it at https://faucet.quicknode.com/base/sepolia to create tournaments`);
            return; // No point trying further sessions
          }

          const tx = await tournamentContract.createTournament(
            name,
            entryFee,
            maxPlayers,
            prizeSplits,
            session.subsessionId,
            leagueId,
            season.seasonId,
            true, // useChex
            { gasLimit: 400000 }
          );
          const receipt = await tx.wait();
          logger.info(`Auto-create: tournament created for subsession ${session.subsessionId} — TX: ${receipt.hash}`);
          existingSubsessions.add(session.subsessionId);
        } catch (err) {
          const hint = err.code === 'INSUFFICIENT_FUNDS'
            ? ' — oracle wallet has no ETH, fund it at https://faucet.quicknode.com/base/sepolia'
            : '';
          logger.error(`Auto-create: failed for subsession ${session.subsessionId}: ${err.message}${hint}`);
        }
      }
    }
  } catch (err) {
    logger.error(`Auto-create poll error: ${err.message}`);
  }
}

// ============================================================
//  CREATE & START APP
// ============================================================
const app = createApp({
  adminApiKey: ADMIN_API_KEY,
  tournamentContract,
  oracleWallet,
  mockMode: MOCK_MODE,
  logger,
  pollTournaments,
  pollLeagueTournaments,
  provider,
  iRacingAuth,
  fetchMemberInfo,
});

app.listen(PORT, async () => {
  logger.info(`Oracle backend running on port ${PORT}`);
  logger.info(`Oracle address: ${oracleWallet.address}`);
  logger.info(`Contract: ${process.env.TOURNAMENT_CONTRACT_ADDRESS}`);

  // Warn if oracle has no ETH to pay for gas
  try {
    const balance = await provider.getBalance(oracleWallet.address);
    const ethBalance = parseFloat(ethers.formatEther(balance));
    if (ethBalance < 0.001) {
      logger.warn(`Oracle wallet balance is ${ethBalance} ETH — may not have enough gas to submit transactions. Fund at https://faucet.quicknode.com/base/sepolia`);
    } else {
      logger.info(`Oracle wallet balance: ${ethBalance} ETH`);
    }
  } catch (err) {
    logger.warn(`Could not check oracle wallet balance: ${err.message}`);
  }
  logger.info(`Mock mode: ${MOCK_MODE}`);

  // Oracle result polling — runs every POLL_INTERVAL (default 30s)
  const interval = parseInt(process.env.POLL_INTERVAL || "30000");
  pollTournaments();
  setInterval(pollTournaments, interval);
  logger.info(`Oracle polling every ${interval / 1000} seconds`);

  // Auto-create tournaments from iRacing league — runs every AUTO_CREATE_INTERVAL (default 1h)
  const autoCreateInterval = parseInt(process.env.AUTO_CREATE_INTERVAL || "3600000");
  const autoCreateLeagueId = parseInt(process.env.AUTO_CREATE_LEAGUE_ID || "132296");
  const autoCreateMemberCustId = parseInt(process.env.AUTO_CREATE_MEMBER_CUST_ID || "0");
  if (!MOCK_MODE && autoCreateLeagueId > 0) {
    if (autoCreateMemberCustId > 0) {
      logger.info(`Auto-create: using member cust_id ${autoCreateMemberCustId} for league ${autoCreateLeagueId} lookups (oracle not required to be a league member)`);
    }
    pollLeagueTournaments();
    setInterval(pollLeagueTournaments, autoCreateInterval);
    logger.info(`Auto-create polling league ${autoCreateLeagueId} every ${autoCreateInterval / 1000} seconds`);
  }
});
