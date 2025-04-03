// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import "./DAO/IDAO.sol";
import "./IGovernance.sol";
import "./IParameterInfo.sol";
import "./IRoles.sol";
import "../Treasure/interfaces/IProducer.sol";
import "./ICrosschainTokens.sol";

/// @title Multisig contract
/// @author bjwswang
contract MulSig is Initializable, OwnableUpgradeable {
    bytes32 public constant FOUNDATION_MANAGER = keccak256("FOUNDATION_MANAGER");
    bytes32 public constant FEEDER = keccak256("FEEDER");

    mapping(uint256 => proposal) private proposals;
    uint256[] private pendingProposals;
    uint256 private proposalIDx;
    uint256 private confirmDuration;

    IDAO private _dao;
    IGovernance private _governance;
    IParameterInfo private _parameterInfo;
    IRoles private _roles;
    ICrosschainTokens private _crosschainTokens;

    // Proposals:
    // - Manage manager
    // - Manage user groups
    // - Manage platform config
    // - Manage discount config
    // - Manage mineral types
    // - Manage crosschain token
    struct proposal {
        address proposer;
        string name;
        address _add;
        uint256 value;
        IParameterInfo.PriceDiscountConfig data;
        uint256 _type; // 1: adminPermission 2: addResource 3: dataConfig 4: discountConfig 5: registerDApp 6: setCrosschainToken
        uint8 signatureCount;
        uint256 excuteTime;
        address producer;
        address productionData;
        mapping(address => uint8) signatures;

        string treasureKind;
        address payee;
        string token;
        address sourceERC20;
        address sourceCrosschain;
        uint256 sourceChainId;
        address targetERC20;
        address targetCrosschain;
        uint256 targetChainId;
        uint256 fee;
        uint256 chainId;
    }

    uint256 constant PROPOSAL_TYPE_SET_CROSSCHAIN_TOKEN = 6;

    /// @dev Used for the initialization of the Mulsig contract
    /// @param _daoContract DAO contract address
    /// @param _governanceContract Governance contract address
    /// @param _roleContract Role management contract address
    /// @param _parameterInfoContract Parameter management contract address
    /// @param _crosschainTokensContract CrosschainTokens contract address
    /// @param _confirmation Confirmation duration in seconds
    function initialize(
        address _daoContract,
        address _governanceContract,
        address _roleContract,
        address _parameterInfoContract,
        address _crosschainTokensContract,
        uint256 _confirmation
    ) public initializer {
        __Ownable_init();

        confirmDuration = _confirmation * 1 seconds;

        _dao = IDAO(_daoContract);
        _governance = IGovernance(_governanceContract);
        _parameterInfo = IParameterInfo(_parameterInfoContract);
        _roles = IRoles(_roleContract);
        _crosschainTokens = ICrosschainTokens(_crosschainTokensContract);
    }

    /// @dev 获取当前初始化参数值
    /// @return daoAddress DAO合约地址
    /// @return governanceAddress 治理合约地址
    /// @return rolesAddress 角色管理合约地址
    /// @return parameterInfoAddress 参数信息合约地址
    /// @return crosschainTokensAddress 跨链代币合约地址
    /// @return _confirmDuration 确认时间(秒)
    function getCurrentValues() public view returns (
        address daoAddress,
        address governanceAddress,
        address rolesAddress,
        address parameterInfoAddress,
        address crosschainTokensAddress,
        uint256 _confirmDuration
    ) {
        return (
            address(_dao),
            address(_governance),
            address(_roles),
            address(_parameterInfo),
            address(_crosschainTokens),
            confirmDuration / 1 seconds
        );
    }

    modifier onlyDAO() {
        require(_msgSender() == address(_dao), "only DAO");
        _;
    }

    modifier onlyFoundationManager() {
        require(_roles.hasRole(FOUNDATION_MANAGER, _msgSender()), "only foundation manager");
        _;
    }


    event ManagePermission(uint256 proposalId, address proposer, string name, address _add);
    /// @dev Initiates a new proposal to add or revoke role permissions for a certain user
    /// - Only allowed to be initiated by FoundationManager
    /// - Event:
    /// - event ManagePermission(address proposer, string name, address _add, uint256 proposalId);
    /// @param _name: Operation type, including:
    /// - FMD: Revoke FoundationManager permission
    /// - FMA: Add FoundationManager permission
    /// - FEEDERD: Add FEEDER permission
    /// - FEEDERA: Revoke FEEDER permission
    /// @param _account Account address
    /// @return bool Whether the proposal is successfully initiated
    function proposeToManagePermission(string memory _name, address _account) public onlyFoundationManager returns (bool) {
        require(address(0) != _account, "MulSig:zero address");
        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;
        kk.name = _name;
        kk._add = _account;
        kk._type = 1;
        kk.signatureCount = 0;
        pendingProposals.push(proposalID);

        emit ManagePermission(proposalID, msg.sender, _name, _account);

        return true;
    }

    event AddResource(uint256 proposalId, address proposer, string name, address producerContract, address productionContract);
    /// @dev Used to add a new Treasure asset
    /// - Event:
    /// - event AddResource(address proposer, string name, address producerContract,address productionContract);
    /// @param _name Asset name
    /// @param _producer Producer management contract
    /// @param _productionData Production data management contract
    /// @return bool Whether the proposal is successfully initiated
    function proposeToAddResource(
        string memory _name,
        address _producer,
        address _productionData
    ) public onlyFoundationManager returns (bool) {
        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;
        kk.name = _name;
        kk._type = 2;
        kk.signatureCount = 0;
        kk.producer = _producer;
        kk.productionData = _productionData;

        pendingProposals.push(proposalID);

        emit AddResource(proposalID, msg.sender, _name, _producer, _productionData);

        return true;
    }

    event RegisterDApp(uint256 proposalId, address proposer, string treasure, string dapp, address payee);

    function proposeToRegisterDApp(
        string memory _treasure,
        string memory _dapp,
        address _payee
    ) public onlyFoundationManager returns (bool) {
        require(keccak256(bytes(_treasure)) != keccak256(bytes("")), "empty treasure name");
        require(keccak256(bytes(_dapp)) != keccak256(bytes("")), "empty dapp name");
        require(_payee != address(0), "empty DApp payee");

        (address producerContract,) = _governance.getTreasureByKind(_treasure);
        require(producerContract != address(0), "treasure with this kind not found");

        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;

        kk.name = _dapp;
        kk.treasureKind = _treasure;
        kk.payee = _payee;
        kk._type = 5;

        kk.signatureCount = 0;

        pendingProposals.push(proposalID);

        emit RegisterDApp(proposalID, kk.proposer, _treasure, _dapp, _payee);

        return true;
    }


    event SetPlatformConfig(uint256 proposalId, address proposer, string name, uint256 _value);
    /// @dev Used to initiate the modification of the platform configuration information (parameterInfo)
    /// - Event
    /// - event SetPlatformConfig(address proposer, string name, uint256 _value);
    /// @param _name The key of the configuration information
    /// @param _value The value of the configuration information
    /// @return bool Whether the proposal is successfully initiated
    function proposeToSetPlatformConfig(string memory _name, uint256 _value) public onlyFoundationManager returns (bool) {
        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;
        kk.name = _name;
        kk.value = _value;
        kk._type = 3;
        kk.signatureCount = 0;
        pendingProposals.push(proposalID);

        emit SetPlatformConfig(proposalID, msg.sender, _name, _value);

        return true;
    }

    event SetDiscountConfig(uint256 proposalId, address proposer, IParameterInfo.PriceDiscountConfig config);
    /// @dev Used to initiate the modification of the discount information of the asset (parameterInfo.DiscountConfig)
    ///  - Event
    ///     - event SetDiscountConfig(address proposer,IParameterInfo.PriceDiscountConfig config);
    ///       struct PriceDiscountConfig {
    ///         uint256 API;
    ///         uint256 sulphur;
    ///         uint256[4] discount;
    ///       }         
    /// @param b1 API data
    /// @param b2 sulphur acidity data
    /// @param b3 discount[0]
    /// @param b4 discount[1]
    /// @param b5 discount[2]
    /// @param b6 discount[3]
    /// @return bool Whether the proposal is successfully initiated
    function proposeToSetDiscountConfig(
        uint256 b1,
        uint256 b2,
        uint256 b3,
        uint256 b4,
        uint256 b5,
        uint256 b6
    ) public onlyFoundationManager returns (bool) {
        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;
        kk.data.API = b1;
        kk.data.sulphur = b2;
        kk.data.discount[0] = b3;
        kk.data.discount[1] = b4;
        kk.data.discount[2] = b5;
        kk.data.discount[3] = b6;
        kk._type = 4;
        kk.signatureCount = 0;
        pendingProposals.push(proposalID);

        emit SetDiscountConfig(proposalID, msg.sender, kk.data);

        return true;
    }

    event SetCrosschainTokenProposed(uint256 proposalId, address proposer, string token);

    function proposeToSetCrosschainToken(
        string memory token,
        address sourceERC20address,
        address sourceCrosschainAddress,
        uint256 sourcechainid,
        address targetERC20address,
        address targetCrosschainAddress,
        uint256 targetchainid,
        uint256 fee,
        uint256 chainId
    ) public onlyFoundationManager returns (bool) {
        uint256 proposalID = proposalIDx++;
        proposal storage kk = proposals[proposalID];
        kk.proposer = msg.sender;
        kk.token = token;
        kk.sourceERC20 = sourceERC20address;
        kk.sourceCrosschain = sourceCrosschainAddress;
        kk.sourceChainId = sourcechainid;
        kk.targetERC20 = targetERC20address;
        kk.targetCrosschain = targetCrosschainAddress;
        kk.targetChainId = targetchainid;
        kk.fee = fee;
        kk.chainId = chainId;
        kk._type = PROPOSAL_TYPE_SET_CROSSCHAIN_TOKEN;
        kk.signatureCount = 0;
        pendingProposals.push(proposalID);

        emit SetCrosschainTokenProposed(proposalID, msg.sender, token);
        return true;
    }

    /// @dev Used to obtain the list of proposals in the pending state
    /// @return uint256[] List of proposal id
    function getPendingProposals() public view onlyFoundationManager returns (uint256[] memory) {
        return pendingProposals;
    }

    event ProposalSigned(uint256 proposalId, address signer);
    /// @dev Issued by the FoundationManager to sign a transaction and approve a certain proposal
    /// @param _proposalId The ID of the corresponding proposal
    /// @return bool Whether the request was successful
    function signTransaction(uint256 _proposalId) public onlyFoundationManager returns (bool) {
        proposal storage pro = proposals[_proposalId];
        // Not meeting the multi-signature threshold requirement
        require(pro.signatureCount < _governance.fmThreshold(), "limit");
        // The current signature sender has not sent before
        require(pro.signatures[msg.sender] != 1, "already signed");
        // Set as signed
        pro.signatures[msg.sender] = 1;
        pro.signatureCount++;

        // If the threshold is met, set the execution time (effective time)
        if (pro.signatureCount >= _governance.fmThreshold()) {
            // Two hours after the block creation time
            pro.excuteTime = block.timestamp + confirmDuration;
        }
        emit ProposalSigned(_proposalId, msg.sender);

        return true;
    }

    event ProposalExecuted(uint256 proposalId);
/// @dev Executed by the FoundationManager for a specific proposal (with completed voting)
/// @param _proposalId The ID of the corresponding proposal
/// @return bool Whether the request was successful
function executeProposal(uint256 _proposalId) public onlyFoundationManager returns (bool) {
    proposal storage pro = proposals[_proposalId];
    // Ensure the execution time has been reached
    require(pro.excuteTime <= block.timestamp, "executeTime not meet");

    if (pro._type == 1) {
        // Role management: grant or revoke Foundation Manager role
        if (keccak256(bytes(pro.name)) == keccak256(bytes("FMD"))) {
            _roles.revokeRole(FOUNDATION_MANAGER, pro._add);
        } else if (keccak256(bytes(pro.name)) == keccak256(bytes("FMA"))) {
            _roles.grantRole(FOUNDATION_MANAGER, pro._add);
        }
        // Role management: grant or revoke Feeder role
        if (keccak256(bytes(pro.name)) == keccak256(bytes("FEEDERD"))) {
            _roles.revokeRole(FEEDER, pro._add);
        } else if (keccak256(bytes(pro.name)) == keccak256(bytes("FEEDERA"))) {
            _roles.grantRole(FEEDER, pro._add);
        }
    } else if (pro._type == 2) {
        // Treasury management: add a new treasure
        _governance.addTreasure(pro.name, pro.producer, pro.productionData);
    } else if (pro._type == 3) {
        // Update platform configuration parameters
        _parameterInfo.setPlatformConfig(pro.name, pro.value);
    } else if (pro._type == 4) {
        // Update price discount configuration
        _parameterInfo.setPriceDiscountConfig(
            pro.data.API,
            pro.data.sulphur,
            pro.data.discount[0],
            pro.data.discount[1],
            pro.data.discount[2],
            pro.data.discount[3]
        );
    } else if (pro._type == 5) {
        // Register DApp connection for a producer
        (address producerAddr,) = _governance.getTreasureByKind(pro.treasureKind);
        require(producerAddr != address(0), "treasure not found with proposal's treasure kind");
        IProducer _producer = IProducer(producerAddr);
        _producer.registerDAppConnect(pro.name, pro.payee);
    } else if (pro._type == PROPOSAL_TYPE_SET_CROSSCHAIN_TOKEN) {
        // 检查 _crosschainTokens 是否已初始化
        require(address(_crosschainTokens) != address(0), "CrosschainTokens not initialized");
        
        // 调用 CrosschainTokens 合约的 setCrosschainToken 函数
        _crosschainTokens.setCrosschainToken(
            pro.token,
            pro.sourceERC20,
            pro.sourceCrosschain,
            pro.sourceChainId,
            pro.targetERC20,
            pro.targetCrosschain,
            pro.targetChainId,
            pro.fee,
            pro.chainId
        );
    }
    // Remove the executed proposal from storage
    deleteProposals(_proposalId);

    emit ProposalExecuted(_proposalId);

    return true;
}

    struct ProposalResponse {
        string name;
        address _add;
        uint256 a1;
        uint256 a2;
        uint256 a3;
        uint256 a4;
        uint256 a5;
        uint256 a6;
        uint256 executeTime;
    }

    /**
    * Get detailed information about a proposal based on its ID.
    *
    * @param _proposalId The unique identifier of the proposal.
    * @return Returns a ProposalResponse struct containing different types of information about the proposal.
    */
    function transactionDetails(uint256 _proposalId)
    public
    view
    returns (ProposalResponse memory)
    {
        proposal storage pro = proposals[_proposalId];
        ProposalResponse memory pr;
        if (pro._type == 1) {
            pr = ProposalResponse(pro.name, pro._add, 0, 0, 0, 0, 0, 0, pro.excuteTime);
        } else if (pro._type == 2) {
            pr = ProposalResponse(pro.name, address(0), 0, 0, 0, 0, 0, 0, pro.excuteTime);
        } else if (pro._type == 3) {
            pr = ProposalResponse(pro.name, address(0), pro.value, 0, 0, 0, 0, 0, pro.excuteTime);
        } else if (pro._type == 4) {
            pr = ProposalResponse(
                "0",
                address(0),
                pro.data.API,
                pro.data.sulphur,
                pro.data.discount[0],
                pro.data.discount[1],
                pro.data.discount[2],
                pro.data.discount[3],
                pro.excuteTime
            );
        }
        return pr;
    }

    /// @dev Delete a proposal
    /// @param _proposalId The ID of the proposal to be deleted
    function deleteProposals(uint256 _proposalId) public onlyFoundationManager {
        uint8 replace = 0;
        for (uint256 i = 0; i < pendingProposals.length; i++) {
            if (1 == replace) {
                pendingProposals[i - 1] = pendingProposals[i];
            } else if (_proposalId == pendingProposals[i]) {
                replace = 1;
            }
        }
        if (1 == replace) {
            delete pendingProposals[pendingProposals.length - 1];
            pendingProposals.pop();
            delete proposals[_proposalId];
        }
    }

    /// @dev Get the number of signatures for a proposal
    function getSignatureCount(uint256 _proposalId) public view returns (uint8) {
        return proposals[_proposalId].signatureCount;
    }

    /// @dev Check if an address has already signed a proposal
    function hasAlreadySigned(uint256 _proposalId, address _signer) public view returns (bool) {
        return proposals[_proposalId].signatures[_signer] == 1;
    }
}
