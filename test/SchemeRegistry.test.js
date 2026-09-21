const { expect } = require("chai");
const hre = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("SchemeRegistry", function () {
  let userRegistry;
  let schemeRegistry;
  let admin, cfa, unregistered;
  let termsHash;

  beforeEach(async function () {
    [admin, cfa, unregistered] = await hre.ethers.getSigners();

    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();

    const SchemeRegistry = await hre.ethers.getContractFactory("SchemeRegistry");
    schemeRegistry = await SchemeRegistry.deploy(await userRegistry.getAddress());
    await schemeRegistry.waitForDeployment();

    const CFA_ROLE = await userRegistry.CFA_ROLE();
    await userRegistry.registerUser(
      cfa.address,
      "SAP_CFA_001",
      "CFA Name",
      CFA_ROLE,
      "DL_CFA_123"
    );

    termsHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test terms"));
  });

  describe("Deployment", function () {
    it("1. Should store correct userRegistry address", async function () {
      expect(await schemeRegistry.userRegistry()).to.equal(await userRegistry.getAddress());
    });

    it("should revert if initialized with zero address", async function () {
      const SchemeRegistry = await hre.ethers.getContractFactory("SchemeRegistry");
      await expect(SchemeRegistry.deploy(hre.ethers.ZeroAddress)).to.be.revertedWith("SchemeRegistry: zero registry address");
    });
  });

  describe("Scheme Creation", function () {
    it("2. createScheme by admin - succeeds", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400; // 1 day later

      await expect(
        schemeRegistry.connect(admin).createScheme(
          "Diwali Bonanza",
          "PROD123",
          validFrom,
          validTo,
          termsHash
        )
      ).to.not.be.reverted;
    });

    it("3. createScheme by non-admin - REVERTS", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await expect(
        schemeRegistry.connect(cfa).createScheme(
          "Diwali Bonanza",
          "PROD123",
          validFrom,
          validTo,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: caller is not admin");
    });

    it("4. createScheme by unregistered user - REVERTS", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await expect(
        schemeRegistry.connect(unregistered).createScheme(
          "Diwali Bonanza",
          "PROD123",
          validFrom,
          validTo,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: caller is not admin");
    });

    it("5. createScheme with empty title - REVERTS", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await expect(
        schemeRegistry.connect(admin).createScheme(
          "",
          "PROD123",
          validFrom,
          validTo,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: empty title");
    });

    it("6. createScheme with empty productSAP - REVERTS", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await expect(
        schemeRegistry.connect(admin).createScheme(
          "Diwali Bonanza",
          "",
          validFrom,
          validTo,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: empty productSAP");
    });

    it("7. createScheme with invalid date range (validTo <= validFrom) - REVERTS", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom;

      await expect(
        schemeRegistry.connect(admin).createScheme(
          "Diwali Bonanza",
          "PROD123",
          validFrom,
          validTo,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: invalid date range");
      
      await expect(
        schemeRegistry.connect(admin).createScheme(
          "Diwali Bonanza",
          "PROD123",
          validFrom,
          validFrom - 1,
          termsHash
        )
      ).to.be.revertedWith("SchemeRegistry: invalid date range");
    });

    it("8. Scheme ID auto-increments starting at 1", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await schemeRegistry.connect(admin).createScheme("S1", "P1", validFrom, validTo, termsHash);
      const res1 = await schemeRegistry.verifyScheme(1);
      expect(res1.scheme.schemeId).to.equal(1n);

      await schemeRegistry.connect(admin).createScheme("S2", "P2", validFrom, validTo, termsHash);
      const res2 = await schemeRegistry.verifyScheme(2);
      expect(res2.scheme.schemeId).to.equal(2n);
    });

    it("17. Events: SchemeCreated emitted with correct args", async function () {
      const validFrom = (await time.latest()) + 100;
      const validTo = validFrom + 86400;

      await expect(
        schemeRegistry.connect(admin).createScheme("S1", "P1", validFrom, validTo, termsHash)
      ).to.emit(schemeRegistry, "SchemeCreated")
        .withArgs(1n, "S1", "P1");
    });
  });

  describe("Scheme Verification", function () {
    let validFrom, validTo, schemeId;

    beforeEach(async function () {
      validFrom = (await time.latest()) + 100;
      validTo = validFrom + 86400;

      await schemeRegistry.connect(admin).createScheme("Diwali", "PROD1", validFrom, validTo, termsHash);
      schemeId = 1n;
    });

    it("9. verifyScheme returns correct scheme struct", async function () {
      const { scheme } = await schemeRegistry.verifyScheme(schemeId);
      expect(scheme.schemeId).to.equal(schemeId);
      expect(scheme.title).to.equal("Diwali");
      expect(scheme.productSAP).to.equal("PROD1");
      expect(scheme.validFrom).to.equal(BigInt(validFrom));
      expect(scheme.validTo).to.equal(BigInt(validTo));
    });

    it("18. termsHash stored correctly", async function () {
      const { scheme } = await schemeRegistry.verifyScheme(schemeId);
      expect(scheme.termsHash).to.equal(termsHash);
    });

    it("19. isActive flag defaults to true", async function () {
      const { scheme } = await schemeRegistry.verifyScheme(schemeId);
      expect(scheme.isActive).to.be.true;
    });

    it("20. createdAt timestamp is set", async function () {
      const { scheme } = await schemeRegistry.verifyScheme(schemeId);
      expect(scheme.createdAt).to.be.closeTo(BigInt(await time.latest()), 2n);
    });

    it("12. verifyScheme - not yet started scheme (timestamp before validFrom) -> currentlyActive = false", async function () {
      const { currentlyActive } = await schemeRegistry.verifyScheme(schemeId);
      expect(currentlyActive).to.be.false;
    });

    it("10. verifyScheme - currently active scheme (timestamp between validFrom and validTo)", async function () {
      await time.increaseTo(validFrom + 10);
      const { currentlyActive } = await schemeRegistry.verifyScheme(schemeId);
      expect(currentlyActive).to.be.true;
    });

    it("11. verifyScheme - expired scheme (timestamp past validTo) -> currentlyActive = false", async function () {
      await time.increaseTo(validTo + 10);
      const { currentlyActive } = await schemeRegistry.verifyScheme(schemeId);
      expect(currentlyActive).to.be.false;
    });

    it("21. Scheme transition from active to expired as time passes", async function () {
      await time.increaseTo(validFrom + 10);
      expect((await schemeRegistry.verifyScheme(schemeId)).currentlyActive).to.be.true;
      
      await time.increaseTo(validTo + 10);
      expect((await schemeRegistry.verifyScheme(schemeId)).currentlyActive).to.be.false;
    });

    it("13. verifyScheme with invalid ID - REVERTS", async function () {
      await expect(schemeRegistry.verifyScheme(0)).to.be.revertedWith("SchemeRegistry: invalid scheme ID");
      await expect(schemeRegistry.verifyScheme(2)).to.be.revertedWith("SchemeRegistry: invalid scheme ID");
    });
  });

  describe("Querying Schemes by Product", function () {
    let validFrom, validTo;

    beforeEach(async function () {
      validFrom = (await time.latest()) + 100;
      validTo = validFrom + 86400;
    });

    it("14. getSchemesByProduct returns correct scheme IDs", async function () {
      await schemeRegistry.connect(admin).createScheme("S1", "P1", validFrom, validTo, termsHash);
      const schemes = await schemeRegistry.getSchemesByProduct("P1");
      expect(schemes.length).to.equal(1);
      expect(schemes[0]).to.equal(1n);
    });

    it("15. Multiple schemes for same product", async function () {
      await schemeRegistry.connect(admin).createScheme("S1", "P1", validFrom, validTo, termsHash);
      await schemeRegistry.connect(admin).createScheme("S2", "P1", validFrom, validTo, termsHash);
      
      const schemes = await schemeRegistry.getSchemesByProduct("P1");
      expect(schemes.length).to.equal(2);
      expect(schemes[0]).to.equal(1n);
      expect(schemes[1]).to.equal(2n);
    });

    it("16. Multiple schemes for different products", async function () {
      await schemeRegistry.connect(admin).createScheme("S1", "P1", validFrom, validTo, termsHash);
      await schemeRegistry.connect(admin).createScheme("S2", "P2", validFrom, validTo, termsHash);
      await schemeRegistry.connect(admin).createScheme("S3", "P1", validFrom, validTo, termsHash);

      const schemesP1 = await schemeRegistry.getSchemesByProduct("P1");
      expect(schemesP1.length).to.equal(2);
      expect(schemesP1[0]).to.equal(1n);
      expect(schemesP1[1]).to.equal(3n);

      const schemesP2 = await schemeRegistry.getSchemesByProduct("P2");
      expect(schemesP2.length).to.equal(1);
      expect(schemesP2[0]).to.equal(2n);
    });
    
    it("returns empty array for product with no schemes", async function () {
      const schemes = await schemeRegistry.getSchemesByProduct("P_NON_EXISTENT");
      expect(schemes.length).to.equal(0);
    });
  });
});
