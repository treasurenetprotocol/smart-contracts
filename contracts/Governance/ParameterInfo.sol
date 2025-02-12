// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IParameterInfo.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

/// @title Platform configuration information management contract
/// @author bjwswang
contract ParameterInfo is Initializable, OwnableUpgradeable, IParameterInfo {
    // OIL/GAS required
    PriceDiscountConfig private _priceDiscountConfig;
    mapping(string => uint256) private _platformConfig;

    uint256 private warnRatio;
    uint256 private liquidationRatio;

    address private _mulSig;

    /// @dev Contract initialization
    /// @param _mulSigContract Multi-signature contract address
    function initialize(address _mulSigContract) public initializer {
        __Ownable_init();

        _mulSig = _mulSigContract;

        warnRatio = 9900;
        liquidationRatio = 9000;

        _platformConfig["marginRatio"] = 100;
        _platformConfig["reserveRatio"] = 1000;
        _platformConfig["loanInterestRate"] = 5;
        _platformConfig["loanPledgeRate"] = 15000;

        _priceDiscountConfig.API = 3110;
        _priceDiscountConfig.sulphur = 500;
        _priceDiscountConfig.discount = [9000, 8500, 8000, 7500];
    }

    modifier onlyMulSig() {
        require(_msgSender() == _mulSig, "");
        _;
    }

    function _msgSender()
    internal
    view
    virtual
    override(ContextUpgradeable)
    returns (address)
    {
        return msg.sender;
    }

    function _msgData()
    internal
    view
    virtual
    override(ContextUpgradeable)
    returns (bytes calldata)
    {
        return msg.data;
    }

    /// @dev Set platform parameters
    /// @param key Parameter name
    ///    - marginRatio
    ///    - reserveRatio
    ///    - loanInterestRate
    ///    - loanPledgeRate
    ///    - liquidationRatio
    /// @param amount Parameter value
    /// @return bool Whether the setting was successful
    function setPlatformConfig(string memory key, uint256 amount)
    external override
    onlyMulSig
    returns (bool)
    {
        if (keccak256(bytes(key)) == keccak256(bytes("marginRatio"))) {
            require(0 <= amount && amount <= 10000, "overflow");
            _platformConfig[key] = amount;
        } else if (keccak256(bytes(key)) == keccak256(bytes("reserveRatio"))) {
            require(0 <= amount && amount <= 10000, "overflow");
            _platformConfig[key] = amount;
        } else if (keccak256(bytes(key)) == keccak256(bytes("loanInterestRate"))) {
            require(0 <= amount && amount <= 100, "overflow");
            _platformConfig[key] = amount;
        } else if (keccak256(bytes(key)) == keccak256(bytes("loanPledgeRate"))) {
            require(12000 <= amount && amount <= 66600, "overflow");
            _platformConfig[key] = amount;
        } else if (keccak256(bytes(key)) == keccak256(bytes("liquidationRatio"))) {
            require(9000 <= amount && amount <= 9900, "overflow");
            liquidationRatio = amount;
        } else {
            revert("not support");
        }

        return true;
    }

    /// @dev Get platform parameters
    /// @param key Parameter name
    /// @return uint256 Current value of the parameter
    function getPlatformConfig(string memory key) public view override returns (uint256) {
        return _platformConfig[key];
    }

    function getUSTNLoanPledgeRateWarningValue() public view override returns (uint amount){
        return _platformConfig["loanPledgeRate"] * warnRatio / 10000;
    }

    // get USTN loan liquidation rate
    function getUSTNLoanLiquidationRate() public view override returns (uint amount){
        return _platformConfig["loanPledgeRate"] * liquidationRatio / 10000;
    }

    // Additional interfaces for querying ratios for frontend
    function getUSTNLoanPledgeRate() public view returns (uint256){
        return _platformConfig["loanPledgeRate"];
    }
    function getUSTNLoanInterestRate() public view returns (uint256){
        return _platformConfig["loanInterestRate"];
    }

    /// @dev Set asset discount configuration information
    /// @param API API value
    /// @param sulphur acidity
    /// @param discount1 Discount parameter 1
    /// @param discount2 Discount parameter 2
    /// @param discount3 Discount parameter 3
    /// @param discount4 Discount parameter 4
    /// @return bool Whether the setting was successful
    function setPriceDiscountConfig(
        uint256 API,
        uint256 sulphur,
        uint256 discount1,
        uint256 discount2,
        uint256 discount3,
        uint256 discount4
    ) external override onlyMulSig returns (bool) {
        require(0 <= API && API <= 10000, "overflow");
        require(0 <= sulphur && sulphur <= 10000, "overflow");
        require(0 <= discount1 && discount1 <= 10000, "overflow");
        require(
            discount1 > discount2 && discount2 > discount3 && discount3 > discount4,
            "overflow"
        );
        _priceDiscountConfig.API = API;
        _priceDiscountConfig.sulphur = sulphur;
        _priceDiscountConfig.discount = [discount1, discount2, discount3, discount4];

        return true;
    }

    /// @dev Query discount information
    /// @param _API API value
    /// @param _sulphur Acidity
    /// @return uint256 Discount parameter
    function getPriceDiscountConfig(uint256 _API, uint256 _sulphur) public view override returns (uint256) {
        uint256 discount;
        require(_API != 0 && _sulphur != 0, "this mine data is error or not exist this mine.");
        if (_API > _priceDiscountConfig.API && _sulphur < _priceDiscountConfig.sulphur) {
            discount = _priceDiscountConfig.discount[0];
        }
        if (_API > _priceDiscountConfig.API && _sulphur >= _priceDiscountConfig.sulphur) {
            discount = _priceDiscountConfig.discount[1];
        }
        if (_API <= _priceDiscountConfig.API && _sulphur < _priceDiscountConfig.sulphur) {
            discount = _priceDiscountConfig.discount[2];
        }
        if (_API <= _priceDiscountConfig.API && _sulphur >= _priceDiscountConfig.sulphur) {
            discount = _priceDiscountConfig.discount[3];
        }
        return discount;
    }
}
