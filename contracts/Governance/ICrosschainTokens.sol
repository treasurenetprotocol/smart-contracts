// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

/// @title Cross-chain Token Management Interface
/// @author qiangwei
interface ICrosschainTokens {
    /// @dev Cross-chain token information structure
    struct CrosschainTokenInfo {
        string token;
        address sourceERC20address;
        address sourceCrosschainAddress;
        uint256 sourcechainid;
        address targetERC20address;
        address targetCrosschainAddress;
        uint256 targetchainid;
        uint256 fee;
    }

    /// @dev Cross-chain token setting event
    event CrosschainToken(
        string token,
        address sourceERC20address,
        address sourceCrosschainAddress,
        uint256 sourcechainid,
        address targetERC20address,
        address targetCrosschainAddress,
        uint256 targetchainid,
        uint256 fee,
        uint256 chainId
    );

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
        uint256 chainId
    ) external;

    /// @dev Get cross-chain token information
    /// @param token Token name
    /// @return string Token name
    /// @return address Source ERC20 contract address
    /// @return address Source cross-chain contract address
    /// @return uint256 Source chain ID
    /// @return address Target ERC20 contract address
    /// @return address Target cross-chain contract address
    /// @return uint256 Target chain ID
    /// @return uint256 Transaction fee
    function getCrosschainToken(string memory token) external view returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    );

    /// @dev Get cross-chain token information by chain ID
    /// @param token Token name
    /// @param chainId Chain ID
    /// @return string Token name
    /// @return address Source ERC20 contract address
    /// @return address Source cross-chain contract address
    /// @return uint256 Source chain ID
    /// @return address Target ERC20 contract address
    /// @return address Target cross-chain contract address
    /// @return uint256 Target chain ID
    /// @return uint256 Transaction fee
    function getCrosschainTokenByChainId(
        string memory token,
        uint256 chainId
    ) external view returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    );
}
