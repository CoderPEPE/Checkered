/**
 * Mint test USDC to a wallet address on Base Sepolia.
 *
 * Usage:
 *   npx hardhat run scripts/mint-usdc.js --network baseSepolia
 *
 * Set MINT_TO and MINT_AMOUNT env vars, or it uses defaults.
 * Example:
 *   MINT_TO=0xYourWalletAddress MINT_AMOUNT=100 npx hardhat run scripts/mint-usdc.js --network baseSepolia
 */
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const recipient = process.env.MINT_TO || deployer.address;
  const amount = parseFloat(process.env.MINT_AMOUNT || "100");
  const amountUnits = BigInt(Math.round(amount * 1_000_000)); // USDC has 6 decimals

  console.log(`Minting ${amount} USDC to ${recipient}...`);

  const usdc = await hre.ethers.getContractAt(
    "MockUSDC",
    "0xD24Ed1355C533771360A4a8dC724C1c1Fe2cB918",
    deployer
  );

  const tx = await usdc.mint(recipient, amountUnits);
  const receipt = await tx.wait();

  const balance = await usdc.balanceOf(recipient);
  console.log(`Done! TX: ${receipt.hash}`);
  console.log(`${recipient} balance: ${Number(balance) / 1_000_000} USDC`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
