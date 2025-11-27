// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./IStake.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ITAT is IERC20Upgradeable,IStake {
    /**
     * @dev Mint new tokens representing a tokenized asset
     * @param treasureKind The kind of treasure being tokenized
     * @param uniqueId The unique identifier of the tokenized asset
     * @param to The recipient address of the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(
        string memory treasureKind,
        bytes32 uniqueId,
        address to,
        uint256 amount
    ) external;

    // Burn tokens representing a tokenized asset
    function burn(
        string memory treasureKind,
        address to,
        uint256 amount
    ) external;

    /**
     * @dev Set TAT mint record for a user
     * @param account User address
     * @param amount Mint amount
     */
    function setTATRecord(
        address account,
        uint256 amount
    ) external;
    
    /**
     * @dev Get TAT mint records of a user
     * @param account User address
     * @return months Recorded year-month array
     * @return amounts Corresponding mint amounts
     */
    function getTATRecord(address account) external view returns (uint256[] memory months, uint256[] memory amounts);

    // Check if the token contract is paused
    function paused() external returns (bool);
    // Pause the token contract, preventing transfers and approvals
    function pause() external;
    // Unpause the token contract, allowing transfers and approvals
    function unpause() external;
}
