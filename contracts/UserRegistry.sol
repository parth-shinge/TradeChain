// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title UserRegistry
 * @notice Manages roles for all supply chain participants in the TradeChain system.
 * @dev Uses OpenZeppelin AccessControl for role-based access.
 *
 * Five roles in the pharmaceutical supply chain:
 *   ADMIN_ROLE   – Pharma company HQ (e.g., Serum Institute)
 *   CFA_ROLE     – C&F Agent (Carrying & Forwarding)
 *   DISTRIBUTOR_ROLE – Regional distributor
 *   STOCKIST_ROLE    – City-level stockist
 *   PHARMACY_ROLE    – Medical store / pharmacy
 */
contract UserRegistry is AccessControl {
    // ──────────────────────────── Role Constants ────────────────────────────
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant CFA_ROLE = keccak256("CFA_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant STOCKIST_ROLE = keccak256("STOCKIST_ROLE");
    bytes32 public constant PHARMACY_ROLE = keccak256("PHARMACY_ROLE");

    // ──────────────────────────── Structs ───────────────────────────────────
    struct User {
        address userAddress;
        string sapCode;
        string sapName;
        bytes32 role;
        string drugLicenseNo; // optional – primarily for pharmacies & distributors
        bool isActive;
    }

    // ──────────────────────────── State ─────────────────────────────────────
    mapping(address => User) private users;
    mapping(string => address) private sapCodeToAddress;

    // ──────────────────────────── Events ────────────────────────────────────
    event UserRegistered(address indexed userAddress, string sapCode, bytes32 role);
    event UserRevoked(address indexed userAddress);

    // ──────────────────────────── Constructor ──────────────────────────────
    constructor() {
        // Deployer gets ADMIN_ROLE and DEFAULT_ADMIN_ROLE (needed to grant other roles)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ──────────────────────────── Modifiers ─────────────────────────────────
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "UserRegistry: caller is not admin");
        _;
    }

    // ──────────────────────────── Functions ─────────────────────────────────

    /**
     * @notice Register a new user in the supply chain.
     * @param _address        Wallet address of the user
     * @param _sapCode        Unique SAP party code
     * @param _sapName        Name as it appears in SAP
     * @param _role           One of the five role constants
     * @param _drugLicenseNo  Drug license number (optional – pass "" if N/A)
     */
    function registerUser(
        address _address,
        string calldata _sapCode,
        string calldata _sapName,
        bytes32 _role,
        string calldata _drugLicenseNo
    ) external onlyAdmin {
        require(_address != address(0), "UserRegistry: zero address");
        require(!users[_address].isActive, "UserRegistry: user already registered");
        require(bytes(_sapCode).length > 0, "UserRegistry: empty SAP code");
        require(sapCodeToAddress[_sapCode] == address(0), "UserRegistry: SAP code already used");
        require(_isValidRole(_role), "UserRegistry: invalid role");

        users[_address] = User({
            userAddress: _address,
            sapCode: _sapCode,
            sapName: _sapName,
            role: _role,
            drugLicenseNo: _drugLicenseNo,
            isActive: true
        });

        sapCodeToAddress[_sapCode] = _address;

        // Grant the appropriate AccessControl role
        _grantRole(_role, _address);

        emit UserRegistered(_address, _sapCode, _role);
    }

    /**
     * @notice Get user details by wallet address.
     */
    function getUser(address _address) external view returns (User memory) {
        require(users[_address].isActive, "UserRegistry: user not found");
        return users[_address];
    }

    /**
     * @notice Get user details by SAP code.
     * @return userAddress The wallet address
     * @return user        The full User struct
     */
    function getUserBySAP(string calldata _sapCode) external view returns (address userAddress, User memory user) {
        userAddress = sapCodeToAddress[_sapCode];
        require(userAddress != address(0), "UserRegistry: SAP code not found");
        user = users[userAddress];
        require(user.isActive, "UserRegistry: user not active");
    }

    /**
     * @notice Revoke (deactivate) a user.
     */
    function revokeUser(address _address) external onlyAdmin {
        require(users[_address].isActive, "UserRegistry: user not active");

        users[_address].isActive = false;
        // Revoke their AccessControl role
        _revokeRole(users[_address].role, _address);

        emit UserRevoked(_address);
    }

    /**
     * @notice Check whether an address is a registered (active) user.
     */
    function isRegistered(address _address) external view returns (bool) {
        return users[_address].isActive;
    }

    // ──────────────────────────── Internal ──────────────────────────────────

    function _isValidRole(bytes32 _role) internal pure returns (bool) {
        return (
            _role == ADMIN_ROLE ||
            _role == CFA_ROLE ||
            _role == DISTRIBUTOR_ROLE ||
            _role == STOCKIST_ROLE ||
            _role == PHARMACY_ROLE
        );
    }
}
