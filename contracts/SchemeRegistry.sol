// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

/**
 * @title SchemeRegistry
 * @notice Locks promotional scheme terms on-chain so distributors cannot alter or absorb them.
 * @dev Imports UserRegistry for role checking. Only ADMIN can create schemes.
 *
 * Schemes have a validity window (validFrom to validTo) and an IPFS terms hash.
 * verifyScheme returns the scheme + whether it is currently active.
 */
contract SchemeRegistry {
    // ──────────────────────────── References ────────────────────────────────
    UserRegistry public userRegistry;

    // ──────────────────────────── Structs ───────────────────────────────────
    struct Scheme {
        uint256 schemeId;
        string title;
        string productSAP;
        uint256 validFrom;
        uint256 validTo;
        bytes32 termsHash;
        bool isActive;
        uint256 createdAt;
    }

    // ──────────────────────────── State ─────────────────────────────────────
    uint256 private nextSchemeId;
    mapping(uint256 => Scheme) private schemes;
    mapping(string => uint256[]) private productSchemes; // productSAP → schemeIds

    // ──────────────────────────── Events ────────────────────────────────────
    event SchemeCreated(uint256 indexed schemeId, string title, string productSAP);

    // ──────────────────────────── Constructor ──────────────────────────────
    constructor(address _userRegistryAddress) {
        require(_userRegistryAddress != address(0), "SchemeRegistry: zero registry address");
        userRegistry = UserRegistry(_userRegistryAddress);
        nextSchemeId = 1; // Start IDs at 1
    }

    // ──────────────────────────── Modifiers ─────────────────────────────────

    modifier onlyAdmin() {
        require(
            userRegistry.hasRole(userRegistry.ADMIN_ROLE(), msg.sender),
            "SchemeRegistry: caller is not admin"
        );
        _;
    }

    // ──────────────────────────── Functions ─────────────────────────────────

    /**
     * @notice Create a new promotional scheme.
     * @param _title       Human-readable scheme title
     * @param _productSAP  SAP material code for the product
     * @param _validFrom   Start timestamp (unix)
     * @param _validTo     End timestamp (unix)
     * @param _termsHash   keccak256 hash of scheme terms document
     * @return schemeId     The auto-incremented scheme ID
     */
    function createScheme(
        string calldata _title,
        string calldata _productSAP,
        uint256 _validFrom,
        uint256 _validTo,
        bytes32 _termsHash
    ) external onlyAdmin returns (uint256) {
        require(bytes(_title).length > 0, "SchemeRegistry: empty title");
        require(bytes(_productSAP).length > 0, "SchemeRegistry: empty productSAP");
        require(_validTo > _validFrom, "SchemeRegistry: invalid date range");

        uint256 schemeId = nextSchemeId++;

        schemes[schemeId] = Scheme({
            schemeId: schemeId,
            title: _title,
            productSAP: _productSAP,
            validFrom: _validFrom,
            validTo: _validTo,
            termsHash: _termsHash,
            isActive: true,
            createdAt: block.timestamp
        });

        productSchemes[_productSAP].push(schemeId);

        emit SchemeCreated(schemeId, _title, _productSAP);

        return schemeId;
    }

    /**
     * @notice Verify a scheme — returns the full struct + whether currently active.
     * @param _schemeId  The scheme ID to verify
     * @return scheme          The Scheme struct
     * @return currentlyActive True if block.timestamp is between validFrom and validTo AND isActive
     */
    function verifyScheme(uint256 _schemeId) external view returns (Scheme memory scheme, bool currentlyActive) {
        require(_schemeId > 0 && _schemeId < nextSchemeId, "SchemeRegistry: invalid scheme ID");
        scheme = schemes[_schemeId];
        currentlyActive = scheme.isActive &&
                          block.timestamp >= scheme.validFrom &&
                          block.timestamp <= scheme.validTo;
    }

    /**
     * @notice Get all scheme IDs for a given product SAP code.
     */
    function getSchemesByProduct(string calldata _productSAP) external view returns (uint256[] memory) {
        return productSchemes[_productSAP];
    }
}
