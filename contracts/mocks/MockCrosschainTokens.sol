// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../Governance/ICrosschainTokens.sol";

contract MockCrosschainTokens is ICrosschainTokens {
    mapping(uint256 => mapping(string => CrosschainTokenInfo)) private infos;

    function setCrosschainToken(
        string memory token,
        address sourceERC20address,
        address,
        uint256 sourcechainid,
        address targetERC20address,
        address,
        uint256 targetchainid,
        uint256 fee,
        uint256 chainId
    ) external override {
        setInfo(
            chainId,
            token,
            sourceERC20address,
            targetERC20address,
            sourcechainid,
            targetchainid,
            fee
        );
    }

    function setInfo(
        uint256 chainId,
        string memory token,
        address sourceERC20address,
        address targetERC20address,
        uint256 sourcechainid,
        uint256 targetchainid,
        uint256 fee
    ) public {
        infos[chainId][token] = CrosschainTokenInfo({
            token: token,
            sourceERC20address: sourceERC20address,
            sourceCrosschainAddress: address(0),
            sourcechainid: sourcechainid,
            targetERC20address: targetERC20address,
            targetCrosschainAddress: address(0),
            targetchainid: targetchainid,
            fee: fee
        });
    }

    function getCrosschainToken(string memory token) external view override returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    ) {
        CrosschainTokenInfo memory info = infos[block.chainid][token];
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

    function getCrosschainTokenByChainId(
        string memory token,
        uint256 chainId
    ) external view override returns (
        string memory,
        address,
        address,
        uint256,
        address,
        address,
        uint256,
        uint256
    ) {
        CrosschainTokenInfo memory info = infos[chainId][token];
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
