/**
 * Advance a tournament through status transitions on Base Sepolia.
 *
 * Usage:
 *   TOURNAMENT_ID=0 ACTION=close npx hardhat run scripts/advance-tournament.js --network baseSepolia
 *   TOURNAMENT_ID=0 ACTION=start npx hardhat run scripts/advance-tournament.js --network baseSepolia
 *   TOURNAMENT_ID=0 ACTION=status npx hardhat run scripts/advance-tournament.js --network baseSepolia
 *
 * Actions:
 *   status  — Show current tournament state + registered players
 *   close   — Close registration (Created → RegistrationClosed)
 *   start   — Start race (RegistrationClosed → Racing)
 *   cancel  — Cancel tournament (enables refunds)
 */
require("dotenv").config();
const hre = require("hardhat");

const STATUS_NAMES = ["Created", "RegistrationClosed", "Racing", "ResultsSubmitted", "Completed", "Cancelled"];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const tournamentId = parseInt(process.env.TOURNAMENT_ID || "0");
  const action = process.env.ACTION || "status";

  const tournament = await hre.ethers.getContractAt(
    "IRacingTournament",
    "0x325C6D6d0386F0cAf0200d94043eef9A87a21aEA",
    deployer
  );

  const usdc = await hre.ethers.getContractAt(
    "MockUSDC",
    "0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918",
    deployer
  );

  // Show current state
  const t = await tournament.getTournament(tournamentId);
  console.log(`Tournament #${tournamentId}: "${t.name}"`);
  console.log(`  Status: ${STATUS_NAMES[Number(t.status)]} (${Number(t.status)})`);
  console.log(`  Entry Fee: ${Number(t.entryFee) / 1_000_000} USDC`);
  console.log(`  Players: ${Number(t.registeredCount)}/${Number(t.maxPlayers)}`);
  console.log(`  Prize Pool: ${Number(t.prizePool) / 1_000_000} USDC`);
  console.log(`  Subsession: ${Number(t.iRacingSubsessionId)}`);

  // Show registered players
  try {
    const players = await tournament.getTournamentPlayers(tournamentId);
    if (players.length > 0) {
      console.log(`\n  Registered players:`);
      for (const addr of players) {
        const reg = await tournament.getPlayerRegistration(tournamentId, addr);
        const balance = await usdc.balanceOf(addr);
        console.log(`    ${addr} — iRacing ID: ${Number(reg.iRacingCustomerId)}, USDC balance: ${Number(balance) / 1_000_000}`);
      }
    }
  } catch (e) {
    // getTournamentPlayers may not exist on older deployments
  }

  if (action === "status") return;

  // Execute action
  console.log(`\nExecuting: ${action}...`);

  if (action === "close") {
    const tx = await tournament.closeRegistration(tournamentId);
    await tx.wait();
    console.log("Registration closed! Status → RegistrationClosed");
  } else if (action === "start") {
    const tx = await tournament.startRace(tournamentId);
    await tx.wait();
    console.log("Race started! Status → Racing");
  } else if (action === "cancel") {
    const tx = await tournament.cancelTournament(tournamentId);
    await tx.wait();
    console.log("Tournament cancelled! Players can claim refunds.");
  } else {
    console.log(`Unknown action: ${action}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
