// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";

contract TCashOracle is Initializable, OwnableUpgradeable {
    // 事件定义
    event PriceUpdated(
        string indexed symbol,
        uint256 price,
        uint256 timestamp
    );

    // 价格结构
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }

    // 状态变量
    IRoles public roles;
    mapping(string => PriceData) public prices;
    mapping(string => bool) public supportedSymbols;

    // 初始化函数
    function initialize(address _roles) public initializer {
        __Ownable_init();
        roles = IRoles(_roles);
        
        // 初始化支持的代币
        supportedSymbols["UNIT"] = true;
        supportedSymbols["TCASH"] = true;
    }

    // 更新价格
    function updatePrice(string memory symbol, uint256 price) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        require(supportedSymbols[symbol], "Unsupported symbol");
        require(price > 0, "Invalid price");

        prices[symbol] = PriceData({
            price: price,
            timestamp: block.timestamp
        });

        emit PriceUpdated(symbol, price, block.timestamp);

        return true;
    }

    // 获取价格
    function getPrice(string memory symbol) external view returns (uint256) {
        require(supportedSymbols[symbol], "Unsupported symbol");
        return prices[symbol].price;
    }

    // 获取价格和时间戳
    function getPriceData(string memory symbol) external view returns (PriceData memory) {
        require(supportedSymbols[symbol], "Unsupported symbol");
        return prices[symbol];
    }

    // 添加支持的代币
    function addSupportedSymbol(string memory symbol) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        require(!supportedSymbols[symbol], "Symbol already supported");
        
        supportedSymbols[symbol] = true;
        return true;
    }

    // 移除支持的代币
    function removeSupportedSymbol(string memory symbol) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        require(supportedSymbols[symbol], "Symbol not supported");
        
        supportedSymbols[symbol] = false;
        return true;
    }

    // 检查代币是否支持
    function isSupportedSymbol(string memory symbol) external view returns (bool) {
        return supportedSymbols[symbol];
    }
} 