/**
 * Frontend tests for buildRegisterCalls (Milestone 10)
 *
 * Verifies that the registration call builder produces correct
 * ABI-encoded calldata targeting the right contract addresses.
 */
import { describe, it, expect } from "vitest";
import { decodeFunctionData } from "viem";
import { buildRegisterCalls } from "../calls";
import { TOURNAMENT_ADDRESS, USDC_ADDRESS, CHEX_ADDRESS, ERC20_ABI, TOURNAMENT_ABI } from "../contracts";

describe("buildRegisterCalls", () => {
  const tournamentId = 1;
  const iRacingId = 100001;
  const entryFee = 10_000_000n; // 10 USDC

  it("should return exactly 2 calls (approve + register)", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee, USDC_ADDRESS);
    expect(calls).toHaveLength(2);
  });

  it("first call should target USDC contract when paying with USDC", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee, USDC_ADDRESS);
    expect(calls[0].to).toBe(USDC_ADDRESS);
  });

  it("first call should target CHEX contract when paying with CHEX", () => {
    const chexFee = 10_000_000_000_000_000_000n; // 10 CHEX (18 decimals)
    const calls = buildRegisterCalls(tournamentId, iRacingId, chexFee, CHEX_ADDRESS);
    expect(calls[0].to).toBe(CHEX_ADDRESS);
  });

  it("second call should target Tournament contract (register)", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee, USDC_ADDRESS);
    expect(calls[1].to).toBe(TOURNAMENT_ADDRESS);
  });

  it("approve call should encode correct spender and amount", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee, USDC_ADDRESS);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.functionName).toBe("approve");
    expect(decoded.args[0]).toBe(TOURNAMENT_ADDRESS); // spender
    expect(decoded.args[1]).toBe(entryFee); // amount
  });

  it("register call should encode correct tournamentId and iRacingId", () => {
    const calls = buildRegisterCalls(tournamentId, iRacingId, entryFee, USDC_ADDRESS);
    const decoded = decodeFunctionData({
      abi: TOURNAMENT_ABI,
      data: calls[1].data!,
    });
    expect(decoded.functionName).toBe("register");
    expect(decoded.args[0]).toBe(BigInt(tournamentId));
    expect(decoded.args[1]).toBe(BigInt(iRacingId));
  });

  it("should handle zero entry fee", () => {
    const calls = buildRegisterCalls(0, 999, 0n, USDC_ADDRESS);
    expect(calls).toHaveLength(2);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.args[1]).toBe(0n);
  });

  it("should handle large entry fee", () => {
    const largeFee = 1_000_000_000_000n; // 1M USDC
    const calls = buildRegisterCalls(99, 123456, largeFee, USDC_ADDRESS);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.args[1]).toBe(largeFee);
  });

  it("should handle large CHEX entry fee (18 decimals)", () => {
    const largeFee = 1_000_000_000_000_000_000_000_000n; // 1M CHEX
    const calls = buildRegisterCalls(99, 123456, largeFee, CHEX_ADDRESS);
    const decoded = decodeFunctionData({
      abi: ERC20_ABI,
      data: calls[0].data!,
    });
    expect(decoded.args[0]).toBe(TOURNAMENT_ADDRESS);
    expect(decoded.args[1]).toBe(largeFee);
    expect(calls[0].to).toBe(CHEX_ADDRESS);
  });
});
