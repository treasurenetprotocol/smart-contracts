// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract WUNIT is Initializable, ERC20Upgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __ERC20_init("wrapped unit token", "WUNIT");
    }

    // 铸造代币
    function mint(address to, uint256 amount) external returns (bool) {
        _mint(to, amount);
        return true;
    }

    // 销毁代币
    function burn(uint256 amount) external returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    // 增加余额
    function addBalance(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }

    // 减少余额
    function reduceBalance(address account, uint256 amount) external returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
}
