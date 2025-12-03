// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockRoles {
    mapping(bytes32 => mapping(address => bool)) private roles;
    bytes32 private constant CROSSCHAIN_SENDER_ROLE = keccak256("CROSSCHAIN_SENDER");

    function CROSSCHAIN_SENDER() external pure returns (bytes32) {
        return CROSSCHAIN_SENDER_ROLE;
    }

    function setRole(bytes32 role, address account, bool value) external {
        roles[role][account] = value;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }
}
