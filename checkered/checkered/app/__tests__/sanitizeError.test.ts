/**
 * Frontend tests for sanitizeError utility (Milestone 10)
 *
 * Verifies that raw wallet/contract errors are mapped to
 * user-friendly messages and internal details never leak.
 */
import { describe, it, expect } from "vitest";
import { sanitizeError } from "../utils/sanitizeError";

describe("sanitizeError", () => {
  // ── Contract custom errors ────────────────────────────────
  describe("contract errors", () => {
    it("should map InvalidStatus to friendly message", () => {
      const err = new Error("reverted with custom error InvalidStatus(1, 0)");
      expect(sanitizeError(err)).toBe(
        "This action isn't available in the tournament's current state."
      );
    });

    it("should map TournamentFull", () => {
      expect(sanitizeError(new Error("TournamentFull()"))).toBe(
        "This tournament is full — no more spots available."
      );
    });

    it("should map AlreadyRegistered", () => {
      expect(sanitizeError(new Error("AlreadyRegistered()"))).toBe(
        "You're already registered for this tournament."
      );
    });

    it("should map NotRegistered", () => {
      expect(sanitizeError(new Error("NotRegistered()"))).toBe(
        "You're not registered for this tournament."
      );
    });

    it("should map InvalidName", () => {
      expect(sanitizeError(new Error("InvalidName()"))).toBe(
        "Tournament name can't be empty."
      );
    });

    it("should map InvalidSplits", () => {
      expect(sanitizeError(new Error("InvalidSplits()"))).toBe(
        "Prize split configuration is invalid."
      );
    });

    it("should map InvalidFee", () => {
      expect(sanitizeError(new Error("InvalidFee()"))).toBe(
        "The fee amount is invalid or exceeds the maximum."
      );
    });

    it("should map InsufficientAllowance", () => {
      expect(sanitizeError(new Error("InsufficientAllowance()"))).toBe(
        "USDC spending approval is insufficient. Please try again."
      );
    });

    it("should map DuplicateWinner", () => {
      expect(sanitizeError(new Error("DuplicateWinner()"))).toBe(
        "Duplicate winner address detected."
      );
    });

    it("should map InvalidAddress", () => {
      expect(sanitizeError(new Error("InvalidAddress()"))).toBe(
        "An invalid wallet address was provided."
      );
    });

    it("should map NoFundsToWithdraw", () => {
      expect(sanitizeError(new Error("NoFundsToWithdraw()"))).toBe(
        "No funds available to withdraw."
      );
    });
  });

  // ── Wallet / provider errors ──────────────────────────────
  describe("wallet errors", () => {
    it("should handle user rejected request", () => {
      expect(sanitizeError(new Error("User rejected the request"))).toBe(
        "Transaction was cancelled."
      );
    });

    it("should handle user denied transaction", () => {
      expect(sanitizeError(new Error("User denied transaction signature"))).toBe(
        "Transaction was cancelled."
      );
    });

    it("should handle insufficient funds", () => {
      expect(sanitizeError(new Error("insufficient funds for gas"))).toBe(
        "Insufficient funds to cover gas fees."
      );
    });

    it("should handle nonce too low", () => {
      expect(sanitizeError(new Error("nonce too low"))).toBe(
        "Transaction conflict — please try again."
      );
    });

    it("should handle network changed", () => {
      expect(sanitizeError(new Error("chain mismatch"))).toBe(
        "Wrong network — please switch to Base Sepolia."
      );
    });

    it("should handle timeout", () => {
      expect(sanitizeError(new Error("request timed out"))).toBe(
        "Request timed out — please try again."
      );
    });

    it("should handle fetch failures", () => {
      expect(sanitizeError(new Error("Failed to fetch"))).toBe(
        "Can't reach the server — is the backend running?"
      );
    });

    it("should handle backend not reachable", () => {
      expect(sanitizeError(new Error("Backend not reachable — is it running on port 3001?"))).toBe(
        "Can't reach the server — is the backend running?"
      );
    });
  });

  // ── Fallback / safety ─────────────────────────────────────
  describe("fallback behavior", () => {
    it("should return generic message for unknown errors", () => {
      expect(sanitizeError(new Error("0x1234abcd unexpected revert at block 12345"))).toBe(
        "Something went wrong. Please try again."
      );
    });

    it("should handle non-Error input (string)", () => {
      expect(sanitizeError("some string error")).toBe(
        "Something went wrong. Please try again."
      );
    });

    it("should handle null/undefined", () => {
      expect(sanitizeError(null)).toBe("Something went wrong. Please try again.");
      expect(sanitizeError(undefined)).toBe("Something went wrong. Please try again.");
    });

    it("should never expose RPC URLs or stack traces", () => {
      const nastyError = new Error(
        "call revert exception; Transaction reverted: function selector was not recognized at 0x8a5fB... (url=https://rpc.internal.example.com:8545)"
      );
      const result = sanitizeError(nastyError);
      expect(result).not.toContain("rpc");
      expect(result).not.toContain("0x8a5fB");
      expect(result).not.toContain("8545");
    });
  });
});
