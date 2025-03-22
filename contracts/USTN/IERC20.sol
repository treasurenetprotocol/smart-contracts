// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address tokenOwner) external view returns (uint256 balance);

    function transfer(address to, uint256 tokens) external returns (bool success);

    // Returns the remaining number of tokens that spender will be allowed to spend on behalf of owner
    function allowance(address tokenOwner, address spender) external view returns (uint256 remaining);

    function approve(address spender, uint256 tokens) external returns (bool success);

    function transferFrom(address from, address to, uint256 tokens) external returns (bool success);

    /**
     * @dev Emitted when tokens are transferred from one account to another.
     * @param from The address of the sender.
     * @param to The address of the recipient.
     * @param tokens The amount of tokens transferred.
     */
    event Transfer(address indexed from, address indexed to, uint256 tokens);

    /**
     * @dev Emitted when the allowance of a spender for a specific owner is set.
     * @param owner The address of the owner who approved the allowance.
     * @param spender The address of the spender who gained the allowance.
     * @param tokens The amount of tokens allowed.
     */
    event Approval(address indexed owner, address indexed spender, uint256 tokens);
}
