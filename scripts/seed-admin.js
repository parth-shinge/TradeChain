const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Seeding admin with account:", deployer.address);

  // Get the deployed UserRegistry — assumes it's deployed on the current network
  // For local testing, deploy first with deploy.js, then run this script
  // In production, replace with the actual deployed address
  const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");

  // Deploy a fresh instance for seeding (or attach to existing)
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  const registryAddress = await userRegistry.getAddress();
  console.log("UserRegistry at:", registryAddress);

  // The deployer already has ADMIN_ROLE from the constructor,
  // but we need to register them as a user with SAP code
  const ADMIN_ROLE = await userRegistry.ADMIN_ROLE();

  const tx = await userRegistry.registerUser(
    deployer.address,
    "SAP-100001",
    "Serum Institute HQ",
    ADMIN_ROLE,
    "" // No drug license for admin
  );
  await tx.wait();

  console.log("Admin registered successfully!");
  console.log("  Address:", deployer.address);
  console.log("  SAP Code: SAP-100001");
  console.log("  SAP Name: Serum Institute HQ");
  console.log("  Role: ADMIN_ROLE");

  // Verify
  const user = await userRegistry.getUser(deployer.address);
  console.log("\nVerification:");
  console.log("  SAP Code:", user.sapCode);
  console.log("  SAP Name:", user.sapName);
  console.log("  Is Active:", user.isActive);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
