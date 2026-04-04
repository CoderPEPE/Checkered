// Shared TypeScript interfaces for the Checkered dashboard

export interface Tournament {
  id: number;
  name: string;
  entryFee: string; // token amount in raw units
  maxPlayers: number;
  registeredCount: number;
  prizePool: string; // token amount in raw units
  statusName: string;
  iRacingSubsessionId: number;
  paymentToken: string; // address of the ERC-20 used (USDC or CHEX)
  tokenSymbol: "USDC" | "CHEX"; // derived from paymentToken address
  tokenDecimals: number; // 6 for USDC, 18 for CHEX
}

export interface Player {
  wallet: string;
  iRacingCustomerId: number;
  refundClaimed?: boolean;
}

export interface Winner {
  wallet: string;
  amount: string; // USDC in 6-decimal units
  position: number;
}

export interface TournamentDetail extends Tournament {
  prizeSplits: number[];
  creator: string;
  createdAt: number;
  players: Player[];
  winners?: Winner[];
}

export interface OracleData {
  address: string;
  contract: string;
  mockMode: boolean;
  pollInterval: number;
}
