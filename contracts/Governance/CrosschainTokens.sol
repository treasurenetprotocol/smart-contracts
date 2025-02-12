// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "./ICrosschainTokens.sol";
import "./MulSig.sol";

/// @title Cross-chain Token Management Contract
/// @author qiangwei
contract CrosschainTokens is Context, Initializable, OwnableUpgradeable, AccessControlUpgradeable, ICrosschainTokens {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    
    // 双重映射: chainId => token => info
    mapping(uint256 => mapping(string => CrosschainTokenInfo)) private _crosschainTokens;
    mapping(string => uint256) private _lastUpdateTime;
    uint256 public constant UPDATE_INTERVAL = 1 days;

    MulSig private _mulSig;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @dev Contract initialization
    /// @param signers 多签者地址数组
    /// @param mulSigAddress MulSig合约地址
    function initialize(
        address[] memory signers,
        address mulSigAddress
    ) public initializer {
        __Ownable_init();
        __AccessControl_init();
        _mulSig = MulSig(mulSigAddress);
        
        // 设置多个签名者
        for(uint i = 0; i < signers.length; i++) {
            _grantRole(SIGNER_ROLE, signers[i]);
        }
    }

    modifier onlySigners() {
        require(hasRole(SIGNER_ROLE, _msgSender()), "Caller is not a signer");
        _;
    }

    modifier onlyMulSig() {
        require(msg.sender == address(_mulSig), "Caller is not MulSig");
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
    /// @param chainId Current chain ID for storage
    function setCrosschainToken(
        string memory token,
        address sourceERC20address,
        address sourceCrosschainAddress,
        uint256 sourcechainid,
        address targetERC20address,
        address targetCrosschainAddress,
        uint256 targetchainid,
        uint256 fee,
        uint256 chainId    // 新增 chainId 参数
    ) external onlyMulSig {
        require(bytes(token).length > 0, "Token name cannot be empty");
        
        // 使用传入的 chainId 来存储
        _crosschainTokens[chainId][token] = CrosschainTokenInfo({
            token: token,
            sourceERC20address: sourceERC20address,
            sourceCrosschainAddress: sourceCrosschainAddress,
            sourcechainid: sourcechainid,
            targetERC20address: targetERC20address,
            targetCrosschainAddress: targetCrosschainAddress,
            targetchainid: targetchainid,
            fee: fee
        });
        
        // 触发接口中定义的事件
        emit ICrosschainTokens.CrosschainToken(
            token,
            sourceERC20address,
            sourceCrosschainAddress,
            sourcechainid,
            targetERC20address,
            targetCrosschainAddress,
            targetchainid,
            fee,
            chainId
        );
    }

    /// @dev Get cross-chain token information
    /// @param token Token name
    /// @return token Token name
    /// @return sourceERC20address Source ERC20 address
    /// @return sourceCrosschainAddress Source crosschain address
    /// @return sourcechainid Source chain ID
    /// @return targetERC20address Target ERC20 address
    /// @return targetCrosschainAddress Target crosschain address
    /// @return targetchainid Target chain ID
    /// @return fee Fee amount
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
        // 从当前链 ID 获取代币信息
        CrosschainTokenInfo memory info = _crosschainTokens[block.chainid][token];
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

    // 添加设置 MulSig 地址的函数
    function setMulSig(address mulSigAddress) external onlyOwner {
        require(mulSigAddress != address(0), "Invalid MulSig address");
        require(address(_mulSig) == address(0), "MulSig already set"); // 只允许设置一次
        _mulSig = MulSig(mulSigAddress);
    }

    // 新增：获取特定链上的代币信息
    function getCrosschainTokenByChainId(
        string memory token,
        uint256 chainId
    ) public view returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    ) {
        CrosschainTokenInfo memory info = _crosschainTokens[chainId][token];
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