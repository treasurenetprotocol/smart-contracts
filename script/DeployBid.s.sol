// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../contracts/Bid/Bid.sol";

/// @notice Deploy Bid (mirrors migrations/20_deploy_bid.js)
contract DeployBid is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address tat = vm.envAddress("TAT_PROXY");

        vm.startBroadcast(pk);

        Bid impl = new Bid();
        bytes memory initData = abi.encodeWithSelector(Bid.initialize.selector, tat);
        TransparentUpgradeableProxy bid =
            new TransparentUpgradeableProxy(address(impl), proxyAdmin, initData);

        vm.stopBroadcast();

        console2.log("Bid (proxy):", address(bid));
    }
}
