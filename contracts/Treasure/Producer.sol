// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IProductionData.sol";
import "../Governance/IRoles.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/utils/Timers.sol";
import "./interfaces/IProducer.sol";
import "./Share.sol";

/**
 * @dev Core contract for managing producers, implementing:
 *    - Producer management: Adding/modifying producers
 *    - Producer revenue sharing: Share
 *    - Integration with Otter Stream
 */
abstract contract Producer is Initializable, IProducer, Share {
    using SafeCast for uint256;

    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");

    address private _mulSig;
    IRoles private _roles;

    string private _asset_type;
    mapping(bytes32 => ProducerCore) private _producers;
    mapping(bytes32 => ProducerStatus) private _producerStatus;

    // _producerTotalOccupied records the proportion occupied by streams through DApps for each producer (well), < 100
    mapping(bytes32 => uint256) private _producerTotalOccupied;

    mapping(bytes32 => address) private _dapps;

    IProductionData private _productionData;

    /// @dev Contract initialization
    /// @param _mulSigContract Multi-signature contract address
    /// @param _roleContract Role management contract address
    /// @param _productionDataContract Production data management contract address
    function __ProducerInitialize(
        address _mulSigContract,
        address _roleContract,
        string memory _assetType,
        address _productionDataContract,
        string[] memory _dappNames,
        address[] memory _payees
    )
        internal
        onlyInitializing
    {
        require(_mulSigContract != address(0), "empty MulSig contract");
        require(_roleContract != address(0), "empty Role contract");
        require(keccak256(bytes(_assetType)) != keccak256(bytes("")), "empty treasure type");
        require(_productionDataContract != address(0), "empty ProductionData contract");

        _asset_type = _assetType;
        _roles = IRoles(_roleContract);
        _productionData = IProductionData(_productionDataContract);

        require(_dappNames.length == _payees.length, "dapps array must equal to payees array");
        for (uint256 i = 0; i < _dappNames.length; i++) {
            require(keccak256(bytes(_dappNames[i])) != keccak256(bytes("")), "has empty dapp name");
            require(_payees[i] != address(0), "has empty dapp payee");
            bytes32 dappId = keccak256(abi.encodePacked(_dappNames[i], _payees[i]));
            _dapps[dappId] = _payees[i];
            /* add an event here. */
            emit RegisterDAppConnect(_dappNames[i], _payees[i], dappId);
        }
    }

    modifier onlyFoundationManager() {
        require(_roles.hasRole(FOUNDATION_MANAGER, msg.sender), "must have role FOUNDATION_MANAGER ");
        _;
    }

    modifier onlyMulSig() {
        require(msg.sender == _mulSig, "");
        _;
    }

    /// @dev Add a producer (only FOUNDATION_MANAGER)
    /// - Event
    ///     event AddProducer(bytes32 uniqueId,ProducerCore producer);
    /// @param _uniqueId Unique ID of the producer
    /// @param _producer Producer information
    function addProducer(bytes32 _uniqueId, ProducerCore memory _producer) public override {
        _beforeAddProducer(_uniqueId, _producer);
        _addProducer(_uniqueId, _producer);
        _afterAddProducer(_uniqueId);
        emit AddProducer(_uniqueId, _producer);
    }

    // TODO: implement below functions

    function _beforeAddProducer(bytes32 _uniqueId, ProducerCore memory /* _producer */ ) internal virtual {
        ProducerCore memory producer = _producers[_uniqueId];
        require(producer.owner == address(0), "producer already exist");
    }

    function _addProducer(bytes32 _uniqueId, ProducerCore memory _producer) internal virtual {
        _producers[_uniqueId] = _producer;
    }

    function _afterAddProducer(bytes32 _uniqueId) internal virtual {
        _producerStatus[_uniqueId] = ProducerStatus.NotSet;
    }

    /// @dev Update producer status (only FOUNDATION_MANAGER)
    /// - Event
    ///      event SetProducerStatus(bytes32 uniqueId,ProducerStatus status);
    /// @param _uniqueId Unique ID of the producer
    /// @param _newStatus New status
    // enum ProducerStatus {
    //     NotSet,
    //     Active,
    //     Deactive
    // }
    function setProducerStatus(bytes32 _uniqueId, ProducerStatus _newStatus) public override onlyFoundationManager {
        //require(producerStatus(_uniqueId) != _newStatus, "status not changed");
        require(_newStatus != ProducerStatus.NotSet, "invalid status");

        bytes32 requestId;

        if (_newStatus == ProducerStatus.Active && _productionData.getTDRequestID(_uniqueId) == bytes32("")) {
            requestId = _productionData.registerTrustedDataRequest(_uniqueId);
        }

        if (_newStatus == ProducerStatus.Deactive && _productionData.getTDRequestID(_uniqueId) != bytes32("")) {
            _productionData.cancelTrustedDataRequest(_uniqueId);
        }

        _producerStatus[_uniqueId] = _newStatus;

        emit SetProducerStatus(_uniqueId, requestId, _newStatus);
    }

    event UpdateProducer(bytes32 uniqueId, ProducerCore _old, ProducerCore _new);
    /// @dev Update producer information (only FOUNDATION_MANAGER)
    /// - Event
    ///       event UpdateProducer(bytes32 uniqueId,ProducerCore _old ,ProducerCore _new);
    /// @param _uniqueId Unique ID of the producer
    /// @param _producer Producer information
    /// struct ProducerCore {
    ///     string nickname;
    ///     address owner;
    ///     uint256 API;
    ///     uint256 sulphur;
    /// }

    function updateProdcuer(bytes32 _uniqueId, ProducerCore memory _producer) public override {
        (, ProducerCore memory curr) = getProducer(_uniqueId);
        require(curr.owner == _producer.owner, "owner change not allowd");
        require(curr.owner == msg.sender, "only owner can update");
        _updateProducer(_uniqueId, _producer);

        _producerStatus[_uniqueId] = ProducerStatus.NotSet;

        emit UpdateProducer(_uniqueId, curr, _producer);
    }

    function _updateProducer(bytes32 _uniqueId, ProducerCore memory _producer) internal {
        _producers[_uniqueId] = _producer;
    }

    /// @dev Get producer status
    /// @param _uniqueId Unique ID of the producer
    /// @return ProducerStatus Producer status
    function producerStatus(bytes32 _uniqueId) public view override returns (ProducerStatus) {
        return _producerStatus[_uniqueId];
    }

    /// @dev Get producer information and status
    /// @param _uniqueId Unique ID of the producer
    /// @return ProducerStatus Producer status
    /// @return ProducerCore
    function getProducer(bytes32 _uniqueId) public view override returns (ProducerStatus, ProducerCore memory) {
        if (producerStatus(_uniqueId) == ProducerStatus.NotSet) {
            ProducerCore memory emptyProducer;
            return (ProducerStatus.NotSet, emptyProducer);
        }
        return (producerStatus(_uniqueId), _producers[_uniqueId]);
    }

    event RegisterDAppConnect(string dap, address payee, bytes32 dappId);
    /// @dev Register a DApp
    /// @param dapp Name of the DApp
    /// @param payee Payee address of the DApp
    /// @return bytes32 ID of the DApp

    function registerDAppConnect(string memory dapp, address payee) external override onlyMulSig returns (bytes32) {
        require(keccak256(bytes(dapp)) != keccak256(bytes("")), "empty dapp name");
        require(payee != address(0), "empty DApp payee");
        bytes32 dappId = keccak256(abi.encodePacked(dapp, payee));
        require(_dapps[dappId] == address(0), "dapp already registered");
        _dapps[dappId] = payee;
        emit RegisterDAppConnect(dapp, payee, dappId);
        return dappId;
    }

    function getDAppPayee(bytes32 _dappId) public view override returns (address) {
        address payee = _dapps[_dappId];
        require(payee != address(0), "dapp with this dappId not registered yet");
        return payee;
    }

    /// @dev Link Otter Stream
    /// @param _uniqueIds Array of unique IDs of producers
    /// @param _key Verification code
    /// @param _dappId ID of the DApp
    function link(bytes32[] memory _uniqueIds, bytes32 _key, bytes32 _dappId) public override {
        require(_uniqueIds.length > 0, "at least 1 uniqueId is required");
        require(_dapps[_dappId] != address(0), "dapp with this id not found");

        uint256[] memory ratios = new uint256[](_uniqueIds.length);
        string[] memory nicknames = new string[](_uniqueIds.length);

        for (uint256 i = 0; i < _uniqueIds.length; i++) {
            (ProducerStatus status, ProducerCore memory p) = getProducer(_uniqueIds[i]);
            require(status == ProducerStatus.Active, "producer not active");
            //require(isHolder(_uniqueIds[i], msg.sender) || msg.sender == p.owner, "only producer holder or producer
            // owner can link stream");
            require(isHolder(_uniqueIds[i], _dapps[_dappId]), "dapp's payee must be producer's holder");
            Holder memory hold = holder(_uniqueIds[i], _dapps[_dappId]);

            /*uint256 occupied = _producerTotalOccupied[_uniqueIds[i]];
            require(occupied + hold.ratio <= MAX_PIECES, "occupied ratio of a producer cannot exceedes
            MAX_PIECES(100)");
            _producerTotalOccupied[_uniqueIds[i]] = occupied + hold.ratio;
            ratios[i] = _producerTotalOccupied[_uniqueIds[i]];*/
            ratios[i] = hold.ratio;
            nicknames[i] = p.nickname;
        }

        emit Link(_key, _uniqueIds, ratios, nicknames, _dappId);
    }
}
