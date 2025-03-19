// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../Governance/IRoles.sol";
import "./IOracle.sol";

/**
 * @dev Oracle contract serves as the core oracle system, implementing functionalities such as:
 *    - Initiating/Canceling Oracle requests
 *    - Uploading Oracle data (Role: Feeder)
 *    - Managing TCASH minting status based on price fluctuations
*/
contract Oracle is Initializable, OwnableUpgradeable, IOracle {
    bytes32 public constant FEEDER = keccak256("FEEDER");

    event OracleRequest(
        address requester,
        bytes32 requesterid,
        address callbackAddress,
        bytes4 callbackFunctionId
    );

    event CancelOracleRequest(address requester, bytes32 requestid);
    
    // TCASH铸造状态相关事件
    event TCashMintStatusChanged(bool status, uint256 timestamp);
    event TCashMintLockPriceChanged(uint256 price, uint256 timestamp);

    IRoles private _roleController;

    mapping(bytes32 => uint256) private _currencyValues;

    // requestid -> commitment id
    mapping(bytes32 => bytes32) private _commitments;
    
    // TCASH铸造锁定相关状态
    bool private _tcashMintStatus; // TCASHMS: true=允许铸造, false=禁止铸造
    uint256 private _tcashMintLockPrice; // TCASHMLP: 0=未锁定, >0=锁定价格

    /// @dev Contract initialization
    /// @param _roleContract Address of the role management contract
    function initialize(address _roleContract) public initializer {
        __Ownable_init();
        _roleController = IRoles(_roleContract);
        
        // 初始化TCASH铸造状态为允许
        _tcashMintStatus = true;
        _tcashMintLockPrice = 0;
    }

    modifier onlyFeeder() {
        require(_roleController.hasRole(FEEDER, _msgSender()), "Only Feeder can push data");
        _;
    }

    /// @dev Initiates an Oracle request
    ///  - Emits an event:
    ///  ``` 
    ///  event OracleRequest(
    ///     address requester,
    ///     bytes32 requesterid,
    ///     address callbackAddress,
    ///     bytes4 callbackFunctionId
    // ); 
    /// ```
    /// @param _callbackAddress Address of the callback contract
    /// @param _callbackFunctionId Selector of the callback function
    /// @param _nonce Nonce value
    /// @return bytes32 The request ID
    function createOracleRequest(
        address _callbackAddress,
        bytes4 _callbackFunctionId,
        uint256 _nonce
    ) public override returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, _nonce));
        require(_commitments[requestId] == 0, "must be a unique request id");
        _commitments[requestId] = keccak256(
            abi.encodePacked(_callbackAddress, _callbackFunctionId)
        );

        emit OracleRequest(msg.sender, requestId, _callbackAddress, _callbackFunctionId);

        return requestId;
    }

    /// @dev Cancels an Oracle request
    ///  - Emits an event:
    ///  ``` 
    ///  event CancelOracleRequest(
    ///     address requester,
    ///     bytes32 requesterid,
    ///     address callbackAddress,
    ///     bytes4 callbackFunctionId
    // ); 
    /// ```
    /// @param _requestId The request ID
    /// @param _callbackAddress Address of the callback contract
    /// @param _callbackFuncId Selector of the callback function
    /// @return bytes32 The request ID
    function cancelOracleRequest(
        bytes32 _requestId,
        address _callbackAddress,
        bytes4 _callbackFuncId
    ) public override returns (bytes32) {
        bytes32 paramsHash = keccak256(abi.encodePacked(_callbackAddress, _callbackFuncId));
        require(paramsHash == _commitments[_requestId], "Params do not match request ID");
        // delete _commitments[_requestId];

        emit CancelOracleRequest(msg.sender, _requestId);

        return _requestId;
    }

    // UNIT Value 
    function setCurrencyValue(bytes32 _currencyKind,uint256 _currencyValue) public override onlyFeeder {
        _currencyValues[_currencyKind] = _currencyValue;
    }

    function getCurrencyValue(bytes32 _currencyKind) public view override returns(uint256) {
        return _currencyValues[_currencyKind];
    }
    
    /// @notice 获取TCASH铸造状态
    /// @dev 返回当前TCASH是否允许铸造
    /// @return 当前TCASH铸造状态(true:允许, false:禁止)
    function getTCashMintStatus() public view override returns(bool) {
        return _tcashMintStatus;
    }
    
    /// @notice 设置TCASH铸造状态
    /// @dev 仅限Feeder角色调用，用于设置TCASH铸造状态
    /// @param _status TCASH铸造状态(true:允许, false:禁止)
    function setTCashMintStatus(bool _status) public override onlyFeeder {
        _tcashMintStatus = _status;
        emit TCashMintStatusChanged(_status, block.timestamp);
    }
    
    /// @notice 获取TCASH铸造锁定价格
    /// @dev 返回当前TCASH铸造锁定价格，0表示未锁定
    /// @return TCASH铸造锁定价格
    function getTCashMintLockPrice() public view override returns(uint256) {
        return _tcashMintLockPrice;
    }
    
    /// @notice 设置TCASH铸造锁定价格
    /// @dev 仅限Feeder角色调用，用于设置TCASH铸造锁定价格
    /// @param _price TCASH铸造锁定价格(0:未锁定)
    function setTCashMintLockPrice(uint256 _price) public override onlyFeeder {
        _tcashMintLockPrice = _price;
        emit TCashMintLockPriceChanged(_price, block.timestamp);
    }
    
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
    ) public override onlyFeeder {
        // 检查当前铸造锁定价格是否为0(表示目前处于"可铸造"状态)
        if (_tcashMintLockPrice == 0) {
            // 计算过去一小时内价格波动是否超过阈值
            if (_previousPrice > 0) {
                uint256 priceChange = (_previousPrice - _currentPrice) * 10000 / _previousPrice;
                
                // 如果价格下跌超过阈值，则锁定铸造
                if (priceChange >= _lockThreshold) {
                    _tcashMintLockPrice = _currentPrice;
                    _tcashMintStatus = false;
                    
                    emit TCashMintLockPriceChanged(_currentPrice, block.timestamp);
                    emit TCashMintStatusChanged(false, block.timestamp);
                }
            }
        } else {
            // 已锁定状态，判断当前价格是否达到重置阈值
            uint256 resetPrice = _tcashMintLockPrice * _resetThreshold / 10000;
            
            // 如果当前价格达到或超过重置阈值，则解除锁定
            if (_currentPrice >= resetPrice) {
                _tcashMintLockPrice = 0;
                _tcashMintStatus = true;
                
                emit TCashMintLockPriceChanged(0, block.timestamp);
                emit TCashMintStatusChanged(true, block.timestamp);
            }
        }
    }
}
