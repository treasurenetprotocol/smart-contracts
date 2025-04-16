// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/IAccessControlEnumerableUpgradeable.sol";

/**
 * @dev Extended role-based access control interface with additional functionality
 */
interface IRoles is IAccessControlUpgradeable, IAccessControlEnumerableUpgradeable {
    // Role constants
    function ADMIN() external pure returns (bytes32);
    function AUCTION_MANAGER() external pure returns (bytes32);
    function CROSSCHAIN_SENDER() external pure returns (bytes32);
    function TCASH_MINTER() external pure returns (bytes32);
    function TCASH_BURNER() external pure returns (bytes32);
    
    // Additional role management functions
    function getRoleMemberArray(bytes32 role) external view returns (address[] memory);
}
