// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../contracts/Crosschain/CrosschainTokens.sol";
import "../contracts/Crosschain/CrosschainBridge.sol";
import "../contracts/Governance/MulSig.sol";
import "../contracts/Governance/Roles.sol";
import "../contracts/Governance/Governance.sol";
import "../contracts/Governance/ParameterInfo.sol";
import "../contracts/Oracle/Oracle.sol";
import "../contracts/TCash/TCashLoan.sol";
import "../contracts/TCash/TCashAuction.sol";
import "../contracts/TCash/TCash.sol";
import "../contracts/TAT/TAT.sol";
import "../contracts/Governance/DAO.sol";

/// @notice Deploy crosschain contracts and initialize MulSig, Roles, TCashLoan
/// - Mirrors migrations/5_deploy_crosschain.js
contract DeployCrosschain is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address proxyAdmin = vm.envAddress("PROXY_ADMIN");
        address dao = vm.envAddress("DAO_PROXY");
        address mulSig = vm.envAddress("MULSIG_PROXY");
        address roles = vm.envAddress("ROLES_PROXY");
        address governance = vm.envAddress("GOVERNANCE_PROXY");
        address oracle = vm.envAddress("ORACLE_PROXY");
        address parameterInfo = vm.envAddress("PARAMETER_INFO_PROXY");
        address tcash = vm.envAddress("TCASH_PROXY");
        address tcashLoan = vm.envAddress("TCASH_LOAN_PROXY");
        address tcashAuction = vm.envAddress("TCASH_AUCTION_PROXY");
        address tat = vm.envAddress("TAT_PROXY");

        // Role arrays parsed from comma-separated env strings
        address[] memory foundationManagers = _parseAddresses(vm.envOr("FOUNDATION_MANAGERS", string("")));
        address[] memory auctionManagers = _parseAddresses(vm.envOr("AUCTION_MANAGERS", string("")));
        address[] memory feeders = _parseAddresses(vm.envOr("FEEDERS", string("")));
        address[] memory crosschainSenders = _parseAddresses(vm.envOr("CROSSCHAIN_SENDERS", string("")));
        address[] memory tcashManagers = _parseAddresses(vm.envOr("TCASH_MANAGERS", string("")));

        uint256 confirmDuration = vm.envOr("CONFIRM_DURATION_SECONDS", uint256(5));
        uint256 unitPrice = vm.envUint("INIT_UNIT_PRICE_WEI");
        uint256 tcashPrice = vm.envUint("INIT_TCASH_PRICE_WEI");

        vm.startBroadcast(pk);

        // CrosschainTokens
        CrosschainTokens tokensImpl = new CrosschainTokens();
        address[] memory zeroValidators = new address[](1);
        zeroValidators[0] = address(0);
        bytes memory tokensInit = abi.encodeWithSelector(
            CrosschainTokens.initialize.selector,
            zeroValidators
        );
        TransparentUpgradeableProxy crosschainTokens =
            new TransparentUpgradeableProxy(address(tokensImpl), proxyAdmin, tokensInit);

        // CrosschainBridge
        CrosschainBridge bridgeImpl = new CrosschainBridge();
        bytes memory bridgeInit = abi.encodeWithSelector(
            CrosschainBridge.initialize.selector,
            address(crosschainTokens),
            roles
        );
        TransparentUpgradeableProxy crosschainBridge =
            new TransparentUpgradeableProxy(address(bridgeImpl), proxyAdmin, bridgeInit);

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

    /// @dev Parse comma-separated 0x addresses into an array; empty string returns empty array
    function _parseAddresses(string memory csv) internal pure returns (address[] memory addrs) {
        bytes memory b = bytes(csv);
        if (b.length == 0) return addrs;

        // Count addresses
        uint256 count = 1;
        for (uint256 i; i < b.length; i++) {
            if (b[i] == ",") {
                count++;
            }
        }

        addrs = new address[](count);
        uint256 idx;
        uint256 start;
        for (uint256 i; i <= b.length; i++) {
            if (i == b.length || b[i] == ",") {
                uint256 len = i - start;
                addrs[idx] = _toAddress(_slice(b, start, len));
                idx++;
                start = i + 1;
            }
        }
    }

    function _slice(bytes memory data, uint256 start, uint256 len) internal pure returns (bytes memory) {
        bytes memory out = new bytes(len);
        for (uint256 i; i < len; i++) {
            out[i] = data[start + i];
        }
        return out;
    }

    function _toAddress(bytes memory str) internal pure returns (address addr) {
        require(str.length == 42, "address format");
        require(str[0] == "0" && (str[1] == "x" || str[1] == "X"), "address prefix");
        uint160 res;
        for (uint256 i = 2; i < 42; i++) {
            uint8 v = uint8(str[i]);
            res <<= 4;
            if (v >= 48 && v <= 57) res |= uint160(v - 48);          // 0-9
            else if (v >= 65 && v <= 70) res |= uint160(v - 55);     // A-F
            else if (v >= 97 && v <= 102) res |= uint160(v - 87);    // a-f
            else revert("invalid hex char");
        }
        addr = address(res);
    }
}
