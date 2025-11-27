// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";

/// @notice Collect deployed addresses from env vars and write to deployments/<chainId>.json
/// @dev Run after deployments to snapshot addresses in one place
contract RecordAddresses is Script {
    function run() external {
        uint256 chainId = block.chainid;
        string memory file = string.concat("deployments/", vm.toString(chainId), ".json");
        string memory root = "addresses";

        // Core
        _sa(root, "ProxyAdmin", vm.envAddress("PROXY_ADMIN"));
        _sa(root, "DAO", vm.envAddress("DAO_PROXY"));
        _sa(root, "MulSig", vm.envAddress("MULSIG_PROXY"));
        _sa(root, "Roles", vm.envAddress("ROLES_PROXY"));
        _sa(root, "ParameterInfo", vm.envAddress("PARAMETER_INFO_PROXY"));
        _sa(root, "Oracle", vm.envAddress("ORACLE_PROXY"));

        // Governance / Treasure / TAT
        _sa(root, "Governance", vm.envAddress("GOVERNANCE_PROXY"));
        _sa(root, "TAT", vm.envAddress("TAT_PROXY"));
        _sa(root, "OilProducer", vm.envAddress("OIL_PRODUCER_PROXY"));
        _sa(root, "OilData", vm.envAddress("OIL_DATA_PROXY"));
        _sa(root, "GasProducer", vm.envAddress("GAS_PRODUCER_PROXY"));
        _sa(root, "GasData", vm.envAddress("GAS_DATA_PROXY"));
        _sa(root, "EthProducer", vm.envAddress("ETH_PRODUCER_PROXY"));
        _sa(root, "EthData", vm.envAddress("ETH_DATA_PROXY"));
        _sa(root, "BtcProducer", vm.envAddress("BTC_PRODUCER_PROXY"));
        _sa(root, "BtcData", vm.envAddress("BTC_DATA_PROXY"));

        // TCash stack
        _sa(root, "TCash", vm.envAddress("TCASH_PROXY"));
        _sa(root, "TCashLoan", vm.envAddress("TCASH_LOAN_PROXY"));
        _sa(root, "TCashAuction", vm.envAddress("TCASH_AUCTION_PROXY"));
        _sa(root, "TATManager", vm.envAddress("TAT_MANAGER_PROXY"));

        // Crosschain
        _sa(root, "CrosschainTokens", vm.envOr("CROSSCHAIN_TOKENS_PROXY", address(0)));
        _sa(root, "CrosschainBridge", vm.envOr("CROSSCHAIN_BRIDGE_PROXY", address(0)));

        // Other
        _sa(root, "TokenLocker", vm.envOr("TOKENLOCKER_PROXY", address(0)));
        _sa(root, "WTCASH", vm.envOr("WTCASH_PROXY", address(0)));
        _sa(root, "Bid", vm.envOr("BID_PROXY", address(0)));
        _sa(root, "USTN", vm.envOr("USTN_PROXY", address(0)));
        _sa(root, "USTNAuction", vm.envOr("USTN_AUCTION_PROXY", address(0)));
        _sa(root, "USTNFinance", vm.envOr("USTN_FINANCE_PROXY", address(0)));

        string memory json = vm.serializeAddress(root, "SavedAt", address(this));
        vm.writeJson(json, file);
        console2.log("Addresses written to:", file);
    }

    function _sa(string memory root, string memory key, address value) internal view {
        vm.serializeAddress(root, key, value);
    }
}
