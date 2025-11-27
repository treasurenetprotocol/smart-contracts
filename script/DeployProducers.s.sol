// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "./lib/DeployLib.sol";

/// @notice Deploy producers, data contracts, Governance and TAT
/// - Mirrors migrations/2_deploy_producers.js
contract DeployProducers is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        ProxyAdmin pa = ProxyAdmin(vm.envAddress("PROXY_ADMIN"));

        DeployLib.Core memory core = DeployLib.Core({
            proxyAdmin: pa,
            dao: vm.envAddress("DAO_PROXY"),
            mulSig: vm.envAddress("MULSIG_PROXY"),
            roles: vm.envAddress("ROLES_PROXY"),
            parameterInfo: vm.envAddress("PARAMETER_INFO_PROXY"),
            oracle: vm.envAddress("ORACLE_PROXY")
        });

        vm.startBroadcast(pk);

        DeployLib.Producers memory prod = DeployLib.deployProducers(core);

        vm.stopBroadcast();

        console2.log("Governance (proxy):", prod.governance);
        console2.log("TAT (proxy)       :", prod.tat);
        console2.log("OilProducer/Data  :", prod.producer[0], prod.data[0]);
        console2.log("GasProducer/Data  :", prod.producer[1], prod.data[1]);
        console2.log("EthProducer/Data  :", prod.producer[2], prod.data[2]);
        console2.log("BtcProducer/Data  :", prod.producer[3], prod.data[3]);
    }
}
