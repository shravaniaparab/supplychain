// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title HashAnchor
/// @notice Immutable audit-proof storage for deterministic database snapshot hashes.
/// @dev The contract only stores proof records. All data validation/comparison stays off-chain.
contract HashAnchor is AccessControl {
    bytes32 public constant ANCHORER_ROLE = keccak256("ANCHORER_ROLE");

    struct AnchorRecord {
        bytes32 snapshotHash;
        uint64 anchoredAt;
        string context;
        address anchoredBy;
    }

    // batchId => append-only proof records
    mapping(bytes32 => AnchorRecord[]) private _batchAnchors;

    event HashAnchored(
        bytes32 indexed batchId,
        bytes32 indexed snapshotHash,
        uint256 indexed recordIndex,
        uint64 anchoredAt,
        address anchoredBy,
        string context
    );

    constructor(address admin, address initialAnchorer) {
        require(admin != address(0), "HashAnchor: admin is zero address");
        require(initialAnchorer != address(0), "HashAnchor: anchorer is zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ANCHORER_ROLE, initialAnchorer);
    }

    /// @notice Stores a new immutable hash proof for a batch.
    /// @param batchId Unique batch identifier (recommended as deterministic bytes32 id from backend).
    /// @param snapshotHash Deterministic hash of the canonical DB snapshot for the lifecycle event.
    /// @param context Minimal optional context (e.g., lifecycle event name).
    /// @return recordIndex Index where the record was stored.
    function anchorHash(
        bytes32 batchId,
        bytes32 snapshotHash,
        string calldata context
    ) external onlyRole(ANCHORER_ROLE) returns (uint256 recordIndex) {
        require(batchId != bytes32(0), "HashAnchor: batch id is zero");
        require(snapshotHash != bytes32(0), "HashAnchor: snapshot hash is zero");

        AnchorRecord[] storage records = _batchAnchors[batchId];

        recordIndex = records.length;
        records.push(
            AnchorRecord({
                snapshotHash: snapshotHash,
                anchoredAt: uint64(block.timestamp),
                context: context,
                anchoredBy: msg.sender
            })
        );

        emit HashAnchored(
            batchId,
            snapshotHash,
            recordIndex,
            uint64(block.timestamp),
            msg.sender,
            context
        );
    }

    /// @notice Returns the number of hash proofs stored for a batch.
    function getAnchorCount(bytes32 batchId) external view returns (uint256) {
        return _batchAnchors[batchId].length;
    }

    /// @notice Returns a specific hash proof record by index.
    function getAnchor(bytes32 batchId, uint256 index) external view returns (AnchorRecord memory) {
        require(index < _batchAnchors[batchId].length, "HashAnchor: anchor index out of bounds");
        return _batchAnchors[batchId][index];
    }

    /// @notice Returns the latest hash proof record for a batch.
    function getLatestAnchor(bytes32 batchId) external view returns (AnchorRecord memory) {
        uint256 count = _batchAnchors[batchId].length;
        require(count > 0, "HashAnchor: no anchors for batch");
        return _batchAnchors[batchId][count - 1];
    }
}
