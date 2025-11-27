// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/// @notice Generic upgrade script: specify new implementation and call ProxyAdmin.upgrade
/// - Can replace legacy migrations upgrade scripts (e.g., upgrade_tcashloan, upgrade_tokenlocker)
contract UpgradeTransparent is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("PROXY_TO_UPGRADE");
        address newImplementation = vm.envAddress("NEW_IMPLEMENTATION");

        vm.startBroadcast(pk);
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            newImplementation
        );
        vm.stopBroadcast();

        console2.log("Upgraded proxy :", proxy);
        console2.log("New implementation:", newImplementation);
    }
}
