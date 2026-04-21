const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Granting roles from deployer:", deployer.address);

  const tournamentAddress = process.env.TOURNAMENT_CONTRACT_ADDRESS;
  if (!tournamentAddress) {
    console.error("TOURNAMENT_CONTRACT_ADDRESS not set in .env");
    process.exit(1);
  }

  const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
  if (!oraclePrivateKey) {
    console.error("ORACLE_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  // Derive oracle wallet address from private key
  const oracleWallet = new hre.ethers.Wallet(oraclePrivateKey);
  console.log("Oracle wallet address:", oracleWallet.address);

  const TOURNAMENT_ABI = [
    "function ADMIN_ROLE() view returns (bytes32)",
    "function ORACLE_ROLE() view returns (bytes32)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function grantRole(bytes32, address) external",
  ];

  const tournament = new hre.ethers.Contract(tournamentAddress, TOURNAMENT_ABI, deployer);

  const ADMIN_ROLE = await tournament.ADMIN_ROLE();
  const ORACLE_ROLE = await tournament.ORACLE_ROLE();

  const hasAdmin = await tournament.hasRole(ADMIN_ROLE, oracleWallet.address);
  const hasOracle = await tournament.hasRole(ORACLE_ROLE, oracleWallet.address);

  console.log(`Oracle has ADMIN_ROLE:  ${hasAdmin}`);
  console.log(`Oracle has ORACLE_ROLE: ${hasOracle}`);

  if (!hasAdmin) {
    console.log("\nGranting ADMIN_ROLE to oracle wallet...");
    const tx = await tournament.grantRole(ADMIN_ROLE, oracleWallet.address, { gasLimit: 100000 });
    await tx.wait();
    console.log("ADMIN_ROLE granted. TX:", tx.hash);
  } else {
    console.log("\nOracle already has ADMIN_ROLE — nothing to do.");
  }

  if (!hasOracle) {
    console.log("Granting ORACLE_ROLE to oracle wallet...");
    const tx = await tournament.grantRole(ORACLE_ROLE, oracleWallet.address, { gasLimit: 100000 });
    await tx.wait();
    console.log("ORACLE_ROLE granted. TX:", tx.hash);
  } else {
    console.log("Oracle already has ORACLE_ROLE — nothing to do.");
  }

  console.log("\nDone. Oracle wallet can now auto-advance tournament states and submit results.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
