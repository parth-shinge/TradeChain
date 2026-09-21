const { expect } = require("chai");
const hre = require("hardhat");

describe("DisputeManager", function () {
    let UserRegistry, userRegistry;
    let DisputeManager, disputeManager;
    let admin, cfa, distributor, stockist, pharmacy, unregistered;

    // Roles
    let ADMIN_ROLE, CFA_ROLE, DISTRIBUTOR_ROLE, STOCKIST_ROLE, PHARMACY_ROLE;

    beforeEach(async function () {
        [admin, cfa, distributor, stockist, pharmacy, unregistered] = await hre.ethers.getSigners();

        // Deploy UserRegistry
        UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
        userRegistry = await UserRegistry.deploy();
        await userRegistry.waitForDeployment();

        // Get Role Hashes
        ADMIN_ROLE = await userRegistry.ADMIN_ROLE();
        CFA_ROLE = await userRegistry.CFA_ROLE();
        DISTRIBUTOR_ROLE = await userRegistry.DISTRIBUTOR_ROLE();
        STOCKIST_ROLE = await userRegistry.STOCKIST_ROLE();
        PHARMACY_ROLE = await userRegistry.PHARMACY_ROLE();

        // Register Users
        await userRegistry.connect(admin).registerUser(admin.address, "SAP-100001", "Admin Pharma", ADMIN_ROLE, "");
        await userRegistry.connect(admin).registerUser(cfa.address, "SAP-CFA-1", "CFA Agent", CFA_ROLE, "");
        await userRegistry.connect(admin).registerUser(distributor.address, "SAP-DIST-1", "Distributor 1", DISTRIBUTOR_ROLE, "DL-123");
        await userRegistry.connect(admin).registerUser(stockist.address, "SAP-STOCK-1", "Stockist 1", STOCKIST_ROLE, "DL-456");
        await userRegistry.connect(admin).registerUser(pharmacy.address, "SAP-PHARM-1", "Pharmacy 1", PHARMACY_ROLE, "DL-789");

        // Deploy DisputeManager
        DisputeManager = await hre.ethers.getContractFactory("DisputeManager");
        const userRegistryAddress = await userRegistry.getAddress();
        disputeManager = await DisputeManager.deploy(userRegistryAddress);
        await disputeManager.waitForDeployment();
    });

    describe("Deployment", function () {
        it("1. Should store the userRegistry address correctly", async function () {
            expect(await disputeManager.userRegistry()).to.equal(await userRegistry.getAddress());
        });
        
        it("Reverts if deployed with zero address", async function () {
            await expect(DisputeManager.deploy(hre.ethers.ZeroAddress)).to.be.revertedWith("DisputeManager: zero registry address");
        });
    });

    describe("raiseDispute", function () {
        it("2. raiseDispute by CFA - succeeds", async function () {
            const tx = await disputeManager.connect(cfa).raiseDispute("ORD-1", "QUANTITY_MISMATCH", "ipfs://hash1");
            await expect(tx).to.emit(disputeManager, "DisputeRaised").withArgs(1, "ORD-1", "QUANTITY_MISMATCH");
        });

        it("3. raiseDispute by DISTRIBUTOR - succeeds", async function () {
            const tx = await disputeManager.connect(distributor).raiseDispute("ORD-2", "DAMAGED", "ipfs://hash2");
            await expect(tx).to.emit(disputeManager, "DisputeRaised").withArgs(1, "ORD-2", "DAMAGED");
        });

        it("4. raiseDispute by STOCKIST - succeeds", async function () {
            const tx = await disputeManager.connect(stockist).raiseDispute("ORD-3", "EXPIRED", "ipfs://hash3");
            await expect(tx).to.emit(disputeManager, "DisputeRaised").withArgs(1, "ORD-3", "EXPIRED");
        });

        it("5. raiseDispute by PHARMACY - succeeds", async function () {
            const tx = await disputeManager.connect(pharmacy).raiseDispute("ORD-4", "WRONG_PRODUCT", "ipfs://hash4");
            await expect(tx).to.emit(disputeManager, "DisputeRaised").withArgs(1, "ORD-4", "WRONG_PRODUCT");
        });

        it("6. raiseDispute by ADMIN - REVERTS", async function () {
            await expect(disputeManager.connect(admin).raiseDispute("ORD-5", "DAMAGED", "ipfs://hash5"))
                .to.be.revertedWith("DisputeManager: admin cannot raise disputes");
        });

        it("7. raiseDispute by unregistered user - REVERTS", async function () {
            await expect(disputeManager.connect(unregistered).raiseDispute("ORD-6", "DAMAGED", "ipfs://hash6"))
                .to.be.revertedWith("DisputeManager: caller not registered");
        });

        it("8. raiseDispute with empty order code - REVERTS", async function () {
            await expect(disputeManager.connect(cfa).raiseDispute("", "DAMAGED", "ipfs://hash7"))
                .to.be.revertedWith("DisputeManager: empty order code");
        });

        it("9. raiseDispute with empty reason - REVERTS", async function () {
            await expect(disputeManager.connect(cfa).raiseDispute("ORD-8", "", "ipfs://hash8"))
                .to.be.revertedWith("DisputeManager: empty reason");
        });

        it("10. Dispute ID auto-increments starting at 1", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-9", "REASON1", "hash9");
            await disputeManager.connect(distributor).raiseDispute("ORD-10", "REASON2", "hash10");
            
            const dispute1 = await disputeManager.getDispute(1);
            const dispute2 = await disputeManager.getDispute(2);
            
            expect(dispute1.disputeId).to.equal(1);
            expect(dispute2.disputeId).to.equal(2);
        });
    });

    describe("getDispute", function () {
        beforeEach(async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-TEST", "TEST_REASON", "TEST_HASH");
        });

        it("11. getDispute returns correct full struct", async function () {
            const dispute = await disputeManager.getDispute(1);
            expect(dispute.disputeId).to.equal(1);
            expect(dispute.orderCode).to.equal("ORD-TEST");
            expect(dispute.raisedBy).to.equal(cfa.address);
            expect(dispute.reason).to.equal("TEST_REASON");
            expect(dispute.evidenceIpfsHash).to.equal("TEST_HASH");
            expect(dispute.status).to.equal(0); // DisputeStatus.OPEN
            expect(dispute.resolution).to.equal("");
            expect(dispute.createdAt).to.be.greaterThan(0);
            expect(dispute.resolvedAt).to.equal(0);
        });

        it("12. getDispute with invalid ID reverts", async function () {
            await expect(disputeManager.getDispute(0)).to.be.revertedWith("DisputeManager: invalid dispute ID");
            await expect(disputeManager.getDispute(2)).to.be.revertedWith("DisputeManager: invalid dispute ID");
        });
    });

    describe("resolveDispute", function () {
        beforeEach(async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-RES", "REASON", "HASH");
        });

        it("13. resolveDispute by admin - succeeds, status becomes RESOLVED", async function () {
            await disputeManager.connect(admin).resolveDispute(1, "Refund issued");
            const dispute = await disputeManager.getDispute(1);
            expect(dispute.status).to.equal(1); // RESOLVED
            expect(dispute.resolution).to.equal("Refund issued");
        });

        it("14. resolveDispute by non-admin - REVERTS", async function () {
            await expect(disputeManager.connect(cfa).resolveDispute(1, "Refund issued"))
                .to.be.revertedWith("DisputeManager: caller is not admin");
        });

        it("15. resolveDispute on already resolved dispute - REVERTS", async function () {
            await disputeManager.connect(admin).resolveDispute(1, "Refund issued");
            await expect(disputeManager.connect(admin).resolveDispute(1, "Another resolve"))
                .to.be.revertedWith("DisputeManager: dispute not open");
        });

        it("16. resolveDispute on rejected dispute - REVERTS", async function () {
            await disputeManager.connect(admin).rejectDispute(1, "Invalid claim");
            await expect(disputeManager.connect(admin).resolveDispute(1, "Try resolve"))
                .to.be.revertedWith("DisputeManager: dispute not open");
        });
        
        it("Reverts if dispute id is invalid when resolving", async function () {
            await expect(disputeManager.connect(admin).resolveDispute(99, "Resolve")).to.be.revertedWith("DisputeManager: invalid dispute ID");
        });
    });

    describe("rejectDispute", function () {
        beforeEach(async function () {
            await disputeManager.connect(distributor).raiseDispute("ORD-REJ", "REASON", "HASH");
        });

        it("17. rejectDispute by admin - succeeds, status becomes REJECTED", async function () {
            await disputeManager.connect(admin).rejectDispute(1, "Lack of evidence");
            const dispute = await disputeManager.getDispute(1);
            expect(dispute.status).to.equal(2); // REJECTED
            expect(dispute.resolution).to.equal("Lack of evidence");
        });

        it("18. rejectDispute by non-admin - REVERTS", async function () {
            await expect(disputeManager.connect(distributor).rejectDispute(1, "Reject"))
                .to.be.revertedWith("DisputeManager: caller is not admin");
        });

        it("19. rejectDispute on already resolved dispute - REVERTS", async function () {
            await disputeManager.connect(admin).resolveDispute(1, "Resolved");
            await expect(disputeManager.connect(admin).rejectDispute(1, "Reject now"))
                .to.be.revertedWith("DisputeManager: dispute not open");
        });

        it("20. rejectDispute on already rejected dispute - REVERTS", async function () {
            await disputeManager.connect(admin).rejectDispute(1, "Rejected first");
            await expect(disputeManager.connect(admin).rejectDispute(1, "Reject again"))
                .to.be.revertedWith("DisputeManager: dispute not open");
        });
        
        it("Reverts if dispute id is invalid when rejecting", async function () {
            await expect(disputeManager.connect(admin).rejectDispute(99, "Reject")).to.be.revertedWith("DisputeManager: invalid dispute ID");
        });
    });

    describe("Querying & Metadata", function () {
        it("21. getDisputesByOrder returns correct dispute IDs", async function () {
            await disputeManager.connect(pharmacy).raiseDispute("ORD-MULTI", "R1", "H1"); // ID 1
            await disputeManager.connect(stockist).raiseDispute("ORD-MULTI", "R2", "H2"); // ID 2
            
            const ids = await disputeManager.getDisputesByOrder("ORD-MULTI");
            expect(ids.length).to.equal(2);
            expect(ids[0]).to.equal(1n);
            expect(ids[1]).to.equal(2n);
        });

        it("22. Multiple disputes for same order", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-SAME", "R1", "H1");
            await disputeManager.connect(distributor).raiseDispute("ORD-SAME", "R2", "H2");
            
            const ids = await disputeManager.getDisputesByOrder("ORD-SAME");
            expect(ids.length).to.equal(2);
        });

        it("23. Events: DisputeRaised emitted with correct args", async function () {
            await expect(disputeManager.connect(cfa).raiseDispute("ORD-EVT", "REASON_EVT", "HASH_EVT"))
                .to.emit(disputeManager, "DisputeRaised")
                .withArgs(1, "ORD-EVT", "REASON_EVT");
        });

        it("24. Events: DisputeResolved emitted", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-EVT2", "REASON", "HASH");
            await expect(disputeManager.connect(admin).resolveDispute(1, "Resolved"))
                .to.emit(disputeManager, "DisputeResolved")
                .withArgs(1);
        });

        it("25. Events: DisputeRejected emitted", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-EVT3", "REASON", "HASH");
            await expect(disputeManager.connect(admin).rejectDispute(1, "Rejected"))
                .to.emit(disputeManager, "DisputeRejected")
                .withArgs(1);
        });

        it("26. Resolution string is stored correctly", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-RES", "REASON", "HASH");
            await disputeManager.connect(admin).resolveDispute(1, "Correctly Stored Resolution");
            const d = await disputeManager.getDispute(1);
            expect(d.resolution).to.equal("Correctly Stored Resolution");
        });

        it("27. Evidence IPFS hash stored correctly", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-IPFS", "REASON", "ipfs://QmMyHash");
            const d = await disputeManager.getDispute(1);
            expect(d.evidenceIpfsHash).to.equal("ipfs://QmMyHash");
        });

        it("28. Timestamps set correctly (createdAt, resolvedAt)", async function () {
            await disputeManager.connect(cfa).raiseDispute("ORD-TIME", "REASON", "HASH");
            let d = await disputeManager.getDispute(1);
            expect(d.createdAt).to.be.greaterThan(0);
            expect(d.resolvedAt).to.equal(0);

            await disputeManager.connect(admin).resolveDispute(1, "Resolved");
            d = await disputeManager.getDispute(1);
            expect(d.resolvedAt).to.be.greaterThan(d.createdAt);
        });

        it("29. raisedBy address stored correctly", async function () {
            await disputeManager.connect(stockist).raiseDispute("ORD-RAISED", "REASON", "HASH");
            const d = await disputeManager.getDispute(1);
            expect(d.raisedBy).to.equal(stockist.address);
        });
        
        it("30. Returns empty array for order without disputes", async function () {
            const ids = await disputeManager.getDisputesByOrder("NON-EXISTENT");
            expect(ids.length).to.equal(0);
        });
    });
});
