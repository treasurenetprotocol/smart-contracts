// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../USTN/USTNInterface.sol";

contract MockUSTN is USTNInterface {
    mapping(address => uint256) public balances;
    uint256 public total;
    address public auctionManager;

    event BidCost(address indexed bidder, uint256 amount);
    event BidBack(address indexed bidder, uint256 amount);
    event Burned(address indexed account, uint256 amount);

    function setAuctionManager(address manager) external {
        auctionManager = manager;
    }

    function setBalance(address account, uint256 amount) external {
        total -= balances[account];
        balances[account] = amount;
        total += amount;
    }

    function bidCost(address bider, uint amount) external override returns (bool) {
        require(balances[bider] >= amount, "MockUSTN: not enough");
        balances[bider] -= amount;
        balances[auctionManager] += amount;
        emit BidCost(bider, amount);
        return true;
    }

    function bidBack(address bider, uint amount) external override returns (bool) {
        require(balances[auctionManager] >= amount, "MockUSTN: auction not enough");
        balances[bider] += amount;
        balances[auctionManager] -= amount;
        emit BidBack(bider, amount);
        return true;
    }

    function burn(address account, uint256 tokens) external override returns (bool) {
        require(balances[account] >= tokens, "MockUSTN: not enough");
        balances[account] -= tokens;
        total -= tokens;
        emit Burned(account, tokens);
        return true;
    }

    function reduceTotalSupply(uint amount) external override returns (bool) {
        require(total >= amount, "MockUSTN: supply low");
        total -= amount;
        return true;
    }

    function addTotalSupply(uint amount) external override returns (bool) {
        total += amount;
        return true;
    }

    function addBalance(address add, uint amount) external override returns (bool) {
        balances[add] += amount;
        total += amount;
        return true;
    }

    function reduceBalance(address add, uint amount) external override returns (bool) {
        require(balances[add] >= amount, "MockUSTN: balance low");
        balances[add] -= amount;
        return true;
    }

    function totalSupply() external view override returns (uint256) {
        return total;
    }

    function balanceOf(address tokenOwner) external view override returns (uint256 balance) {
        return balances[tokenOwner];
    }

    function transfer(address to, uint256 tokens) external override returns (bool success) {
        require(balances[msg.sender] >= tokens, "MockUSTN: not enough");
        balances[msg.sender] -= tokens;
        balances[to] += tokens;
        return true;
    }
}
