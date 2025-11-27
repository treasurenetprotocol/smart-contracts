// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/Treasure/OIL/OilProducer.sol";
import "contracts/Treasure/OIL/OilData.sol";
import "contracts/Treasure/GAS/GasProducer.sol";
import "contracts/Treasure/GAS/GasData.sol";
import "contracts/Treasure/ETH/EthProducer.sol";
import "contracts/Treasure/ETH/EthData.sol";
import "contracts/Treasure/BTC/BtcProducer.sol";
import "contracts/Treasure/BTC/BtcData.sol";

/// @notice Upgrade producer/data implementations (matches migrations/16_upgrade_producers.js)
contract UpgradeProducers is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");

        address oilProducer = vm.envAddress("OIL_PRODUCER_PROXY");
        address oilData = vm.envAddress("OIL_DATA_PROXY");
        address gasProducer = vm.envAddress("GAS_PRODUCER_PROXY");
        address gasData = vm.envAddress("GAS_DATA_PROXY");
        address ethProducer = vm.envAddress("ETH_PRODUCER_PROXY");
        address ethData = vm.envAddress("ETH_DATA_PROXY");
        address btcProducer = vm.envAddress("BTC_PRODUCER_PROXY");
        address btcData = vm.envAddress("BTC_DATA_PROXY");

        vm.startBroadcast(pk);

        ProxyAdmin pa = ProxyAdmin(proxyAdmin);

        pa.upgrade(TransparentUpgradeableProxy(payable(oilProducer)), address(new OilProducer()));
        pa.upgrade(TransparentUpgradeableProxy(payable(oilData)), address(new OilData()));
        pa.upgrade(TransparentUpgradeableProxy(payable(gasProducer)), address(new GasProducer()));
        pa.upgrade(TransparentUpgradeableProxy(payable(gasData)), address(new GasData()));
        pa.upgrade(TransparentUpgradeableProxy(payable(ethProducer)), address(new EthProducer()));
        pa.upgrade(TransparentUpgradeableProxy(payable(ethData)), address(new EthData()));
        pa.upgrade(TransparentUpgradeableProxy(payable(btcProducer)), address(new BtcProducer()));
        pa.upgrade(TransparentUpgradeableProxy(payable(btcData)), address(new BtcData()));

        vm.stopBroadcast();

        console2.log("Producers/Data upgraded");
    }
}
