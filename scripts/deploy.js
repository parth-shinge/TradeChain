const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // 1. Deploy UserRegistry first (no dependencies)
  console.log("\n--- Deploying UserRegistry ---");
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const userRegistryAddress = await userRegistry.getAddress();
  console.log("UserRegistry deployed to:", userRegistryAddress);

  // 2. Deploy OrderTracking (depends on UserRegistry)
  console.log("\n--- Deploying OrderTracking ---");
  const OrderTracking = await hre.ethers.getContractFactory("OrderTracking");
  const orderTracking = await OrderTracking.deploy(userRegistryAddress);
  await orderTracking.waitForDeployment();
  const orderTrackingAddress = await orderTracking.getAddress();
  console.log("OrderTracking deployed to:", orderTrackingAddress);

  // 3. Deploy DisputeManager (depends on UserRegistry)
  console.log("\n--- Deploying DisputeManager ---");
  const DisputeManager = await hre.ethers.getContractFactory("DisputeManager");
  const disputeManager = await DisputeManager.deploy(userRegistryAddress);
  await disputeManager.waitForDeployment();
  const disputeManagerAddress = await disputeManager.getAddress();
  console.log("DisputeManager deployed to:", disputeManagerAddress);

  // 4. Deploy SchemeRegistry (depends on UserRegistry)
  console.log("\n--- Deploying SchemeRegistry ---");
  const SchemeRegistry = await hre.ethers.getContractFactory("SchemeRegistry");
  const schemeRegistry = await SchemeRegistry.deploy(userRegistryAddress);
  await schemeRegistry.waitForDeployment();
  const schemeRegistryAddress = await schemeRegistry.getAddress();
  console.log("SchemeRegistry deployed to:", schemeRegistryAddress);

  // Summary
  console.log("\n========== DEPLOYMENT SUMMARY ==========");
  console.log("UserRegistry   :", userRegistryAddress);
  console.log("OrderTracking  :", orderTrackingAddress);
  console.log("DisputeManager :", disputeManagerAddress);
  console.log("SchemeRegistry :", schemeRegistryAddress);
  console.log("=========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
