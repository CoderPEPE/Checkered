require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { ethers } = require("ethers");
const winston = require("winston");
require("winston-daily-rotate-file");
const { iRacingAuth, fetchSubsessionResults } = require("./iracing-api");



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

// Security headers — explicit config for readability (Milestone 7)
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true },  // Strict-Transport-Security: 1 year
  frameguard: { action: "deny" },                        // X-Frame-Options: DENY
  contentSecurityPolicy: {                               // Content-Security-Policy
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },  // Referrer-Policy
  noSniff: true,                                         // X-Content-Type-Options: nosniff
  dnsPrefetchControl: { allow: false },                  // X-DNS-Prefetch-Control: off
  permittedCrossDomainPolicies: { permittedPolicies: "none" },  // X-Permitted-Cross-Domain-Policies
}));

// CORS allowlist — only your frontend origin can call the API (Milestone 2)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];
app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST"],
}));

// Global rate limit — 60 requests per minute per IP (Milestone 2)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
}));

app.use(express.json());

// Auth middleware — timing-safe comparison prevents timing attacks (Milestone 2)
function requireApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey !== "string") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const a = Buffer.from(apiKey);
  const b = Buffer.from(ADMIN_API_KEY);

  let valid = false;
  if (a.length === b.length) {
    valid = crypto.timingSafeEqual(a, b);
  }

  if (!valid) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// Public health check — returns only safe info (Milestone 3)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get single tournament with player details
app.get("/api/tournaments/:id", async (req, res) => {
  // Validate tournament ID — reject NaN, negative, non-numeric (Milestone 3)
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    return res.status(400).json({ error: "Invalid tournament ID: must be a non-negative integer" });
  }

  try {
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
    res.status(500).json({ error: "Internal server error" });
  }
});

// Oracle status — detailed info requires API key (Milestone 3)
app.get("/api/oracle/status", requireApiKey, (_req, res) => {
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
    logger.error(`POST /api/oracle/poll error: ${err.message}`);
    res.status(500).json({ error: "Internal server error" });
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
