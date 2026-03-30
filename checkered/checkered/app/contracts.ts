import { parseAbi } from "viem";

// Contract addresses deployed on Base Sepolia
export const TOURNAMENT_ADDRESS =
  "0x44cB744685c5591ac19E3b04d10569F735e5E263" as const;
export const USDC_ADDRESS =
  "0x77905c2eDa81D18449015d979D670c29948A31F8" as const;

// Block explorer for transaction links
export const EXPLORER_URL = "https://sepolia.basescan.org";

// Tournament contract ABI — admin + player functions
export const TOURNAMENT_ABI = parseAbi([
  // Admin write functions
  "function createTournament(string _name, uint256 _entryFee, uint256 _maxPlayers, uint256[] _prizeSplits, uint256 _subsessionId, uint256 _leagueId, uint256 _seasonId) returns (uint256)",
  "function closeRegistration(uint256 _tournamentId)",
  "function startRace(uint256 _tournamentId)",
  "function cancelTournament(uint256 _tournamentId)",

  // Player write functions
  "function register(uint256 _tournamentId, uint256 _iRacingCustomerId)",
  "function claimRefund(uint256 _tournamentId)",

  // Read functions
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function tournamentCount() view returns (uint256)",
  "function getTournament(uint256 _tournamentId) view returns (string name, uint256 entryFee, uint256 maxPlayers, uint256 registeredCount, uint256 prizePool, uint256[] prizeSplits, uint256 iRacingSubsessionId, uint8 status, address creator, uint256 createdAt, uint256 iRacingLeagueId, uint256 iRacingSeasonId)",
  "function getPlayerRegistration(uint256 _tournamentId, address _player) view returns (uint256 iRacingCustomerId, bool registered, bool refundClaimed)",

  // Events
  "event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers)",
  "event RegistrationClosed(uint256 indexed tournamentId)",
  "event RaceStarted(uint256 indexed tournamentId)",
  "event TournamentCancelled(uint256 indexed tournamentId)",
  "event PrizesDistributed(uint256 indexed tournamentId, address[] winners, uint256[] amounts)",
  "event RefundClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount)",
]);

// ERC-20 ABI — approve + balanceOf for USDC
export const ERC20_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
]);
