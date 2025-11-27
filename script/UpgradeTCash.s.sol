// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/TCash/TCash.sol";

/// @notice Upgrade TCash implementation (matches migrations/14_update_tcash.js)
contract UpgradeTCash is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("TCASH_PROXY");

        vm.startBroadcast(pk);
        TCash newImpl = new TCash();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("TCash upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
