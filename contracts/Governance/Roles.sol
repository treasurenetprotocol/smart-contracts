// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IRoles.sol";

/// @title Role management contract
/// @notice 管理不同角色的权限分配
contract Roles is Initializable, OwnableUpgradeable, AccessControlEnumerableUpgradeable, IRoles {
    // 角色常量定义
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");
    bytes32 public constant AUCTION_MANAGER = keccak256("AUCTION_MANAGER");
    bytes32 public constant FEEDER = keccak256("FEEDER");
    bytes32 private constant _CROSSCHAIN_SENDER = keccak256("CROSSCHAIN_SENDER");

    // 多签合约地址
    address private _mulSig;

    /**
     * @notice 初始化角色管理合约
     * @param _mulSigContract 多签合约地址
     * @param managers FOUNDATION_MANAGER 角色的账户数组
     * @param auctionManagers AUCTION_MANAGER 角色的账户数组
     * @param feeders FEEDER 角色的账户数组
     * @param crosschainSenders CROSSCHAIN_SENDER 角色的账户数组
     */
    function initialize(
        address _mulSigContract,
        address[] memory managers,         // FOUNDATION_MANAGER
        address[] memory auctionManagers,    // AUCTION_MANAGER
        address[] memory feeders,            // FEEDER
        address[] memory crosschainSenders   // CROSSCHAIN_SENDER
    ) public initializer {
        __Ownable_init();
        __AccessControlEnumerable_init();

        _mulSig = _mulSigContract;
        _setupRole(ADMIN, _mulSigContract);

        // 设置角色的管理关系
        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(FOUNDATION_MANAGER, ADMIN);
        _setRoleAdmin(AUCTION_MANAGER, FOUNDATION_MANAGER);
        _setRoleAdmin(FEEDER, ADMIN);
        _setRoleAdmin(_CROSSCHAIN_SENDER, ADMIN);

        // 批量设置 FOUNDATION_MANAGER 角色
        for (uint256 i = 0; i < managers.length; ++i) {
            _setupRole(FOUNDATION_MANAGER, managers[i]);
        }

        // 批量设置 AUCTION_MANAGER 角色
        for (uint256 i = 0; i < auctionManagers.length; ++i) {
            _setupRole(AUCTION_MANAGER, auctionManagers[i]);
        }

        // 批量设置 FEEDER 角色
        for (uint256 i = 0; i < feeders.length; ++i) {
            _setupRole(FEEDER, feeders[i]);
        }

        // 批量设置 CROSSCHAIN_SENDER 角色
        for (uint256 i = 0; i < crosschainSenders.length; ++i) {
            _setupRole(_CROSSCHAIN_SENDER, crosschainSenders[i]);
        }
    }

    /**
     * @dev 重写 _msgSender 方法，只需指定 ContextUpgradeable 即可
     */
    function _msgSender() internal view virtual override(ContextUpgradeable) returns (address) {
        return ContextUpgradeable._msgSender();
    }

    /**
     * @dev 重写 _msgData 方法，只需指定 ContextUpgradeable 即可
     */
    function _msgData() internal view virtual override(ContextUpgradeable) returns (bytes calldata) {
        return ContextUpgradeable._msgData();
    }

    /**
     * @dev 重写 _contextSuffixLength 方法，只需指定 ContextUpgradeable 即可
     */
    function _contextSuffixLength() internal view virtual override(ContextUpgradeable) returns (uint256) {
        return ContextUpgradeable._contextSuffixLength();
    }

    /**
     * @dev 限定只有多签合约能够调用的修饰符
     */
    modifier onlyMulSig() {
        require(_msgSender() == _mulSig, "Roles: caller is not the multisig contract");
        _;
    }

    /**
     * @notice 返回跨链消息发送者角色的标识符
     */
    function CROSSCHAIN_SENDER() public pure returns (bytes32) {
        return _CROSSCHAIN_SENDER;
    }
}
