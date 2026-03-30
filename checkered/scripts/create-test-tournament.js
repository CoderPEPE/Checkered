require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Creating tournament with:", deployer.address);

  // Connect to deployed contract
  const contractAddress = process.env.TOURNAMENT_CONTRACT_ADDRESS || "0x44cB744685c5591ac19E3b04d10569F735e5E263";
  const tournament = await hre.ethers.getContractAt(
    "IRacingTournament",
    contractAddress,
    deployer
  );

  // Check deployer has ADMIN_ROLE
  const ADMIN_ROLE = await tournament.ADMIN_ROLE();
  const hasAdmin = await tournament.hasRole(ADMIN_ROLE, deployer.address);
  console.log("Has ADMIN_ROLE:", hasAdmin);
  if (!hasAdmin) {
    console.error("ERROR: Deployer does not have ADMIN_ROLE. Cannot create tournament.");
    process.exit(1);
  }

  // Tournament parameters
  const name = "League Test Tournament";
  const entryFee = 1000000;              // 1 USDC (6 decimals)
  const maxPlayers = 20;
  const prizeSplits = [6000, 3000, 1000]; // 60/30/10
  const subsessionId = 0;                // 0 = auto-discover from league
  const leagueId = 14250;                // iRacing league ID
  const seasonId = 1;                    // Season ID (update if needed)

  console.log("\nTournament details:");
  console.log("  Name:", name);
  console.log("  Entry Fee: 1 USDC");
  console.log("  Max Players:", maxPlayers);
  console.log("  Prize Split: 60/30/10");
  console.log("  Subsession ID:", subsessionId, "(auto-discover)");
  console.log("  League ID:", leagueId);
  console.log("  Season ID:", seasonId);

  const tx = await tournament.createTournament(
    name,
    entryFee,
    maxPlayers,
    prizeSplits,
    subsessionId,
    leagueId,
    seasonId
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
