// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./ICrosschainTokens.sol";

/// @title Cross-chain Token Management Contract
/// @author qiangwei
contract CrosschainTokens is Context, Initializable, OwnableUpgradeable, ICrosschainTokens {
    // Multi-signature contract address
    address private _mulSig;

    // token => CrosschainTokenInfo mapping
    mapping(string => CrosschainTokenInfo) private _crosschainTokens;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev Contract initialization
    /// @param mulSigContract Multi-signature contract address
    function initialize(address mulSigContract) public initializer {
        __Ownable_init();
        _mulSig = mulSigContract;
    }

    modifier onlyMulSig() {
        require(_msgSender() == _mulSig, "only MulSig can call");
        _;
    }

    function _msgSender() internal view virtual override(Context, ContextUpgradeable) returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual override(Context, ContextUpgradeable) returns (bytes calldata) {
        return msg.data;
    }

    /// @dev Set cross-chain token information
    /// @param token Token name
    /// @param sourceERC20address Source ERC20 contract address
    /// @param sourceCrosschainAddress Source cross-chain contract address
    /// @param sourcechainid Source chain ID
    /// @param targetERC20address Target ERC20 contract address
    /// @param targetCrosschainAddress Target cross-chain contract address
    /// @param targetchainid Target chain ID
    /// @param fee Transaction fee (0.01% - 100%)
    function setCrosschainToken(
        string memory token,
        address sourceERC20address,
        address sourceCrosschainAddress,
        uint256 sourcechainid,
        address targetERC20address,
        address targetCrosschainAddress,
        uint256 targetchainid,
        uint256 fee
    ) external onlyMulSig {
        // Check token length
        require(bytes(token).length <= 10, "token length must <= 10");
        
        // Check fee range (0.01% - 100%)
        require(fee >= 1 && fee <= 10000, "fee must between 0.01% and 100%");

        // Store cross-chain token information
        _crosschainTokens[token] = CrosschainTokenInfo({
            token: token,
            sourceERC20address: sourceERC20address,
            sourceCrosschainAddress: sourceCrosschainAddress,
            sourcechainid: sourcechainid,
            targetERC20address: targetERC20address,
            targetCrosschainAddress: targetCrosschainAddress,
            targetchainid: targetchainid,
            fee: fee
        });
    }

    /// @dev Get cross-chain token information
    /// @param token Token name
    /// @return CrosschainTokenInfo Cross-chain token information
    function getCrosschainToken(string memory token) public view returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    ) {
        CrosschainTokenInfo memory info = _crosschainTokens[token];
        return (
            info.token,
            info.sourceERC20address,
            info.sourceCrosschainAddress,
            info.sourcechainid,
            info.targetERC20address,
            info.targetCrosschainAddress,
            info.targetchainid,
            info.fee
        );
    }
} 