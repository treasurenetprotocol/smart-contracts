// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract WUNIT is Initializable, ERC20Upgradeable, AccessControlUpgradeable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address[] memory operators) public initializer {
        __ERC20_init("wrapped unit token", "wUnit");
        __AccessControl_init();
        
        // 设置默认管理员角色
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // 为所有操作员授予OPERATOR_ROLE权限
        for (uint256 i = 0; i < operators.length; i++) {
            _grantRole(OPERATOR_ROLE, operators[i]);
        }
    }

    // 铸造代币
    function mint(address to, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _mint(to, amount);
        return true;
    }

    // 销毁代币
    function burn(uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    // 增加余额
    function addBalance(address account, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _mint(account, amount);
        return true;
    }

    // 减少余额
    function reduceBalance(address account, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
    
    // 添加新的操作员
    function addOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, operator);
    }
    
    // 移除操作员
    function removeOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(OPERATOR_ROLE, operator);
    }
}
