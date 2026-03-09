/**
 * Frontend tests for buildRegisterCalls (Milestone 10)
 *
 * Verifies that the registration call builder produces correct
 * ABI-encoded calldata targeting the right contract addresses.
 */
import { describe, it, expect } from "vitest";
import { decodeFunctionData } from "viem";
import { buildRegisterCalls } from "../calls";
import { TOURNAMENT_ADDRESS, USDC_ADDRESS, ERC20_ABI, TOURNAMENT_ABI } from "../contracts";

describe("buildRegisterCalls", () => {
  const tournamentId = 1;
  const iRacingId = 100001;
  const entryFee = 10_000_000n; // 10 USDC

  it("should return exactly 2 calls (approve + register)", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee);
    expect(calls).toHaveLength(2);
  });

  it("first call should target USDC contract (approve)", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee);
    expect(calls[0].to).toBe(USDC_ADDRESS);
  });

  it("second call should target Tournament contract (register)", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee);
    expect(calls[1].to).toBe(TOURNAMENT_ADDRESS);
  });

  it("approve call should encode correct spender and amount", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args[0]).toBe(TOURNAMENT_ADDRESS); // spender
    expect(decoded.args[1]).toBe(entryFee); // amount
  });

  it("register call should encode correct tournamentId and iRacingId", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee);
    const decoded = decodeFunctionData({
      abi: TOURNAMENT_ABI,
      data: calls[1].data!,
    });
    expect(decoded.functionName).toBe("register");
    expect(decoded.args[0]).toBe(BigInt(tournamentId));
    expect(decoded.args[1]).toBe(BigInt(iRacingId));
  });

  it("should handle zero entry fee", () => {
    const calls = buildRegisterCalls(0, 999, 0n);
    expect(calls).toHaveLength(2);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.args[1]).toBe(0n);
  });

  it("should handle large entry fee", () => {
    const largeFee = 1_000_000_000_000n; // 1M USDC
    const calls = buildRegisterCalls(99, 123456, largeFee);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.args[1]).toBe(largeFee);
  });
});
