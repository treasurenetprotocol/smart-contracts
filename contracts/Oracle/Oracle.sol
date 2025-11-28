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
 *    - Managing price data for supported tokens/symbols
*/
contract Oracle is Initializable, OwnableUpgradeable, IOracle {
    bytes32 public constant FEEDER = keccak256("FEEDER");
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");

    event OracleRequest(
        address requester,
        bytes32 requesterid,
        address callbackAddress,
        bytes4 callbackFunctionId
    );

    event CancelOracleRequest(address requester, bytes32 requestid);
    
    // TCASH mint status events
    event TCashMintStatusChanged(bool status, uint256 timestamp);
    event TCashMintLockPriceChanged(uint256 price, uint256 timestamp);
    
    // Events integrated from TCashOracle
    event PriceUpdated(
        string indexed symbol,
        uint256 price,
        uint256 timestamp
    );

    IRoles private _roleController;

    mapping(bytes32 => uint256) private _currencyValues;

    // requestid -> commitment id
    mapping(bytes32 => bytes32) private _commitments;
    
    // TCASH mint lock related state
    bool private _tcashMintStatus; // TCASHMS: true=allowed, false=disabled
    uint256 private _tcashMintLockPrice; // TCASHMLP: 0=unlocked, >0=lock price
    
    // Data structures and state from TCashOracle
    // Price structure
    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }
    
    // TCashOracle state variables
    mapping(string => PriceData) public prices;
    mapping(string => bool) public supportedSymbols;

    /// @dev Contract initialization
    /// @param _roleContract Address of the role management contract
    function initialize(address _roleContract) public initializer {
        __Ownable_init();
        _roleController = IRoles(_roleContract);
        
        // Initialize TCASH mint status as allowed
        _tcashMintStatus = true;
        _tcashMintLockPrice = 0;
        
        // Initialize supported tokens (integrated from TCashOracle)
        supportedSymbols["UNIT"] = true;
        supportedSymbols["TCASH"] = true;
    }

    modifier onlyFeeder() {
        require(_roleController.hasRole(FEEDER, _msgSender()), "Only Feeder can push data");
        _;
    }
    
    modifier onlyFoundationManager() {
        require(_roleController.hasRole(FOUNDATION_MANAGER, _msgSender()), "Not authorized");
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
    function setCurrencyValue(bytes32 _currencyKind, uint256 _currencyValue) public override onlyFeeder {
        _currencyValues[_currencyKind] = _currencyValue;
    }

    function getCurrencyValue(bytes32 _currencyKind) public view override returns(uint256) {
        return _currencyValues[_currencyKind];
    }
    
    /// @notice Get TCASH mint status
    /// @dev Returns whether TCASH minting is allowed
    /// @return Current TCASH mint status (true: allowed, false: disabled)
    function getTCashMintStatus() public view override returns(bool) {
        return _tcashMintStatus;
    }
    
    /// @notice Set TCASH mint status
    /// @dev Feeder only; sets TCASH mint status
    /// @param _status TCASH mint status (true: allowed, false: disabled)
    function setTCashMintStatus(bool _status) public override onlyFeeder {
        _tcashMintStatus = _status;
        emit TCashMintStatusChanged(_status, block.timestamp);
    }
    
    /// @notice Get TCASH mint lock price
    /// @dev Returns current TCASH mint lock price; 0 means unlocked
    /// @return TCASH mint lock price
    function getTCashMintLockPrice() public view override returns(uint256) {
        return _tcashMintLockPrice;
    }
    
    /// @notice Set TCASH mint lock price
    /// @dev Feeder only; sets TCASH mint lock price
    /// @param _price TCASH mint lock price (0: unlocked)
    function setTCashMintLockPrice(uint256 _price) public override onlyFeeder {
        _tcashMintLockPrice = _price;
        emit TCashMintLockPriceChanged(_price, block.timestamp);
    }

    /// @notice Check and update TCASH mint status
    /// @dev Called by Feeder; checks price movement and updates mint status
    /// @param _currentPrice Current TCASH price
    /// @param _previousPrice TCASH price recorded one hour ago
    /// @param _lockThreshold Lock threshold (e.g., 3000 means 30%)
    /// @param _resetThreshold Reset threshold (e.g., 11000 means 110%)
    function checkAndUpdateTCashMintStatus(
        uint256 _currentPrice, 
        uint256 _previousPrice, 
        uint256 _lockThreshold, 
        uint256 _resetThreshold
    ) public override onlyFeeder {
        // If currently unlocked (minting allowed)
        if (_tcashMintLockPrice == 0) {
            // Check whether price drop in past hour exceeds threshold
            if (_previousPrice > 0) {
                uint256 priceChange = (_previousPrice - _currentPrice) * 10000 / _previousPrice;
                
                // Lock minting if price drop exceeds threshold
                if (priceChange >= _lockThreshold) {
                    _tcashMintLockPrice = _currentPrice;
                    _tcashMintStatus = false;
                    
                    emit TCashMintLockPriceChanged(_currentPrice, block.timestamp);
                    emit TCashMintStatusChanged(false, block.timestamp);
                }
            }
        } else {
            // Locked; determine if price meets reset threshold
            uint256 resetPrice = _tcashMintLockPrice * _resetThreshold / 10000;
            
            // Unlock if price meets or exceeds reset threshold
            if (_currentPrice >= resetPrice) {
                _tcashMintLockPrice = 0;
                _tcashMintStatus = true;
                emit TCashMintLockPriceChanged(0, block.timestamp);
                emit TCashMintStatusChanged(true, block.timestamp);
            }
        }
    }
    
    // Functions integrated from TCashOracle
    function updatePrice(string memory symbol, uint256 price) external onlyFoundationManager returns (bool) {
        require(supportedSymbols[symbol], "Unsupported symbol");
        require(price > 0, "Invalid price");
        bytes32 symbolHash = keccak256(bytes(symbol));
        _currencyValues[symbolHash] = price;
        prices[symbol] = PriceData({
            price: price,
            timestamp: block.timestamp
        });
        emit PriceUpdated(symbol, price, block.timestamp);
        return true;
    }

    function getPrice(string memory symbol) external view returns (uint256) {
        require(supportedSymbols[symbol], "Unsupported symbol");
        bytes32 symbolHash = keccak256(bytes(symbol));
        return _currencyValues[symbolHash];
    }

    function getPriceData(string memory symbol) external view returns (uint256 price, uint256 timestamp) {
        require(supportedSymbols[symbol], "Unsupported symbol");
        bytes32 symbolHash = keccak256(bytes(symbol));
        price = _currencyValues[symbolHash];
        timestamp = prices[symbol].timestamp;
        return (price, timestamp);
    }

    /// @notice Add a supported token
    /// @dev Add a new supported token symbol
    /// @param symbol Token symbol
    /// @return Whether the operation succeeded
    function addSupportedSymbol(string memory symbol) external onlyFoundationManager returns (bool) {
        require(!supportedSymbols[symbol], "Symbol already supported");
        
        supportedSymbols[symbol] = true;
        return true;
    }

    /// @notice Remove a supported token
    /// @dev Remove a supported token symbol
    /// @param symbol Token symbol
    /// @return Whether the operation succeeded
    function removeSupportedSymbol(string memory symbol) external onlyFoundationManager returns (bool) {
        require(supportedSymbols[symbol], "Symbol not supported");
        
        supportedSymbols[symbol] = false;
        return true;
    }

    /// @notice Check if a token is supported
    /// @dev Check whether the specified token symbol is supported
    /// @param symbol Token symbol
    /// @return Whether it is supported
    function isSupportedSymbol(string memory symbol) external view returns (bool) {
        return supportedSymbols[symbol];
    }
}
