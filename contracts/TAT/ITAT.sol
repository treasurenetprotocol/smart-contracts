// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IStake.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ITAT is IERC20Upgradeable, IStake {
    /**
     * @dev Mint new tokens representing a tokenized asset
     * @param treasureKind The kind of treasure being tokenized
     * @param uniqueId The unique identifier of the tokenized asset
     * @param to The recipient address of the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(string memory treasureKind, bytes32 uniqueId, address to, uint256 amount) external;

    // Burn tokens representing a tokenized asset
    function burn(string memory treasureKind, address to, uint256 amount) external;

    // Check if the token contract is paused
    function paused() external returns (bool);
    // Pause the token contract, preventing transfers and approvals
    function pause() external;
    // Unpause the token contract, allowing transfers and approvals
    function unpause() external;
}
