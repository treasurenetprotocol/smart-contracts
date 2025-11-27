// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/Oracle/Oracle.sol";

/// @notice Upgrade Oracle implementation (matches migrations/19_upgrade_oracle.js)
contract UpgradeOracle is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("ORACLE_PROXY");

        vm.startBroadcast(pk);
        Oracle newImpl = new Oracle();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("Oracle upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
