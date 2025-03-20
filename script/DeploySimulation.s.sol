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
    // Core contract addresses
    address public tatAddress;
    address public oilProducerAddress;
    address public oilDataAddress;
    address public gasProducerAddress;
    address public gasDataAddress;
    address public ethProducerAddress;
    address public ethDataAddress;
    address public btcProducerAddress;
    address public btcDataAddress;
    address public mulSigAddress;
    address public rolesAddress;
    address public parameterInfoAddress;
    address public governanceAddress;
    address public oracleAddress;

    function deployProxy(address implementation, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(implementation, data));
    }

    // Split deployment into smaller steps to avoid stack too deep error
    function deployGovernanceContracts(address deployer) internal {
        // Deploy implementation contracts
        MulSig mulSigImpl = new MulSig();
        Roles rolesImpl = new Roles();
        ParameterInfo parameterInfoImpl = new ParameterInfo();

        // Deploy proxies
        mulSigAddress = deployProxy(address(mulSigImpl), "");
        console.log("MulSig deployed at:", mulSigAddress);

        rolesAddress = deployProxy(address(rolesImpl), "");
        console.log("Roles deployed at:", rolesAddress);

        parameterInfoAddress = deployProxy(
            address(parameterInfoImpl), abi.encodeWithSelector(ParameterInfo.initialize.selector, mulSigAddress)
        );
        console.log("ParameterInfo deployed at:", parameterInfoAddress);
    }

    function deployProducerContracts() internal {
        // Deploy implementation contracts
        OilProducer oilProducerImpl = new OilProducer();
        OilData oilDataImpl = new OilData();
        GasProducer gasProducerImpl = new GasProducer();
        GasData gasDataImpl = new GasData();
        EthProducer ethProducerImpl = new EthProducer();
        EthData ethDataImpl = new EthData();
        BtcProducer btcProducerImpl = new BtcProducer();
        BtcData btcDataImpl = new BtcData();

        // Deploy proxies
        oilProducerAddress = deployProxy(address(oilProducerImpl), "");
        console.log("OilProducer deployed at:", oilProducerAddress);

        oilDataAddress = deployProxy(address(oilDataImpl), "");
        console.log("OilData deployed at:", oilDataAddress);

        gasProducerAddress = deployProxy(address(gasProducerImpl), "");
        console.log("GasProducer deployed at:", gasProducerAddress);

        gasDataAddress = deployProxy(address(gasDataImpl), "");
        console.log("GasData deployed at:", gasDataAddress);

        ethProducerAddress = deployProxy(address(ethProducerImpl), "");
        console.log("EthProducer deployed at:", ethProducerAddress);

        ethDataAddress = deployProxy(address(ethDataImpl), "");
        console.log("EthData deployed at:", ethDataAddress);

        btcProducerAddress = deployProxy(address(btcProducerImpl), "");
        console.log("BtcProducer deployed at:", btcProducerAddress);

        btcDataAddress = deployProxy(address(btcDataImpl), "");
        console.log("BtcData deployed at:", btcDataAddress);
    }

    function deployRemainingContracts() internal {
        // Deploy implementation contracts
        Governance governanceImpl = new Governance();
        Oracle oracleImpl = new Oracle();
        TAT tatImpl = new TAT();

        // Deploy Governance
        governanceAddress = deployProxy(
            address(governanceImpl),
            abi.encodeWithSelector(
                Governance.initialize.selector,
                address(0), // DAO placeholder
                mulSigAddress,
                rolesAddress,
                parameterInfoAddress,
                ["OIL", "GAS", "ETH", "BTC"],
                [oilProducerAddress, gasProducerAddress, ethProducerAddress, btcProducerAddress],
                [oilDataAddress, gasDataAddress, ethDataAddress, btcDataAddress]
            )
        );
        console.log("Governance deployed at:", governanceAddress);

        // Deploy Oracle
        oracleAddress =
            deployProxy(address(oracleImpl), abi.encodeWithSelector(Oracle.initialize.selector, rolesAddress));
        console.log("Oracle deployed at:", oracleAddress);

        // Deploy TAT token
        tatAddress = deployProxy(
            address(tatImpl), abi.encodeWithSelector(TAT.initialize.selector, "TAT Token", "TAT", governanceAddress)
        );
        console.log("TAT deployed at:", tatAddress);
    }

    function initializeContracts(address deployer) internal {
        // Initialize MulSig
        MulSig(payable(mulSigAddress)).initialize(
            address(0), // DAO placeholder
            governanceAddress,
            rolesAddress,
            parameterInfoAddress,
            address(0), // CrosschainTokens placeholder
            2
        );

        // Create arrays for Roles initialization
        address[] memory managers = new address[](1);
        managers[0] = deployer;

        address[] memory admins = new address[](1);
        admins[0] = deployer;

        address[] memory oracles = new address[](2);
        oracles[0] = oracleAddress;
        oracles[1] = deployer;

        address[] memory bridges = new address[](2);
        bridges[0] = address(0);
        bridges[1] = address(0);

        // Initialize Roles
        Roles(rolesAddress).initialize(mulSigAddress, managers, admins, oracles, bridges);
    }

    function initializeProducers() internal {
        // Create empty arrays for Producer initialization
        string[] memory emptyDappNames = new string[](0);
        address[] memory emptyPayees = new address[](0);

        // Initialize producer contracts
        OilProducer(oilProducerAddress).initialize(
            mulSigAddress, rolesAddress, "OIL", oilDataAddress, emptyDappNames, emptyPayees
        );

        OilData(payable(oilDataAddress)).initialize(
            "OIL", oracleAddress, rolesAddress, parameterInfoAddress, oilProducerAddress, tatAddress
        );

        GasProducer(gasProducerAddress).initialize(
            mulSigAddress, rolesAddress, "GAS", gasDataAddress, emptyDappNames, emptyPayees
        );

        GasData(payable(gasDataAddress)).initialize(
            "GAS", oracleAddress, rolesAddress, parameterInfoAddress, gasProducerAddress, tatAddress
        );

        EthProducer(ethProducerAddress).initialize(
            mulSigAddress, rolesAddress, "ETH", ethDataAddress, emptyDappNames, emptyPayees
        );

        EthData(payable(ethDataAddress)).initialize(
            "ETH", oracleAddress, rolesAddress, parameterInfoAddress, ethProducerAddress, tatAddress
        );

        BtcProducer(btcProducerAddress).initialize(
            mulSigAddress, rolesAddress, "BTC", btcDataAddress, emptyDappNames, emptyPayees
        );

        BtcData(payable(btcDataAddress)).initialize(
            "BTC", oracleAddress, rolesAddress, parameterInfoAddress, btcProducerAddress, tatAddress
        );
    }

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);
        console.log("Deploying Simulation - Core Contracts Only");
        console.log("Deployer address:", deployer);

        // Deploy contracts in stages to avoid stack too deep errors
        deployGovernanceContracts(deployer);
        deployProducerContracts();
        deployRemainingContracts();

        // Initialize contracts
        initializeContracts(deployer);
        initializeProducers();

        console.log("Deployment simulation completed successfully!");
        vm.stopBroadcast();
    }
}
