/**
 * Express app factory — separated from index.js for testability (Milestone 9).
 * Accepts dependencies so tests can inject mocks.
 */
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

/**
 * Creates the Express app with all middleware and routes.
 * @param {object} deps - Injected dependencies
 * @param {string} deps.adminApiKey - API key for protected endpoints
 * @param {object} deps.tournamentContract - ethers Contract instance (or mock)
 * @param {object} deps.oracleWallet - ethers Wallet (or mock with .address)
 * @param {boolean} deps.mockMode - Whether iRacing is in mock mode
 * @param {object} deps.logger - Winston logger (or mock)
 * @param {function} deps.pollTournaments - Poll function for manual trigger
 */
function createApp({ adminApiKey, tournamentContract, oracleWallet, mockMode, logger, pollTournaments }) {
  const app = express();

  // Security headers — explicit config for readability (Milestone 7)
  app.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true },
    frameguard: { action: "deny" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    dnsPrefetchControl: { allow: false },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  }));

  // CORS allowlist (Milestone 2)
  const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];
  app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] }));

  // Global rate limit — 60 requests per minute per IP (Milestone 2)
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  }));

  app.use(express.json());

  // Auth middleware — timing-safe comparison (Milestone 2)
  function requireApiKey(req, res, next) {
    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const a = Buffer.from(apiKey);
    const b = Buffer.from(adminApiKey);

    let valid = false;
    if (a.length === b.length) {
      valid = crypto.timingSafeEqual(a, b);
    }

    if (!valid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    next();
  }

  // Public health check (Milestone 3)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Get all tournaments
  app.get("/api/tournaments", async (_req, res) => {
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

  // Oracle status — protected (Milestone 3)
  app.get("/api/oracle/status", requireApiKey, (_req, res) => {
    res.json({
      address: oracleWallet.address,
      contract: process.env.TOURNAMENT_CONTRACT_ADDRESS,
      mockMode,
      pollInterval: process.env.POLL_INTERVAL || 30000,
      uptime: process.uptime(),
    });
  });

  // Manual poll trigger — protected
  app.post("/api/oracle/poll", requireApiKey, async (_req, res) => {
    try {
      await pollTournaments();
      res.json({ status: "poll complete" });
    } catch (err) {
      logger.error(`POST /api/oracle/poll error: ${err.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return app;
}

module.exports = { createApp };
