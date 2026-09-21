// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

/**
 * @title DisputeManager
 * @notice Records disputes on-chain with tamper-proof evidence for the TradeChain system.
 * @dev Imports UserRegistry for role checking. Only registered non-admin users can raise disputes.
 *      Only ADMIN can resolve or reject disputes.
 *
 * Dispute reason values (documented for off-chain reference):
 *   - QUANTITY_MISMATCH   : Received quantity doesn't match dispatched
 *   - DAMAGED             : Goods arrived damaged
 *   - EXPIRED             : Products received past expiry date
 *   - WRONG_PRODUCT       : Different product than what was ordered
 *   - COLD_CHAIN_BREAK    : Temperature threshold exceeded during transit
 *   - COUNTERFEIT_SUSPECT : Suspected counterfeit or tampered product
 */
contract DisputeManager {
    // ──────────────────────────── References ────────────────────────────────
    UserRegistry public userRegistry;

    // ──────────────────────────── Enums ─────────────────────────────────────
    enum DisputeStatus { OPEN, RESOLVED, REJECTED }

    // ──────────────────────────── Structs ───────────────────────────────────
    struct Dispute {
        uint256 disputeId;
        string orderCode;
        address raisedBy;
        string reason;
        string evidenceIpfsHash;
        DisputeStatus status;
        string resolution;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    // ──────────────────────────── State ─────────────────────────────────────
    uint256 private nextDisputeId;
    mapping(uint256 => Dispute) private disputes;
    mapping(string => uint256[]) private orderDisputes; // orderCode → disputeIds

    // ──────────────────────────── Events ────────────────────────────────────
    event DisputeRaised(uint256 indexed disputeId, string orderCode, string reason);
    event DisputeResolved(uint256 indexed disputeId);
    event DisputeRejected(uint256 indexed disputeId);

    // ──────────────────────────── Constructor ──────────────────────────────
    constructor(address _userRegistryAddress) {
        require(_userRegistryAddress != address(0), "DisputeManager: zero registry address");
        userRegistry = UserRegistry(_userRegistryAddress);
        nextDisputeId = 1; // Start IDs at 1
    }

    // ──────────────────────────── Modifiers ─────────────────────────────────

    modifier onlyAdmin() {
        require(
            userRegistry.hasRole(userRegistry.ADMIN_ROLE(), msg.sender),
            "DisputeManager: caller is not admin"
        );
        _;
    }

    modifier onlyRegisteredNonAdmin() {
        require(userRegistry.isRegistered(msg.sender), "DisputeManager: caller not registered");
        UserRegistry.User memory u = userRegistry.getUser(msg.sender);
        require(
            u.role != userRegistry.ADMIN_ROLE(),
            "DisputeManager: admin cannot raise disputes"
        );
        _;
    }

    // ──────────────────────────── Functions ─────────────────────────────────

    /**
     * @notice Raise a new dispute against an order.
     * @param _orderCode        The order code this dispute is about
     * @param _reason           Reason string (e.g., "QUANTITY_MISMATCH", "COLD_CHAIN_BREAK")
     * @param _evidenceIpfsHash IPFS hash of uploaded evidence (photos, documents)
     * @return disputeId        The auto-incremented dispute ID
     */
    function raiseDispute(
        string calldata _orderCode,
        string calldata _reason,
        string calldata _evidenceIpfsHash
    ) external onlyRegisteredNonAdmin returns (uint256) {
        require(bytes(_orderCode).length > 0, "DisputeManager: empty order code");
        require(bytes(_reason).length > 0, "DisputeManager: empty reason");

        uint256 disputeId = nextDisputeId++;

        disputes[disputeId] = Dispute({
            disputeId: disputeId,
            orderCode: _orderCode,
            raisedBy: msg.sender,
            reason: _reason,
            evidenceIpfsHash: _evidenceIpfsHash,
            status: DisputeStatus.OPEN,
            resolution: "",
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        orderDisputes[_orderCode].push(disputeId);

        emit DisputeRaised(disputeId, _orderCode, _reason);

        return disputeId;
    }

    /**
     * @notice Resolve a dispute (admin only).
     * @param _disputeId   The dispute to resolve
     * @param _resolution  Resolution description
     */
    function resolveDispute(uint256 _disputeId, string calldata _resolution) external onlyAdmin {
        require(_disputeId > 0 && _disputeId < nextDisputeId, "DisputeManager: invalid dispute ID");
        Dispute storage d = disputes[_disputeId];
        require(d.status == DisputeStatus.OPEN, "DisputeManager: dispute not open");

        d.status = DisputeStatus.RESOLVED;
        d.resolution = _resolution;
        d.resolvedAt = block.timestamp;

        emit DisputeResolved(_disputeId);
    }

    /**
     * @notice Reject a dispute (admin only).
     * @param _disputeId  The dispute to reject
     * @param _reason     Reason for rejection
     */
    function rejectDispute(uint256 _disputeId, string calldata _reason) external onlyAdmin {
        require(_disputeId > 0 && _disputeId < nextDisputeId, "DisputeManager: invalid dispute ID");
        Dispute storage d = disputes[_disputeId];
        require(d.status == DisputeStatus.OPEN, "DisputeManager: dispute not open");

        d.status = DisputeStatus.REJECTED;
        d.resolution = _reason;
        d.resolvedAt = block.timestamp;

        emit DisputeRejected(_disputeId);
    }

    /**
     * @notice Get dispute details by ID.
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        require(_disputeId > 0 && _disputeId < nextDisputeId, "DisputeManager: invalid dispute ID");
        return disputes[_disputeId];
    }

    /**
     * @notice Get all dispute IDs for a given order.
     */
    function getDisputesByOrder(string calldata _orderCode) external view returns (uint256[] memory) {
        return orderDisputes[_orderCode];
    }
}
