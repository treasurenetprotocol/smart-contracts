// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../contracts/TokenLocker/TokenLocker.sol";

/// @notice Deploy TokenLocker (mirrors migrations/6_deploy_okenlocker.js)
contract DeployTokenLocker is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");

        vm.startBroadcast(pk);

        TokenLocker impl = new TokenLocker();
        TransparentUpgradeableProxy locker =
            new TransparentUpgradeableProxy(address(impl), proxyAdmin, "");
        TokenLocker(address(locker)).initialize();

        vm.stopBroadcast();

        console2.log("TokenLocker (proxy):", address(locker));
    }
}
