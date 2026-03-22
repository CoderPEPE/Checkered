require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating tournament with:", deployer.address);

  // Connect to deployed contract
  const tournament = await hre.ethers.getContractAt(
    "IRacingTournament",
    "0xF8D32D1AA112A3A5663eDDEF8a29ecc769233Def",
    deployer
  );

  // Tournament parameters
  const name = "Test Race 1";
  const entryFee = 1000000;           // 1 USDC (6 decimals)
  const maxPlayers = 10;
  const prizeSplits = [6000, 3000, 1000]; // 60/30/10
  const subsessionId = 12345;         // Fake iRacing subsession for testing

  console.log("\nTournament details:");
  console.log("  Name:", name);
  console.log("  Entry Fee: 1 USDC (1000000)");
  console.log("  Max Players:", maxPlayers);
  console.log("  Prize Split: 60/30/10");
  console.log("  Subsession ID:", subsessionId);

  const tx = await tournament.createTournament(
    name,
    entryFee,
    maxPlayers,
    prizeSplits,
    subsessionId
  );
  const receipt = await tx.wait();

  // Get tournament ID from the count
  const count = Number(await tournament.tournamentCount());
  const tournamentId = count - 1;

  console.log("\nTournament created!");
  console.log("  Tournament ID:", tournamentId);
  console.log("  TX Hash:", receipt.hash);
  console.log("  Gas Used:", receipt.gasUsed.toString());

  // Verify by reading it back
  const t = await tournament.getTournament(tournamentId);
  console.log("\nOn-chain verification:");
  console.log("  Name:", t.name);
  console.log("  Entry Fee:", t.entryFee.toString());
  console.log("  Max Players:", Number(t.maxPlayers));
  console.log("  Prize Pool:", t.prizePool.toString());
  console.log("  Status:", Number(t.status), "(0 = Created)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
