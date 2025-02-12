// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IRoles {
    // Role definitions
    function CROSSCHAIN_SENDER() external pure returns (bytes32);

    // Role management functions
    function getRoleMemberArray(bytes32 role) external view returns (address[] memory);
}
