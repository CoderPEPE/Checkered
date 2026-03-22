// Shared TypeScript interfaces for the Checkered dashboard

export interface Tournament {
  id: number;
  name: string;
  entryFee: string; // USDC in 6-decimal units
  maxPlayers: number;
  registeredCount: number;
  prizePool: string; // USDC in 6-decimal units
  statusName: string;
  iRacingSubsessionId: number;
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
