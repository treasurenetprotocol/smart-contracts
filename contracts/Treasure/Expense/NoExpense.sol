// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../Governance/IParameterInfo.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

abstract contract NoExpense is ContextUpgradeable {
    enum Action {
        NotSet,
        Deposite,
        Withdraw,
        Penalty
    }
    enum Status {
        NotSet,
        Normal,
        Abnormal
    }

    struct Depositor {
        uint256 margin;
        address debtor;
        Status status;
    }

    event ExpenseHistory(uint256 time, address operator, Action _type, string content, uint256 tokens);

    receive() external payable { }

    mapping(address => Depositor) private _depositors;

    IParameterInfo private _parameterInfo;

    function _isDepositor(address _account) internal view returns (bool) {
        return _depositors[_account].status != Status(0);
    }

    function prepay() public payable returns (bool) {
        return true;
    }
    // solhint-disable-next-line

    function withdraw(uint256 amount) public payable returns (bool) {
        return true;
    }

    // solhint-disable-next-line
    function _penalty(address account, uint256 value, uint256 percent) internal returns (uint256) {
        return 0;
    }
    // solhint-disable-next-line

    function marginOf(address _account) public view returns (uint256, Status) {
        return (0, Status.Normal);
    }
}
