// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./IOracle.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev Abstract contract for interacting with an Oracle
 * Provides functionality to send requests to an Oracle contract and handle responses
 */
abstract contract OracleClient is Initializable {
    event Request(
        bytes32 requestid,
        address callbackAddress,
        bytes4 callbackFunctionId,
        uint256 nonce
    );

    using SafeMath for uint256;

    IOracle private _oracle;

    // requestID => oracle contract
    mapping(bytes32 => address) private _oracleRequests;
    uint256 private _nonce;

    /**
     * @dev Initializes the OracleClient contract with the specified Oracle contract address
     * @param _oracleContractAddress The address of the Oracle contract
     */
    function __oracleClientInitialize(address _oracleContractAddress) internal onlyInitializing {
        _oracle = IOracle(_oracleContractAddress);
    }

    /**
     * @dev Retrieves the address of the Oracle contract
     * @return The address of the Oracle contract
     */
    function _oracleContract() internal view returns (address) {
        return address(_oracle);
    }

    /**
     * @dev Retrieves the current nonce value
     * @return The current nonce value
     */
    function _currNonce() internal view returns (uint256) {
        return _nonce;
    }

    /**
     * @dev Increments the nonce value and returns the updated value
     * @return The updated nonce value
     */
    function _nextNonce() internal returns (uint256) {
        _nonce = _nonce.add(1);
        return _nonce;
    }

    /**
     * @dev Sends a request to the Oracle contract
     * Emits a Request event upon successful request creation
     * @param _callbackAddress The address of the callback contract
     * @param _callbackFunctionId The function selector of the callback function
     * @param _request_nonce The nonce value for the request
     * @return The generated request ID
     */
    function _sendOracleRequest(
        address _callbackAddress,
        bytes4 _callbackFunctionId,
        uint256 _request_nonce
    ) internal returns (bytes32) {
        bytes32 expectedRequestId = keccak256(abi.encodePacked(address(this), _request_nonce));

        require(
            expectedRequestId ==
                _oracle.createOracleRequest(_callbackAddress, _callbackFunctionId, _request_nonce),
            "requestid mismatch,check oracle logic"
        );

        return expectedRequestId;
    }

    /**
     * @dev Cancels a previously sent Oracle request
     * @param _requestId The ID of the request to be canceled
     * @param _callbackAddress The address of the callback contract
     * @param _callbackFunctionId The function selector of the callback function
     */
    function _cancelOracleRequest(
        bytes32 _requestId,
        address _callbackAddress,
        bytes4 _callbackFunctionId
    ) internal {
        _oracle.cancelOracleRequest(_requestId, _callbackAddress, _callbackFunctionId);
    }
}
