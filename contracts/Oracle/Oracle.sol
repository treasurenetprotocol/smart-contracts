// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "../Governance/IRoles.sol";
import "./IOracle.sol";

/**
 * @dev Oracle contract serves as the core oracle system, implementing functionalities such as:
 *    - Initiating/Canceling Oracle requests
 *    - Uploading Oracle data (Role: Feeder)
 */
contract Oracle is Initializable, OwnableUpgradeable, IOracle {
    bytes32 public constant FEEDER = keccak256("FEEDER");

    event OracleRequest(address requester, bytes32 requesterid, address callbackAddress, bytes4 callbackFunctionId);

    event CancelOracleRequest(address requester, bytes32 requestid);

    IRoles private _roleController;

    mapping(bytes32 => uint256) private _currencyValues;

    // requestid -> commitment id
    mapping(bytes32 => bytes32) private _commitments;

    /// @dev Contract initialization
    /// @param _roleContract Address of the role management contract
    function initialize(address _roleContract) public initializer {
        __Ownable_init();
        _roleController = IRoles(_roleContract);
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
    )
        public
        override
        returns (bytes32)
    {
        bytes32 requestId = keccak256(abi.encodePacked(msg.sender, _nonce));
        require(_commitments[requestId] == 0, "must be a unique request id");
        _commitments[requestId] = keccak256(abi.encodePacked(_callbackAddress, _callbackFunctionId));

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
    )
        public
        override
        returns (bytes32)
    {
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

    function getCurrencyValue(bytes32 _currencyKind) public view override returns (uint256) {
        return _currencyValues[_currencyKind];
    }
}
