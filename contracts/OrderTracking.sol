// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

/**
 * @title OrderTracking
 * @notice Records every drug order dispatch and delivery confirmation on-chain.
 * @dev Imports UserRegistry for role checking. Supports cold chain temperature monitoring.
 *
 * Order flow: CREATED → DELIVERED / DISPUTED
 * Temperature is stored as int16 (Celsius × 10) for one decimal precision.
 * e.g., 42 = 4.2°C, -15 = -1.5°C
 */
contract OrderTracking {
    // ──────────────────────────── References ────────────────────────────────
    UserRegistry public userRegistry;

    // ──────────────────────────── Enums ─────────────────────────────────────
    enum OrderStatus { CREATED, DISPATCHED, DELIVERED, DISPUTED }

    // ──────────────────────────── Structs ───────────────────────────────────
    struct Order {
        string orderCode;
        string fromSAP;
        string toSAP;
        bytes32 itemsHash;       // keccak256 of items JSON
        uint256 totalAmount;     // in smallest currency unit
        OrderStatus status;
        int16 temperatureAtDispatch;  // Celsius × 10
        int16 temperatureAtReceipt;   // Celsius × 10
        int16 maxTempThreshold;       // max allowed temp × 10 (e.g., 80 = 8.0°C for vaccines)
        bool hasDispute;
        uint256 createdAt;
        uint256 deliveredAt;
    }

    // ──────────────────────────── State ─────────────────────────────────────
    mapping(string => Order) private orders;
    mapping(string => string[]) private partyOrders; // sapCode → orderCodes
    mapping(string => bool) private orderExists;

    // ──────────────────────────── Events ────────────────────────────────────
    event OrderCreated(string indexed orderCode, string fromSAP, string toSAP);
    event DeliveryConfirmed(string indexed orderCode, bool hasDispute);
    event ColdChainBreak(string indexed orderCode, int16 tempRecorded, int16 threshold);

    // ──────────────────────────── Constructor ──────────────────────────────
    constructor(address _userRegistryAddress) {
        require(_userRegistryAddress != address(0), "OrderTracking: zero registry address");
        userRegistry = UserRegistry(_userRegistryAddress);
    }

    // ──────────────────────────── Modifiers ─────────────────────────────────

    modifier onlyRegistered() {
        require(userRegistry.isRegistered(msg.sender), "OrderTracking: caller not registered");
        _;
    }

    modifier canCreateOrder() {
        require(userRegistry.isRegistered(msg.sender), "OrderTracking: caller not registered");
        UserRegistry.User memory u = userRegistry.getUser(msg.sender);
        require(
            u.role == userRegistry.ADMIN_ROLE() ||
            u.role == userRegistry.CFA_ROLE() ||
            u.role == userRegistry.DISTRIBUTOR_ROLE() ||
            u.role == userRegistry.STOCKIST_ROLE(),
            "OrderTracking: pharmacies cannot create orders"
        );
        _;
    }

    // ──────────────────────────── Functions ─────────────────────────────────

    /**
     * @notice Create a new order (dispatch).
     * @param _orderCode             Unique order identifier (e.g., "TC-4821")
     * @param _fromSAP               Sender's SAP code
     * @param _toSAP                 Receiver's SAP code
     * @param _itemsHash             keccak256 hash of the items JSON
     * @param _totalAmount            Total value in smallest currency unit
     * @param _temperatureAtDispatch  Temperature at dispatch (Celsius × 10)
     * @param _maxTempThreshold       Maximum allowed temperature (Celsius × 10), 0 = no cold chain
     */
    function createOrder(
        string calldata _orderCode,
        string calldata _fromSAP,
        string calldata _toSAP,
        bytes32 _itemsHash,
        uint256 _totalAmount,
        int16 _temperatureAtDispatch,
        int16 _maxTempThreshold
    ) external canCreateOrder {
        require(bytes(_orderCode).length > 0, "OrderTracking: empty order code");
        require(!orderExists[_orderCode], "OrderTracking: order already exists");
        require(bytes(_fromSAP).length > 0, "OrderTracking: empty fromSAP");
        require(bytes(_toSAP).length > 0, "OrderTracking: empty toSAP");

        orders[_orderCode] = Order({
            orderCode: _orderCode,
            fromSAP: _fromSAP,
            toSAP: _toSAP,
            itemsHash: _itemsHash,
            totalAmount: _totalAmount,
            status: OrderStatus.CREATED,
            temperatureAtDispatch: _temperatureAtDispatch,
            temperatureAtReceipt: 0,
            maxTempThreshold: _maxTempThreshold,
            hasDispute: false,
            createdAt: block.timestamp,
            deliveredAt: 0
        });

        orderExists[_orderCode] = true;

        // Track orders for both parties
        partyOrders[_fromSAP].push(_orderCode);
        partyOrders[_toSAP].push(_orderCode);

        emit OrderCreated(_orderCode, _fromSAP, _toSAP);
    }

    /**
     * @notice Confirm delivery of an order.
     * @param _orderCode          The order to confirm
     * @param _receivedItemsHash  Hash of actually received items (for verification)
     * @param _temperatureAtReceipt Temperature at receipt (Celsius × 10)
     *
     * If temperatureAtReceipt > maxTempThreshold AND maxTempThreshold > 0,
     * auto-sets hasDispute = true and status = DISPUTED (cold chain break).
     */
    function confirmDelivery(
        string calldata _orderCode,
        bytes32 _receivedItemsHash,
        int16 _temperatureAtReceipt
    ) external onlyRegistered {
        require(orderExists[_orderCode], "OrderTracking: order not found");
        Order storage order = orders[_orderCode];
        require(
            order.status == OrderStatus.CREATED || order.status == OrderStatus.DISPATCHED,
            "OrderTracking: order already finalized"
        );

        order.temperatureAtReceipt = _temperatureAtReceipt;
        order.deliveredAt = block.timestamp;

        // Check cold chain
        bool coldChainBroken = order.maxTempThreshold > 0 &&
                               _temperatureAtReceipt > order.maxTempThreshold;

        if (coldChainBroken) {
            order.hasDispute = true;
            order.status = OrderStatus.DISPUTED;
            emit ColdChainBreak(_orderCode, _temperatureAtReceipt, order.maxTempThreshold);
        } else {
            order.status = OrderStatus.DELIVERED;
        }

        emit DeliveryConfirmed(_orderCode, order.hasDispute);
    }

    /**
     * @notice Get full order details.
     */
    function getOrder(string calldata _orderCode) external view returns (Order memory) {
        require(orderExists[_orderCode], "OrderTracking: order not found");
        return orders[_orderCode];
    }

    /**
     * @notice Get all order codes associated with a SAP code (as sender or receiver).
     */
    function getOrdersByParty(string calldata _sapCode) external view returns (string[] memory) {
        return partyOrders[_sapCode];
    }
}
