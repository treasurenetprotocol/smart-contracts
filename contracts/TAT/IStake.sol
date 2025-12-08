// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

interface IStake {
     /**
     * @dev Stake tokens for a specific account
     * @param account The account to stake tokens for
     * @param _amount The amount of tokens to stake
     */
    function stake(address account, uint256 _amount) external;

    /**
     * @dev Withdraw tokens from a specific account's stake
     * @param account The account to withdraw tokens from
     * @param _amount The amount of tokens to withdraw
     */
    function withdraw(address account, uint256 _amount) external;

    /**
     * @dev Get the stake amount of a specific staker
     * @param _staker The address of the staker
     * @return The amount of tokens staked by the specified staker
     */
    function stakeOf(address _staker) external returns (uint256);

    // Get the total amount of tokens staked
    function totalStakes() external returns (uint256);

    // Get the total number of stakers
    function totalStakers() external returns (uint256);
}
