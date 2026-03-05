const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const network = hre.network.name;
  let usdcAddress;

  if (network === "baseMainnet") {
    // Real USDC on Base mainnet
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("Using Base mainnet USDC:", usdcAddress);
  } else {
    // Deploy MockUSDC for testnet
    console.log("Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    // Mint test tokens to deployer
    const mintAmount = hre.ethers.parseUnits("100000", 6); // 100k USDC
    await mockUsdc.mint(deployer.address, mintAmount);
    console.log("Minted 100,000 test USDC to deployer");
  }

  // Deploy Tournament contract
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const platformFeeBps = 500; // 5%

  console.log("\nDeploying IRacingTournament...");
  console.log("  USDC:", usdcAddress);
  console.log("  Treasury:", treasuryAddress);
  console.log("  Platform Fee:", platformFeeBps, "bps (5%)");

  const Tournament = await hre.ethers.getContractFactory("IRacingTournament");
  const tournament = await Tournament.deploy(usdcAddress, treasuryAddress, platformFeeBps);
  await tournament.waitForDeployment();
  const tournamentAddress = await tournament.getAddress();
  console.log("IRacingTournament deployed to:", tournamentAddress);

  // Grant oracle role if ORACLE_ADDRESS is set
  if (process.env.ORACLE_ADDRESS && process.env.ORACLE_ADDRESS !== deployer.address) {
    const ORACLE_ROLE = await tournament.ORACLE_ROLE();
    await tournament.grantRole(ORACLE_ROLE, process.env.ORACLE_ADDRESS);
    console.log("Oracle role granted to:", process.env.ORACLE_ADDRESS);
  }

  // Summary
  console.log("\n============================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("============================================");
  console.log("  Network:     ", network);
  console.log("  USDC:        ", usdcAddress);
  console.log("  Tournament:  ", tournamentAddress);
  console.log("  Treasury:    ", treasuryAddress);
  console.log("  Fee:          5% (500 bps)");
  console.log("============================================");
  console.log("\nTo verify on BaseScan:");
  console.log(`  npx hardhat verify --network ${network} ${tournamentAddress} ${usdcAddress} ${treasuryAddress} ${platformFeeBps}`);
  if (network !== "baseMainnet") {
    console.log(`  npx hardhat verify --network ${network} ${usdcAddress}`);
  }

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      usdc: usdcAddress,
      tournament: tournamentAddress,
    },
    config: {
      treasury: treasuryAddress,
      platformFeeBps,
    },
  };
  fs.writeFileSync(
    `deployments/${network}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\nDeployment info saved to deployments/${network}.json`);
}

// Create deployments directory
const fs = require("fs");
if (!fs.existsSync("deployments")) {
  fs.mkdirSync("deployments");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
