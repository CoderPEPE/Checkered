/**
 * Create a Winner-Take-All tournament, then submit results after players register.
 *
 * Usage:
 *   ACTION=create npx hardhat run scripts/create-and-resolve.js --network baseSepolia
 *   ACTION=resolve TOURNAMENT_ID=1 WINNER=0xAddress npx hardhat run scripts/create-and-resolve.js --network baseSepolia
 */
require("dotenv").config();
const hre = require("hardhat");

const TOURNAMENT_ADDR = "0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA";
const USDC_ADDR = "0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918";
const STATUS_NAMES = ["Created", "RegistrationClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const action = process.env.ACTION || "create";

  const tournament = await hre.ethers.getContractAt("IRacingTournament", TOURNAMENT_ADDR, deployer);
  const usdc = await hre.ethers.getContractAt("MockUSDC", USDC_ADDR, deployer);

  if (action === "create") {
    // Create a Winner Take All tournament (single winner = works with 2+ players)
    const tx = await tournament.createTournament(
      "E2E Test — Winner Take All",
      1_000_000,       // 1 USDC entry
      10,              // max players
      [10000],         // 100% to winner
      54321            // fake subsession
    );
    await tx.wait();
    const count = Number(await tournament.tournamentCount());
    console.log(`Tournament #${count - 1} created: "E2E Test — Winner Take All"`);
    console.log("  Entry: 1 USDC, Prize Split: 100% to winner");
    console.log("  Players can now register in the frontend.");

  } else if (action === "resolve") {
    const tid = parseInt(process.env.TOURNAMENT_ID);
    const winner = process.env.WINNER;

    if (!winner) {
      console.error("Set WINNER=0xAddress");
      process.exit(1);
    }

    // Show state
    const t = await tournament.getTournament(tid);
    console.log(`Tournament #${tid}: "${t.name}"`);
    console.log(`  Status: ${STATUS_NAMES[Number(t.status)]}`);
    console.log(`  Players: ${Number(t.registeredCount)}, Prize Pool: ${Number(t.prizePool) / 1_000_000} USDC`);

    // Check winner balance before
    const balBefore = await usdc.balanceOf(winner);
    console.log(`\n  Winner (${winner}) USDC before: ${Number(balBefore) / 1_000_000}`);

    // Close registration if still open
    if (Number(t.status) === 0) {
      await (await tournament.closeRegistration(tid)).wait();
      console.log("  → Registration closed");
    }

    // Start race if needed
    const t2 = await tournament.getTournament(tid);
    if (Number(t2.status) === 1) {
      await (await tournament.startRace(tid)).wait();
      console.log("  → Race started");
    }

    // Submit results
    const resultData = JSON.stringify([{ wallet: winner, position: 1 }]);
    const resultHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(resultData));

    console.log(`\n  Submitting results: Winner = ${winner}`);
    const submitTx = await tournament.submitResultsAndDistribute(tid, [winner], resultHash);
    const receipt = await submitTx.wait();
    console.log(`  TX: ${receipt.hash}`);
    console.log(`  Gas: ${receipt.gasUsed.toString()}`);

    // Check balances after
    const balAfter = await usdc.balanceOf(winner);
    const prizeReceived = Number(balAfter) - Number(balBefore);
    console.log(`\n  Winner USDC after: ${Number(balAfter) / 1_000_000}`);
    console.log(`  Prize received: ${prizeReceived / 1_000_000} USDC`);

    // Check tournament final state
    const tFinal = await tournament.getTournament(tid);
    console.log(`\n  Tournament status: ${STATUS_NAMES[Number(tFinal.status)]}`);

    // Show platform fee
    const treasuryBal = await usdc.balanceOf(deployer.address);
    console.log(`  Treasury balance: ${Number(treasuryBal) / 1_000_000} USDC`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
