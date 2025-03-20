// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.29;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import only contracts we know exist based on the test files
import "../contracts/TAT/TAT.sol";
import "../contracts/Treasure/OIL/OilProducer.sol";
import "../contracts/Treasure/OIL/OilData.sol";
import "../contracts/Treasure/GAS/GasProducer.sol";
import "../contracts/Treasure/GAS/GasData.sol";
import "../contracts/Treasure/ETH/EthProducer.sol";
import "../contracts/Treasure/ETH/EthData.sol";
import "../contracts/Treasure/BTC/BtcProducer.sol";
import "../contracts/Treasure/BTC/BtcData.sol";
import "../contracts/Governance/MulSig.sol";
import "../contracts/Governance/Roles.sol";
import "../contracts/Governance/ParameterInfo.sol";
import "../contracts/Governance/Governance.sol";
import "../contracts/Oracle/Oracle.sol";

// Import proxy implementation
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeploySimulation is Script {
    // Core contracts that we know exist
    TAT tat;
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

    function deployProxy(address implementation, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(implementation, data));
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying Simulation - Core Contracts Only");
        console.log("Deployer address:", deployer);

        // Deploy implementation contracts first
        MulSig mulSigImpl = new MulSig();
        Roles rolesImpl = new Roles();
        ParameterInfo parameterInfoImpl = new ParameterInfo();
        OilProducer oilProducerImpl = new OilProducer();
        OilData oilDataImpl = new OilData();
        GasProducer gasProducerImpl = new GasProducer();
        GasData gasDataImpl = new GasData();
        EthProducer ethProducerImpl = new EthProducer();
        EthData ethDataImpl = new EthData();
        BtcProducer btcProducerImpl = new BtcProducer();
        BtcData btcDataImpl = new BtcData();
        Governance governanceImpl = new Governance();
        Oracle oracleImpl = new Oracle();
        TAT tatImpl = new TAT();

        // Deploy core contracts with proxy
        mulSig = MulSig(
            deployProxy(
                address(mulSigImpl),
                "" // Initialize later
            )
        );
        console.log("MulSig deployed at:", address(mulSig));

        roles = Roles(
            deployProxy(
                address(rolesImpl),
                "" // Initialize later
            )
        );
        console.log("Roles deployed at:", address(roles));

        parameterInfo = ParameterInfo(
            deployProxy(
                address(parameterInfoImpl), abi.encodeWithSelector(ParameterInfo.initialize.selector, address(mulSig))
            )
        );
        console.log("ParameterInfo deployed at:", address(parameterInfo));

        // Deploy producer contracts
        oilProducer = OilProducer(
            deployProxy(
                address(oilProducerImpl),
                "" // Empty data means no initialization
            )
        );
        console.log("OilProducer deployed at:", address(oilProducer));

        oilData = OilData(deployProxy(address(oilDataImpl), ""));
        console.log("OilData deployed at:", address(oilData));

        gasProducer = GasProducer(deployProxy(address(gasProducerImpl), ""));
        console.log("GasProducer deployed at:", address(gasProducer));

        gasData = GasData(deployProxy(address(gasDataImpl), ""));
        console.log("GasData deployed at:", address(gasData));

        ethProducer = EthProducer(deployProxy(address(ethProducerImpl), ""));
        console.log("EthProducer deployed at:", address(ethProducer));

        ethData = EthData(deployProxy(address(ethDataImpl), ""));
        console.log("EthData deployed at:", address(ethData));

        btcProducer = BtcProducer(deployProxy(address(btcProducerImpl), ""));
        console.log("BtcProducer deployed at:", address(btcProducer));

        btcData = BtcData(deployProxy(address(btcDataImpl), ""));
        console.log("BtcData deployed at:", address(btcData));

        // Deploy Governance (assume DAO isn't necessary for simulation)
        governance = Governance(
            deployProxy(
                address(governanceImpl),
                abi.encodeWithSelector(
                    Governance.initialize.selector,
                    address(0), // DAO placeholder
                    address(mulSig),
                    address(roles),
                    address(parameterInfo),
                    ["OIL", "GAS", "ETH", "BTC"],
                    [address(oilProducer), address(gasProducer), address(ethProducer), address(btcProducer)],
                    [address(oilData), address(gasData), address(ethData), address(btcData)]
                )
            )
        );
        console.log("Governance deployed at:", address(governance));

        // Deploy Oracle
        oracle =
            Oracle(deployProxy(address(oracleImpl), abi.encodeWithSelector(Oracle.initialize.selector, address(roles))));
        console.log("Oracle deployed at:", address(oracle));

        // Initialize MulSig with minimum parameters
        mulSig.initialize(
            address(0), // DAO placeholder
            address(governance),
            address(roles),
            address(parameterInfo),
            address(0), // CrosschainTokens placeholder
            2
        );

        // Initialize Roles with minimum parameters
        roles.initialize(
            address(mulSig),
            [deployer],
            [deployer],
            [address(oracle), deployer],
            [address(0), address(0)] // CrosschainBridge placeholder
        );

        // Deploy TAT token
        tat = TAT(
            deployProxy(
                address(tatImpl),
                abi.encodeWithSelector(TAT.initialize.selector, "TAT Token", "TAT", address(governance))
            )
        );
        console.log("TAT deployed at:", address(tat));

        // Initialize producer contracts with minimum parameters
        oilProducer.initialize(
            address(mulSig), address(roles), "OIL", address(oilData), new address[](0), new string[](0)
        );

        oilData.initialize(
            "OIL", address(oracle), address(roles), address(parameterInfo), address(oilProducer), address(tat)
        );

        gasProducer.initialize(
            address(mulSig), address(roles), "GAS", address(gasData), new address[](0), new string[](0)
        );

        gasData.initialize(
            "GAS", address(oracle), address(roles), address(parameterInfo), address(gasProducer), address(tat)
        );

        ethProducer.initialize(
            address(mulSig), address(roles), "ETH", address(ethData), new address[](0), new string[](0)
        );

        ethData.initialize(
            "ETH", address(oracle), address(roles), address(parameterInfo), address(ethProducer), address(tat)
        );

        btcProducer.initialize(
            address(mulSig), address(roles), "BTC", address(btcData), new address[](0), new string[](0)
        );

        btcData.initialize(
            "BTC", address(oracle), address(roles), address(parameterInfo), address(btcProducer), address(tat)
        );

        console.log("Deployment simulation completed successfully!");
        vm.stopBroadcast();
    }
}
