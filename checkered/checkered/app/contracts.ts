import { parseAbi } from "viem";

// Contract addresses deployed on Base Sepolia
export const TOURNAMENT_ADDRESS =
  "0xF1Faad5d69c0a73C605b4c4d6b3701B1aA9e2695" as const;
export const USDC_ADDRESS =
  "0x88039a579A1a92EB09EA6a95F163251e0F4ec021" as const;
export const CHEX_ADDRESS =
  "0x475fa1c8934F40Ad55804CD998C422e8b624F35c" as const;

// Block explorer for transaction links
export const EXPLORER_URL = "https://sepolia.basescan.org";

// Tournament contract ABI — admin + player functions
export const TOURNAMENT_ABI = parseAbi([
  // Admin write functions (now includes _useChex bool)
  "function createTournament(string _name, uint256 _entryFee, uint256 _maxPlayers, uint256[] _prizeSplits, uint256 _subsessionId, uint256 _leagueId, uint256 _seasonId, bool _useChex) returns (uint256)",
  "function closeRegistration(uint256 _tournamentId)",
  "function startRace(uint256 _tournamentId)",
  "function cancelTournament(uint256 _tournamentId)",

  // Player write functions
  "function register(uint256 _tournamentId, uint256 _iRacingCustomerId)",
  "function claimRefund(uint256 _tournamentId)",

  // Read functions
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function usdc() view returns (address)",
  "function chex() view returns (address)",
  "function tournamentCount() view returns (uint256)",
  "function getTournament(uint256 _tournamentId) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt)",
  "function getTournamentExtra(uint256 _tournamentId) view returns (uint256 iRacingLeagueId, uint256 iRacingSeasonId, address paymentToken)",
  "function getPlayerRegistration(uint256 _tournamentId, address _player) view returns (uint256 iRacingCustomerId, bool registered, bool refundClaimed)",

  // Events
  "event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers)",
  "event RegistrationClosed(uint256 indexed tournamentId)",
  "event RaceStarted(uint256 indexed tournamentId)",
  "event TournamentCancelled(uint256 indexed tournamentId)",
  "event PrizesDistributed(uint256 indexed tournamentId, address[] winners, uint256[] amounts)",
  "event RefundClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount)",
]);

// ERC-20 ABI — approve + balanceOf for USDC and CHEX
export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
