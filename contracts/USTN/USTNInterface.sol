// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

interface USTNInterface{
    // Allows a bidder to place a bid and deduct the corresponding cost from their balance
    function bidCost(address bider, uint amount)external returns(bool);

    // Refunds a bid amount back to the bidder.
    function bidBack(address bider, uint amount)external returns(bool);

    function burn(address account, uint256 tokens)external returns (bool);

    /**
     * @dev Reduces the total supply of tokens.
     * @param amount The amount to reduce from the total supply.
     * @return bool True if the reduction was successful, revert otherwise.
     */
    function reduceTotalSupply(uint amount)external returns(bool);

    function addTotalSupply(uint amount)external returns(bool);

    function addBalance(address add, uint amount)external returns(bool);

    function reduceBalance(address add, uint amount)external returns(bool);

    function totalSupply() external view returns (uint256);

    function balanceOf(address tokenOwner) external view returns (uint256 balance);  
    
    function transfer(address to, uint256 tokens) external returns (bool success);  
}
