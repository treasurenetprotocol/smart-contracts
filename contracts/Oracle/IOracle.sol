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
    
    /// @notice 获取TCASH铸造状态
    /// @dev 返回当前TCASH是否允许铸造
    /// @return bool 当前TCASH铸造状态(true:允许, false:禁止)
    function getTCashMintStatus() external view returns(bool);
    
    /// @notice 设置TCASH铸造状态
    /// @dev 仅限Feeder角色调用，用于设置TCASH铸造状态
    /// @param _status TCASH铸造状态(true:允许, false:禁止)
    function setTCashMintStatus(bool _status) external;
    
    /// @notice 获取TCASH铸造锁定价格
    /// @dev 返回当前TCASH铸造锁定价格，0表示未锁定
    /// @return uint256 TCASH铸造锁定价格
    function getTCashMintLockPrice() external view returns(uint256);
    
    /// @notice 设置TCASH铸造锁定价格
    /// @dev 仅限Feeder角色调用，用于设置TCASH铸造锁定价格
    /// @param _price TCASH铸造锁定价格(0:未锁定)
    function setTCashMintLockPrice(uint256 _price) external;
    
    /// @notice 检查并更新TCASH铸造状态
    /// @dev 由Feeder调用，检查价格波动并更新TCASH铸造状态
    /// @param _currentPrice 当前TCASH价格
    /// @param _previousPrice 先前记录的TCASH价格(一小时前)
    /// @param _lockThreshold 锁定阈值(如3000表示30%)
    /// @param _resetThreshold 恢复阈值(如11000表示110%)
    function checkAndUpdateTCashMintStatus(
        uint256 _currentPrice, 
        uint256 _previousPrice, 
        uint256 _lockThreshold, 
        uint256 _resetThreshold
    ) external;
}
