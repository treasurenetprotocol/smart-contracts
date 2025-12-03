// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockOracle {
    bool private status;
    mapping(bytes32 => uint256) private prices;

    function setStatus(bool _status) external {
        status = _status;
    }

    function setPrice(string calldata symbol, uint256 value) external {
        prices[keccak256(bytes(symbol))] = value;
    }

    function getPrice(string calldata symbol) external view returns (uint256) {
        return prices[keccak256(bytes(symbol))];
    }

    function getTCashMintStatus() external view returns (bool) {
        return status;
    }
}
