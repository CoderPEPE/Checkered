require("dotenv").config();
const hre = require("hardhat");

const CONTRACT = "0xF8D32D1AA112A3A5663eDDEF8a29ecc769233Def";

const tournaments = [
  { name: "Daytona 500 Sprint", fee: 5000000, max: 20, splits: [5000, 3000, 2000], sub: 67890 },
  { name: "Spa 24 Hours", fee: 10000000, max: 16, splits: [6000, 2500, 1500], sub: 11111 },
  { name: "Nurburgring Endurance", fee: 25000000, max: 8, splits: [7000, 2000, 1000], sub: 22222 },
  { name: "Watkins Glen GT3 Cup", fee: 2000000, max: 24, splits: [5000, 3000, 2000], sub: 33333 },
  { name: "Road America Challenge", fee: 3000000, max: 12, splits: [6000, 3000, 1000], sub: 44444 },
  { name: "Sebring 12 Hours", fee: 15000000, max: 10, splits: [5500, 3000, 1500], sub: 55555 },
  { name: "Monza Sprint Series", fee: 1000000, max: 30, splits: [6000, 2500, 1500], sub: 66666 },
  { name: "Bathurst 1000", fee: 20000000, max: 6, splits: [7000, 2000, 1000], sub: 77777 },
  { name: "Laguna Seca Time Trial", fee: 500000, max: 50, splits: [5000, 3000, 2000], sub: 88888 },
  { name: "Indianapolis 500", fee: 8000000, max: 15, splits: [6000, 2500, 1500], sub: 99999 },
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);

  const contract = await hre.ethers.getContractAt("IRacingTournament", CONTRACT, deployer);

  for (const t of tournaments) {
    const tx = await contract.createTournament(t.name, t.fee, t.max, t.splits, t.sub);
    await tx.wait();
    console.log("Created:", t.name, `($${t.fee / 1e6} USDC)`);
  }

  const count = await contract.tournamentCount();
  console.log("\nTotal tournaments:", Number(count));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
