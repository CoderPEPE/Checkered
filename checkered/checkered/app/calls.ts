import { encodeFunctionData, type Hex } from "viem";
import {
  TOURNAMENT_ADDRESS,
  USDC_ADDRESS,
  TOURNAMENT_ABI,
  ERC20_ABI,
} from "./contracts";

/**
 * Builds the two calls needed to register for a tournament:
 *   1. USDC.approve(tournamentContract, entryFee)
 *   2. Tournament.register(tournamentId, iRacingCustomerId)
 *
 * The OnchainKit Transaction component will batch these via EIP-5792
 * if the wallet supports it (e.g. Coinbase Smart Wallet), or execute
 * them sequentially otherwise.
 */
// Call type matching what OnchainKit Transaction expects
type Call = { to: Hex; data?: Hex; value?: bigint };

export function buildRegisterCalls(
  tournamentId: number,
  iRacingCustomerId: number,
  entryFee: bigint,
): Call[] {
  return [
    // Step 1: Approve the tournament contract to spend the entry fee in USDC
    {
      to: USDC_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TOURNAMENT_ADDRESS, entryFee],
      }),
    },
    // Step 2: Register for the tournament (contract pulls the USDC)
    {
      to: TOURNAMENT_ADDRESS,
      data: encodeFunctionData({
        abi: TOURNAMENT_ABI,
        functionName: "register",
        args: [BigInt(tournamentId), BigInt(iRacingCustomerId)],
      }),
    },
  ];
}
