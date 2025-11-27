// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/WTCASH/WTCASH.sol";

/// @notice Force-import WTCASH proxy into ProxyAdmin (matches migrations/18_force_import_wtcash.js)
contract ForceImportWTCASH is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("WTCASH_PROXY");

        vm.startBroadcast(pk);
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(new WTCASH())
        );
        vm.stopBroadcast();

        console2.log("Force-imported WTCASH proxy:", proxy);
    }
}
