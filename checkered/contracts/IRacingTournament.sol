// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title IRacingTournament
 * @notice Manages iRacing tournaments with USDC escrow and automated prize distribution on Base
 * @dev Uses AccessControl for role management, ReentrancyGuard for security, Pausable for emergency stops
 */
contract IRacingTournament is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================================
    //  ROLES
    // ============================================================
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    // ============================================================
    //  ENUMS & STRUCTS
    // ============================================================
    enum TournamentStatus {
        Created,
        RegistrationClosed,
        Racing,
        ResultsSubmitted,
        Completed,
        Cancelled
    }

    struct Tournament {
        string name;
        uint256 entryFee;          // USDC amount (6 decimals)
        uint256 maxPlayers;
        uint256 registeredCount;
        uint256 prizePool;
        uint256[] prizeSplits;     // basis points (e.g., [6000, 3000, 1000] = 60/30/10)
        uint256 iRacingSubsessionId;
        uint256 iRacingLeagueId;   // 0 = manual subsession, >0 = auto-discover from league
        uint256 iRacingSeasonId;   // league season ID for race discovery
        TournamentStatus status;
        address creator;
        uint256 createdAt;
        bytes32 resultHash;
    }

    struct PlayerRegistration {
        address wallet;
        uint256 iRacingCustomerId;
        bool registered;
        bool refundClaimed;
    }

    // ============================================================
    //  STATE
    // ============================================================
    IERC20 public immutable usdc;
    address public treasury;
    uint256 public platformFeeBps;     // basis points (500 = 5%)
    uint256 public constant MAX_FEE_BPS = 2000; // 20% cap
    uint256 public constant EMERGENCY_DELAY = 30 days;
    uint256 public tournamentCount;

    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(address => PlayerRegistration)) public registrations;
    mapping(uint256 => address[]) public tournamentPlayers;
    mapping(uint256 => uint256) public emergencyWithdrawRequests; // tournamentId → request timestamp

    // ============================================================
    //  EVENTS
    // ============================================================
    event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxPlayers);
    event PlayerRegistered(uint256 indexed tournamentId, address indexed player, uint256 iRacingCustomerId);
    event RegistrationClosed(uint256 indexed tournamentId);
    event RaceStarted(uint256 indexed tournamentId);
    event ResultsSubmitted(uint256 indexed tournamentId, bytes32 resultHash);
    event PrizesDistributed(uint256 indexed tournamentId, address[] winners, uint256[] amounts);
    event TournamentCancelled(uint256 indexed tournamentId);
    event RefundClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event EmergencyWithdrawRequested(uint256 indexed tournamentId, uint256 executeAfter);
    event EmergencyWithdrawExecuted(uint256 indexed tournamentId, uint256 amount);
    event SubsessionIdUpdated(uint256 indexed tournamentId, uint256 subsessionId);

    // ============================================================
    //  ERRORS
    // ============================================================
    error InvalidAddress();
    error InvalidFee();
    error InvalidSplits();
    error TournamentNotFound();
    error InvalidStatus(TournamentStatus expected, TournamentStatus actual);
    error CannotCancelTerminalTournament();
    error TournamentFull();
    error AlreadyRegistered();
    error NotRegistered();
    error RefundAlreadyClaimed();
    error InsufficientAllowance();
    error InvalidName();
    error InvalidIRacingId();
    error DuplicateWinner();
    error EmergencyNotRequested();
    error EmergencyDelayNotMet();
    error NoFundsToWithdraw();

    // ============================================================
    //  CONSTRUCTOR
    // ============================================================
    constructor(address _usdc, address _treasury, uint256 _platformFeeBps) {
        if (_usdc == address(0) || _treasury == address(0)) revert InvalidAddress();
        if (_platformFeeBps > MAX_FEE_BPS) revert InvalidFee();

        usdc = IERC20(_usdc);
        treasury = _treasury;
        platformFeeBps = _platformFeeBps;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    // ============================================================
    //  ADMIN FUNCTIONS
    // ============================================================

    /**
     * @notice Create a new tournament
     * @param _name Tournament display name
     * @param _entryFee USDC entry fee (6 decimals)
     * @param _maxPlayers Maximum number of participants
     * @param _prizeSplits Array of basis points for prize distribution (must sum to 10000)
     * @param _subsessionId iRacing subsession ID to link results (0 if using league auto-discovery)
     * @param _leagueId iRacing league ID for auto-discovery (0 for manual subsession mode)
     * @param _seasonId iRacing league season ID (required if _leagueId > 0)
     */
    function createTournament(
        string calldata _name,
        uint256 _entryFee,
        uint256 _maxPlayers,
        uint256[] calldata _prizeSplits,
        uint256 _subsessionId,
        uint256 _leagueId,
        uint256 _seasonId
    ) external onlyRole(ADMIN_ROLE) whenNotPaused returns (uint256) {
        // Validate name is non-empty (Milestone 5)
        if (bytes(_name).length == 0) revert InvalidName();

        // Validate prizeSplits length is bounded 1–10 (Milestone 5)
        if (_prizeSplits.length == 0 || _prizeSplits.length > 10) revert InvalidSplits();

        // Validate maxPlayers can cover all prize slots (Milestone 5)
        if (_maxPlayers < _prizeSplits.length) revert InvalidSplits();

        // Validate splits sum to 10000 (100%)
        uint256 totalSplits;
        for (uint256 i = 0; i < _prizeSplits.length; i++) {
            totalSplits += _prizeSplits[i];
        }
        if (totalSplits != 10000) revert InvalidSplits();

        uint256 tournamentId = tournamentCount++;

        Tournament storage t = tournaments[tournamentId];
        t.name = _name;
        t.entryFee = _entryFee;
        t.maxPlayers = _maxPlayers;
        t.prizeSplits = _prizeSplits;
        t.iRacingSubsessionId = _subsessionId;
        t.iRacingLeagueId = _leagueId;
        t.iRacingSeasonId = _seasonId;
        t.status = TournamentStatus.Created;
        t.creator = msg.sender;
        t.createdAt = block.timestamp;

        emit TournamentCreated(tournamentId, _name, _entryFee, _maxPlayers);
        return tournamentId;
    }

    /**
     * @notice Update the subsession ID for a league-based tournament (oracle auto-discovery)
     * @param _tournamentId Tournament to update
     * @param _subsessionId The discovered iRacing subsession ID
     */
    function updateSubsessionId(uint256 _tournamentId, uint256 _subsessionId) external {
        // Allow both admin (manual override) and oracle (auto-discovery) to set subsession
        if (!hasRole(ORACLE_ROLE, msg.sender) && !hasRole(ADMIN_ROLE, msg.sender))
            revert AccessControlUnauthorizedAccount(msg.sender, ORACLE_ROLE);
        Tournament storage t = tournaments[_tournamentId];
        if (t.status == TournamentStatus.Completed || t.status == TournamentStatus.Cancelled)
            revert CannotCancelTerminalTournament();
        t.iRacingSubsessionId = _subsessionId;
        emit SubsessionIdUpdated(_tournamentId, _subsessionId);
    }

    /**
     * @notice Close registration for a tournament
     */
    function closeRegistration(uint256 _tournamentId) external onlyRole(ADMIN_ROLE) {
        Tournament storage t = tournaments[_tournamentId];
        if (t.status != TournamentStatus.Created)
            revert InvalidStatus(TournamentStatus.Created, t.status);

        t.status = TournamentStatus.RegistrationClosed;
        emit RegistrationClosed(_tournamentId);
    }

    /**
     * @notice Mark tournament as racing (race has started on iRacing)
     */
    function startRace(uint256 _tournamentId) external onlyRole(ADMIN_ROLE) {
        Tournament storage t = tournaments[_tournamentId];
        if (t.status != TournamentStatus.RegistrationClosed)
            revert InvalidStatus(TournamentStatus.RegistrationClosed, t.status);

        t.status = TournamentStatus.Racing;
        emit RaceStarted(_tournamentId);
    }

    /**
     * @notice Cancel a tournament and enable refunds
     */
    function cancelTournament(uint256 _tournamentId) external onlyRole(ADMIN_ROLE) {
        Tournament storage t = tournaments[_tournamentId];
        // Cannot cancel tournaments that are already Completed or Cancelled
        if (t.status == TournamentStatus.Completed || t.status == TournamentStatus.Cancelled)
            revert CannotCancelTerminalTournament();

        t.status = TournamentStatus.Cancelled;
        emit TournamentCancelled(_tournamentId);
    }

    /**
     * @notice Update platform fee (capped at MAX_FEE_BPS)
     */
    function setPlatformFee(uint256 _newFeeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _newFeeBps;
        emit PlatformFeeUpdated(oldFee, _newFeeBps);
    }

    /**
     * @notice Update treasury address
     */
    function setTreasury(address _newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newTreasury == address(0)) revert InvalidAddress();
        address oldTreasury = treasury;
        treasury = _newTreasury;
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ============================================================
    //  EMERGENCY WITHDRAWAL (Milestone 6)
    // ============================================================

    /**
     * @notice Initiate a time-locked emergency withdrawal for stuck tournament funds
     * @dev Requires DEFAULT_ADMIN_ROLE. Funds can be withdrawn after EMERGENCY_DELAY (30 days).
     */
    function requestEmergencyWithdraw(uint256 _tournamentId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Tournament storage t = tournaments[_tournamentId];
        if (t.prizePool == 0) revert NoFundsToWithdraw();

        uint256 executeAfter = block.timestamp + EMERGENCY_DELAY;
        emergencyWithdrawRequests[_tournamentId] = executeAfter;
        emit EmergencyWithdrawRequested(_tournamentId, executeAfter);
    }

    /**
     * @notice Execute emergency withdrawal after the 30-day delay has passed
     * @dev Sends the tournament's prize pool to the treasury address
     */
    function executeEmergencyWithdraw(uint256 _tournamentId) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 executeAfter = emergencyWithdrawRequests[_tournamentId];
        if (executeAfter == 0) revert EmergencyNotRequested();
        if (block.timestamp < executeAfter) revert EmergencyDelayNotMet();

        Tournament storage t = tournaments[_tournamentId];
        uint256 amount = t.prizePool;
        if (amount == 0) revert NoFundsToWithdraw();

        // Mark all player refunds as claimed so UI doesn't show broken refund button
        address[] storage players = tournamentPlayers[_tournamentId];
        for (uint256 i = 0; i < players.length; i++) {
            registrations[_tournamentId][players[i]].refundClaimed = true;
        }

        // Clear state before transfer
        t.prizePool = 0;
        t.status = TournamentStatus.Cancelled;
        delete emergencyWithdrawRequests[_tournamentId];

        usdc.safeTransfer(treasury, amount);
        emit EmergencyWithdrawExecuted(_tournamentId, amount);
    }

    // ============================================================
    //  PLAYER FUNCTIONS
    // ============================================================

    /**
     * @notice Register for a tournament by paying the entry fee in USDC
     * @param _tournamentId Tournament to register for
     * @param _iRacingCustomerId Player's iRacing customer ID for result matching
     */
    function register(uint256 _tournamentId, uint256 _iRacingCustomerId)
        external
        nonReentrant
        whenNotPaused
    {
        Tournament storage t = tournaments[_tournamentId];
        if (t.status != TournamentStatus.Created)
            revert InvalidStatus(TournamentStatus.Created, t.status);
        if (t.registeredCount >= t.maxPlayers) revert TournamentFull();
        if (registrations[_tournamentId][msg.sender].registered) revert AlreadyRegistered();
        // Validate iRacing customer ID is not zero
        if (_iRacingCustomerId == 0) revert InvalidIRacingId();

        // Transfer USDC entry fee from player to contract
        usdc.safeTransferFrom(msg.sender, address(this), t.entryFee);

        // Record registration
        registrations[_tournamentId][msg.sender] = PlayerRegistration({
            wallet: msg.sender,
            iRacingCustomerId: _iRacingCustomerId,
            registered: true,
            refundClaimed: false
        });
        tournamentPlayers[_tournamentId].push(msg.sender);

        t.registeredCount++;
        t.prizePool += t.entryFee;

        emit PlayerRegistered(_tournamentId, msg.sender, _iRacingCustomerId);
    }

    /**
     * @notice Claim refund from a cancelled tournament
     */
    function claimRefund(uint256 _tournamentId) external nonReentrant {
        Tournament storage t = tournaments[_tournamentId];
        if (t.status != TournamentStatus.Cancelled)
            revert InvalidStatus(TournamentStatus.Cancelled, t.status);

        PlayerRegistration storage reg = registrations[_tournamentId][msg.sender];
        if (!reg.registered) revert NotRegistered();
        if (reg.refundClaimed) revert RefundAlreadyClaimed();

        reg.refundClaimed = true;
        // Decrement prize pool so accounting stays accurate
        t.prizePool -= t.entryFee;
        usdc.safeTransfer(msg.sender, t.entryFee);

        emit RefundClaimed(_tournamentId, msg.sender, t.entryFee);
    }

    // ============================================================
    //  ORACLE FUNCTIONS
    // ============================================================

    /**
     * @notice Submit race results and distribute prizes automatically
     * @param _tournamentId Tournament to finalize
     * @param _winners Array of winner addresses (1st, 2nd, 3rd, etc.) matching prizeSplits length
     * @param _resultHash Keccak256 hash of the full result data for verification
     */
    function submitResultsAndDistribute(
        uint256 _tournamentId,
        address[] calldata _winners,
        bytes32 _resultHash
    ) external onlyRole(ORACLE_ROLE) nonReentrant whenNotPaused {
        Tournament storage t = tournaments[_tournamentId];
        // Only allow result submission when status is Racing (Milestone 5)
        if (t.status != TournamentStatus.Racing)
            revert InvalidStatus(TournamentStatus.Racing, t.status);
        if (_winners.length != t.prizeSplits.length) revert InvalidSplits();

        // Validate all winners are valid, registered, and no duplicates
        for (uint256 i = 0; i < _winners.length; i++) {
            if (_winners[i] == address(0)) revert InvalidAddress();
            if (!registrations[_tournamentId][_winners[i]].registered) revert NotRegistered();
            for (uint256 j = 0; j < i; j++) {
                if (_winners[j] == _winners[i]) revert DuplicateWinner();
            }
        }

        t.resultHash = _resultHash;
        t.status = TournamentStatus.Completed;

        // Calculate platform fee
        uint256 feeAmount = (t.prizePool * platformFeeBps) / 10000;
        uint256 distributablePool = t.prizePool - feeAmount;

        // Transfer platform fee to treasury
        if (feeAmount > 0) {
            usdc.safeTransfer(treasury, feeAmount);
        }

        // Distribute prizes according to splits
        uint256[] memory amounts = new uint256[](_winners.length);
        uint256 totalDistributed;

        for (uint256 i = 0; i < _winners.length; i++) {
            uint256 prizeAmount = (distributablePool * t.prizeSplits[i]) / 10000;
            amounts[i] = prizeAmount;
            totalDistributed += prizeAmount;
            usdc.safeTransfer(_winners[i], prizeAmount);
        }

        // Send any dust (rounding remainder) to treasury
        uint256 dust = distributablePool - totalDistributed;
        if (dust > 0) {
            usdc.safeTransfer(treasury, dust);
        }

        emit ResultsSubmitted(_tournamentId, _resultHash);
        emit PrizesDistributed(_tournamentId, _winners, amounts);
    }

    // ============================================================
    //  VIEW FUNCTIONS
    // ============================================================

    function getTournament(uint256 _tournamentId)
        external
        view
        returns (
            string memory name,
            uint256 entryFee,
            uint256 maxPlayers,
            uint256 registeredCount,
            uint256 prizePool,
            uint256[] memory prizeSplits,
            uint256 iRacingSubsessionId,
            TournamentStatus status,
            address creator,
            uint256 createdAt,
            uint256 iRacingLeagueId,
            uint256 iRacingSeasonId
        )
    {
        Tournament storage t = tournaments[_tournamentId];
        return (
            t.name, t.entryFee, t.maxPlayers, t.registeredCount,
            t.prizePool, t.prizeSplits, t.iRacingSubsessionId,
            t.status, t.creator, t.createdAt,
            t.iRacingLeagueId, t.iRacingSeasonId
        );
    }

    function getTournamentPlayers(uint256 _tournamentId) external view returns (address[] memory) {
        return tournamentPlayers[_tournamentId];
    }

    function getPlayerRegistration(uint256 _tournamentId, address _player)
        external
        view
        returns (uint256 iRacingCustomerId, bool registered, bool refundClaimed)
    {
        PlayerRegistration storage reg = registrations[_tournamentId][_player];
        return (reg.iRacingCustomerId, reg.registered, reg.refundClaimed);
    }

    function getPrizeSplits(uint256 _tournamentId) external view returns (uint256[] memory) {
        return tournaments[_tournamentId].prizeSplits;
    }
}
