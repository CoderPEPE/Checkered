/**
 * Maps raw wallet/contract error messages to user-friendly text.
 * Keeps internal revert reasons, RPC details, and stack traces
 * away from the UI. (Milestone 8)
 */

// Contract custom errors → plain-English explanations
const CONTRACT_ERRORS: Record<string, string> = {
  InvalidStatus: "This action isn't available in the tournament's current state.",
  TournamentFull: "This tournament is full — no more spots available.",
  AlreadyRegistered: "You're already registered for this tournament.",
  NotRegistered: "You're not registered for this tournament.",
  InvalidName: "Tournament name can't be empty.",
  InvalidSplits: "Prize split configuration is invalid.",
  InvalidFee: "The fee amount is invalid or exceeds the maximum.",
  InsufficientAllowance: "USDC spending approval is insufficient. Please try again.",
  DuplicateWinner: "Duplicate winner address detected.",
  InvalidAddress: "An invalid wallet address was provided.",
  NoFundsToWithdraw: "No funds available to withdraw.",
};

// Wallet / provider / network patterns → friendly messages
const WALLET_PATTERNS: [RegExp, string][] = [
  [/user rejected|user denied|rejected the request/i, "Transaction was cancelled."],
  [/insufficient funds/i, "Insufficient funds to cover gas fees."],
  [/nonce too low/i, "Transaction conflict — please try again."],
  [/network changed|chain mismatch/i, "Wrong network — please switch to Base Sepolia."],
  [/timeout|timed out/i, "Request timed out — please try again."],
  [/backend not reachable|failed to fetch|fetch failed|network error/i, "Can't reach the server — is the backend running?"],
];

export function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Check for known contract revert errors
  for (const [key, friendly] of Object.entries(CONTRACT_ERRORS)) {
    if (raw.includes(key)) return friendly;
  }

  // Check for wallet / provider patterns
  for (const [pattern, friendly] of WALLET_PATTERNS) {
    if (pattern.test(raw)) return friendly;
  }

  // Fallback — don't leak the raw message
  return "Something went wrong. Please try again.";
}
