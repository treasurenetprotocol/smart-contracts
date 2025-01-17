// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

interface IRoles is IAccessControlEnumerable {
    // Role definitions
    function CROSSCHAIN_SENDER() external pure returns (bytes32);
    
    // Role management functions
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberArray(bytes32 role) external view returns (address[] memory);
}
