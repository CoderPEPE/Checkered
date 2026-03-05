import { parseAbi } from "viem";

// Contract addresses deployed on Base Sepolia
export const TOURNAMENT_ADDRESS =
  "0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA" as const;
export const USDC_ADDRESS =
  "0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918" as const;

// Block explorer for transaction links
export const EXPLORER_URL = "https://sepolia.basescan.org";

// Tournament contract ABI — admin + player functions
export const TOURNAMENT_ABI = parseAbi([
  // Admin write functions
  "function createTournament(string _name, uint256 _entryFee, uint256 _maxPlayers, uint256[] _prizeSplits, uint256 _subsessionId) returns (uint256)",
  "function closeRegistration(uint256 _tournamentId)",
  "function startRace(uint256 _tournamentId)",
  "function cancelTournament(uint256 _tournamentId)",

  // Player write functions
  "function register(uint256 _tournamentId, uint256 _iRacingCustomerId)",

  // Read functions
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function tournamentCount() view returns (uint256)",
  "function getTournament(uint256 _tournamentId) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt)",

  // Events
  "event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers)",
  "event RegistrationClosed(uint256 indexed tournamentId)",
  "event RaceStarted(uint256 indexed tournamentId)",
  "event TournamentCancelled(uint256 indexed tournamentId)",
]);

// ERC-20 ABI — only the approve function needed for USDC
export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);
