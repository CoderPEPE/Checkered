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
 * @param {object} deps.provider - ethers Provider for event queries
 * @param {function} deps.iRacingAuth - iRacing OAuth auth function (optional)
 * @param {function} deps.fetchMemberInfo - iRacing member info function (optional)
 */
function createApp({ adminApiKey, tournamentContract, oracleWallet, mockMode, logger, pollTournaments, pollLeagueTournaments, provider, iRacingAuth, fetchMemberInfo }) {
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

  // Trust proxy for accurate IP detection behind reverse proxies
  app.set("trust proxy", 1);

  // Global rate limit — 60 requests per minute per IP (Milestone 2)
  app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  }));

  app.use(express.json());

  // Auth middleware — constant-time comparison regardless of input length (Milestone 2)
  function requireApiKey(req, res, next) {
    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Hash both sides to fixed-length digests so timing doesn't leak key length
    const expected = crypto.createHmac("sha256", "checkered-auth").update(adminApiKey).digest();
    const actual = crypto.createHmac("sha256", "checkered-auth").update(apiKey).digest();
    const valid = crypto.timingSafeEqual(actual, expected);

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
        const [t, extra] = await Promise.all([
          tournamentContract.getTournament(i),
          tournamentContract.getTournamentExtra(i),
        ]);
        // Determine token symbol from payment token address
        const usdcAddr = await tournamentContract.usdc();
        const isChex = extra.paymentToken.toLowerCase() !== usdcAddr.toLowerCase();
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
          iRacingLeagueId: Number(extra.iRacingLeagueId || 0),
          iRacingSeasonId: Number(extra.iRacingSeasonId || 0),
          createdAt: Number(t.createdAt),
          paymentToken: extra.paymentToken,
          tokenSymbol: isChex ? "CHEX" : "USDC",
          tokenDecimals: isChex ? 18 : 6,
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
      const [t, extra, players] = await Promise.all([
        tournamentContract.getTournament(id),
        tournamentContract.getTournamentExtra(id),
        tournamentContract.getTournamentPlayers(id),
      ]);

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

      // Determine token symbol from payment token address
      const usdcAddr = await tournamentContract.usdc();
      const isChex = extra.paymentToken.toLowerCase() !== usdcAddr.toLowerCase();

      const statusNum = Number(t.status);
      const response = {
        id,
        name: t.name,
        entryFee: t.entryFee.toString(),
        maxPlayers: Number(t.maxPlayers),
        registeredCount: Number(t.registeredCount),
        prizePool: t.prizePool.toString(),
        prizeSplits: t.prizeSplits.map(Number),
        status: statusNum,
        statusName: ["Created", "RegistrationClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"][statusNum],
        iRacingSubsessionId: Number(t.iRacingSubsessionId),
        iRacingLeagueId: Number(extra.iRacingLeagueId || 0),
        iRacingSeasonId: Number(extra.iRacingSeasonId || 0),
        createdAt: Number(t.createdAt),
        paymentToken: extra.paymentToken,
        tokenSymbol: isChex ? "CHEX" : "USDC",
        tokenDecimals: isChex ? 18 : 6,
        players: playerDetails,
      };

      // For completed tournaments, fetch winners from PrizesDistributed events
      if (statusNum === 4 && provider) {
        try {
          const filter = tournamentContract.filters.PrizesDistributed(id);
          const events = await tournamentContract.queryFilter(filter);
          if (events.length > 0) {
            const event = events[events.length - 1]; // most recent
            const winners = event.args.winners;
            const amounts = event.args.amounts;
            response.winners = winners.map((addr, i) => ({
              wallet: addr,
              amount: amounts[i].toString(),
              position: i + 1,
            }));
          }
        } catch (evtErr) {
          logger.warn(`Could not fetch winners for tournament ${id}: ${evtErr.message}`);
        }
      }

      res.json(response);
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
      pollInterval: parseInt(process.env.POLL_INTERVAL || "30000"),
      uptime: process.uptime(),
    });
  });

  // Manual oracle poll trigger — protected
  app.post("/api/oracle/poll", requireApiKey, async (_req, res) => {
    try {
      await pollTournaments();
      res.json({ status: "poll complete" });
    } catch (err) {
      logger.error(`POST /api/oracle/poll error: ${err.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Manual trigger: sync iRacing league sessions → create missing tournaments — protected
  app.post("/api/admin/sync-league", requireApiKey, async (_req, res) => {
    if (mockMode) {
      return res.json({ status: "skipped", reason: "mock mode enabled" });
    }
    if (!pollLeagueTournaments) {
      return res.status(501).json({ error: "Auto-create not configured" });
    }
    try {
      await pollLeagueTournaments();
      res.json({ status: "sync complete" });
    } catch (err) {
      logger.error(`POST /api/admin/sync-league error: ${err.message}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // iRacing API status — verifies OAuth connection is working
  app.get("/api/iracing/status", requireApiKey, async (_req, res) => {
    try {
      if (mockMode) {
        return res.json({ connected: true, mockMode: true, member: null });
      }

      if (!iRacingAuth || !fetchMemberInfo) {
        return res.json({ connected: false, error: "iRacing functions not configured" });
      }

      // Test OAuth token
      await iRacingAuth();

      // Get member info to confirm API access
      const member = await fetchMemberInfo();
      res.json({
        connected: true,
        mockMode: false,
        member: member ? {
          custId: member.cust_id,
          displayName: member.display_name,
          memberSince: member.member_since,
        } : null,
      });
    } catch (err) {
      logger.error(`GET /api/iracing/status error: ${err.message}`);
      res.json({ connected: false, error: err.message });
    }
  });

  return app;
}

module.exports = { createApp };
