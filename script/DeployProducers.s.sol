// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../contracts/Governance/Governance.sol";
import "../contracts/TAT/TAT.sol";
import "../contracts/Treasure/OIL/OilProducer.sol";
import "../contracts/Treasure/OIL/OilData.sol";
import "../contracts/Treasure/GAS/GasProducer.sol";
import "../contracts/Treasure/GAS/GasData.sol";
import "../contracts/Treasure/ETH/EthProducer.sol";
import "../contracts/Treasure/ETH/EthData.sol";
import "../contracts/Treasure/BTC/BtcProducer.sol";
import "../contracts/Treasure/BTC/BtcData.sol";

/// @notice Deploy producers, data contracts, Governance and TAT
/// - Mirrors migrations/2_deploy_producers.js
contract DeployProducers is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address dao = vm.envAddress("DAO_PROXY");
        address mulSig = vm.envAddress("MULSIG_PROXY");
        address roles = vm.envAddress("ROLES_PROXY");
        address parameterInfo = vm.envAddress("PARAMETER_INFO_PROXY");
        address oracle = vm.envAddress("ORACLE_PROXY");

        vm.startBroadcast(pk);

        // Deploy producer/data implementations + proxies (no init yet)
        OilProducer oilProducerImpl = new OilProducer();
        OilData oilDataImpl = new OilData();
        TransparentUpgradeableProxy oilProducer =
            new TransparentUpgradeableProxy(address(oilProducerImpl), proxyAdmin, "");
        TransparentUpgradeableProxy oilData =
            new TransparentUpgradeableProxy(address(oilDataImpl), proxyAdmin, "");

        GasProducer gasProducerImpl = new GasProducer();
        GasData gasDataImpl = new GasData();
        TransparentUpgradeableProxy gasProducer =
            new TransparentUpgradeableProxy(address(gasProducerImpl), proxyAdmin, "");
        TransparentUpgradeableProxy gasData =
            new TransparentUpgradeableProxy(address(gasDataImpl), proxyAdmin, "");

        EthProducer ethProducerImpl = new EthProducer();
        EthData ethDataImpl = new EthData();
        TransparentUpgradeableProxy ethProducer =
            new TransparentUpgradeableProxy(address(ethProducerImpl), proxyAdmin, "");
        TransparentUpgradeableProxy ethData =
            new TransparentUpgradeableProxy(address(ethDataImpl), proxyAdmin, "");

        BtcProducer btcProducerImpl = new BtcProducer();
        BtcData btcDataImpl = new BtcData();
        TransparentUpgradeableProxy btcProducer =
            new TransparentUpgradeableProxy(address(btcProducerImpl), proxyAdmin, "");
        TransparentUpgradeableProxy btcData =
            new TransparentUpgradeableProxy(address(btcDataImpl), proxyAdmin, "");

        // Governance
        Governance govImpl = new Governance();
        string[] memory treasureTypes = new string[](4);
        treasureTypes[0] = "OIL";
        treasureTypes[1] = "GAS";
        treasureTypes[2] = "ETH";
        treasureTypes[3] = "BTC";
        address[] memory producers = new address[](4);
        producers[0] = address(oilProducer);
        producers[1] = address(gasProducer);
        producers[2] = address(ethProducer);
        producers[3] = address(btcProducer);
        address[] memory productionDatas = new address[](4);
        productionDatas[0] = address(oilData);
        productionDatas[1] = address(gasData);
        productionDatas[2] = address(ethData);
        productionDatas[3] = address(btcData);
        bytes memory govInit = abi.encodeWithSelector(
            Governance.initialize.selector,
            dao,
            mulSig,
            roles,
            parameterInfo,
            treasureTypes,
            producers,
            productionDatas
        );
        TransparentUpgradeableProxy gov =
            new TransparentUpgradeableProxy(address(govImpl), proxyAdmin, govInit);

        // TAT
        TAT tatImpl = new TAT();
        bytes memory tatInit = abi.encodeWithSelector(TAT.initialize.selector, "Rep", "REP", address(gov));
        TransparentUpgradeableProxy tat =
            new TransparentUpgradeableProxy(address(tatImpl), proxyAdmin, tatInit);

        // Initialize producers/data (requires TAT address)
        OilProducer(address(oilProducer)).initialize(mulSig, roles, "OIL", address(oilData), new string[](0), new address[](0));
        OilData(address(oilData)).initialize("OIL", oracle, roles, parameterInfo, address(oilProducer), address(tat));

        GasProducer(address(gasProducer)).initialize(mulSig, roles, "GAS", address(gasData), new string[](0), new address[](0));
        GasData(address(gasData)).initialize("GAS", oracle, roles, parameterInfo, address(gasProducer), address(tat));

        EthProducer(address(ethProducer)).initialize(mulSig, roles, "ETH", address(ethData), new string[](0), new address[](0));
        EthData(address(ethData)).initialize("ETH", oracle, roles, parameterInfo, address(ethProducer), address(tat));

        BtcProducer(address(btcProducer)).initialize(mulSig, roles, "BTC", address(btcData), new string[](0), new address[](0));
        BtcData(address(btcData)).initialize("BTC", oracle, roles, parameterInfo, address(btcProducer), address(tat));

        vm.stopBroadcast();

        console2.log("Governance (proxy):", address(gov));
        console2.log("TAT (proxy)       :", address(tat));
        console2.log("OilProducer/Data  :", address(oilProducer), address(oilData));
        console2.log("GasProducer/Data  :", address(gasProducer), address(gasData));
        console2.log("EthProducer/Data  :", address(ethProducer), address(ethData));
        console2.log("BtcProducer/Data  :", address(btcProducer), address(btcData));
    }
}
