/**
 * Frontend tests for contract config (Milestone 10)
 *
 * Verifies ABI structure, addresses are valid hex, and
 * expected functions are present for the app to work.
 */
import { describe, it, expect } from "vitest";
import {
  TOURNAMENT_ADDRESS,
  USDC_ADDRESS,
  CHEX_ADDRESS,
  EXPLORER_URL,
  TOURNAMENT_ABI,
  ERC20_ABI,
} from "../contracts";

describe("contracts config", () => {
  // ── Addresses ─────────────────────────────────────────────
  describe("addresses", () => {
    it("TOURNAMENT_ADDRESS should be a valid hex address", () => {
      expect(TOURNAMENT_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("USDC_ADDRESS should be a valid hex address", () => {
      expect(USDC_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("CHEX_ADDRESS should be a valid hex address", () => {
      expect(CHEX_ADDRESS).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });

    it("EXPLORER_URL should be a Base Sepolia URL", () => {
      expect(EXPLORER_URL).toContain("sepolia.basescan.org");
    });

    it("addresses should not be zero address", () => {
      expect(TOURNAMENT_ADDRESS).not.toBe("0x0000000000000000000000000000000000000000");
      expect(USDC_ADDRESS).not.toBe("0x0000000000000000000000000000000000000000");
      expect(CHEX_ADDRESS).not.toBe("0x0000000000000000000000000000000000000000");
    });
  });

  // ── ABI structure ─────────────────────────────────────────
  describe("Tournament ABI", () => {
    // Helper to check if ABI contains a function by name
    function hasFunction(abi: readonly unknown[], name: string): boolean {
      return abi.some(
        (item: any) => item.type === "function" && item.name === name
      );
    }

    function hasEvent(abi: readonly unknown[], name: string): boolean {
      return abi.some(
        (item: any) => item.type === "event" && item.name === name
      );
    }

    it("should include createTournament", () => {
      expect(hasFunction(TOURNAMENT_ABI, "createTournament")).toBe(true);
    });

    it("should include register", () => {
      expect(hasFunction(TOURNAMENT_ABI, "register")).toBe(true);
    });

    it("should include closeRegistration", () => {
      expect(hasFunction(TOURNAMENT_ABI, "closeRegistration")).toBe(true);
    });

    it("should include startRace", () => {
      expect(hasFunction(TOURNAMENT_ABI, "startRace")).toBe(true);
    });

    it("should include cancelTournament", () => {
      expect(hasFunction(TOURNAMENT_ABI, "cancelTournament")).toBe(true);
    });

    it("should include hasRole (for admin check)", () => {
      expect(hasFunction(TOURNAMENT_ABI, "hasRole")).toBe(true);
    });

    it("should include ADMIN_ROLE (for admin check)", () => {
      expect(hasFunction(TOURNAMENT_ABI, "ADMIN_ROLE")).toBe(true);
    });

    it("should include getTournament", () => {
      expect(hasFunction(TOURNAMENT_ABI, "getTournament")).toBe(true);
    });

    it("should include getTournamentExtra", () => {
      expect(hasFunction(TOURNAMENT_ABI, "getTournamentExtra")).toBe(true);
    });

    it("should include usdc and chex getters", () => {
      expect(hasFunction(TOURNAMENT_ABI, "usdc")).toBe(true);
      expect(hasFunction(TOURNAMENT_ABI, "chex")).toBe(true);
    });

    it("should include TournamentCreated event", () => {
      expect(hasEvent(TOURNAMENT_ABI, "TournamentCreated")).toBe(true);
    });
  });

  // ── ERC20 ABI ─────────────────────────────────────────────
  describe("ERC20 ABI", () => {
    it("should include approve function", () => {
      const hasApprove = ERC20_ABI.some(
        (item: any) => item.type === "function" && item.name === "approve"
      );
      expect(hasApprove).toBe(true);
    });

    it("should include decimals function", () => {
      const hasDecimals = ERC20_ABI.some(
        (item: any) => item.type === "function" && item.name === "decimals"
      );
      expect(hasDecimals).toBe(true);
    });
  });
});
