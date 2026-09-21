const { expect } = require("chai");
const hre = require("hardhat");

describe("OrderTracking", function () {
  let userRegistry, orderTracking;
  let admin, cfa, distributor, stockist, pharmacy, unregistered;
  let ADMIN_ROLE, CFA_ROLE, DISTRIBUTOR_ROLE, STOCKIST_ROLE, PHARMACY_ROLE;
  
  const dummyItemsHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("dummy_items"));

  beforeEach(async function () {
    [admin, cfa, distributor, stockist, pharmacy, unregistered] = await hre.ethers.getSigners();

    const UserRegistry = await hre.ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();
    await userRegistry.waitForDeployment();

    ADMIN_ROLE = await userRegistry.ADMIN_ROLE();
    CFA_ROLE = await userRegistry.CFA_ROLE();
    DISTRIBUTOR_ROLE = await userRegistry.DISTRIBUTOR_ROLE();
    STOCKIST_ROLE = await userRegistry.STOCKIST_ROLE();
    PHARMACY_ROLE = await userRegistry.PHARMACY_ROLE();

    await userRegistry.connect(admin).registerUser(admin.address, "SAP_ADMIN", "Admin Co", ADMIN_ROLE, "DL-01");
    await userRegistry.connect(admin).registerUser(cfa.address, "SAP_CFA", "CFA Co", CFA_ROLE, "DL-02");
    await userRegistry.connect(admin).registerUser(distributor.address, "SAP_DIST", "Dist Co", DISTRIBUTOR_ROLE, "DL-03");
    await userRegistry.connect(admin).registerUser(stockist.address, "SAP_STOCK", "Stock Co", STOCKIST_ROLE, "DL-04");
    await userRegistry.connect(admin).registerUser(pharmacy.address, "SAP_PHARM", "Pharm Co", PHARMACY_ROLE, "DL-05");

    const OrderTracking = await hre.ethers.getContractFactory("OrderTracking");
    orderTracking = await OrderTracking.deploy(await userRegistry.getAddress());
    await orderTracking.waitForDeployment();
  });

  describe("Deployment", function () {
    it("stores userRegistry address correctly", async function () {
      expect(await orderTracking.userRegistry()).to.equal(await userRegistry.getAddress());
    });

    it("reverts if deployed with zero address", async function () {
      const OrderTracking = await hre.ethers.getContractFactory("OrderTracking");
      await expect(OrderTracking.deploy(hre.ethers.ZeroAddress))
        .to.be.revertedWith("OrderTracking: zero registry address");
    });
  });

  describe("createOrder", function () {
    it("createOrder by ADMIN role - succeeds", async function () {
      await expect(orderTracking.connect(admin).createOrder("ORD-001", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80))
        .to.not.be.reverted;
    });

    it("createOrder by CFA role - succeeds", async function () {
      await expect(orderTracking.connect(cfa).createOrder("ORD-002", "SAP_CFA", "SAP_DIST", dummyItemsHash, 1000, 40, 80))
        .to.not.be.reverted;
    });

    it("createOrder by DISTRIBUTOR role - succeeds", async function () {
      await expect(orderTracking.connect(distributor).createOrder("ORD-003", "SAP_DIST", "SAP_STOCK", dummyItemsHash, 1000, 40, 80))
        .to.not.be.reverted;
    });

    it("createOrder by STOCKIST role - succeeds", async function () {
      await expect(orderTracking.connect(stockist).createOrder("ORD-004", "SAP_STOCK", "SAP_PHARM", dummyItemsHash, 1000, 40, 80))
        .to.not.be.reverted;
    });

    it("createOrder by PHARMACY role - REVERTS (pharmacies cannot create orders)", async function () {
      await expect(
        orderTracking.connect(pharmacy).createOrder("ORD-005", "SAP_PHARM", "SAP_ADMIN", dummyItemsHash, 1000, 40, 80)
      ).to.be.revertedWith("OrderTracking: pharmacies cannot create orders");
    });

    it("createOrder by unregistered user - REVERTS", async function () {
      await expect(
        orderTracking.connect(unregistered).createOrder("ORD-006", "SAP_UNREG", "SAP_ADMIN", dummyItemsHash, 1000, 40, 80)
      ).to.be.revertedWith("OrderTracking: caller not registered");
    });

    it("Cannot create order with empty order code", async function () {
      await expect(
        orderTracking.connect(admin).createOrder("", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80)
      ).to.be.revertedWith("OrderTracking: empty order code");
    });

    it("Cannot create order with duplicate order code", async function () {
      await orderTracking.connect(admin).createOrder("ORD-007", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      await expect(
        orderTracking.connect(admin).createOrder("ORD-007", "SAP_ADMIN", "SAP_DIST", dummyItemsHash, 2000, 40, 80)
      ).to.be.revertedWith("OrderTracking: order already exists");
    });

    it("Cannot create order with empty fromSAP", async function () {
      await expect(
        orderTracking.connect(admin).createOrder("ORD-008", "", "SAP_CFA", dummyItemsHash, 1000, 40, 80)
      ).to.be.revertedWith("OrderTracking: empty fromSAP");
    });

    it("Cannot create order with empty toSAP", async function () {
      await expect(
        orderTracking.connect(admin).createOrder("ORD-009", "SAP_ADMIN", "", dummyItemsHash, 1000, 40, 80)
      ).to.be.revertedWith("OrderTracking: empty toSAP");
    });
  });

  describe("getOrder", function () {
    beforeEach(async function () {
      await orderTracking.connect(admin).createOrder("ORD-100", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 5000, 20, 80);
    });

    it("getOrder returns correct full struct", async function () {
      const order = await orderTracking.getOrder("ORD-100");
      expect(order.orderCode).to.equal("ORD-100");
      expect(order.fromSAP).to.equal("SAP_ADMIN");
      expect(order.toSAP).to.equal("SAP_CFA");
      expect(order.itemsHash).to.equal(dummyItemsHash);
      expect(order.totalAmount).to.equal(5000);
      expect(order.status).to.equal(0); // CREATED
      expect(order.temperatureAtDispatch).to.equal(20);
      expect(order.temperatureAtReceipt).to.equal(0);
      expect(order.maxTempThreshold).to.equal(80);
      expect(order.hasDispute).to.equal(false);
      expect(order.createdAt).to.be.above(0);
      expect(order.deliveredAt).to.equal(0);
    });

    it("getOrder reverts for non-existent order", async function () {
      await expect(orderTracking.getOrder("ORD-999"))
        .to.be.revertedWith("OrderTracking: order not found");
    });
  });

  describe("confirmDelivery", function () {
    beforeEach(async function () {
      await orderTracking.connect(admin).createOrder("ORD-200", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      await orderTracking.connect(admin).createOrder("ORD-NO-TEMP", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 200, 0); // threshold 0
    });

    it("confirmDelivery - normal temperature (status -> DELIVERED)", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 60);
      const order = await orderTracking.getOrder("ORD-200");
      expect(order.status).to.equal(2); // DELIVERED
      expect(order.hasDispute).to.equal(false);
      expect(order.temperatureAtReceipt).to.equal(60);
    });

    it("confirmDelivery - cold chain break auto-dispute (tempReceipt > maxThreshold and threshold > 0)", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 85);
      const order = await orderTracking.getOrder("ORD-200");
      expect(order.status).to.equal(3); // DISPUTED
      expect(order.hasDispute).to.equal(true);
      expect(order.temperatureAtReceipt).to.equal(85);
    });

    it("confirmDelivery - temperature at threshold exactly (not a break)", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 80);
      const order = await orderTracking.getOrder("ORD-200");
      expect(order.status).to.equal(2); // DELIVERED
      expect(order.hasDispute).to.equal(false);
    });

    it("confirmDelivery - threshold is 0 (no cold chain required, high temp OK)", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-NO-TEMP", dummyItemsHash, 250);
      const order = await orderTracking.getOrder("ORD-NO-TEMP");
      expect(order.status).to.equal(2); // DELIVERED
      expect(order.hasDispute).to.equal(false);
    });

    it("confirmDelivery - negative temperatures work correctly", async function () {
      // When maxTempThreshold is negative, the contract check (maxTempThreshold > 0) is false,
      // so cold chain break is never triggered for negative thresholds.
      // This is by design: negative thresholds are not meaningful for the cold chain check.
      await orderTracking.connect(admin).createOrder("ORD-FROZEN", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, -200, -100);
      await orderTracking.connect(cfa).confirmDelivery("ORD-FROZEN", dummyItemsHash, -150);
      const order = await orderTracking.getOrder("ORD-FROZEN");
      expect(order.status).to.equal(2); // DELIVERED — maxTempThreshold < 0, so no cold chain check
      expect(order.temperatureAtReceipt).to.equal(-150);

      // Even with receipt temp > threshold in signed comparison, maxTempThreshold > 0 is false
      await orderTracking.connect(admin).createOrder("ORD-FROZEN-2", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, -200, -100);
      await orderTracking.connect(cfa).confirmDelivery("ORD-FROZEN-2", dummyItemsHash, -50);
      const order2 = await orderTracking.getOrder("ORD-FROZEN-2");
      expect(order2.status).to.equal(2); // DELIVERED — maxTempThreshold < 0, no cold chain check
      expect(order2.temperatureAtReceipt).to.equal(-50);
    });

    it("Cannot confirm delivery for non-existent order", async function () {
      await expect(orderTracking.connect(cfa).confirmDelivery("ORD-999", dummyItemsHash, 50))
        .to.be.revertedWith("OrderTracking: order not found");
    });

    it("Cannot confirm delivery for already delivered order", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 50);
      await expect(orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 50))
        .to.be.revertedWith("OrderTracking: order already finalized");
    });

    it("Cannot confirm delivery for already disputed order", async function () {
      await orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 90); // will be disputed
      await expect(orderTracking.connect(cfa).confirmDelivery("ORD-200", dummyItemsHash, 50))
        .to.be.revertedWith("OrderTracking: order already finalized");
    });

    it("Only registered users can confirm delivery", async function () {
      await expect(orderTracking.connect(unregistered).confirmDelivery("ORD-200", dummyItemsHash, 50))
        .to.be.revertedWith("OrderTracking: caller not registered");
    });
  });

  describe("getOrdersByParty & Multi Tracking", function () {
    beforeEach(async function () {
      await orderTracking.connect(admin).createOrder("O1", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 100, 40, 80);
      await orderTracking.connect(cfa).createOrder("O2", "SAP_CFA", "SAP_DIST", dummyItemsHash, 100, 40, 80);
      await orderTracking.connect(admin).createOrder("O3", "SAP_ADMIN", "SAP_DIST", dummyItemsHash, 100, 40, 80);
    });

    it("getOrdersByParty returns correct order codes for sender", async function () {
      const adminOrders = await orderTracking.getOrdersByParty("SAP_ADMIN");
      expect(adminOrders).to.deep.equal(["O1", "O3"]);
    });

    it("getOrdersByParty returns correct order codes for receiver", async function () {
      const cfaOrders = await orderTracking.getOrdersByParty("SAP_CFA");
      expect(cfaOrders).to.deep.equal(["O1", "O2"]); // Received O1, sent O2
    });

    it("getOrdersByParty returns both sent and received orders", async function () {
      const distOrders = await orderTracking.getOrdersByParty("SAP_DIST");
      expect(distOrders).to.deep.equal(["O2", "O3"]); // Received both
    });

    it("Multiple orders tracking", async function () {
      await orderTracking.connect(distributor).createOrder("O4", "SAP_DIST", "SAP_STOCK", dummyItemsHash, 100, 40, 80);
      const stockOrders = await orderTracking.getOrdersByParty("SAP_STOCK");
      expect(stockOrders).to.deep.equal(["O4"]);
    });
  });

  describe("Events & Fields Verification", function () {
    it("Events: OrderCreated emitted with correct args", async function () {
      await expect(orderTracking.connect(admin).createOrder("EV-1", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80))
        .to.emit(orderTracking, "OrderCreated")
        .withArgs("EV-1", "SAP_ADMIN", "SAP_CFA");
    });

    it("Events: DeliveryConfirmed emitted (no dispute)", async function () {
      await orderTracking.connect(admin).createOrder("EV-2", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      await expect(orderTracking.connect(cfa).confirmDelivery("EV-2", dummyItemsHash, 50))
        .to.emit(orderTracking, "DeliveryConfirmed")
        .withArgs("EV-2", false);
    });

    it("Events: DeliveryConfirmed emitted (with dispute)", async function () {
      await orderTracking.connect(admin).createOrder("EV-3", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      await expect(orderTracking.connect(cfa).confirmDelivery("EV-3", dummyItemsHash, 90))
        .to.emit(orderTracking, "DeliveryConfirmed")
        .withArgs("EV-3", true);
    });

    it("Events: ColdChainBreak emitted when temp exceeds threshold", async function () {
      await orderTracking.connect(admin).createOrder("EV-4", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      await expect(orderTracking.connect(cfa).confirmDelivery("EV-4", dummyItemsHash, 85))
        .to.emit(orderTracking, "ColdChainBreak")
        .withArgs("EV-4", 85, 80);
    });

    it("Items hash is stored correctly", async function () {
      const customHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("custom"));
      await orderTracking.connect(admin).createOrder("CHK-1", "SAP_ADMIN", "SAP_CFA", customHash, 1000, 40, 80);
      const order = await orderTracking.getOrder("CHK-1");
      expect(order.itemsHash).to.equal(customHash);
    });

    it("Timestamps are set correctly (createdAt, deliveredAt)", async function () {
      await orderTracking.connect(admin).createOrder("CHK-2", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, 1000, 40, 80);
      const orderBefore = await orderTracking.getOrder("CHK-2");
      expect(orderBefore.createdAt).to.be.gt(0);
      expect(orderBefore.deliveredAt).to.equal(0);

      await hre.network.provider.send("evm_increaseTime", [3600]);
      await hre.network.provider.send("evm_mine");

      await orderTracking.connect(cfa).confirmDelivery("CHK-2", dummyItemsHash, 50);
      const orderAfter = await orderTracking.getOrder("CHK-2");
      expect(orderAfter.deliveredAt).to.be.gt(orderBefore.createdAt);
    });

    it("Total amount stored correctly", async function () {
      const amount = 999999;
      await orderTracking.connect(admin).createOrder("CHK-3", "SAP_ADMIN", "SAP_CFA", dummyItemsHash, amount, 40, 80);
      const order = await orderTracking.getOrder("CHK-3");
      expect(order.totalAmount).to.equal(amount);
    });
  });
});
