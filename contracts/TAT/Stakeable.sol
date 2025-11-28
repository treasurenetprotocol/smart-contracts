// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./IStake.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

abstract contract Stakeable is IStake {
    using SafeMath for uint256;

    address[] internal _stakeHolders;

    mapping(address => uint256) internal _stakes;

    /**
     * @dev Check if an address is a stakeholder
     * @param _address The address to check
     * @return A boolean indicating whether the address is a stakeholder, and its index
     */
    function _isStakeholder(address _address) internal view returns (bool, uint256) {
        for (uint256 s = 0; s < _stakeHolders.length; s += 1) {
            if (_address == _stakeHolders[s]) return (true, s);
        }
        return (false, 0);
    }

    /**
     * @dev Add a new stakeholder
     * @param _stakeholder The address of the stakeholder to add
     */
    function _addStakeholder(address _stakeholder) internal {
        (bool _is,) = _isStakeholder(_stakeholder);
        if (!_is) _stakeHolders.push(_stakeholder);
    }

    /**
     * @dev Remove a stakeholder
     * @param _stakeholder The address of the stakeholder to remove
     */
    function _removeStakeholder(address _stakeholder) internal {
        (bool _is, uint256 s) = _isStakeholder(_stakeholder);
        if (_is) {
            _stakeHolders[s] = _stakeHolders[_stakeHolders.length - 1];
            _stakeHolders.pop();
        }
    }

    /**
     * @dev Get the stake amount of a specific stakeholder
     * @param _stakeholder The address of the stakeholder
     * @return The amount of tokens staked by the specified stakeholder
     */
    function stakeOf(address _stakeholder) public view override returns (uint256) {
        return _stakes[_stakeholder];
    }

    // Get the total amount of tokens staked
    function totalStakes() public view override returns (uint256) {
        uint256 _totalStakes = 0;
        for (uint256 s = 0; s < _stakeHolders.length; s += 1) {
            _totalStakes = _totalStakes.add(_stakes[_stakeHolders[s]]);
        }
        return _totalStakes;
    }

    // Get the total number of stakeholders
    function totalStakers() public view override returns (uint256) {
        return _stakeHolders.length;
    }

    // Logics to bid and withdraw
    event Stake(address from, uint256 amount);

    /**
     * @dev Stake tokens for a specific account
     * @param account The account to stake tokens for
     * @param amount The amount of tokens to stake
     */
    function _stake(address account, uint256 amount) internal {
        if (_stakes[account] == 0) _addStakeholder(account);
        _stakes[account] = _stakes[account].add(amount);
        emit Stake(account, amount);
    }

    event Withdraw(address from, uint256 amount);

    /**
     * @dev Withdraw tokens from a specific account's stake
     * @param account The account to withdraw tokens from
     * @param amount The amount of tokens to withdraw
     */
    function _withdraw(address account, uint256 amount) internal {
        require(_stakes[account] > amount, "withdrawed tokens bigger than staked");
        _stakes[account] = _stakes[account].sub(amount);
        if (_stakes[account] == 0) _removeStakeholder(account);
        emit Withdraw(account, amount);
    }

    function stake(address account, uint256 _amount) public override virtual;

    function withdraw(address account, uint256 _amount) public override virtual;
}
