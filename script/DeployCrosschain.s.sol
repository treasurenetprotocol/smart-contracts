// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "./lib/EnvUtils.sol";
import "Governance/CrosschainTokens.sol";
import "Crosschain/CrosschainBridge.sol";
import "Governance/MulSig.sol";
import "Governance/Roles.sol";
import "Governance/Governance.sol";
import "Governance/ParameterInfo.sol";
import "Oracle/Oracle.sol";
import "TCash/TCashLoan.sol";
import "TCash/TCashAuction.sol";
import "TCash/TCash.sol";
import "TAT/TAT.sol";
import "Governance/DAO/DAO.sol";

/// @notice Deploy crosschain contracts and initialize MulSig, Roles, TCashLoan
/// - Mirrors migrations/5_deploy_crosschain.js
contract DeployCrosschain is Script {
    address public proxyAdmin;
    address public dao;
    address public mulSig;
    address public roles;
    address public governance;
    address public oracle;
    address public parameterInfo;
    address public tcash;
    address public tcashLoan;
    address public tcashAuction;
    address public tat;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        proxyAdmin = vm.envAddress("PROXY_ADMIN");
        dao = vm.envAddress("DAO_PROXY");
        mulSig = vm.envAddress("MULSIG_PROXY");
        roles = vm.envAddress("ROLES_PROXY");
        governance = vm.envAddress("GOVERNANCE_PROXY");
        oracle = vm.envAddress("ORACLE_PROXY");
        parameterInfo = vm.envAddress("PARAMETER_INFO_PROXY");
        tcash = vm.envAddress("TCASH_PROXY");
        tcashLoan = vm.envAddress("TCASH_LOAN_PROXY");
        tcashAuction = vm.envAddress("TCASH_AUCTION_PROXY");
        tat = vm.envAddress("TAT_PROXY");

        // Role arrays parsed from comma-separated env strings
        address[] memory foundationManagers = EnvUtils.parseAddresses(vm.envOr("FOUNDATION_MANAGERS", string("")));
        address[] memory auctionManagers = EnvUtils.parseAddresses(vm.envOr("AUCTION_MANAGERS", string("")));
        address[] memory feeders = EnvUtils.parseAddresses(vm.envOr("FEEDERS", string("")));
        address[] memory crosschainSenders = EnvUtils.parseAddresses(vm.envOr("CROSSCHAIN_SENDERS", string("")));
        address[] memory tcashManagers = EnvUtils.parseAddresses(vm.envOr("TCASH_MANAGERS", string("")));

        uint256 confirmDuration = vm.envOr("CONFIRM_DURATION_SECONDS", uint256(5));
        uint256 unitPrice = vm.envUint("INIT_UNIT_PRICE_WEI");
        uint256 tcashPrice = vm.envUint("INIT_TCASH_PRICE_WEI");

        vm.startBroadcast(pk);

        // CrosschainTokens
        address[] memory zeroValidators = new address[](1);
        zeroValidators[0] = address(0);
        TransparentUpgradeableProxy crosschainTokens =
            new TransparentUpgradeableProxy(
                address(new CrosschainTokens()),
                proxyAdmin,
                abi.encodeWithSelector(CrosschainTokens.initialize.selector, zeroValidators)
            );

        // CrosschainBridge
        TransparentUpgradeableProxy crosschainBridge =
            new TransparentUpgradeableProxy(
                address(new CrosschainBridge()),
                proxyAdmin,
                abi.encodeWithSelector(
                    CrosschainBridge.initialize.selector,
                    address(crosschainTokens),
                    roles
                )
            );

        // setMulSig
        CrosschainTokens(address(crosschainTokens)).setMulSig(mulSig);

        // MulSig initialize
        MulSig(address(mulSig)).initialize(
            dao,
            governance,
            roles,
            parameterInfo,
            address(crosschainTokens),
            confirmDuration
        );

        // Roles initialize
        Roles(address(roles)).initialize(
            mulSig,
            foundationManagers,
            auctionManagers,
            feeders,
            crosschainSenders,
            tcashManagers
        );

        // TCashLoan initialize + set auction
        TCashLoan(address(tcashLoan)).initialize(
            tcash,
            roles,
            parameterInfo,
            oracle,
            tat
        );
        TCashLoan(address(tcashLoan)).setAuctionContract(tcashAuction);

        // Set initial prices
        Oracle(address(oracle)).updatePrice("UNIT", unitPrice);
        Oracle(address(oracle)).updatePrice("TCASH", tcashPrice);

        vm.stopBroadcast();

        console2.log("CrosschainTokens (proxy):", address(crosschainTokens));
        console2.log("CrosschainBridge (proxy):", address(crosschainBridge));
        console2.log("MulSig initialized     :", mulSig);
        console2.log("Roles initialized      :", roles);
        console2.log("TCashLoan initialized  :", tcashLoan);
    }
}
