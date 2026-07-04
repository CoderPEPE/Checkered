const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Sending from:", deployer.address);

  const recipient = "0xCE3dF6cfBf94b40d87e49A0379b0B213c6D3cB11";

  // --- CHEX Transfer (18 decimals) ---
  const chexAddress = "0xB53FF45C2E4157f251d0eeD0baEEA202f3052b7D";
  const chexAmount = hre.ethers.parseUnits("10000", 18);
  const chex = await hre.ethers.getContractAt("CheckeredCredits", chexAddress);

  const chexBalance = await chex.balanceOf(deployer.address);
  console.log("CHEX balance:", hre.ethers.formatUnits(chexBalance, 18));

  if (chexBalance < chexAmount) {
    console.error("ERROR: Insufficient CHEX balance. Need 10,000 but have", hre.ethers.formatUnits(chexBalance, 18));
    process.exit(1);
  }

  console.log(`\nTransferring 10,000 CHEX to ${recipient}...`);
  const chexTx = await chex.transfer(recipient, chexAmount);
  console.log("CHEX tx hash:", chexTx.hash);
  const chexReceipt = await chexTx.wait();
  console.log("CHEX confirmed in block:", chexReceipt.blockNumber);

  // --- USDC Transfer (6 decimals) ---
  const usdcAddress = "0x857cFa7518f35cc472f5C956C9161E3780dd0016";
  const usdcAmount = hre.ethers.parseUnits("10000", 6);
  const usdc = await hre.ethers.getContractAt("MockUSDC", usdcAddress);

  const usdcBalance = await usdc.balanceOf(deployer.address);
  console.log("\nUSDC balance:", hre.ethers.formatUnits(usdcBalance, 6));

  if (usdcBalance < usdcAmount) {
    console.error("ERROR: Insufficient USDC balance. Need 10,000 but have", hre.ethers.formatUnits(usdcBalance, 6));
    process.exit(1);
  }

  console.log(`Transferring 10,000 USDC to ${recipient}...`);
  const usdcTx = await usdc.transfer(recipient, usdcAmount);
  console.log("USDC tx hash:", usdcTx.hash);
  const usdcReceipt = await usdcTx.wait();
  console.log("USDC confirmed in block:", usdcReceipt.blockNumber);

  // --- Final balances ---
  console.log("\n--- Balances after transfers ---");
  console.log("Sender CHEX:", hre.ethers.formatUnits(await chex.balanceOf(deployer.address), 18));
  console.log("Recipient CHEX:", hre.ethers.formatUnits(await chex.balanceOf(recipient), 18));
  console.log("Sender USDC:", hre.ethers.formatUnits(await usdc.balanceOf(deployer.address), 6));
  console.log("Recipient USDC:", hre.ethers.formatUnits(await usdc.balanceOf(recipient), 6));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
