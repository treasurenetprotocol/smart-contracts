// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IOracle {
    /// @notice Creates a request to the Oracle contract
    /// @dev This function is used to request data from the Oracle contract
    /// @param _callbackAddress The address of the contract that will receive the callback
    /// @param _callbackFunctionId The function selector of the callback function
    /// @param _nonce A unique identifier for the request
    /// @return bytes32 A unique identifier for the request
    function createOracleRequest(
        address _callbackAddress,
        bytes4 _callbackFunctionId,
        uint256 _nonce
    )
        external
        returns (bytes32);

    /// @notice Cancels a request to the Oracle contract
    /// @dev This function is used to cancel a previously made request
    /// @param _requestId The unique identifier of the request to be canceled
    /// @param _callbackAddress The address of the contract that made the request
    /// @param _callbackFuncId The function selector of the callback function
    /// @return bytes32 The unique identifier of the canceled request
    function cancelOracleRequest(
        bytes32 _requestId,
        address _callbackAddress,
        bytes4 _callbackFuncId
    )
        external
        returns (bytes32);

    /// @notice Sets the value of a currency in the Oracle contract
    /// @dev This function is used to update the value of a currency
    /// @param _currencyKind The identifier of the currency
    /// @param _currencyValue The value of the currency
    function setCurrencyValue(bytes32 _currencyKind, uint256 _currencyValue) external;

    /// @notice Gets the value of a currency from the Oracle contract
    /// @dev This function is used to retrieve the value of a currency
    /// @param _currencyKind The identifier of the currency
    /// @return uint256 The value of the currency
    function getCurrencyValue(bytes32 _currencyKind) external view returns (uint256);
}
