// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockOracle {
    bool private status;

    function setStatus(bool _status) external {
        status = _status;
    }

    function getTCashMintStatus() external view returns (bool) {
        return status;
    }
}
