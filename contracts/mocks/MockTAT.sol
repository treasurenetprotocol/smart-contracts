// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockTAT {
    uint256[] private months;
    uint256[] private amounts;

    constructor() {
        months = new uint256[](3);
        months[0] = 202401;
        months[1] = 202402;
        months[2] = 202403;

        amounts = new uint256[](3);
        amounts[0] = 100 ether;
        amounts[1] = 100 ether;
        amounts[2] = 100 ether;
    }

    function setRecords(uint256[] calldata _months, uint256[] calldata _amounts) external {
        months = _months;
        amounts = _amounts;
    }

    function getTATRecord(address) external view returns (uint256[] memory, uint256[] memory) {
        return (months, amounts);
    }
}
