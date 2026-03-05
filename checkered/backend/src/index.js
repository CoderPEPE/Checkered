require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const winston = require("winston");
const { iRacingAuth, fetchSubsessionResults } = require("./iracing-api");

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
    new winston.transports.File({ filename: "oracle.log" }),
  ],
});

// ============================================================
//  CONFIG
// ============================================================
const PORT = process.env.PORT || 3001;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "dev-api-key";
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
// Maps iRacing customer IDs to wallet addresses (populated from on-chain registrations)
const walletMap = new Map();

// Track active tournaments being monitored
const activeTournaments = new Map();

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
      }
    }
  } catch (err) {
    logger.error(`Poll cycle error: ${err.message}`);
  }
}

async function submitResults(tournamentId, raceResults, tournamentData) {
  try {
    // Get registered players and build wallet map
    const players = await tournamentContract.getTournamentPlayers(tournamentId);
    const playerMap = new Map();

    for (const playerAddr of players) {
      const reg = await tournamentContract.getPlayerRegistration(tournamentId, playerAddr);
      playerMap.set(Number(reg.iRacingCustomerId), playerAddr);
    }

    // Map top finishers (by position) to wallet addresses
    const prizeSplitCount = tournamentData.prizeSplits.length;
    const sortedResults = raceResults
      .filter((r) => playerMap.has(r.custId))
      .sort((a, b) => a.finishPosition - b.finishPosition);

    if (sortedResults.length < prizeSplitCount) {
      logger.warn(`Tournament ${tournamentId}: Only ${sortedResults.length} finishers, need ${prizeSplitCount}`);
      return;
    }

    const winners = sortedResults
      .slice(0, prizeSplitCount)
      .map((r) => playerMap.get(r.custId));

    // Create result hash for on-chain verification
    const resultData = JSON.stringify(raceResults.slice(0, prizeSplitCount));
    const resultHash = ethers.keccak256(ethers.toUtf8Bytes(resultData));

    logger.info(`Tournament ${tournamentId}: Submitting results — Winners: ${winners.join(", ")}`);

    // Submit on-chain
    const tx = await tournamentContract.submitResultsAndDistribute(
      tournamentId,
      winners,
      resultHash
    );
    const receipt = await tx.wait();

    logger.info(`Tournament ${tournamentId}: Results submitted! TX: ${receipt.hash}`);
    logger.info(`Gas used: ${receipt.gasUsed.toString()}`);
  } catch (err) {
    logger.error(`Submit results error for tournament ${tournamentId}: ${err.message}`);
  }
}

function generateMockResults(tournamentId) {
  // For testing: generate fake race results
  return [
    { custId: 100001, finishPosition: 1, displayName: "Test Driver 1" },
    { custId: 100002, finishPosition: 2, displayName: "Test Driver 2" },
    { custId: 100003, finishPosition: 3, displayName: "Test Driver 3" },
  ];
}

// ============================================================
//  EXPRESS API
// ============================================================
const app = express();
app.use(cors());
app.use(express.json());

// Auth middleware for admin endpoints
function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    oracle: oracleWallet.address,
    contract: process.env.TOURNAMENT_CONTRACT_ADDRESS,
    mockMode: MOCK_MODE,
    uptime: process.uptime(),
  });
});

// Get all tournaments
app.get("/api/tournaments", async (req, res) => {
  try {
    const count = await tournamentContract.tournamentCount();
    const tournaments = [];

    for (let i = 0; i < count; i++) {
      const t = await tournamentContract.getTournament(i);
      tournaments.push({
        id: i,
        name: t.name,
        entryFee: t.entryFee.toString(),
        maxPlayers: Number(t.maxPlayers),
        registeredCount: Number(t.registeredCount),
        prizePool: t.prizePool.toString(),
        status: Number(t.status),
        statusName: ["Created", "RegistrationClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"][Number(t.status)],
        iRacingSubsessionId: Number(t.iRacingSubsessionId),
        createdAt: Number(t.createdAt),
      });
    }

    res.json(tournaments);
  } catch (err) {
    logger.error(`GET /api/tournaments error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get single tournament with player details
app.get("/api/tournaments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const t = await tournamentContract.getTournament(id);
    const players = await tournamentContract.getTournamentPlayers(id);

    const playerDetails = await Promise.all(
      players.map(async (addr) => {
        const reg = await tournamentContract.getPlayerRegistration(id, addr);
        return {
          wallet: addr,
          iRacingCustomerId: Number(reg.iRacingCustomerId),
          refundClaimed: reg.refundClaimed,
        };
      })
    );

    res.json({
      id,
      name: t.name,
      entryFee: t.entryFee.toString(),
      maxPlayers: Number(t.maxPlayers),
      registeredCount: Number(t.registeredCount),
      prizePool: t.prizePool.toString(),
      prizeSplits: t.prizeSplits.map(Number),
      status: Number(t.status),
      statusName: ["Created", "RegistrationClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"][Number(t.status)],
      iRacingSubsessionId: Number(t.iRacingSubsessionId),
      createdAt: Number(t.createdAt),
      players: playerDetails,
    });
  } catch (err) {
    logger.error(`GET /api/tournaments/${req.params.id} error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Oracle status
app.get("/api/oracle/status", (req, res) => {
  res.json({
    address: oracleWallet.address,
    contract: process.env.TOURNAMENT_CONTRACT_ADDRESS,
    mockMode: MOCK_MODE,
    pollInterval: process.env.POLL_INTERVAL || 30000,
    uptime: process.uptime(),
  });
});

// Manual trigger for testing
app.post("/api/oracle/poll", requireApiKey, async (req, res) => {
  try {
    await pollTournaments();
    res.json({ status: "poll complete" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  START
// ============================================================
app.listen(PORT, () => {
  logger.info(`Oracle backend running on port ${PORT}`);
  logger.info(`Oracle address: ${oracleWallet.address}`);
  logger.info(`Contract: ${process.env.TOURNAMENT_CONTRACT_ADDRESS}`);
  logger.info(`Mock mode: ${MOCK_MODE}`);

  // Start polling
  const interval = parseInt(process.env.POLL_INTERVAL || "30000");
  setInterval(pollTournaments, interval);
  logger.info(`Polling every ${interval / 1000} seconds`);
});
