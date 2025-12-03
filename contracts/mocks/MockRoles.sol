// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockRoles {
    mapping(bytes32 => mapping(address => bool)) private roles;
    mapping(bytes32 => address[]) private roleMembers;
    bytes32 private constant CROSSCHAIN_SENDER_ROLE = keccak256("CROSSCHAIN_SENDER");

    function CROSSCHAIN_SENDER() external pure returns (bytes32) {
        return CROSSCHAIN_SENDER_ROLE;
    }

    function setRole(bytes32 role, address account, bool value) external {
        roles[role][account] = value;
        if (value) {
            bool exists;
            for (uint256 i = 0; i < roleMembers[role].length; i++) {
                if (roleMembers[role][i] == account) {
                    exists = true;
                    break;
                }
            }
            if (!exists) roleMembers[role].push(account);
        }
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account];
    }

    function getRoleMember(bytes32 role, uint256 index) external view returns (address) {
        if (index >= roleMembers[role].length) return address(0);
        return roleMembers[role][index];
    }
}
