// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../contracts/TCash/TCash.sol";
import "../contracts/TCash/TCashLoan.sol";
import "../contracts/TCash/TCashAuction.sol";
import "../contracts/TCash/TATManager.sol";

/// @notice Deploy TCash, TCashLoan, TCashAuction, TATManager
/// - Mirrors migrations/3_depoloy_tcash.js (TCashLoan init deferred to Crosschain step)
contract DeployTCash is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address roles = vm.envAddress("ROLES_PROXY");
        address oracle = vm.envAddress("ORACLE_PROXY");
        address tat = vm.envAddress("TAT_PROXY");
        address parameterInfo = vm.envAddress("PARAMETER_INFO_PROXY");
        address initialReceiver = vm.envAddress("TCASH_RECEIVER");

        vm.startBroadcast(pk);

        // TCash
        TCash tcashImpl = new TCash();
        bytes memory tcashInit = abi.encodeWithSelector(TCash.initialize.selector, initialReceiver);
        TransparentUpgradeableProxy tcash =
            new TransparentUpgradeableProxy(address(tcashImpl), proxyAdmin, tcashInit);

        // TATManager
        TATManager tatManagerImpl = new TATManager();
        bytes memory tatMgrInit = abi.encodeWithSelector(TATManager.initialize.selector, roles);
        TransparentUpgradeableProxy tatManager =
            new TransparentUpgradeableProxy(address(tatManagerImpl), proxyAdmin, tatMgrInit);

        // TCashLoan (not initialized here)
        TCashLoan tcashLoanImpl = new TCashLoan();
        TransparentUpgradeableProxy tcashLoan =
            new TransparentUpgradeableProxy(address(tcashLoanImpl), proxyAdmin, "");

        // TCashAuction
        TCashAuction tcashAuctionImpl = new TCashAuction();
        bytes memory auctionInit = abi.encodeWithSelector(
            TCashAuction.initialize.selector,
            roles,
            address(tcash),
            address(tcashLoan)
        );
        TransparentUpgradeableProxy tcashAuction =
            new TransparentUpgradeableProxy(address(tcashAuctionImpl), proxyAdmin, auctionInit);

        // Wire TCash dependencies
        TCash(address(tcash)).setRoles(roles);
        TCash(address(tcash)).setOracle(oracle);
        TCash(address(tcash)).setAuctionContract(address(tcashAuction));

        vm.stopBroadcast();

        console2.log("TCash (proxy)       :", address(tcash));
        console2.log("TCashLoan (proxy)   :", address(tcashLoan));
        console2.log("TCashAuction (proxy):", address(tcashAuction));
        console2.log("TATManager (proxy)  :", address(tatManager));
        console2.log("ParameterInfo       :", parameterInfo);
        console2.log("Oracle              :", oracle);
        console2.log("Roles               :", roles);
    }
}
