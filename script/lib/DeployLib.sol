// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import "Governance/DAO/DAO.sol";
import "Governance/MulSig.sol";
import "Governance/Roles.sol";
import "Governance/ParameterInfo.sol";
import "Governance/Governance.sol";
import "Governance/CrosschainTokens.sol";

import "Oracle/Oracle.sol";

import "TAT/TAT.sol";
import "Treasure/OIL/OilProducer.sol";
import "Treasure/OIL/OilData.sol";
import "Treasure/GAS/GasProducer.sol";
import "Treasure/GAS/GasData.sol";
import "Treasure/ETH/EthProducer.sol";
import "Treasure/ETH/EthData.sol";
import "Treasure/BTC/BtcProducer.sol";
import "Treasure/BTC/BtcData.sol";
import "Treasure/interfaces/IProducer.sol";

import "TCash/TCash.sol";
import "TCash/TCashLoan.sol";
import "TCash/TCashAuction.sol";
import "TCash/TATManager.sol";

import "Crosschain/CrosschainBridge.sol";
import "TokenLocker/TokenLocker.sol";

interface IProducerInit {
    function initialize(
        address _mulSigContract,
        address _roleContract,
        string memory _treasureKind,
        address _productionDataContract,
        string[] memory _dappNames,
        address[] memory _payees
    ) external;
}

interface IProdDataInit {
    function initialize(
        string memory _treasureKind,
        address _oracleContract,
        address _rolesContract,
        address _parameterInfoContract,
        address _producerContract,
        address _tatContract
    ) external;
}

library DeployLib {

    struct Core {
        ProxyAdmin proxyAdmin;
        address dao;
        address mulSig;
        address roles;
        address parameterInfo;
        address oracle;
    }

    struct Producers {
        address governance;
        address tat;
        address[4] producer;
        address[4] data;
    }

    struct TCashStack {
        address tcash;
        address tcashLoan;
        address tcashAuction;
        address tatManager;
    }

    struct Crosschain {
        address tokens;
        address bridge;
    }

    struct CrosschainConfig {
        address[] foundationManagers;
        address[] auctionManagers;
        address[] feeders;
        address[] crosschainSenders;
        address[] tcashManagers;
        uint256 confirmDuration;
        uint256 unitPrice;
        uint256 tcashPrice;
    }

    // Core deployment
    function deployCore(address proxyAdminAddr) internal returns (Core memory c) {
        ProxyAdmin pa = proxyAdminAddr == address(0) ? new ProxyAdmin() : ProxyAdmin(proxyAdminAddr);
        c.proxyAdmin = pa;

        // DAO
        DAO daoImpl = new DAO();
        bytes memory daoInit = abi.encodeWithSelector(DAO.initialize.selector, "DAO", 2, 10);
        TransparentUpgradeableProxy daoProxy =
            new TransparentUpgradeableProxy(address(daoImpl), address(pa), daoInit);
        c.dao = address(daoProxy);

        // MulSig (uninitialized)
        MulSig mulSigImpl = new MulSig();
        TransparentUpgradeableProxy mulSigProxy =
            new TransparentUpgradeableProxy(address(mulSigImpl), address(pa), "");
        c.mulSig = address(mulSigProxy);

        // Roles (uninitialized)
        Roles rolesImpl = new Roles();
        TransparentUpgradeableProxy rolesProxy =
            new TransparentUpgradeableProxy(address(rolesImpl), address(pa), "");
        c.roles = address(rolesProxy);

        // ParameterInfo
        ParameterInfo paramImpl = new ParameterInfo();
        bytes memory paramInit = abi.encodeWithSelector(ParameterInfo.initialize.selector, c.mulSig);
        TransparentUpgradeableProxy paramProxy =
            new TransparentUpgradeableProxy(address(paramImpl), address(pa), paramInit);
        c.parameterInfo = address(paramProxy);

        // Oracle
        Oracle oracleImpl = new Oracle();
        bytes memory oracleInit = abi.encodeWithSelector(Oracle.initialize.selector, c.roles);
        TransparentUpgradeableProxy oracleProxy =
            new TransparentUpgradeableProxy(address(oracleImpl), address(pa), oracleInit);
        c.oracle = address(oracleProxy);
    }

    // Producers / Governance / TAT deployment
    function deployProducers(Core memory c) internal returns (Producers memory p) {
        ProxyAdmin pa = c.proxyAdmin;

        (p.producer[0], p.data[0]) = _deployPair(address(new OilProducer()), address(new OilData()), pa);
        (p.producer[1], p.data[1]) = _deployPair(address(new GasProducer()), address(new GasData()), pa);
        (p.producer[2], p.data[2]) = _deployPair(address(new EthProducer()), address(new EthData()), pa);
        (p.producer[3], p.data[3]) = _deployPair(address(new BtcProducer()), address(new BtcData()), pa);

        p.governance = _deployGovernance(pa, c, p);
        p.tat = _deployTAT(pa, p.governance);

        _initPair(p.producer[0], p.data[0], "OIL", c, p.tat);
        _initPair(p.producer[1], p.data[1], "GAS", c, p.tat);
        _initPair(p.producer[2], p.data[2], "ETH", c, p.tat);
        _initPair(p.producer[3], p.data[3], "BTC", c, p.tat);
    }

    // TCash stack deployment
    function deployTCashStack(Core memory c, address tat, address receiver) internal returns (TCashStack memory t) {
        ProxyAdmin pa = c.proxyAdmin;

        t.tcash = _deployTCash(pa, receiver);
        t.tatManager = _deployTatManager(pa, c.roles);
        t.tcashLoan = _deployTCashLoan(pa);
        t.tcashAuction = _deployTCashAuction(pa, c.roles, t.tcash, t.tcashLoan);
        _wireTCash(t.tcash, c.roles, c.oracle, t.tcashAuction);
    }

    // TokenLocker deployment
    function deployTokenLocker(ProxyAdmin pa) internal returns (address locker) {
        locker = address(
            new TransparentUpgradeableProxy(
                address(new TokenLocker()),
                address(pa),
                ""
            )
        );
        TokenLocker(locker).initialize();
    }

    // Crosschain deployment + initialization
    function deployCrosschain(
        Core memory c,
        TCashStack memory t,
        Producers memory p,
        CrosschainConfig memory cfg
    ) internal returns (Crosschain memory x) {
        x = _deployCrosschainContracts(c.proxyAdmin, c.roles);
        _initMulSigAndRoles(
            c,
            p,
            x.tokens,
            cfg.foundationManagers,
            cfg.auctionManagers,
            cfg.feeders,
            cfg.crosschainSenders,
            cfg.tcashManagers,
            cfg.confirmDuration
        );
        _initTCashLoanAndPrices(t, c, p.tat, cfg.unitPrice, cfg.tcashPrice);
    }

    function _deployPair(address producerImpl, address dataImpl, ProxyAdmin pa)
        private
        returns (address producerProxy, address dataProxy)
    {
        producerProxy = address(new TransparentUpgradeableProxy(producerImpl, address(pa), ""));
        dataProxy = address(new TransparentUpgradeableProxy(dataImpl, address(pa), ""));
    }

    function _deployTCash(ProxyAdmin pa, address receiver) private returns (address tcash) {
        bytes memory tcashInit = abi.encodeWithSelector(TCash.initialize.selector, receiver);
        tcash = address(new TransparentUpgradeableProxy(address(new TCash()), address(pa), tcashInit));
    }

    function _deployTatManager(ProxyAdmin pa, address roles) private returns (address tatManager) {
        bytes memory tatMgrInit = abi.encodeWithSelector(TATManager.initialize.selector, roles);
        tatManager = address(new TransparentUpgradeableProxy(address(new TATManager()), address(pa), tatMgrInit));
    }

    function _deployTCashLoan(ProxyAdmin pa) private returns (address loan) {
        loan = address(new TransparentUpgradeableProxy(address(new TCashLoan()), address(pa), ""));
    }

    function _deployTCashAuction(
        ProxyAdmin pa,
        address roles,
        address tcash,
        address tcashLoan
    ) private returns (address auction) {
        bytes memory auctionInit = abi.encodeWithSelector(
            TCashAuction.initialize.selector,
            roles,
            tcash,
            tcashLoan
        );
        auction = address(new TransparentUpgradeableProxy(address(new TCashAuction()), address(pa), auctionInit));
    }

    function _wireTCash(address tcash, address roles, address oracle, address auction) private {
        TCash(tcash).setRoles(roles);
        TCash(tcash).setOracle(oracle);
        TCash(tcash).setAuctionContract(auction);
    }

    function _deployCrosschainContracts(ProxyAdmin pa, address roles) private returns (Crosschain memory x) {
        address[] memory zeroValidators = new address[](1);
        zeroValidators[0] = address(0);
        x.tokens = address(
            new TransparentUpgradeableProxy(
                address(new CrosschainTokens()),
                address(pa),
                abi.encodeWithSelector(CrosschainTokens.initialize.selector, zeroValidators)
            )
        );
        x.bridge = address(
            new TransparentUpgradeableProxy(
                address(new CrosschainBridge()),
                address(pa),
                abi.encodeWithSelector(CrosschainBridge.initialize.selector, x.tokens, roles)
            )
        );
    }

    function _initMulSigAndRoles(
        Core memory c,
        Producers memory p,
        address tokens,
        address[] memory foundationManagers,
        address[] memory auctionManagers,
        address[] memory feeders,
        address[] memory crosschainSenders,
        address[] memory tcashManagers,
        uint256 confirmDuration
    ) private {
        CrosschainTokens(tokens).setMulSig(c.mulSig);
        MulSig(c.mulSig).initialize(c.dao, p.governance, c.roles, c.parameterInfo, tokens, confirmDuration);
        Roles(c.roles).initialize(c.mulSig, foundationManagers, auctionManagers, feeders, crosschainSenders, tcashManagers);
    }

    function _initTCashLoanAndPrices(
        TCashStack memory t,
        Core memory c,
        address tat,
        uint256 unitPrice,
        uint256 tcashPrice
    ) private {
        TCashLoan(t.tcashLoan).initialize(t.tcash, c.roles, c.parameterInfo, c.oracle, tat);
        TCashLoan(t.tcashLoan).setAuctionContract(t.tcashAuction);

        if (unitPrice > 0) {
            Oracle(c.oracle).updatePrice("UNIT", unitPrice);
        }
        if (tcashPrice > 0) {
            Oracle(c.oracle).updatePrice("TCASH", tcashPrice);
        }
    }

    function _deployGovernance(ProxyAdmin pa, Core memory c, Producers memory p) private returns (address gov) {
        string[] memory treasureTypes = new string[](4);
        treasureTypes[0] = "OIL";
        treasureTypes[1] = "GAS";
        treasureTypes[2] = "ETH";
        treasureTypes[3] = "BTC";

        address[] memory producers = new address[](4);
        address[] memory datas = new address[](4);
        for (uint256 i; i < 4; i++) {
            producers[i] = p.producer[i];
            datas[i] = p.data[i];
        }

        Governance govImpl = new Governance();
        bytes memory govInit = abi.encodeWithSelector(
            Governance.initialize.selector,
            c.dao,
            c.mulSig,
            c.roles,
            c.parameterInfo,
            treasureTypes,
            producers,
            datas
        );
        gov = address(new TransparentUpgradeableProxy(address(govImpl), address(pa), govInit));
    }

    function _deployTAT(ProxyAdmin pa, address governance) private returns (address tat) {
        TAT tatImpl = new TAT();
        bytes memory tatInit = abi.encodeWithSelector(TAT.initialize.selector, "Rep", "REP", governance);
        tat = address(new TransparentUpgradeableProxy(address(tatImpl), address(pa), tatInit));
    }

    function _initPair(
        address producer,
        address data,
        string memory kind,
        Core memory c,
        address tat
    ) private {
        IProducerInit(producer).initialize(c.mulSig, c.roles, kind, data, new string[](0), new address[](0));
        IProdDataInit(data).initialize(kind, c.oracle, c.roles, c.parameterInfo, producer, tat);
    }
}
