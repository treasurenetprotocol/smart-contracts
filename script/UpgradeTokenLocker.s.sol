// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/TokenLocker/TokenLocker.sol";

/// @notice Upgrade TokenLocker implementation (matches migrations/12_upgrade_tokenlocker.js)
contract UpgradeTokenLocker is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("TOKENLOCKER_PROXY");

        vm.startBroadcast(pk);
        TokenLocker newImpl = new TokenLocker();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("TokenLocker upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
