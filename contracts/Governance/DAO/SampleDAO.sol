// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract SampleDAO is Initializable {
    address private _dao;

    uint256 private _blockReward;

    event BlockRewardReset(uint256 oldB, uint256 newB);

    function initialize(address dao_) public initializer {
        require(dao_ != address(0), "empty address");
        _dao = dao_;
    }

    // Modifier to ensure that only the DAO can call a function
    modifier onlyDAO() {
        require(msg.sender == _dao, "only dao");
        _;
    }

    function blockReward() public view returns (uint256) {
        return _blockReward;
    }

    /**
     * @dev Sets the block reward, can only be called by the DAO
     * @param _newReward New block reward
     */
    function setBlockReward(uint256 _newReward) public onlyDAO {
        uint256 old = _blockReward;
        _blockReward = _newReward;
        emit BlockRewardReset(old, _newReward);
    }

    // Emitted when ETH is received by the contract
    event PayEth(uint256);

    function receiveEth() public payable {
        emit PayEth(msg.value);
    }
}
