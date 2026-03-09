const { expect } = require("chai");
const hre = require("hardhat");
const { ethers } = hre;
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("IRacingTournament", function () {
  // ============================================================
  //  FIXTURE
  // ============================================================
  async function deployFixture() {
    const [owner, admin, oracle, player1, player2, player3, treasury, nonAdmin] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();

    // Deploy Tournament contract (5% platform fee = 500 bps)
    const Tournament = await ethers.getContractFactory("IRacingTournament");
    const tournament = await Tournament.deploy(
      await usdc.getAddress(),
      treasury.address,
      500 // 5% fee
    );

    // Grant roles
    const ADMIN_ROLE = await tournament.ADMIN_ROLE();
    const ORACLE_ROLE = await tournament.ORACLE_ROLE();
    await tournament.grantRole(ADMIN_ROLE, admin.address);
    await tournament.grantRole(ORACLE_ROLE, oracle.address);

    // Mint USDC to players (1000 USDC each, 6 decimals)
    const mintAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(player1.address, mintAmount);
    await usdc.mint(player2.address, mintAmount);
    await usdc.mint(player3.address, mintAmount);

    // Approve tournament contract to spend USDC
    const tournamentAddr = await tournament.getAddress();
    await usdc.connect(player1).approve(tournamentAddr, ethers.MaxUint256);
    await usdc.connect(player2).approve(tournamentAddr, ethers.MaxUint256);
    await usdc.connect(player3).approve(tournamentAddr, ethers.MaxUint256);

    return { tournament, usdc, owner, admin, oracle, player1, player2, player3, treasury, nonAdmin, ADMIN_ROLE, ORACLE_ROLE };
  }

  // ============================================================
  //  DEPLOYMENT
  // ============================================================
  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      const { tournament, usdc } = await loadFixture(deployFixture);
      expect(await tournament.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set correct treasury", async function () {
      const { tournament, treasury } = await loadFixture(deployFixture);
      expect(await tournament.treasury()).to.equal(treasury.address);
    });

    it("Should set correct platform fee", async function () {
      const { tournament } = await loadFixture(deployFixture);
      expect(await tournament.platformFeeBps()).to.equal(500);
    });

    it("Should grant admin and oracle roles to deployer", async function () {
      const { tournament, owner, ADMIN_ROLE, ORACLE_ROLE } = await loadFixture(deployFixture);
      expect(await tournament.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
      expect(await tournament.hasRole(ORACLE_ROLE, owner.address)).to.be.true;
    });

    it("Should revert with zero USDC address", async function () {
      const Tournament = await ethers.getContractFactory("IRacingTournament");
      await expect(Tournament.deploy(ethers.ZeroAddress, ethers.ZeroAddress, 500))
        .to.be.revertedWithCustomError(Tournament, "InvalidAddress");
    });

    it("Should revert with fee exceeding max", async function () {
      const { usdc, treasury } = await loadFixture(deployFixture);
      const Tournament = await ethers.getContractFactory("IRacingTournament");
      await expect(Tournament.deploy(await usdc.getAddress(), treasury.address, 2001))
        .to.be.revertedWithCustomError(Tournament, "InvalidFee");
    });
  });

  // ============================================================
  //  TOURNAMENT CREATION
  // ============================================================
  describe("Tournament Creation", function () {
    it("Should create tournament with correct parameters", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("1", 6); // 1 USDC

      await expect(
        tournament.connect(admin).createTournament("Test Race", entryFee, 20, [6000, 3000, 1000], 12345)
      ).to.emit(tournament, "TournamentCreated").withArgs(0, "Test Race", entryFee, 20);

      const t = await tournament.getTournament(0);
      expect(t.name).to.equal("Test Race");
      expect(t.entryFee).to.equal(entryFee);
      expect(t.maxPlayers).to.equal(20);
      expect(t.status).to.equal(0); // Created
    });

    it("Should reject invalid prize splits (not summing to 10000)", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(admin).createTournament("Bad Split", 1000000, 10, [5000, 3000, 1000], 0)
      ).to.be.revertedWithCustomError(tournament, "InvalidSplits");
    });

    it("Should reject zero max players", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      // maxPlayers (0) < prizeSplits.length (1) → InvalidSplits
      await expect(
        tournament.connect(admin).createTournament("No Players", 1000000, 0, [10000], 0)
      ).to.be.revertedWithCustomError(tournament, "InvalidSplits");
    });

    it("Should reject empty tournament name", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(admin).createTournament("", 1000000, 10, [10000], 0)
      ).to.be.revertedWithCustomError(tournament, "InvalidName");
    });

    it("Should reject prizeSplits with more than 10 entries", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      // 11 splits of 909 each = 9999, add 1 to first = 10000
      const splits = [910, 909, 909, 909, 909, 909, 909, 909, 909, 909, 909];
      await expect(
        tournament.connect(admin).createTournament("Too Many Splits", 1000000, 20, splits, 0)
      ).to.be.revertedWithCustomError(tournament, "InvalidSplits");
    });

    it("Should reject maxPlayers less than prizeSplits length", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      // 3 prize splits but only 2 max players
      await expect(
        tournament.connect(admin).createTournament("Too Few Players", 1000000, 2, [6000, 3000, 1000], 0)
      ).to.be.revertedWithCustomError(tournament, "InvalidSplits");
    });

    it("Should reject non-admin creating tournament", async function () {
      const { tournament, nonAdmin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(nonAdmin).createTournament("Unauthorized", 1000000, 10, [10000], 0)
      ).to.be.reverted;
    });

    it("Should increment tournament count", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race 1", 1000000, 10, [10000], 0);
      await tournament.connect(admin).createTournament("Race 2", 1000000, 10, [10000], 0);
      expect(await tournament.tournamentCount()).to.equal(2);
    });
  });

  // ============================================================
  //  PLAYER REGISTRATION
  // ============================================================
  describe("Registration", function () {
    async function createTournamentFixture() {
      const fixture = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("5", 6); // 5 USDC
      await fixture.tournament.connect(fixture.admin).createTournament(
        "Weekly Race", entryFee, 3, [6000, 3000, 1000], 99999
      );
      return { ...fixture, entryFee };
    }

    it("Should register player and transfer USDC", async function () {
      const { tournament, usdc, player1, entryFee } = await createTournamentFixture();
      const balBefore = await usdc.balanceOf(player1.address);

      await expect(tournament.connect(player1).register(0, 100001))
        .to.emit(tournament, "PlayerRegistered")
        .withArgs(0, player1.address, 100001);

      const balAfter = await usdc.balanceOf(player1.address);
      expect(balBefore - balAfter).to.equal(entryFee);

      const t = await tournament.getTournament(0);
      expect(t.registeredCount).to.equal(1);
      expect(t.prizePool).to.equal(entryFee);
    });

    it("Should reject duplicate registration", async function () {
      const { tournament, player1 } = await createTournamentFixture();
      await tournament.connect(player1).register(0, 100001);
      await expect(
        tournament.connect(player1).register(0, 100001)
      ).to.be.revertedWithCustomError(tournament, "AlreadyRegistered");
    });

    it("Should reject registration when full", async function () {
      const { tournament, player1, player2, player3, nonAdmin, usdc } = await createTournamentFixture();
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(player2).register(0, 100002);
      await tournament.connect(player3).register(0, 100003);

      // Mint and approve for 4th player
      await usdc.mint(nonAdmin.address, ethers.parseUnits("100", 6));
      await usdc.connect(nonAdmin).approve(await tournament.getAddress(), ethers.MaxUint256);

      await expect(
        tournament.connect(nonAdmin).register(0, 100004)
      ).to.be.revertedWithCustomError(tournament, "TournamentFull");
    });

    it("Should reject registration after registration closed", async function () {
      const { tournament, admin, player1 } = await createTournamentFixture();
      await tournament.connect(admin).closeRegistration(0);
      await expect(
        tournament.connect(player1).register(0, 100001)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    it("Should track players list", async function () {
      const { tournament, player1, player2 } = await createTournamentFixture();
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(player2).register(0, 100002);

      const players = await tournament.getTournamentPlayers(0);
      expect(players.length).to.equal(2);
      expect(players[0]).to.equal(player1.address);
      expect(players[1]).to.equal(player2.address);
    });
  });

  // ============================================================
  //  STATUS TRANSITIONS
  // ============================================================
  describe("Status Transitions", function () {
    it("Should transition Created → RegistrationClosed → Racing", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);

      await tournament.connect(admin).closeRegistration(0);
      expect((await tournament.getTournament(0)).status).to.equal(1); // RegistrationClosed

      await tournament.connect(admin).startRace(0);
      expect((await tournament.getTournament(0)).status).to.equal(2); // Racing
    });

    it("Should reject closing already closed registration", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(admin).closeRegistration(0);
      await expect(
        tournament.connect(admin).closeRegistration(0)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    it("Should reject starting race from Created status", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await expect(
        tournament.connect(admin).startRace(0)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });
  });

  // ============================================================
  //  PRIZE DISTRIBUTION
  // ============================================================
  describe("Prize Distribution", function () {
    async function fullTournamentFixture() {
      const fixture = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("10", 6); // 10 USDC

      await fixture.tournament.connect(fixture.admin).createTournament(
        "Big Race", entryFee, 10, [6000, 3000, 1000], 55555
      );

      // Register 3 players
      await fixture.tournament.connect(fixture.player1).register(0, 100001);
      await fixture.tournament.connect(fixture.player2).register(0, 100002);
      await fixture.tournament.connect(fixture.player3).register(0, 100003);

      // Close registration and start race
      await fixture.tournament.connect(fixture.admin).closeRegistration(0);
      await fixture.tournament.connect(fixture.admin).startRace(0);

      return { ...fixture, entryFee };
    }

    it("Should distribute prizes correctly with 5% fee", async function () {
      const { tournament, usdc, oracle, player1, player2, player3, treasury } = await fullTournamentFixture();

      const treasuryBefore = await usdc.balanceOf(treasury.address);
      const p1Before = await usdc.balanceOf(player1.address);
      const p2Before = await usdc.balanceOf(player2.address);
      const p3Before = await usdc.balanceOf(player3.address);

      // Prize pool: 30 USDC (3 players × 10 USDC)
      // Platform fee: 1.5 USDC (5%)
      // Distributable: 28.5 USDC
      // 1st (60%): 17.1 USDC
      // 2nd (30%): 8.55 USDC
      // 3rd (10%): 2.85 USDC
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("race-result-data"));

      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0,
          [player1.address, player2.address, player3.address],
          resultHash
        )
      ).to.emit(tournament, "PrizesDistributed");

      // Verify status changed
      expect((await tournament.getTournament(0)).status).to.equal(4); // Completed

      // Verify treasury received fee
      const treasuryAfter = await usdc.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseUnits("1.5", 6));

      // Verify prize amounts (with potential rounding)
      const p1After = await usdc.balanceOf(player1.address);
      const p2After = await usdc.balanceOf(player2.address);
      const p3After = await usdc.balanceOf(player3.address);

      expect(p1After - p1Before).to.equal(ethers.parseUnits("17.1", 6));   // 60% of 28.5
      expect(p2After - p2Before).to.equal(ethers.parseUnits("8.55", 6));   // 30% of 28.5
      expect(p3After - p3Before).to.equal(ethers.parseUnits("2.85", 6));   // 10% of 28.5
    });

    it("Should reject results from non-oracle", async function () {
      const { tournament, nonAdmin, player1, player2, player3 } = await fullTournamentFixture();
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("fake"));
      await expect(
        tournament.connect(nonAdmin).submitResultsAndDistribute(
          0, [player1.address, player2.address, player3.address], resultHash
        )
      ).to.be.reverted;
    });

    it("Should reject wrong number of winners", async function () {
      const { tournament, oracle, player1, player2 } = await fullTournamentFixture();
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0, [player1.address, player2.address], resultHash
        )
      ).to.be.revertedWithCustomError(tournament, "InvalidSplits");
    });

    it("Should reject unregistered winner address", async function () {
      const { tournament, oracle, player1, player2, nonAdmin } = await fullTournamentFixture();
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0, [player1.address, player2.address, nonAdmin.address], resultHash
        )
      ).to.be.revertedWithCustomError(tournament, "NotRegistered");
    });

    it("Should reject duplicate winner addresses", async function () {
      const { tournament, oracle, player1, player2 } = await fullTournamentFixture();
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      // player1 appears twice — should revert
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0, [player1.address, player2.address, player1.address], resultHash
        )
      ).to.be.revertedWithCustomError(tournament, "DuplicateWinner");
    });

    it("Should reject results when status is RegistrationClosed (not Racing)", async function () {
      const { tournament, admin, oracle, player1, player2, player3 } = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("10", 6);
      await tournament.connect(admin).createTournament("Race", entryFee, 10, [6000, 3000, 1000], 55555);

      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(player2).register(0, 100002);
      await tournament.connect(player3).register(0, 100003);

      // Close registration but do NOT start race
      await tournament.connect(admin).closeRegistration(0);

      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0, [player1.address, player2.address, player3.address], resultHash
        )
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    it("Should store result hash and emit ResultsSubmitted event", async function () {
      const { tournament, oracle, player1, player2, player3 } = await fullTournamentFixture();
      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("official-results"));

      // Verify the event emits the correct hash
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(
          0, [player1.address, player2.address, player3.address], resultHash
        )
      ).to.emit(tournament, "ResultsSubmitted").withArgs(0, resultHash);

      // Verify on-chain storage via auto-generated getter (returns struct fields except arrays)
      const stored = await tournament.tournaments(0);
      expect(stored.resultHash).to.equal(resultHash);
    });
  });

  // ============================================================
  //  CANCELLATION & REFUNDS
  // ============================================================
  describe("Cancellation & Refunds", function () {
    it("Should allow refund after cancellation", async function () {
      const { tournament, usdc, admin, player1 } = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("5", 6);

      await tournament.connect(admin).createTournament("Cancelled Race", entryFee, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);

      const balBefore = await usdc.balanceOf(player1.address);
      await tournament.connect(admin).cancelTournament(0);

      await expect(tournament.connect(player1).claimRefund(0))
        .to.emit(tournament, "RefundClaimed")
        .withArgs(0, player1.address, entryFee);

      const balAfter = await usdc.balanceOf(player1.address);
      expect(balAfter - balBefore).to.equal(entryFee);
    });

    it("Should reject double refund", async function () {
      const { tournament, admin, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(admin).cancelTournament(0);
      await tournament.connect(player1).claimRefund(0);

      await expect(
        tournament.connect(player1).claimRefund(0)
      ).to.be.revertedWithCustomError(tournament, "RefundAlreadyClaimed");
    });

    it("Should reject refund from non-cancelled tournament", async function () {
      const { tournament, admin, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);

      await expect(
        tournament.connect(player1).claimRefund(0)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    it("Should reject refund for unregistered player", async function () {
      const { tournament, admin, nonAdmin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(admin).cancelTournament(0);

      await expect(
        tournament.connect(nonAdmin).claimRefund(0)
      ).to.be.revertedWithCustomError(tournament, "NotRegistered");
    });

    it("Should reject cancelling completed tournament", async function () {
      const { tournament, admin, oracle, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(admin).closeRegistration(0);
      await tournament.connect(admin).startRace(0);

      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await tournament.connect(oracle).submitResultsAndDistribute(0, [player1.address], resultHash);

      await expect(
        tournament.connect(admin).cancelTournament(0)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });
  });

  // ============================================================
  //  ADMIN SETTINGS
  // ============================================================
  describe("Admin Settings", function () {
    it("Should update platform fee", async function () {
      const { tournament, owner } = await loadFixture(deployFixture);
      await expect(tournament.connect(owner).setPlatformFee(300))
        .to.emit(tournament, "PlatformFeeUpdated").withArgs(500, 300);
      expect(await tournament.platformFeeBps()).to.equal(300);
    });

    it("Should reject fee above max", async function () {
      const { tournament, owner } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(owner).setPlatformFee(2001)
      ).to.be.revertedWithCustomError(tournament, "InvalidFee");
    });

    it("Should update treasury", async function () {
      const { tournament, owner, nonAdmin } = await loadFixture(deployFixture);
      await expect(tournament.connect(owner).setTreasury(nonAdmin.address))
        .to.emit(tournament, "TreasuryUpdated");
      expect(await tournament.treasury()).to.equal(nonAdmin.address);
    });

    it("Should pause and unpause", async function () {
      const { tournament, owner, admin } = await loadFixture(deployFixture);
      await tournament.connect(owner).pause();

      await expect(
        tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0)
      ).to.be.revertedWithCustomError(tournament, "EnforcedPause");

      await tournament.connect(owner).unpause();
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
    });
  });

  // ============================================================
  //  EMERGENCY WITHDRAWAL (Milestone 6)
  // ============================================================
  describe("Emergency Withdrawal", function () {
    async function stuckTournamentFixture() {
      const fixture = await loadFixture(deployFixture);
      const entryFee = ethers.parseUnits("10", 6);
      await fixture.tournament.connect(fixture.admin).createTournament(
        "Stuck Race", entryFee, 10, [10000], 99999
      );
      await fixture.tournament.connect(fixture.player1).register(0, 100001);
      return { ...fixture, entryFee };
    }

    it("Should request and execute emergency withdrawal after 30 days", async function () {
      const { tournament, usdc, owner, treasury, entryFee } = await stuckTournamentFixture();

      // Request emergency withdrawal
      await expect(tournament.connect(owner).requestEmergencyWithdraw(0))
        .to.emit(tournament, "EmergencyWithdrawRequested");

      // Fast-forward 30 days
      await hre.network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      const treasuryBefore = await usdc.balanceOf(treasury.address);

      // Execute withdrawal
      await expect(tournament.connect(owner).executeEmergencyWithdraw(0))
        .to.emit(tournament, "EmergencyWithdrawExecuted")
        .withArgs(0, entryFee);

      const treasuryAfter = await usdc.balanceOf(treasury.address);
      expect(treasuryAfter - treasuryBefore).to.equal(entryFee);

      // Tournament should be cancelled with zero prize pool
      const t = await tournament.getTournament(0);
      expect(t.prizePool).to.equal(0);
      expect(t.status).to.equal(5); // Cancelled
    });

    it("Should reject execution before 30-day delay", async function () {
      const { tournament, owner } = await stuckTournamentFixture();
      await tournament.connect(owner).requestEmergencyWithdraw(0);

      // Try to execute immediately
      await expect(
        tournament.connect(owner).executeEmergencyWithdraw(0)
      ).to.be.revertedWithCustomError(tournament, "EmergencyDelayNotMet");
    });

    it("Should reject execution without prior request", async function () {
      const { tournament, owner } = await stuckTournamentFixture();
      await expect(
        tournament.connect(owner).executeEmergencyWithdraw(0)
      ).to.be.revertedWithCustomError(tournament, "EmergencyNotRequested");
    });

    it("Should reject request for tournament with no funds", async function () {
      const { tournament, owner, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Empty", 0, 10, [10000], 0);
      await expect(
        tournament.connect(owner).requestEmergencyWithdraw(0)
      ).to.be.revertedWithCustomError(tournament, "NoFundsToWithdraw");
    });

    it("Should reject non-admin requesting emergency withdrawal", async function () {
      const { tournament, nonAdmin } = await stuckTournamentFixture();
      await expect(
        tournament.connect(nonAdmin).requestEmergencyWithdraw(0)
      ).to.be.reverted;
    });

    it("Should reject non-admin executing emergency withdrawal", async function () {
      const { tournament, owner, nonAdmin } = await stuckTournamentFixture();
      await tournament.connect(owner).requestEmergencyWithdraw(0);

      await hre.network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      await expect(
        tournament.connect(nonAdmin).executeEmergencyWithdraw(0)
      ).to.be.reverted;
    });

    it("Should reject double execution after successful withdrawal", async function () {
      const { tournament, owner } = await stuckTournamentFixture();
      await tournament.connect(owner).requestEmergencyWithdraw(0);

      await hre.network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      await tournament.connect(owner).executeEmergencyWithdraw(0);

      // Second attempt should fail — request was deleted
      await expect(
        tournament.connect(owner).executeEmergencyWithdraw(0)
      ).to.be.revertedWithCustomError(tournament, "EmergencyNotRequested");
    });
  });

  // ============================================================
  //  ADDITIONAL COVERAGE (Milestone 9)
  // ============================================================
  describe("Additional Coverage (Milestone 9)", function () {
    // ── Zero entry fee ─────────────────────────────────────
    it("Should allow tournament with zero entry fee", async function () {
      const { tournament, admin, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Free Race", 0, 10, [10000], 0);

      // Player registers for free (no USDC transfer)
      await tournament.connect(player1).register(0, 100001);
      const t = await tournament.getTournament(0);
      expect(t.registeredCount).to.equal(1);
      expect(t.prizePool).to.equal(0);
    });

    it("Should distribute zero-fee tournament (no prizes)", async function () {
      const { tournament, admin, oracle, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Free Race", 0, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(admin).closeRegistration(0);
      await tournament.connect(admin).startRace(0);

      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("free-results"));
      await tournament.connect(oracle).submitResultsAndDistribute(0, [player1.address], resultHash);

      const t = await tournament.getTournament(0);
      expect(t.status).to.equal(4); // Completed
    });

    // ── Cancel from Racing ─────────────────────────────────
    it("Should cancel tournament in Racing status", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(admin).closeRegistration(0);
      await tournament.connect(admin).startRace(0);

      await expect(tournament.connect(admin).cancelTournament(0))
        .to.emit(tournament, "TournamentCancelled").withArgs(0);
      expect((await tournament.getTournament(0)).status).to.equal(5); // Cancelled
    });

    // ── Cancel from RegistrationClosed ─────────────────────
    it("Should cancel tournament in RegistrationClosed status", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(admin).closeRegistration(0);

      await expect(tournament.connect(admin).cancelTournament(0))
        .to.emit(tournament, "TournamentCancelled").withArgs(0);
      expect((await tournament.getTournament(0)).status).to.equal(5);
    });

    // ── Cancel already-cancelled tournament ─────────────────
    it("Should reject cancelling already-cancelled tournament", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(admin).cancelTournament(0);

      await expect(
        tournament.connect(admin).cancelTournament(0)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    // ── Submit results from Created status ──────────────────
    it("Should reject results from Created status", async function () {
      const { tournament, admin, oracle, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);

      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(0, [player1.address], resultHash)
      ).to.be.revertedWithCustomError(tournament, "InvalidStatus");
    });

    // ── Pause blocks registration ───────────────────────────
    it("Should reject registration when paused", async function () {
      const { tournament, owner, admin, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(owner).pause();

      await expect(
        tournament.connect(player1).register(0, 100001)
      ).to.be.revertedWithCustomError(tournament, "EnforcedPause");
    });

    // ── Pause blocks submitResultsAndDistribute ─────────────
    it("Should reject result submission when paused", async function () {
      const { tournament, owner, admin, oracle, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 100001);
      await tournament.connect(admin).closeRegistration(0);
      await tournament.connect(admin).startRace(0);

      // Pause after race started
      await tournament.connect(owner).pause();

      const resultHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
      await expect(
        tournament.connect(oracle).submitResultsAndDistribute(0, [player1.address], resultHash)
      ).to.be.revertedWithCustomError(tournament, "EnforcedPause");
    });

    // ── Admin settings access control ───────────────────────
    it("Should reject non-admin setting platform fee", async function () {
      const { tournament, nonAdmin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(nonAdmin).setPlatformFee(100)
      ).to.be.reverted;
    });

    it("Should reject non-admin setting treasury", async function () {
      const { tournament, nonAdmin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(nonAdmin).setTreasury(nonAdmin.address)
      ).to.be.reverted;
    });

    it("Should reject setting treasury to zero address", async function () {
      const { tournament, owner } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(owner).setTreasury(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(tournament, "InvalidAddress");
    });

    it("Should reject non-admin pausing", async function () {
      const { tournament, nonAdmin } = await loadFixture(deployFixture);
      await expect(
        tournament.connect(nonAdmin).pause()
      ).to.be.reverted;
    });

    it("Should reject non-admin unpausing", async function () {
      const { tournament, owner, nonAdmin } = await loadFixture(deployFixture);
      await tournament.connect(owner).pause();
      await expect(
        tournament.connect(nonAdmin).unpause()
      ).to.be.reverted;
    });
  });

  // ============================================================
  //  VIEW FUNCTIONS
  // ============================================================
  describe("View Functions", function () {
    it("Should return player registration details", async function () {
      const { tournament, admin, player1 } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [10000], 0);
      await tournament.connect(player1).register(0, 12345);

      const reg = await tournament.getPlayerRegistration(0, player1.address);
      expect(reg.iRacingCustomerId).to.equal(12345);
      expect(reg.registered).to.be.true;
      expect(reg.refundClaimed).to.be.false;
    });

    it("Should return prize splits", async function () {
      const { tournament, admin } = await loadFixture(deployFixture);
      await tournament.connect(admin).createTournament("Race", 1000000, 10, [6000, 3000, 1000], 0);
      const splits = await tournament.getPrizeSplits(0);
      expect(splits[0]).to.equal(6000);
      expect(splits[1]).to.equal(3000);
      expect(splits[2]).to.equal(1000);
    });
  });
});
