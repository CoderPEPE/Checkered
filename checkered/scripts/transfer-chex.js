const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Sending from:", deployer.address);

  // CHEX token address
  const chexAddress = "0x475fa1c8934F40Ad55804CD998C422e8b624F35c";
  // Recipient address
  const recipient = "0xCE3dF6cfBf94b40d87e49A0379b0B213c6D3cB11";
  // Half of 1,000,000 supply = 500,000 CHEX (18 decimals)
  const amount = hre.ethers.parseUnits("500000", 18);

  // Connect to the CHEX token contract
  const chex = await hre.ethers.getContractAt("CheckeredCredits", chexAddress);

  // Check balance before transfer
  const balance = await chex.balanceOf(deployer.address);
  console.log("Current balance:", hre.ethers.formatUnits(balance, 18), "CHEX");

  if (balance < amount) {
    console.error("ERROR: Insufficient CHEX balance. Need 500,000 but have", hre.ethers.formatUnits(balance, 18));
    process.exit(1);
  }

  // Transfer
  console.log(`\nTransferring 500,000 CHEX to ${recipient}...`);
  const tx = await chex.transfer(recipient, amount);
  console.log("Transaction hash:", tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log("Confirmed in block:", receipt.blockNumber);

  // Check balances after
  const senderBalance = await chex.balanceOf(deployer.address);
  const recipientBalance = await chex.balanceOf(recipient);
  console.log("\n--- Balances after transfer ---");
  console.log("Sender:", hre.ethers.formatUnits(senderBalance, 18), "CHEX");
  console.log("Recipient:", hre.ethers.formatUnits(recipientBalance, 18), "CHEX");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
