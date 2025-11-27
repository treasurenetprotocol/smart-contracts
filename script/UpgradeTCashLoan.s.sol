// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "contracts/TCash/TCashLoan.sol";

/// @notice Upgrade TCashLoan implementation (matches migrations/10_upgrade_tcashloan.js)
contract UpgradeTCashLoan is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address proxy = vm.envAddress("TCASH_LOAN_PROXY");

        vm.startBroadcast(pk);
        TCashLoan newImpl = new TCashLoan();
        ProxyAdmin(proxyAdmin).upgrade(
            TransparentUpgradeableProxy(payable(proxy)),
            address(newImpl)
        );
        vm.stopBroadcast();

        console2.log("TCashLoan upgraded proxy:", proxy);
        console2.log("New impl:", address(newImpl));
    }
}
