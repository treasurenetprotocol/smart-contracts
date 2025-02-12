// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/IAccessControlEnumerable.sol";

interface IRoles is IAccessControlEnumerable {
    // Role definitions
    function CROSSCHAIN_SENDER() external pure returns (bytes32);

}
