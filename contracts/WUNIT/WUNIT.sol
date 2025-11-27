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
        
        // Set default admin role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Grant operator role to all provided operators
        for (uint256 i = 0; i < operators.length; i++) {
            _grantRole(OPERATOR_ROLE, operators[i]);
        }
    }

    // Mint tokens
    function mint(address to, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _mint(to, amount);
        return true;
    }

    // Burn tokens
    function burn(uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    // Increase balance
    function addBalance(address account, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        _mint(account, amount);
        return true;
    }

    // Decrease balance
    function reduceBalance(address account, uint256 amount) external onlyRole(OPERATOR_ROLE) returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
    
    // Add a new operator
    function addOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, operator);
    }
    
    // Remove an operator
    function removeOperator(address operator) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(OPERATOR_ROLE, operator);
    }
}
