// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/TCash/TCashAuction.sol";

/// @notice Upgrade TCashAuction implementation (matches migrations/15_update_tcashauction.js)
contract UpgradeTCashAuction is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("TCASH_AUCTION_PROXY");

        vm.startBroadcast(pk);
        TCashAuction newImpl = new TCashAuction();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("TCashAuction upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
