/**
 * Backend API tests — Milestone 9
 *
 * Tests the Express routes with mocked blockchain dependencies.
 * Covers: API key auth, tournament ID validation, error shapes,
 * health endpoint, tournament listing, and oracle status.
 */
const request = require("supertest");
const { createApp } = require("../src/app");

// ============================================================
//  MOCK HELPERS
// ============================================================
const TEST_API_KEY = "test-secret-key-12345";

// Mock tournament data matching the contract's getTournament return shape
function mockTournamentData(overrides = {}) {
  return {
    name: "Test Race",
    entryFee: { toString: () => "10000000" },
    maxPlayers: 10n,
    registeredCount: 2n,
    prizePool: { toString: () => "20000000" },
    prizeSplits: [6000n, 3000n, 1000n],
    iRacingSubsessionId: 55555n,
    status: 0n,
    creator: "0x1111111111111111111111111111111111111111",
    createdAt: 1700000000n,
    ...overrides,
  };
}

// Create a mock contract with configurable behavior
function mockContract({ tournamentCount = 1, tournaments = null, players = [], playerRegs = {} } = {}) {
  const defaultTournament = mockTournamentData();
  return {
    tournamentCount: jest.fn().mockResolvedValue(BigInt(tournamentCount)),
    getTournament: jest.fn().mockImplementation((id) => {
      if (tournaments && tournaments[Number(id)]) return Promise.resolve(tournaments[Number(id)]);
      return Promise.resolve(defaultTournament);
    }),
    getTournamentPlayers: jest.fn().mockResolvedValue(players),
    getPlayerRegistration: jest.fn().mockImplementation((_tid, addr) => {
      return Promise.resolve(playerRegs[addr] || { iRacingCustomerId: 0n, registered: false, refundClaimed: false });
    }),
  };
}

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockWallet = { address: "0xOracleAddress" };

function buildApp(contractOverrides = {}) {
  return createApp({
    adminApiKey: TEST_API_KEY,
    tournamentContract: mockContract(contractOverrides),
    oracleWallet: mockWallet,
    mockMode: true,
    logger: mockLogger,
    pollTournaments: jest.fn().mockResolvedValue(undefined),
  });
}

// ============================================================
//  TESTS
// ============================================================
describe("Backend API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Health endpoint ────────────────────────────────────────
  describe("GET /api/health", () => {
    it("should return { status: 'ok' }", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });

    it("should include security headers", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    });
  });

  // ── API key middleware ─────────────────────────────────────
  describe("API Key Auth", () => {
    it("should allow requests with valid API key", async () => {
      const app = buildApp();
      const res = await request(app)
        .get("/api/oracle/status")
        .set("X-API-Key", TEST_API_KEY);
      expect(res.status).toBe(200);
      expect(res.body.address).toBe("0xOracleAddress");
    });

    it("should reject requests with invalid API key", async () => {
      const app = buildApp();
      const res = await request(app)
        .get("/api/oracle/status")
        .set("X-API-Key", "wrong-key");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("should reject requests with missing API key", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/oracle/status");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    });

    it("should reject requests with empty string API key", async () => {
      const app = buildApp();
      const res = await request(app)
        .get("/api/oracle/status")
        .set("X-API-Key", "");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Unauthorized" });
    });
  });

  // ── Tournament ID validation ───────────────────────────────
  describe("GET /api/tournaments/:id — ID validation", () => {
    it("should accept valid non-negative integer ID", async () => {
      const app = buildApp({ players: [] });
      const res = await request(app).get("/api/tournaments/0");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(0);
    });

    it("should reject negative ID", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/tournaments/-1");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-negative integer/);
    });

    it("should reject non-numeric ID", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/tournaments/abc");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-negative integer/);
    });

    it("should reject decimal ID", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/tournaments/1.5");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/non-negative integer/);
    });
  });

  // ── Error response shape ───────────────────────────────────
  describe("Error response shape", () => {
    it("should return { error: string } on 400", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/tournaments/abc");
      expect(res.status).toBe(400);
      expect(typeof res.body.error).toBe("string");
      expect(Object.keys(res.body)).toEqual(["error"]);
    });

    it("should return { error: string } on 401", async () => {
      const app = buildApp();
      const res = await request(app).get("/api/oracle/status");
      expect(res.status).toBe(401);
      expect(typeof res.body.error).toBe("string");
      expect(Object.keys(res.body)).toEqual(["error"]);
    });

    it("should return { error: 'Internal server error' } on 500 (no internal details)", async () => {
      // Make the contract throw to trigger a 500
      const contract = mockContract();
      contract.tournamentCount.mockRejectedValue(new Error("RPC_CONNECTION_REFUSED at 10.0.0.1:8545"));
      const app = createApp({
        adminApiKey: TEST_API_KEY,
        tournamentContract: contract,
        oracleWallet: mockWallet,
        mockMode: true,
        logger: mockLogger,
        pollTournaments: jest.fn(),
      });

      const res = await request(app).get("/api/tournaments");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
      // The internal error details should NOT be in the response
      expect(JSON.stringify(res.body)).not.toContain("RPC_CONNECTION_REFUSED");
    });
  });

  // ── Tournament list ────────────────────────────────────────
  describe("GET /api/tournaments", () => {
    it("should return tournament list with correct shape", async () => {
      const app = buildApp({ tournamentCount: 1 });
      const res = await request(app).get("/api/tournaments");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      const t = res.body[0];
      expect(t).toHaveProperty("id", 0);
      expect(t).toHaveProperty("name", "Test Race");
      expect(t).toHaveProperty("entryFee", "10000000");
      expect(t).toHaveProperty("maxPlayers", 10);
      expect(t).toHaveProperty("registeredCount", 2);
      expect(t).toHaveProperty("status", 0);
      expect(t).toHaveProperty("statusName", "Created");
    });

    it("should return empty array when no tournaments", async () => {
      const app = buildApp({ tournamentCount: 0 });
      const res = await request(app).get("/api/tournaments");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  // ── Single tournament detail ───────────────────────────────
  describe("GET /api/tournaments/:id — detail", () => {
    it("should return tournament with player details", async () => {
      const playerAddr = "0x2222222222222222222222222222222222222222";
      const app = buildApp({
        players: [playerAddr],
        playerRegs: {
          [playerAddr]: { iRacingCustomerId: 100001n, registered: true, refundClaimed: false },
        },
      });

      const res = await request(app).get("/api/tournaments/0");
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Test Race");
      expect(res.body.players).toHaveLength(1);
      expect(res.body.players[0].wallet).toBe(playerAddr);
      expect(res.body.players[0].iRacingCustomerId).toBe(100001);
    });
  });

  // ── Oracle endpoints ───────────────────────────────────────
  describe("Oracle endpoints", () => {
    it("GET /api/oracle/status should return oracle info with valid key", async () => {
      const app = buildApp();
      const res = await request(app)
        .get("/api/oracle/status")
        .set("X-API-Key", TEST_API_KEY);
      expect(res.status).toBe(200);
      expect(res.body.address).toBe("0xOracleAddress");
      expect(res.body).toHaveProperty("mockMode", true);
    });

    it("POST /api/oracle/poll should trigger poll with valid key", async () => {
      const pollFn = jest.fn().mockResolvedValue(undefined);
      const app = createApp({
        adminApiKey: TEST_API_KEY,
        tournamentContract: mockContract(),
        oracleWallet: mockWallet,
        mockMode: true,
        logger: mockLogger,
        pollTournaments: pollFn,
      });

      const res = await request(app)
        .post("/api/oracle/poll")
        .set("X-API-Key", TEST_API_KEY);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "poll complete" });
      expect(pollFn).toHaveBeenCalledTimes(1);
    });

    it("POST /api/oracle/poll should return 500 on poll failure", async () => {
      const pollFn = jest.fn().mockRejectedValue(new Error("poll failed"));
      const app = createApp({
        adminApiKey: TEST_API_KEY,
        tournamentContract: mockContract(),
        oracleWallet: mockWallet,
        mockMode: true,
        logger: mockLogger,
        pollTournaments: pollFn,
      });

      const res = await request(app)
        .post("/api/oracle/poll")
        .set("X-API-Key", TEST_API_KEY);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    });
  });
});
