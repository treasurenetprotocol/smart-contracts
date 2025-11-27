// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/USTN/USTN.sol";
import "contracts/USTN/USTNAuction.sol";
import "contracts/USTN/USTNFinance.sol";

/// @notice Deploy USTN, USTNAuction, USTNFinance (mirrors migrations/13_deploy_ustn.js)
contract DeployUSTN is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");

        vm.startBroadcast(pk);

        USTN ustnImpl = new USTN();
        TransparentUpgradeableProxy ustn =
            new TransparentUpgradeableProxy(address(ustnImpl), proxyAdmin, "");

        USTNAuction auctionImpl = new USTNAuction();
        TransparentUpgradeableProxy ustnAuction =
            new TransparentUpgradeableProxy(address(auctionImpl), proxyAdmin, "");

        USTNFinance financeImpl = new USTNFinance();
        TransparentUpgradeableProxy ustnFinance =
            new TransparentUpgradeableProxy(address(financeImpl), proxyAdmin, "");

        vm.stopBroadcast();

        console2.log("USTN (proxy)       :", address(ustn));
        console2.log("USTNAuction (proxy):", address(ustnAuction));
        console2.log("USTNFinance (proxy):", address(ustnFinance));
    }
}
