// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

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
    ) external returns (bytes32);

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
    ) external returns (bytes32);

    /// @notice Sets the value of a currency in the Oracle contract
    /// @dev This function is used to update the value of a currency
    /// @param _currencyKind The identifier of the currency
    /// @param _currencyValue The value of the currency
    function setCurrencyValue(bytes32 _currencyKind,uint256 _currencyValue)  external;

    /// @notice Gets the value of a currency from the Oracle contract
    /// @dev This function is used to retrieve the value of a currency
    /// @param _currencyKind The identifier of the currency
    /// @return uint256 The value of the currency
    function getCurrencyValue(bytes32 _currencyKind) external view returns(uint256);
    
    /// @notice Get TCASH mint status
    /// @dev Returns whether TCASH minting is currently allowed
    /// @return bool Current TCASH mint status (true: allowed, false: blocked)
    function getTCashMintStatus() external view returns(bool);
    
    /// @notice Set TCASH mint status
    /// @dev Feeder-only; sets whether TCASH can be minted
    /// @param _status TCASH mint status (true: allow, false: block)
    function setTCashMintStatus(bool _status) external;
    
    /// @notice Get TCASH mint lock price
    /// @dev Returns the current lock price; 0 means unlocked
    /// @return uint256 TCASH mint lock price
    function getTCashMintLockPrice() external view returns(uint256);
    
    /// @notice Set TCASH mint lock price
    /// @dev Feeder-only; sets the lock price
    /// @param _price TCASH mint lock price (0: unlocked)
    function setTCashMintLockPrice(uint256 _price) external;
    
    /// @notice Check and update TCASH mint status
    /// @dev Feeder-only; compares price moves to lock/reset thresholds
    /// @param _currentPrice Current TCASH price
    /// @param _previousPrice TCASH price from one hour ago
    /// @param _lockThreshold Lock threshold (e.g., 3000 represents 30%)
    /// @param _resetThreshold Reset threshold (e.g., 11000 represents 110%)
    function checkAndUpdateTCashMintStatus(
        uint256 _currentPrice, 
        uint256 _previousPrice, 
        uint256 _lockThreshold, 
        uint256 _resetThreshold
    ) external;
    
    // Interfaces unified from TCashOracle
    
    /// @notice Update price
    /// @dev Update the price for a token symbol
    /// @param symbol Token symbol
    /// @param price Price
    /// @return Whether the operation succeeded
    function updatePrice(string memory symbol, uint256 price) external returns (bool);
    
    /// @notice Get price
    /// @dev Fetch price for a token symbol
    /// @param symbol Token symbol
    /// @return Price
    function getPrice(string memory symbol) external view returns (uint256);
    
    /// @notice Get price and timestamp
    /// @dev Fetch price data (price and timestamp) for a token symbol
    /// @param symbol Token symbol
    /// @return price Price
    /// @return timestamp Timestamp
    function getPriceData(string memory symbol) external view returns (uint256 price, uint256 timestamp);
    
    /// @notice Add a supported token
    /// @dev Add a new token symbol to the supported list
    /// @param symbol Token symbol
    /// @return Whether the operation succeeded
    function addSupportedSymbol(string memory symbol) external returns (bool);
    
    /// @notice Remove a supported token
    /// @dev Remove a token symbol from the supported list
    /// @param symbol Token symbol
    /// @return Whether the operation succeeded
    function removeSupportedSymbol(string memory symbol) external returns (bool);
    
    /// @notice Check whether a token is supported
    /// @dev Returns true if the symbol is supported
    /// @param symbol Token symbol
    /// @return Whether supported
    function isSupportedSymbol(string memory symbol) external view returns (bool);
}
