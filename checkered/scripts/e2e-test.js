/**
 * End-to-end test script — runs the complete tournament lifecycle
 * on the local Hardhat network with multiple wallets.
 *
 * Usage: npx hardhat run scripts/e2e-test.js
 */
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer, player1, player2] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  CHECKERED — End-to-End Test");
  console.log("=".repeat(60));
  console.log("\nWallets:");
  console.log("  Admin/Oracle:", deployer.address);
  console.log("  Player 1:    ", player1.address);
  console.log("  Player 2:    ", player2.address);

  // ── Step 1: Deploy contracts ──────────────────────────────
  console.log("\n── Step 1: Deploy Contracts ──");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("  MockUSDC deployed:", await usdc.getAddress());

  const Tournament = await hre.ethers.getContractFactory("IRacingTournament");
  const tournament = await Tournament.deploy(
    await usdc.getAddress(),
    deployer.address,  // treasury
    500                // 5% platform fee
  );
  await tournament.waitForDeployment();
  console.log("  Tournament deployed:", await tournament.getAddress());

  // Grant oracle role to deployer (so deployer can submit results)
  const ORACLE_ROLE = await tournament.ORACLE_ROLE();
  await tournament.grantRole(ORACLE_ROLE, deployer.address);
  console.log("  Oracle role granted to deployer");

  // ── Step 2: Mint USDC to players ──────────────────────────
  console.log("\n── Step 2: Mint Test USDC to Players ──");

  const mintAmount = 100_000_000; // 100 USDC
  await usdc.mint(player1.address, mintAmount);
  await usdc.mint(player2.address, mintAmount);

  const bal1 = await usdc.balanceOf(player1.address);
  const bal2 = await usdc.balanceOf(player2.address);
  console.log(`  Player 1 balance: ${Number(bal1) / 1_000_000} USDC`);
  console.log(`  Player 2 balance: ${Number(bal2) / 1_000_000} USDC`);

  // ── Step 3: Create tournament ─────────────────────────────
  console.log("\n── Step 3: Create Tournament ──");

  const entryFee = 10_000_000; // 10 USDC
  const maxPlayers = 10;
  const prizeSplits = [6000, 3000, 1000]; // 60/30/10
  const subsessionId = 99999;

  const createTx = await tournament.createTournament(
    "Friday Night Thunder",
    entryFee,
    maxPlayers,
    prizeSplits,
    subsessionId
  );
  await createTx.wait();

  const tournamentId = 0;
  const t = await tournament.getTournament(tournamentId);
  console.log(`  Name: ${t.name}`);
  console.log(`  Entry Fee: ${Number(t.entryFee) / 1_000_000} USDC`);
  console.log(`  Max Players: ${Number(t.maxPlayers)}`);
  console.log(`  Prize Split: 60/30/10`);
  console.log(`  Status: ${Number(t.status)} (0 = Created)`);

  // ── Step 4: Players register ──────────────────────────────
  console.log("\n── Step 4: Players Register ──");

  const tournamentAddr = await tournament.getAddress();

  // Player 1: approve + register with iRacing ID 100001
  await usdc.connect(player1).approve(tournamentAddr, entryFee);
  const reg1Tx = await tournament.connect(player1).register(tournamentId, 100001);
  await reg1Tx.wait();
  console.log("  Player 1 registered (iRacing ID: 100001)");

  // Player 2: approve + register with iRacing ID 100002
  await usdc.connect(player2).approve(tournamentAddr, entryFee);
  const reg2Tx = await tournament.connect(player2).register(tournamentId, 100002);
  await reg2Tx.wait();
  console.log("  Player 2 registered (iRacing ID: 100002)");

  // Check state after registration
  const tAfterReg = await tournament.getTournament(tournamentId);
  console.log(`  Registered: ${Number(tAfterReg.registeredCount)}/${Number(tAfterReg.maxPlayers)}`);
  console.log(`  Prize Pool: ${Number(tAfterReg.prizePool) / 1_000_000} USDC`);

  const p1BalAfter = await usdc.balanceOf(player1.address);
  const p2BalAfter = await usdc.balanceOf(player2.address);
  console.log(`  Player 1 balance after: ${Number(p1BalAfter) / 1_000_000} USDC`);
  console.log(`  Player 2 balance after: ${Number(p2BalAfter) / 1_000_000} USDC`);

  // ── Step 5: Admin closes registration + starts race ───────
  console.log("\n── Step 5: Close Registration + Start Race ──");

  await (await tournament.closeRegistration(tournamentId)).wait();
  console.log("  Registration closed (status = 1)");

  await (await tournament.startRace(tournamentId)).wait();
  console.log("  Race started (status = 2 = Racing)");

  // ── Step 6: Oracle submits results ────────────────────────
  console.log("\n── Step 6: Oracle Submits Results ──");

  // Player 1 wins 1st, Player 2 gets 2nd, need a 3rd for the 3-way split
  // Since we only have 2 registered players and need 3 winners for a 60/30/10 split,
  // let's register a 3rd player first... Actually, let's use a 70/30 split instead.
  // But the tournament is already created with 60/30/10. The contract requires
  // winners.length === prizeSplits.length. We need 3 registered players.

  // Re-do: we need a 3rd player. Let's get another signer.
  const signers = await hre.ethers.getSigners();
  const player3 = signers[3];

  // Mint, approve, register player 3
  await usdc.mint(player3.address, mintAmount);
  // Need to re-open registration? No, registration is closed. Let me redo the flow.
  // Actually we should register all 3 before closing registration.

  console.log("  (Need 3 players for 60/30/10 split — restarting with 3 players...)");
  console.log("");

  // ── RESTART: Full clean flow with 3 players ───────────────
  console.log("── Restarting with 3-player flow ──");

  // Create a new tournament
  const create2Tx = await tournament.createTournament(
    "Saturday Sprint Race",
    entryFee,
    maxPlayers,
    prizeSplits,
    88888
  );
  await create2Tx.wait();
  const tid = 1; // second tournament

  console.log(`  Tournament #${tid} created: "Saturday Sprint Race"`);

  // Mint USDC for player3
  await usdc.mint(player3.address, mintAmount);
  console.log(`  Player 3 (${player3.address}) funded with 100 USDC`);

  // All 3 players register
  const tAddr = await tournament.getAddress();
  for (const [i, player] of [player1, player2, player3].entries()) {
    await usdc.connect(player).approve(tAddr, entryFee);
    await (await tournament.connect(player).register(tid, 100001 + i)).wait();
    console.log(`  Player ${i + 1} registered (iRacing ID: ${100001 + i})`);
  }

  const tMid = await tournament.getTournament(tid);
  console.log(`  Prize Pool: ${Number(tMid.prizePool) / 1_000_000} USDC (${Number(tMid.registeredCount)} players)`);

  // Close registration + start race
  await (await tournament.closeRegistration(tid)).wait();
  await (await tournament.startRace(tid)).wait();
  console.log("  Registration closed → Race started");

  // Record balances before distribution
  const treasuryBefore = await usdc.balanceOf(deployer.address);

  // Submit results: Player 2 wins 1st, Player 1 gets 2nd, Player 3 gets 3rd
  const winners = [player2.address, player1.address, player3.address];
  const resultData = JSON.stringify([
    { custId: 100002, finishPosition: 1, displayName: "Player 2" },
    { custId: 100001, finishPosition: 2, displayName: "Player 1" },
    { custId: 100003, finishPosition: 3, displayName: "Player 3" },
  ]);
  const resultHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(resultData));

  console.log("\n  Submitting results:");
  console.log("    1st place: Player 2 →", player2.address);
  console.log("    2nd place: Player 1 →", player1.address);
  console.log("    3rd place: Player 3 →", player3.address);

  const submitTx = await tournament.submitResultsAndDistribute(tid, winners, resultHash);
  const submitReceipt = await submitTx.wait();
  console.log(`  Results submitted! Gas: ${submitReceipt.gasUsed.toString()}`);

  // ── Step 7: Verify prize distribution ─────────────────────
  console.log("\n── Step 7: Verify Prize Distribution ──");

  const tFinal = await tournament.getTournament(tid);
  console.log(`  Tournament status: ${Number(tFinal.status)} (4 = Completed)`);

  // Calculate expected prizes
  const prizePool = 30_000_000; // 30 USDC (3 × 10)
  const platformFee = prizePool * 500 / 10000; // 5% = 1.5 USDC
  const distributable = prizePool - platformFee; // 28.5 USDC
  const prize1st = distributable * 6000 / 10000; // 60% = 17.1 USDC
  const prize2nd = distributable * 3000 / 10000; // 30% = 8.55 USDC
  const prize3rd = distributable * 1000 / 10000; // 10% = 2.85 USDC

  console.log("\n  Expected distribution:");
  console.log(`    Prize Pool:   ${prizePool / 1_000_000} USDC`);
  console.log(`    Platform Fee: ${platformFee / 1_000_000} USDC (5%)`);
  console.log(`    1st (60%):    ${prize1st / 1_000_000} USDC → Player 2`);
  console.log(`    2nd (30%):    ${prize2nd / 1_000_000} USDC → Player 1`);
  console.log(`    3rd (10%):    ${prize3rd / 1_000_000} USDC → Player 3`);

  // Check actual balances
  const p1Final = await usdc.balanceOf(player1.address);
  const p2Final = await usdc.balanceOf(player2.address);
  const p3Final = await usdc.balanceOf(player3.address);
  const treasuryAfter = await usdc.balanceOf(deployer.address);
  const treasuryGain = Number(treasuryAfter) - Number(treasuryBefore);

  // Each player started with 100 USDC, paid 10 USDC entry (twice for tournament 0 and 1 for p1/p2)
  // Player 1: 100 - 10 (t0) - 10 (t1) + 8.55 (2nd prize) = 88.55
  // Player 2: 100 - 10 (t0) - 10 (t1) + 17.1 (1st prize) = 97.1
  // Player 3: 100 - 10 (t1) + 2.85 (3rd prize) = 92.85

  console.log("\n  Actual final balances:");
  console.log(`    Player 1 (2nd): ${Number(p1Final) / 1_000_000} USDC`);
  console.log(`    Player 2 (1st): ${Number(p2Final) / 1_000_000} USDC`);
  console.log(`    Player 3 (3rd): ${Number(p3Final) / 1_000_000} USDC`);
  console.log(`    Treasury gain:  ${treasuryGain / 1_000_000} USDC`);

  // Verify prizes are correct (just for tournament 1)
  // Player 2 received prize1st
  // Note: p1 and p2 also paid 10 USDC into tournament 0 which is still escrowed
  const p2Net = Number(p2Final) - (100_000_000 - 10_000_000 - 10_000_000); // balance minus starting minus 2 entries
  const p1Net = Number(p1Final) - (100_000_000 - 10_000_000 - 10_000_000);
  const p3Net = Number(p3Final) - (100_000_000 - 10_000_000);

  console.log("\n  Net prize received (tournament 1 only):");
  console.log(`    Player 1 (2nd): +${p1Net / 1_000_000} USDC ${p1Net === prize2nd ? "✓ CORRECT" : "✗ MISMATCH (expected " + prize2nd / 1_000_000 + ")"}`);
  console.log(`    Player 2 (1st): +${p2Net / 1_000_000} USDC ${p2Net === prize1st ? "✓ CORRECT" : "✗ MISMATCH (expected " + prize1st / 1_000_000 + ")"}`);
  console.log(`    Player 3 (3rd): +${p3Net / 1_000_000} USDC ${p3Net === prize3rd ? "✓ CORRECT" : "✗ MISMATCH (expected " + prize3rd / 1_000_000 + ")"}`);

  console.log("\n" + "=".repeat(60));
  console.log("  END-TO-END TEST COMPLETE");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
