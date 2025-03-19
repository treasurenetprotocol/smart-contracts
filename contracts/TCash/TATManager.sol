// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";

contract TATManager is Initializable, OwnableUpgradeable {
    // 状态变量
    IRoles public roles;
    
    // 用户TAT铸造记录
    struct TATMintRecord {
        uint256 mintCount;              // 铸造次数
        uint256 unusedTATAverage;       // 未被占用的TAT的3个月均值
        uint256 lastUpdateTime;         // 最后更新时间
    }
    
    mapping(address => TATMintRecord) public tatMintRecords;

    // 初始化函数
    function initialize(address _roles) public initializer {
        __Ownable_init();
        roles = IRoles(_roles);
    }
    
    // 设置用户TAT铸造次数（仅供管理员使用）
    function setMintCount(address account, uint256 count) external {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        tatMintRecords[account].mintCount = count;
        tatMintRecords[account].lastUpdateTime = block.timestamp;
    }
    
    // 设置用户未被占用的TAT的3个月均值（仅供管理员使用）
    function setUnusedTATAverage(address account, uint256 average) external {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        tatMintRecords[account].unusedTATAverage = average;
        tatMintRecords[account].lastUpdateTime = block.timestamp;
    }
    
    // 获取用户TAT铸造次数
    function getMintCount(address account) external view returns (uint256) {
        return tatMintRecords[account].mintCount;
    }
    
    // 获取用户未被占用的TAT的3个月均值
    function getUnusedTATAverage(address account) external view returns (uint256) {
        return tatMintRecords[account].unusedTATAverage;
    }
    
    // 获取用户TAT铸造记录的最后更新时间
    function getLastUpdateTime(address account) external view returns (uint256) {
        return tatMintRecords[account].lastUpdateTime;
    }
    
    // 获取用户完整TAT铸造记录
    function getTATMintRecord(address account) external view returns (TATMintRecord memory) {
        return tatMintRecords[account];
    }
} 