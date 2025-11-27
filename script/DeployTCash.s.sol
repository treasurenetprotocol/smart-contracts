// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "./lib/DeployLib.sol";

/// @notice Deploy TCash, TCashLoan, TCashAuction, TATManager
/// - Mirrors migrations/3_depoloy_tcash.js (TCashLoan init deferred to Crosschain step)
contract DeployTCash is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        ProxyAdmin pa = ProxyAdmin(vm.envAddress("PROXY_ADMIN"));
        address initialReceiver = vm.envAddress("TCASH_RECEIVER");

        DeployLib.Core memory core = DeployLib.Core({
            proxyAdmin: pa,
            dao: vm.envAddress("DAO_PROXY"),
            mulSig: vm.envAddress("MULSIG_PROXY"),
            roles: vm.envAddress("ROLES_PROXY"),
            parameterInfo: vm.envAddress("PARAMETER_INFO_PROXY"),
            oracle: vm.envAddress("ORACLE_PROXY")
        });

        vm.startBroadcast(pk);
        DeployLib.TCashStack memory stack =
            DeployLib.deployTCashStack(core, vm.envAddress("TAT_PROXY"), initialReceiver);
        vm.stopBroadcast();

        console2.log("TCash (proxy)       :", stack.tcash);
        console2.log("TCashLoan (proxy)   :", stack.tcashLoan);
        console2.log("TCashAuction (proxy):", stack.tcashAuction);
        console2.log("TATManager (proxy)  :", stack.tatManager);
        console2.log("ParameterInfo       :", core.parameterInfo);
        console2.log("Oracle              :", core.oracle);
        console2.log("Roles               :", core.roles);
    }
}
