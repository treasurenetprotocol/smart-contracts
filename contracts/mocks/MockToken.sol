// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(uint256 amount) external returns (bool) {
        _mint(msg.sender, amount);
        return true;
    }

    function mint(address account, uint256 amount) public returns (bool) {
        _mint(account, amount);
        return true;
    }

    function addBalance(address account, uint256 amount) external returns (bool) {
        _mint(account, amount);
        return true;
    }

    function reduceBalance(address account, uint256 amount) external returns (bool) {
        _burn(account, amount);
        return true;
    }
}
