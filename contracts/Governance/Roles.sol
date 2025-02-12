// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./IRoles.sol";

/// @title Role management contract
/// @author bjwswang
contract Roles is Initializable, OwnableUpgradeable, AccessControlEnumerable, IRoles {
    bytes32 public constant ADMIN = keccak256("ADMIN");
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");
    bytes32 public constant AUCTION_MANAGER = keccak256("AUCTION_MANAGER");
    bytes32 public constant FEEDER = keccak256("FEEDER");
    bytes32 private constant _CROSSCHAIN_SENDER = keccak256("CROSSCHAIN_SENDER");

    address private _mulSig;

    /// @dev Initializes the role management contract
    /// @param _mulSigContract The address of the multisig contract
    /// @param managers The accounts of administrators (FOUNDATION_MANAGER)
    /// @param auctionManagers The accounts of auction managers (AUCTION_MANAGER)
    /// @param feeders The accounts of data feeders (FEEDER)
    /// @param crosschainSenders The accounts of crosschain message senders (CROSSCHAIN_SENDER)
    function initialize(
        address _mulSigContract,
        address[] memory managers,         // FOUNDATION_MANAGER
        address[] memory auctionManagers,  // AUCTION_MANAGER
        address[] memory feeders,          // FEEDER
        address[] memory crosschainSenders // CROSSCHAIN_SENDER
    ) public initializer {
        __Ownable_init();

        _mulSig = _mulSigContract;
        _setupRole(ADMIN, _mulSigContract);

        _setRoleAdmin(ADMIN, ADMIN);
        _setRoleAdmin(FOUNDATION_MANAGER, ADMIN);
        _setRoleAdmin(AUCTION_MANAGER,FOUNDATION_MANAGER);
        _setRoleAdmin(FEEDER, ADMIN);
        _setRoleAdmin(_CROSSCHAIN_SENDER, ADMIN);

        for (uint256 i = 0; i < managers.length; ++i) {
            _setupRole(FOUNDATION_MANAGER, managers[i]);
        }

        for (uint256 i = 0; i < auctionManagers.length; ++i) {
            _setupRole(AUCTION_MANAGER, auctionManagers[i]);
        }

        for (uint256 i = 0; i < feeders.length; ++i) {
            _setupRole(FEEDER, feeders[i]);
        }

        for (uint256 i = 0; i < crosschainSenders.length; ++i) {
            _setupRole(_CROSSCHAIN_SENDER, crosschainSenders[i]);
        }
    }

    modifier onlyMulSig() {
        require(_msgSender() == _mulSig, "Roles: caller is not the multisig contract");
        _;
    }

    function CROSSCHAIN_SENDER() public pure returns (bytes32) {
        return _CROSSCHAIN_SENDER;
    }
}
