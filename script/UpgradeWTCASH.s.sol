// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/WTCASH/WTCASH.sol";

/// @notice Upgrade WTCASH implementation (matches migrations/17_upgrade_wtcash.js)
contract UpgradeWTCASH is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("WTCASH_PROXY");

        vm.startBroadcast(pk);
        WTCASH newImpl = new WTCASH();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("WTCASH upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
