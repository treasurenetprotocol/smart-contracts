// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./IRoles.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title Treasurenet's governance contract
/// @author bjwswang
contract Governance is OwnableUpgradeable {
    
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");

    // bytes32 public constant TREAUSRE_OIL = keccak256("OIL");
    // bytes32 public constant TREASURE_GAS = keccak256("GAS");

    IRoles private _role;
    address private _parameterInfo;
    address private _mulSig;

    address private _dao;

    mapping(bytes32 => Treasure) private _treasures;

     /// @dev Treasure's core data structure, representing a similar asset, such as OIL/GAS/ETHER
    struct Treasure {
        bytes32 Kind;
        address ProducerContract;
        address ProductionDataContract;
    }

     /// @dev Used for the initialization of the Governance contract
     /// @param _daoContract DAO contract address
     /// @param _mulSigContract Multisig contract address
     /// @param _roleContract Role management contract address
     /// @param _parameterInfoContract Parameter management contract address
    function initialize(
        address _daoContract,
        address _mulSigContract,
        address _roleContract,
        address _parameterInfoContract,
        string[] memory _treasureTypes,
        address[] memory _producers,
        address[] memory _productionDatas        
    ) public initializer {
        _role = IRoles(_roleContract);
        _parameterInfo = _parameterInfoContract;
        _mulSig = _mulSigContract;

        _dao = _daoContract;

        require(_treasureTypes.length == _producers.length,"treasure length mismatch");
        require(_treasureTypes.length == _productionDatas.length,"treasureTypes mismatch with productionDatas length");

        for (uint256 i = 0; i < _treasureTypes.length; ++i) {
            require(_addTreasure(_treasureTypes[i], _producers[i], _productionDatas[i]),"failed to initialize treasure");
        }   
    }

    modifier onlyDAO() {
        require(_msgSender() == _dao, "only DAO contract");
        _;
    }

    modifier onlyMulSig() {
        require(_msgSender() == _mulSig, "");
        _;
    }
    
     /// @dev Return the current threshold set by the Governance multisig contract
     /// @return uint256 threshold
    function fmThreshold() public view returns (uint256) {
        return _role.getRoleMemberCount(FOUNDATION_MANAGER) / 2 + 1;
    }

    event AddTreasure(string treasureType,address producerContract,address produceDataContract);
     /// @dev Used to add new Treasure assets (this method can only be called from the Multisig contract)
     ///   - Events:
     ///    - event AddTreasure(string treasureType,address producerContract,address produceDataContract);
     /// @param _treasureType Asset name
     /// @param _producer Management contract address corresponding to the asset's producer
     /// @param _productionData Management contract address corresponding to the asset's production data
    function addTreasure(
        string memory _treasureType,
        address _producer,
        address _productionData
    ) public onlyMulSig {
        require(_addTreasure(_treasureType, _producer, _productionData),"failed to add treasure");
    }

    function _addTreasure(
        string memory _treasureType,
        address _producer,
        address _productionData
    ) internal returns(bool) {
        bytes32 kind = keccak256(bytes(_treasureType));
        require(_treasures[kind].ProducerContract == address(0), "treasure type already exists");
        require(_producer != address(0),"empty producer contract");
        require(_productionData!= address(0),"empty production data contract");

        Treasure memory newTreasure;
        newTreasure.Kind = kind;
        newTreasure.ProducerContract = _producer;
        newTreasure.ProductionDataContract = _productionData;

        _treasures[newTreasure.Kind] = newTreasure;

        emit AddTreasure(_treasureType, _producer, _productionData);

        return true;
    }

    /// @dev Used to query the contract address corresponding to the asset type of Treasure
    /// @param _treasureType Asset name
    /// @return address Producer management contract address
    /// @return address Production data management contract address
    function getTreasureByKind(string memory _treasureType) public view returns (address, address) {
        bytes32 kind = keccak256(bytes(_treasureType));
        require(_treasures[kind].ProducerContract != address(0), "treasure not found");

        return (_treasures[kind].ProducerContract, _treasures[kind].ProductionDataContract);
    }
}
