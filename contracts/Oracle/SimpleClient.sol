// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./OracleClient.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";
import "../Governance/IParameterInfo.sol";

contract SimpleClient is Initializable, OwnableUpgradeable, OracleClient {
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    event OracleRequest(
        address requester,
        bytes32 requesterid,
        address callbackAddress,
        bytes4 callbackFunctionId
    );

    event AssetValueSet(bytes32 requesterid, uint256 Date, uint256 Value);
    
    // TCASH铸造状态变化事件
    event TCashMintStatusChanged(bool status, uint256 lockPrice, uint256 timestamp);

    struct AssetValue {
        uint256 Date;
        uint256 Value;
        uint256 Timestamp;
    }

    bytes32 private _requestIdToPullAssetValue; // oralce request id
    bytes32 private _requestIdToPullTCashStatus; // TCASH状态请求ID

    mapping(uint256 => AssetValue) private _assetMappedValues;
    AssetValue[] private _assetValues;

    // TCASH历史价格记录
    mapping(uint256 => uint256) private _tcashHistoricalPrices;
    uint256 private _lastTCashPriceTimestamp;
    uint256 private _lastTCashPrice;

    Counters.Counter private _counter;

    IRoles private _roleController;
    IParameterInfo private _parameterInfo;

    /**
     * @dev Initializes the contract with the given oracle and roles contract addresses
     * @param _oracleContract The address of the oracle contract
     * @param _rolesContract The address of the roles contract
     * @param _parameterInfoContract The address of the parameter info contract
     */
    function initialize(address _oracleContract, address _rolesContract, address _parameterInfoContract) public initializer {
        __Ownable_init();
        __oracleClientInitialize(_oracleContract);

        _roleController = IRoles(_rolesContract);
        _parameterInfo = IParameterInfo(_parameterInfoContract);
    }

    // restrict access to functions only to feeders
    modifier onlyFeeder() {
        require(
            _roleController.hasRole(keccak256("FEEDER"), _msgSender()),
            "Only Feeder can push data"
        );
        _;
    }

    // Returns the address of the oracle contract
    function oracle() public view returns (address) {
        return _oracleContract();
    }

    // Returns the request ID for pulling asset values
    function requesterid() public virtual returns (bytes32) {
        return _requestIdToPullAssetValue;
    }

    // Registers a request to pull asset values from the oracle
    function registerAssetValueRequest() public onlyOwner returns (bytes32) {
        uint256 nonce = _nextNonce();

        _requestIdToPullAssetValue = _sendOracleRequest(
            address(this),
            this.receiveAssetValue.selector,
            nonce
        );

        emit OracleRequest(
            address(this),
            _requestIdToPullAssetValue,
            address(this),
            this.receiveAssetValue.selector
        );

        return _requestIdToPullAssetValue;
    }

    /**
     * @dev Callback function to receive asset values from the oracle
     * @param _requestId The request ID of the oracle request
     * @param _date The date for which the asset value is received
     * @param _value The asset value received from the oracle
     */
    function receiveAssetValue(
        bytes32 _requestId,
        uint256 _date,
        uint256 _value
    ) public onlyFeeder {
        require(_requestId == _requestIdToPullAssetValue, "invalid oracle request id");
        require(_value > 0, "zero asset value");
        _setResourceValue(_date, _value);

        emit AssetValueSet(_requestId, _date, _value);

        _counter.increment();
    }

    /**
     * @dev Internal function to set the asset value for a given date
     * @param _date The date for which the asset value is being set
     * @param _value The asset value to be set
     */
    function _setResourceValue(uint256 _date, uint256 _value) internal {
        require(_assetMappedValues[_date].Timestamp == 0, "product value at this date already set");

        AssetValue memory value;
        value.Date = _date;
        value.Value = _value;
        value.Timestamp = block.timestamp;

        _assetMappedValues[_date] = value;
        _assetValues.push(value);
    }

    function getAssetValue(uint256 _date) public view returns (uint256) {
        return _assetMappedValues[_date].Value;
    }
    
    /**
     * @dev 设置TCASH价格并检查铸造锁定条件
     * @param _price 当前TCASH价格
     */
    function setTCashPrice(uint256 _price) public onlyFeeder {
        require(_price > 0, "Price must be greater than zero");
        
        // 获取参数
        uint256 lockThreshold = _parameterInfo.getPlatformConfig("TCASHMLT");
        uint256 resetThreshold = _parameterInfo.getPlatformConfig("TCASHMRST");
        
        // 记录历史价格
        uint256 hourAgo = block.timestamp.sub(1 hours);
        uint256 previousHourPrice = _tcashHistoricalPrices[hourAgo];
        
        // 更新当前价格记录
        _tcashHistoricalPrices[block.timestamp] = _price;
        _lastTCashPrice = _price;
        _lastTCashPriceTimestamp = block.timestamp;
        
        // 调用Oracle合约检查并更新TCASH铸造状态
        // 使用sendOracleRequest发送请求
        uint256 nonce = _nextNonce();
        bytes4 callbackSelector = this.receiveTCashMintStatus.selector;
        
        _requestIdToPullTCashStatus = _sendOracleRequest(
            address(this),
            callbackSelector,
            nonce
        );
        
        // 获取Oracle合约引用并调用检查函数
        IOracle oracleContract = IOracle(_oracleContract());
        oracleContract.checkAndUpdateTCashMintStatus(_price, previousHourPrice, lockThreshold, resetThreshold);
    }
    
    /**
     * @dev 接收TCASH铸造状态变更的回调函数
     * @param _requestId 请求ID
     * @param _status 当前TCASH铸造状态
     * @param _lockPrice 锁定价格
     */
    function receiveTCashMintStatus(
        bytes32 _requestId,
        bool _status,
        uint256 _lockPrice
    ) public onlyFeeder {
        require(_requestId == _requestIdToPullTCashStatus, "invalid oracle request id");
        
        emit TCashMintStatusChanged(_status, _lockPrice, block.timestamp);
    }
    
    /**
     * @dev 获取最新TCASH价格
     * @return 价格和时间戳
     */
    function getLatestTCashPrice() public view returns (uint256 price, uint256 timestamp) {
        return (_lastTCashPrice, _lastTCashPriceTimestamp);
    }
    
    /**
     * @dev 获取历史TCASH价格
     * @param _timestamp 查询的时间戳
     * @return 该时间戳的价格
     */
    function getHistoricalTCashPrice(uint256 _timestamp) public view returns (uint256) {
        return _tcashHistoricalPrices[_timestamp];
    }
}
