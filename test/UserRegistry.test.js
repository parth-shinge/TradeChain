const { expect } = require("chai");
const hre = require("hardhat");

describe("UserRegistry", function () {
  let UserRegistry;
  let userRegistry;
  let deployer;
  let admin2, cfa, distributor, stockist, pharmacy, nonAdmin;
  
  // Role constants
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  let ADMIN_ROLE, CFA_ROLE, DISTRIBUTOR_ROLE, STOCKIST_ROLE, PHARMACY_ROLE;

  beforeEach(async function () {
    [deployer, admin2, cfa, distributor, stockist, pharmacy, nonAdmin] = await hre.ethers.getSigners();
    
    UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();

    ADMIN_ROLE = await userRegistry.ADMIN_ROLE();
    CFA_ROLE = await userRegistry.CFA_ROLE();
    DISTRIBUTOR_ROLE = await userRegistry.DISTRIBUTOR_ROLE();
    STOCKIST_ROLE = await userRegistry.STOCKIST_ROLE();
    PHARMACY_ROLE = await userRegistry.PHARMACY_ROLE();
  });

  describe("Deployment", function () {
    it("should assign ADMIN_ROLE to the deployer", async function () {
      expect(await userRegistry.hasRole(ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("should assign DEFAULT_ADMIN_ROLE to the deployer", async function () {
      expect(await userRegistry.hasRole(DEFAULT_ADMIN_ROLE, deployer.address)).to.be.true;
    });

    it("Role constants should match expected keccak256 values", async function () {
      expect(ADMIN_ROLE).to.equal(hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ADMIN_ROLE")));
      expect(CFA_ROLE).to.equal(hre.ethers.keccak256(hre.ethers.toUtf8Bytes("CFA_ROLE")));
      expect(DISTRIBUTOR_ROLE).to.equal(hre.ethers.keccak256(hre.ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")));
      expect(STOCKIST_ROLE).to.equal(hre.ethers.keccak256(hre.ethers.toUtf8Bytes("STOCKIST_ROLE")));
      expect(PHARMACY_ROLE).to.equal(hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PHARMACY_ROLE")));
    });
  });

  describe("Registration (Success Cases)", function () {
    it("should register an ADMIN user", async function () {
      await expect(userRegistry.registerUser(admin2.address, "SAP_ADMIN2", "Admin Two", ADMIN_ROLE, ""))
        .to.emit(userRegistry, "UserRegistered")
        .withArgs(admin2.address, "SAP_ADMIN2", ADMIN_ROLE);
        
      expect(await userRegistry.hasRole(ADMIN_ROLE, admin2.address)).to.be.true;
    });

    it("should register a CFA user", async function () {
      await userRegistry.registerUser(cfa.address, "SAP_CFA", "CFA Agent", CFA_ROLE, "DL123");
      expect(await userRegistry.hasRole(CFA_ROLE, cfa.address)).to.be.true;
    });

    it("should register a DISTRIBUTOR user", async function () {
      await userRegistry.registerUser(distributor.address, "SAP_DIST", "Distributor", DISTRIBUTOR_ROLE, "DL456");
      expect(await userRegistry.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
    });

    it("should register a STOCKIST user", async function () {
      await userRegistry.registerUser(stockist.address, "SAP_STOCK", "Stockist", STOCKIST_ROLE, "DL789");
      expect(await userRegistry.hasRole(STOCKIST_ROLE, stockist.address)).to.be.true;
    });

    it("should register a PHARMACY user", async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy", PHARMACY_ROLE, "DL999");
      expect(await userRegistry.hasRole(PHARMACY_ROLE, pharmacy.address)).to.be.true;
    });

    it("should register successfully with an empty drug license string", async function () {
      await userRegistry.registerUser(cfa.address, "SAP_CFA2", "CFA 2", CFA_ROLE, "");
      const user = await userRegistry.getUser(cfa.address);
      expect(user.drugLicenseNo).to.equal("");
    });

    it("should allow registering multiple users with different roles", async function () {
      await userRegistry.registerUser(cfa.address, "SAP_CFA", "CFA", CFA_ROLE, "DL1");
      await userRegistry.registerUser(distributor.address, "SAP_DIST", "Distributor", DISTRIBUTOR_ROLE, "DL2");
      await userRegistry.registerUser(stockist.address, "SAP_STOCK", "Stockist", STOCKIST_ROLE, "DL3");
      
      expect(await userRegistry.hasRole(CFA_ROLE, cfa.address)).to.be.true;
      expect(await userRegistry.hasRole(DISTRIBUTOR_ROLE, distributor.address)).to.be.true;
      expect(await userRegistry.hasRole(STOCKIST_ROLE, stockist.address)).to.be.true;
    });

    it("should verify AccessControl correctly via hasRole for registered users", async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy", PHARMACY_ROLE, "DL999");
      expect(await userRegistry.hasRole(PHARMACY_ROLE, pharmacy.address)).to.be.true;
      expect(await userRegistry.hasRole(ADMIN_ROLE, pharmacy.address)).to.be.false;
    });
  });

  describe("Registration (Failure Cases)", function () {
    it("should revert if a non-admin tries to register a user", async function () {
      await expect(
        userRegistry.connect(nonAdmin).registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy", PHARMACY_ROLE, "DL999")
      ).to.be.revertedWith("UserRegistry: caller is not admin");
    });

    it("should revert when registering with the zero address", async function () {
      await expect(
        userRegistry.registerUser(hre.ethers.ZeroAddress, "SAP_0", "Zero", PHARMACY_ROLE, "")
      ).to.be.revertedWith("UserRegistry: zero address");
    });

    it("should revert when registering a duplicate address", async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM1", "Pharmacy 1", PHARMACY_ROLE, "");
      await expect(
        userRegistry.registerUser(pharmacy.address, "SAP_PHARM2", "Pharmacy 2", PHARMACY_ROLE, "")
      ).to.be.revertedWith("UserRegistry: user already registered");
    });

    it("should revert when registering a duplicate SAP code", async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_DUP", "Pharmacy 1", PHARMACY_ROLE, "");
      await expect(
        userRegistry.registerUser(stockist.address, "SAP_DUP", "Stockist", STOCKIST_ROLE, "")
      ).to.be.revertedWith("UserRegistry: SAP code already used");
    });

    it("should revert when registering with an empty SAP code", async function () {
      await expect(
        userRegistry.registerUser(pharmacy.address, "", "Pharmacy", PHARMACY_ROLE, "")
      ).to.be.revertedWith("UserRegistry: empty SAP code");
    });

    it("should revert when registering with an invalid role", async function () {
      const INVALID_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("INVALID_ROLE"));
      await expect(
        userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy", INVALID_ROLE, "")
      ).to.be.revertedWith("UserRegistry: invalid role");
    });
  });

  describe("Data Retrieval", function () {
    beforeEach(async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy Name", PHARMACY_ROLE, "DL999");
    });

    it("getUser by address should return the correct struct", async function () {
      const user = await userRegistry.getUser(pharmacy.address);
      expect(user.userAddress).to.equal(pharmacy.address);
      expect(user.sapCode).to.equal("SAP_PHARM");
      expect(user.sapName).to.equal("Pharmacy Name");
      expect(user.role).to.equal(PHARMACY_ROLE);
      expect(user.drugLicenseNo).to.equal("DL999");
      expect(user.isActive).to.be.true;
    });

    it("getUserBySAP should return the correct address and user struct", async function () {
      const [addr, user] = await userRegistry.getUserBySAP("SAP_PHARM");
      expect(addr).to.equal(pharmacy.address);
      expect(user.userAddress).to.equal(pharmacy.address);
      expect(user.sapName).to.equal("Pharmacy Name");
    });

    it("isRegistered should return true for a registered user", async function () {
      expect(await userRegistry.isRegistered(pharmacy.address)).to.be.true;
    });

    it("isRegistered should return false for an unregistered user", async function () {
      expect(await userRegistry.isRegistered(nonAdmin.address)).to.be.false;
    });

    it("getUser should revert for a non-existent user", async function () {
      await expect(userRegistry.getUser(nonAdmin.address)).to.be.revertedWith("UserRegistry: user not found");
    });

    it("getUserBySAP should revert for a non-existent SAP code", async function () {
      await expect(userRegistry.getUserBySAP("INVALID_SAP")).to.be.revertedWith("UserRegistry: SAP code not found");
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy Name", PHARMACY_ROLE, "DL999");
    });

    it("only admin can revoke users", async function () {
      await expect(
        userRegistry.connect(nonAdmin).revokeUser(pharmacy.address)
      ).to.be.revertedWith("UserRegistry: caller is not admin");
    });

    it("revokeUser should deactivate the user and revoke their role", async function () {
      await userRegistry.revokeUser(pharmacy.address);
      
      expect(await userRegistry.isRegistered(pharmacy.address)).to.be.false;
      expect(await userRegistry.hasRole(PHARMACY_ROLE, pharmacy.address)).to.be.false;
    });

    it("revokeUser should emit UserRevoked event", async function () {
      await expect(userRegistry.revokeUser(pharmacy.address))
        .to.emit(userRegistry, "UserRevoked")
        .withArgs(pharmacy.address);
    });

    it("cannot revoke an already revoked user", async function () {
      await userRegistry.revokeUser(pharmacy.address);
      await expect(userRegistry.revokeUser(pharmacy.address)).to.be.revertedWith("UserRegistry: user not active");
    });

    it("revoked user's SAP lookup should fail", async function () {
      await userRegistry.revokeUser(pharmacy.address);
      await expect(userRegistry.getUserBySAP("SAP_PHARM")).to.be.revertedWith("UserRegistry: user not active");
    });

    it("re-registration after revocation with same SAP code should fail due to SAP code uniqueness", async function () {
      await userRegistry.revokeUser(pharmacy.address);
      // Because `sapCodeToAddress` is not cleared on revocation, the SAP code is still tied to the old address
      await expect(
        userRegistry.registerUser(pharmacy.address, "SAP_PHARM", "Pharmacy Name", PHARMACY_ROLE, "DL999")
      ).to.be.revertedWith("UserRegistry: SAP code already used");
    });

    it("re-registration after revocation with new SAP code works", async function () {
      await userRegistry.revokeUser(pharmacy.address);
      // Registering the same address with a new SAP code is allowed because `users[_address].isActive` is false
      await userRegistry.registerUser(pharmacy.address, "SAP_PHARM_NEW", "Pharmacy Name", PHARMACY_ROLE, "DL999");
      expect(await userRegistry.isRegistered(pharmacy.address)).to.be.true;
    });
  });
});
