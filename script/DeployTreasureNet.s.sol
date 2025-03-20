// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.29;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

// Import core contracts
import {DAO} from "../contracts/DAO/DAO.sol";
import {OilProducer} from "../contracts/Treasure/OIL/OilProducer.sol";
import {OilData} from "../contracts/Treasure/OIL/OilData.sol";
import {GasProducer} from "../contracts/Treasure/GAS/GasProducer.sol";
import {GasData} from "../contracts/Treasure/GAS/GasData.sol";
import {EthProducer} from "../contracts/Treasure/ETH/EthProducer.sol";
import {EthData} from "../contracts/Treasure/ETH/EthData.sol";
import {BtcProducer} from "../contracts/Treasure/BTC/BtcProducer.sol";
import {BtcData} from "../contracts/Treasure/BTC/BtcData.sol";
import {MulSig} from "../contracts/Governance/MulSig.sol";
import {Roles} from "../contracts/Governance/Roles.sol";
import {ParameterInfo} from "../contracts/Governance/ParameterInfo.sol";
import {Governance} from "../contracts/Governance/Governance.sol";
import {Oracle} from "../contracts/Oracle/Oracle.sol";
import {TAT} from "../contracts/TAT/TAT.sol";
import {CrosschainTokens} from "../contracts/Crosschain/CrosschainTokens.sol";
import {CrosschainBridge} from "../contracts/Crosschain/CrosschainBridge.sol";
import {TCash} from "../contracts/TCash/TCash.sol";
import {AirDrop} from "../contracts/AirDrop/AirDrop.sol";

// Import proxy implementation
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployTreasureNet is Script {
    // Core contracts
    DAO dao;
    OilProducer oilProducer;
    OilData oilData;
    GasProducer gasProducer;
    GasData gasData;
    EthProducer ethProducer;
    EthData ethData;
    BtcProducer btcProducer;
    BtcData btcData;
    MulSig mulSig;
    Roles roles;
    ParameterInfo parameterInfo;
    Governance governance;
    Oracle oracle;
    TAT tat;
    CrosschainTokens crosschainTokens;
    CrosschainBridge crosschainBridge;
    TCash tcash;
    AirDrop airDrop;

    function deployProxy(address implementation, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(
            implementation,
            data
        ));
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("Deploying TreasureNet contracts...");
        console.log("Deployer address:", deployer);
        
        // 1. Deploy implementation contracts first
        DAO daoImpl = new DAO();
        OilProducer oilProducerImpl = new OilProducer();
        OilData oilDataImpl = new OilData();
        GasProducer gasProducerImpl = new GasProducer();
        GasData gasDataImpl = new GasData();
        EthProducer ethProducerImpl = new EthProducer();
        EthData ethDataImpl = new EthData();
        BtcProducer btcProducerImpl = new BtcProducer();
        BtcData btcDataImpl = new BtcData();
        MulSig mulSigImpl = new MulSig();
        Roles rolesImpl = new Roles();
        ParameterInfo parameterInfoImpl = new ParameterInfo();
        Governance governanceImpl = new Governance();
        Oracle oracleImpl = new Oracle();
        TAT tatImpl = new TAT();
        CrosschainTokens crosschainTokensImpl = new CrosschainTokens();
        CrosschainBridge crosschainBridgeImpl = new CrosschainBridge();
        TCash tcashImpl = new TCash();
        AirDrop airDropImpl = new AirDrop();
        
        // 2. Deploy and initialize proxies

        // Deploy DAO with proxy
        dao = DAO(deployProxy(
            address(daoImpl),
            abi.encodeWithSelector(DAO.initialize.selector, "DAO", 2, 10)
        ));
        console.log("DAO deployed at:", address(dao));
        
        // Deploy producer and data contracts without initialization first
        oilProducer = OilProducer(deployProxy(
            address(oilProducerImpl),
            ""  // Empty data means no initialization
        ));
        console.log("OilProducer deployed at:", address(oilProducer));
        
        oilData = OilData(deployProxy(
            address(oilDataImpl),
            ""
        ));
        console.log("OilData deployed at:", address(oilData));
        
        gasProducer = GasProducer(deployProxy(
            address(gasProducerImpl),
            ""
        ));
        console.log("GasProducer deployed at:", address(gasProducer));
        
        gasData = GasData(deployProxy(
            address(gasDataImpl),
            ""
        ));
        console.log("GasData deployed at:", address(gasData));
        
        ethProducer = EthProducer(deployProxy(
            address(ethProducerImpl),
            ""
        ));
        console.log("EthProducer deployed at:", address(ethProducer));
        
        ethData = EthData(deployProxy(
            address(ethDataImpl),
            ""
        ));
        console.log("EthData deployed at:", address(ethData));
        
        btcProducer = BtcProducer(deployProxy(
            address(btcProducerImpl),
            ""
        ));
        console.log("BtcProducer deployed at:", address(btcProducer));
        
        btcData = BtcData(deployProxy(
            address(btcDataImpl),
            ""
        ));
        console.log("BtcData deployed at:", address(btcData));
        
        mulSig = MulSig(deployProxy(
            address(mulSigImpl),
            ""
        ));
        console.log("MulSig deployed at:", address(mulSig));
        
        roles = Roles(deployProxy(
            address(rolesImpl),
            ""
        ));
        console.log("Roles deployed at:", address(roles));
        
        parameterInfo = ParameterInfo(deployProxy(
            address(parameterInfoImpl),
            abi.encodeWithSelector(ParameterInfo.initialize.selector, address(mulSig))
        ));
        console.log("ParameterInfo deployed at:", address(parameterInfo));
        
        // Deploy TCash
        tcash = TCash(deployProxy(
            address(tcashImpl),
            abi.encodeWithSelector(TCash.initialize.selector)
        ));
        console.log("TCash deployed at:", address(tcash));
        
        // Deploy Governance
        governance = Governance(deployProxy(
            address(governanceImpl),
            abi.encodeWithSelector(
                Governance.initialize.selector,
                address(dao),
                address(mulSig),
                address(roles),
                address(parameterInfo),
                ["OIL", "GAS", "ETH", "BTC"],
                [address(oilProducer), address(gasProducer), address(ethProducer), address(btcProducer)],
                [address(oilData), address(gasData), address(ethData), address(btcData)]
            )
        ));
        console.log("Governance deployed at:", address(governance));
        
        // Deploy Oracle
        oracle = Oracle(deployProxy(
            address(oracleImpl),
            abi.encodeWithSelector(Oracle.initialize.selector, address(roles))
        ));
        console.log("Oracle deployed at:", address(oracle));
        
        // Deploy CrosschainTokens with temporary address
        crosschainTokens = CrosschainTokens(deployProxy(
            address(crosschainTokensImpl),
            abi.encodeWithSelector(
                CrosschainTokens.initialize.selector,
                address(0)  // Temporary zero address
            )
        ));
        console.log("CrosschainTokens deployed at:", address(crosschainTokens));
        
        // Initialize MulSig
        mulSig.initialize(
            address(dao),
            address(governance),
            address(roles),
            address(parameterInfo),
            address(crosschainTokens),
            2
        );
        
        // Update CrosschainTokens with correct MulSig address
        crosschainTokens.setMulSig(address(mulSig));
        
        // Deploy CrosschainBridge
        crosschainBridge = CrosschainBridge(deployProxy(
            address(crosschainBridgeImpl),
            abi.encodeWithSelector(
                CrosschainBridge.initialize.selector,
                address(crosschainTokens),
                address(roles)
            )
        ));
        console.log("CrosschainBridge deployed at:", address(crosschainBridge));
        
        // Initialize Roles
        roles.initialize(
            address(mulSig),
            [deployer],
            [deployer],
            [address(oracle), deployer],
            [address(crosschainBridge), address(0xD9a1fED8642846CaB06ff168341d2556Cbad0e4a)]
        );
        
        // Deploy TAT
        tat = TAT(deployProxy(
            address(tatImpl),
            abi.encodeWithSelector(
                TAT.initialize.selector,
                "TAT Token",
                "TAT",
                address(governance)
            )
        ));
        console.log("TAT deployed at:", address(tat));
        
        // Initialize producer and data contracts
        oilProducer.initialize(
            address(mulSig),
            address(roles),
            "OIL",
            address(oilData),
            new address[](0),
            new string[](0)
        );
        
        oilData.initialize(
            "OIL",
            address(oracle),
            address(roles),
            address(parameterInfo),
            address(oilProducer),
            address(tat)
        );
        
        gasProducer.initialize(
            address(mulSig),
            address(roles),
            "GAS",
            address(gasData),
            new address[](0),
            new string[](0)
        );
        
        gasData.initialize(
            "GAS",
            address(oracle),
            address(roles),
            address(parameterInfo),
            address(gasProducer),
            address(tat)
        );
        
        ethProducer.initialize(
            address(mulSig),
            address(roles),
            "ETH",
            address(ethData),
            new address[](0),
            new string[](0)
        );
        
        ethData.initialize(
            "ETH",
            address(oracle),
            address(roles),
            address(parameterInfo),
            address(ethProducer),
            address(tat)
        );
        
        btcProducer.initialize(
            address(mulSig),
            address(roles),
            "BTC",
            address(btcData),
            new address[](0),
            new string[](0)
        );
        
        btcData.initialize(
            "BTC",
            address(oracle),
            address(roles),
            address(parameterInfo),
            address(btcProducer),
            address(tat)
        );
        
        // Deploy AirDrop (uninitialized as in the original migration)
        airDrop = AirDrop(deployProxy(
            address(airDropImpl),
            ""
        ));
        console.log("AirDrop deployed at:", address(airDrop));
        
        console.log("Deployment completed successfully!");
        vm.stopBroadcast();
    }
} 