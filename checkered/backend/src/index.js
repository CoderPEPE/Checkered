require("dotenv").config();
const { ethers } = require("ethers");
const winston = require("winston");
require("winston-daily-rotate-file");
const { iRacingAuth, fetchSubsessionResults, fetchMemberInfo } = require("./iracing-api");
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
  "function getTournament(uint256) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt)",
  "function getTournamentPlayers(uint256) view returns (address[])",
  "function getPlayerRegistration(uint256, address) view returns (uint256 iRacingCustomerId, bool registered, bool refundClaimed)",
  "function submitResultsAndDistribute(uint256, address[], bytes32)",
  "function tournamentCount() view returns (uint256)",
  "event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers)",
  "event PrizesDistributed(uint256 indexed tournamentId, address[] winners, uint256[] amounts)",
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

        logger.info(`Tournament ${i} (${t.name}) is Racing — checking iRacing API for subsession ${t.iRacingSubsessionId}`);

        try {
          let results;
          if (MOCK_MODE) {
            results = generateMockResults(i);
          } else {
            results = await fetchSubsessionResults(Number(t.iRacingSubsessionId));
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
//  CREATE & START APP
// ============================================================
const app = createApp({
  adminApiKey: ADMIN_API_KEY,
  tournamentContract,
  oracleWallet,
  mockMode: MOCK_MODE,
  logger,
  pollTournaments,
  provider,
  iRacingAuth,
  fetchMemberInfo,
});

app.listen(PORT, () => {
  logger.info(`Oracle backend running on port ${PORT}`);
  logger.info(`Oracle address: ${oracleWallet.address}`);
  logger.info(`Contract: ${process.env.TOURNAMENT_CONTRACT_ADDRESS}`);
  logger.info(`Mock mode: ${MOCK_MODE}`);

  // Run first poll immediately, then repeat on interval
  const interval = parseInt(process.env.POLL_INTERVAL || "30000");
  pollTournaments();
  setInterval(pollTournaments, interval);
  logger.info(`Polling every ${interval / 1000} seconds`);
});
