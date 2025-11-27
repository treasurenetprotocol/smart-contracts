// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";

contract TATManager is Initializable, OwnableUpgradeable {
    // State variables
    IRoles public roles;
    bytes32 private constant FOUNDATION_MANAGER_ROLE = keccak256("FOUNDATION_MANAGER");
    
    // User TAT mint records
    struct TATMintRecord {
        uint256 mintCount;              // Number of mints
        uint256 unusedTATAverage;       // 3-month average of unutilized TAT
        uint256 lastUpdateTime;         // Last updated timestamp
    }
    
    mapping(address => TATMintRecord) public tatMintRecords;

    // Initializer
    function initialize(address _roles) public initializer {
        __Ownable_init();
        roles = IRoles(_roles);
    }
    
    // Set user mint count (admin only)
    function setMintCount(address account, uint256 count) external {
        require(roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender), "Not authorized");
        tatMintRecords[account].mintCount = count;
        tatMintRecords[account].lastUpdateTime = block.timestamp;
    }
    
    // Set 3-month average of unused TAT (admin only)
    function setUnusedTATAverage(address account, uint256 average) external {
        require(roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender), "Not authorized");
        tatMintRecords[account].unusedTATAverage = average;
        tatMintRecords[account].lastUpdateTime = block.timestamp;
    }
    
    // Get user mint count
    function getMintCount(address account) external view returns (uint256) {
        return tatMintRecords[account].mintCount;
    }
    
    // Get 3-month average of unused TAT for a user
    function getUnusedTATAverage(address account) external view returns (uint256) {
        return tatMintRecords[account].unusedTATAverage;
    }
    
    // Get last update time for a user
    function getLastUpdateTime(address account) external view returns (uint256) {
        return tatMintRecords[account].lastUpdateTime;
    }
    
    // Get full TAT mint record for a user
    function getTATMintRecord(address account) external view returns (TATMintRecord memory) {
        return tatMintRecords[account];
    }
} 
