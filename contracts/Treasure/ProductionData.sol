// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "../TAT/ITAT.sol";
import "../Governance/IRoles.sol";
import "../Governance/IParameterInfo.sol";
import "../Oracle/IOracle.sol";
import "../Oracle/OracleClient.sol";

import "./interfaces/IProductionData.sol";
import "./interfaces/IProducer.sol";
import "./Expense/Expense.sol";

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


/**
 * @dev ProductionData is the core contract for managing production data, implementing:
 *    - Trusted data source: Sending AssetValue
 *    - Trusted data source: Sending trusted production data
 *    - Producer: Sending production data
*/
abstract contract ProductionData is Context, Initializable, OracleClient, IProductionData, Expense {
    bytes32 public constant FEEDER = keccak256("FEEDER");
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");

    using Counters for Counters.Counter;

    string internal TREASURE_KIND;

    IParameterInfo internal _parameterInfo;
    IOracle internal _oracle;
    IProducer internal _producer;
    ITAT internal _tat;

    IRoles private _roleController;

    bytes32 internal _requestIdToPullAssetValue; // oralce request id
    mapping(bytes32 => bytes32) internal _requestIdsToPullTrustedData; // oracle request ids to pull trusted data

    mapping(uint256 => AssetValue) internal _assetMappedValues;
    AssetValue[] internal _assetValues;

    Counters.Counter internal _counter;

    // By Oracle
    // month => (unique id => produce data)
    mapping(uint256 => mapping(bytes32 => IProductionData.ProduceData)) internal _trustedProduceData;

    // By producer
    mapping(uint256 => IProductionData.ProduceData[]) internal _uploadedProduceData;
    Counters.Counter internal _entityCounter;

    /// @dev Contract initialization
    /// @param _treasureKind Asset type
    /// @param _oracleContract Oracle contract address
    /// @param _rolesContract Role management contract address
    /// @param _parameterInfoContract Platform configuration information management contract address
    /// @param _producerContract Producer management contract address
    /// @param _tatContract TAT contract address
    function __ProductionDataInitialize(
        string memory _treasureKind,
        address _oracleContract,
        address _rolesContract,
        address _parameterInfoContract,
        address _producerContract,
        address _tatContract
    ) internal onlyInitializing {
        __ExpenseInitialize(_parameterInfoContract);
        __oracleClientInitialize(_oracleContract);

        TREASURE_KIND = _treasureKind;

        _roleController = IRoles(_rolesContract);
        _parameterInfo = IParameterInfo(_parameterInfoContract);
        _producer = IProducer(_producerContract);
        _tat = ITAT(_tatContract);
    }

    /* producer upload production data */

    /* Oracle Part*/
    modifier onlyFeeder() {
        require(_roleController.hasRole(FEEDER, _msgSender()), "Only Feeder can push data");
        _;
    }

    modifier onlyFoundationManager() {
        require(_roleController.hasRole(FOUNDATION_MANAGER, msg.sender), "must have role FOUNDATION_MANAGER ");
        _;
    }


    modifier onlyProducerContract() {
        require(msg.sender == address(_producer), "only producer contract allowed");
        _;
    }

    modifier onlyWhenActive(bytes32 uniqueId) {
        require(_producer.producerStatus(uniqueId) == IProducer.ProducerStatus.Active, "producer not active on this uniqueId");
        _;
    }

    event RegisterAssetValueRequest(string kind, bytes32 requestid);
    /** Resource asset value management */
    /// @dev Registering the request for trusted AssetValue (to Oracle)
    /// @return bytes32 request id
    function registerAssetValueRequest() public returns (bytes32) {
        require(_requestIdToPullAssetValue == bytes32(""), "already registerd");
        uint256 nonce = _nextNonce();
        _requestIdToPullAssetValue = _sendOracleRequest(
            address(this),
            this.receiveAssetValue.selector,
            nonce
        );
        emit RegisterAssetValueRequest(TREASURE_KIND, _requestIdToPullAssetValue);
        return _requestIdToPullAssetValue;
    }

    event CancleAssetValueRequest(string kind, bytes32 requestId);
    /// @dev Canceling the request for asset price (to Oracle)
    /// @return bool whether the request was successful
    function cancelAssetValueRequest()
    external
    override
    returns (bool)
    {
        _cancelOracleRequest(_requestIdToPullAssetValue, address(this), this.receiveTrustedProductionData.selector);
        _requestIdToPullAssetValue = bytes32("");
        emit CancleAssetValueRequest(TREASURE_KIND, _requestIdToPullAssetValue);
        return true;
    }

    function getAssetValueRequestID() public view override returns (bytes32) {
        return _requestIdToPullAssetValue;
    }

    event ReceiveAssetValue(string treasureKind, uint256 date, uint256 value);
    /// @dev Receiving trusted AssetValue data (from FEEDER)
    /// @param _requestId Oracle request id
    /// @param _date Date of value
    /// @param _value AssetValue
    function receiveAssetValue(
        bytes32 _requestId,
        uint256 _date,
        uint256 _value
    ) public override onlyFeeder returns (uint256) {
        require(_requestId == _requestIdToPullAssetValue, "invalid oracle request id");
        require(_date < 1000000, "Date format is not YYMMDD");
        bool isZero = false;
        if(_value == 0){
            _value = _getAssetValue(_date);
            isZero = true;
        }else{
            _counter.increment();
        }
        _setResourceValue(_date,_value,isZero);
        emit ReceiveAssetValue(TREASURE_KIND, _date, _value);
        return _value;
    }

    function _setResourceValue(uint256 _date, uint256 _value,bool isZero) internal {
        AssetValue memory value;
        value.Date = _date;
        value.Value = _value;
        value.Timestamp = block.timestamp;
        _assetMappedValues[_date] = value;
        if (isZero == false){
            _assetValues.push(value);
        }
    }

    /// @dev Get Asset Value for a specific date
    /// @param _date Date of value
    /// @return uint256 AssetValue
    function getAssetValue(uint256 _date) public override returns (uint256) {
        return _getAssetValue(_date);
    }

    function _getAssetValue(uint256 _date) internal virtual returns (uint256) {
        uint256 count = _counter.current();
        if (count == 0) {
            return 0;
        }

        AssetValue memory vat = _assetMappedValues[_date];
        uint256 value = vat.Value;
        if (value != 0) {
            return value;
        }
        if (count >= 10) {
            uint256 total;
            for (uint256 i = 0; i < 10; i++) {
                total += _assetValues[count - 1].Value;
                count--;
            }
            value = total / 10;
        } else {
            uint256 total;
            for (uint256 i = 0; i < count; i++) {
                total += _assetValues[i].Value;
            }
            value = total / count;
        }
        return value;
    }

    /** Resource Trusted data management*/

    event RegisterTrustedDataRequest(string kind, bytes32 uniqueId, bytes32 requestid);
    /// @dev Registering the request for trusted production data (to Oracle)
    /// @param _uniqueId Producer unique ID
    /// @return bytes32 Oracle request ID
    function registerTrustedDataRequest(bytes32 _uniqueId)
    external
    override
    onlyProducerContract
    returns (bytes32)
    {
        require(
            _requestIdsToPullTrustedData[_uniqueId] == bytes32(""),
            "product oracle request already sent"
        );
        uint256 nonce = _nextNonce();
        bytes32 requestID = _sendOracleRequest(
            address(this),
            this.receiveTrustedProductionData.selector,
            nonce
        );
        _requestIdsToPullTrustedData[_uniqueId] = requestID;

        emit RegisterTrustedDataRequest(TREASURE_KIND, _uniqueId, requestID);
        return requestID;
    }

    event CancleTrustedDataRequest(string kind, bytes32 uniqueId, bytes32 requestId);
    /// @dev Canceling the request for trusted production data (to Oracle)
    /// @param _uniqueId Producer unique ID
    /// @return bool whether the request was successful
    function cancelTrustedDataRequest(bytes32 _uniqueId)
    external
    override
    onlyProducerContract
    returns (bool)
    {
        bytes32 requestId = _requestIdsToPullTrustedData[_uniqueId];
        delete (_requestIdsToPullTrustedData[_uniqueId]);
        _cancelOracleRequest(requestId, address(this), this.receiveTrustedProductionData.selector);
        emit CancleTrustedDataRequest(TREASURE_KIND, _uniqueId, requestId);
        return true;
    }

    function getTDRequestID(bytes32 _uniqueId) public view override returns (bytes32) {
        return _requestIdsToPullTrustedData[_uniqueId];
    }

    event TrustedProductionData(string treasureKind, bytes32 uniqueId, uint256 month, uint256 amount);
    /// @dev Receiving trusted production data request
    /// @param _requestId Trusted data request ID
    /// @param _uniqueId Producer unique ID
    function receiveTrustedProductionData(
        bytes32 _requestId,
        bytes32 _uniqueId,
        ProduceData memory _produceData
    ) external virtual override {}

    /* Resource untrusted produce data*/

    event ProducerProductionData(string treasureKind, bytes32 uniqueId, uint256 month, uint256 date, uint256 amount, uint256 price);
    /// @dev Producers actively upload production data
    /// @param _uniqueId Producer unique ID
    /// @param _produceData Production data
    function setProductionData(bytes32 _uniqueId, ProduceData memory _produceData)
    public
    virtual
    override
    onlyWhenActive(_uniqueId)
    {}

    function getProductionData(bytes32 _uniqueId, uint256 month) public virtual override returns (ProduceData memory){}

    event ClearingReward(string treasureKind, bytes32 _uniqueId, uint256 _month, uint256 rewardAmount);
    event ClearingPenalty(string treasureKind, bytes32 _uniqueId, uint256 _month, uint256 penaltyAmount, uint256 percent);
    /// @dev Conducting production data clearing, Mint TAT upon completion
    /// @param _uniqueId Producer unique ID
    /// @param _month Production month
    function clearing(bytes32 _uniqueId, uint256 _month) public override onlyWhenActive(_uniqueId) {
        _beforeClearing(_uniqueId);
        _clearing(_uniqueId, _month);
        _afterClearing(_uniqueId, _month);
    }

    function _beforeClearing(bytes32 _uniqueId)
    internal
    view
    returns (IProducer.ProducerCore memory)
    {
        IProducer.ProducerCore memory thisProducer = _getProducer(_uniqueId);
        require(_msgSender() == thisProducer.owner, "must be the producer");
        // status check
        return thisProducer;
    }

    // TODO[Refine]
    function _clearing(
        bytes32 _uniqueId,
        uint256 _month
    ) internal virtual returns (bool);

    function _afterClearing(bytes32 _uniqueId, uint256 _month) internal virtual;

    // Utilities
    function _getProducer(bytes32 _uniqueId)
    internal
    view
    returns (IProducer.ProducerCore memory)
    {
        (IProducer.ProducerStatus status, IProducer.ProducerCore memory producer) = _producer
        .getProducer(_uniqueId);
        require(
            status != IProducer.ProducerStatus.NotSet,
            "producer with this unique id not found"
        );
        return producer;
    }


    function _reward(bytes32 uniqueId, address[] memory accounts, uint256[] memory amounts) internal virtual returns (uint256){
        uint256 total;
        require(accounts.length == amounts.length, "accounts and amounts must have same length");
        
        // 获取uniqueId对应的owner
        IProducer.ProducerCore memory producer = _getProducer(uniqueId);
        address owner = producer.owner;
        
        for (uint256 i = 0; i < accounts.length; i++) {
            _tat.mint(TREASURE_KIND, uniqueId, accounts[i], amounts[i]);
            _tat.setTATRecord(accounts[i], amounts[i]);
            total = total + amounts[i];
        }
        return total;
    }

    function reward(bytes32 uniqueId, address[] memory accounts, uint256[] memory amounts) public returns (uint256){
       return _reward(uniqueId, accounts, amounts);
    }



    /**
     * @dev 获取当前年月，格式YYYYMM
     * @return 当前年月，例如202407表示2024年7月
     */
    function getCurrentYearMonth() internal view returns (uint256) {
        // 获取当前时间戳
        uint256 timestamp = block.timestamp;
        
        // 转换为日期（简化实现）
        uint256 secondsInDay = 86400; // 24小时 * 60分钟 * 60秒
        uint256 secondsInYear = secondsInDay * 365; // 简化，不考虑闰年
        
        uint256 yearsSince1970 = timestamp / secondsInYear;
        uint256 year = 1970 + yearsSince1970;
        
        // 计算月份
        uint256 secondsRemainingInYear = timestamp % secondsInYear;
        uint256 daysRemainingInYear = secondsRemainingInYear / secondsInDay;
        
        // 简化实现，大约估算月份
        uint256 month = (daysRemainingInYear * 12) / 365 + 1;
        
        // 限制月份范围
        if (month > 12) month = 12;
        
        // 组合成YYYYMM格式
        return year * 100 + month;
    }
}
