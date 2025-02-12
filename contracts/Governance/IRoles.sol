// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/IAccessControlUpgradeable.sol";

/**
 * @title IRoles
 * @dev 自定义接口，可在此扩展额外的角色相关方法，目前直接继承 upgradeable 的 IAccessControl 接口
 */
interface IRoles is IAccessControlUpgradeable {
    // 如果需要添加额外函数，可以在此处定义
    function CROSSCHAIN_SENDER() external pure returns (bytes32);
}
