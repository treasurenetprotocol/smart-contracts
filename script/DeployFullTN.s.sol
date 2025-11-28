// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "./lib/DeployLib.sol";
import "./lib/EnvUtils.sol";

/// @notice One-shot deployment of the full Treasurenet stack.
/// Env vars:
/// - PRIVATE_KEY (required)
/// - PROXY_ADMIN (optional: reuse existing; default deploys new)
/// - TCASH_RECEIVER (optional: defaults to PRIVATE_KEY address)
/// - FOUNDATION_MANAGERS, AUCTION_MANAGERS, FEEDERS, CROSSCHAIN_SENDERS, TCASH_MANAGERS (csv)
/// - CONFIRM_DURATION_SECONDS (optional; default 5)
/// - INIT_UNIT_PRICE_WEI (optional; default 0)
/// - INIT_TCASH_PRICE_WEI (optional; default 0)
/// - DEPLOY_TOKEN_LOCKER (optional; default true)
contract DeployFullTN is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdminOverride = vm.envOr("PROXY_ADMIN", address(0));
        address tcashReceiver = vm.envOr("TCASH_RECEIVER", vm.addr(pk));

        bool deployTokenLocker = vm.envOr("DEPLOY_TOKEN_LOCKER", true);
        DeployLib.CrosschainConfig memory cfg = DeployLib.CrosschainConfig({
            foundationManagers: EnvUtils.parseAddresses(vm.envOr("FOUNDATION_MANAGERS", string(""))),
            auctionManagers: EnvUtils.parseAddresses(vm.envOr("AUCTION_MANAGERS", string(""))),
            feeders: EnvUtils.parseAddresses(vm.envOr("FEEDERS", string(""))),
            crosschainSenders: EnvUtils.parseAddresses(vm.envOr("CROSSCHAIN_SENDERS", string(""))),
            tcashManagers: EnvUtils.parseAddresses(vm.envOr("TCASH_MANAGERS", string(""))),
            confirmDuration: vm.envOr("CONFIRM_DURATION_SECONDS", uint256(5)),
            unitPrice: vm.envOr("INIT_UNIT_PRICE_WEI", uint256(0)),
            tcashPrice: vm.envOr("INIT_TCASH_PRICE_WEI", uint256(0))
        });

        vm.startBroadcast(pk);

        DeployLib.Core memory core = DeployLib.deployCore(proxyAdminOverride);
        DeployLib.Producers memory prod = DeployLib.deployProducers(core);
        DeployLib.TCashStack memory tstack =
            DeployLib.deployTCashStack(core, prod.tat, tcashReceiver);

        address tokenLocker;
        if (deployTokenLocker) {
            tokenLocker = DeployLib.deployTokenLocker(core.proxyAdmin);
        }

        DeployLib.Crosschain memory cross = DeployLib.deployCrosschain(
            core,
            tstack,
            prod,
            cfg
        );

        vm.stopBroadcast();

        console2.log("ProxyAdmin          :", address(core.proxyAdmin));
        console2.log("DAO (proxy)         :", core.dao);
        console2.log("MulSig (proxy)      :", core.mulSig);
        console2.log("Roles (proxy)       :", core.roles);
        console2.log("ParameterInfo (proxy):", core.parameterInfo);
        console2.log("Oracle (proxy)      :", core.oracle);

        console2.log("Governance (proxy):", prod.governance);
        console2.log("TAT (proxy)       :", prod.tat);
        console2.log("OilProducer/Data  :", prod.producer[0], prod.data[0]);
        console2.log("GasProducer/Data  :", prod.producer[1], prod.data[1]);
        console2.log("EthProducer/Data  :", prod.producer[2], prod.data[2]);
        console2.log("BtcProducer/Data  :", prod.producer[3], prod.data[3]);

        console2.log("TCash (proxy)       :", tstack.tcash);
        console2.log("TCashLoan (proxy)   :", tstack.tcashLoan);
        console2.log("TCashAuction (proxy):", tstack.tcashAuction);
        console2.log("TATManager (proxy)  :", tstack.tatManager);
        if (deployTokenLocker) {
            console2.log("TokenLocker (proxy):", tokenLocker);
        }

        console2.log("CrosschainTokens (proxy):", cross.tokens);
        console2.log("CrosschainBridge (proxy):", cross.bridge);
    }
}
