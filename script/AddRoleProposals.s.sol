// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "contracts/Governance/MulSig.sol";
import "contracts/Governance/Roles.sol";

/// @notice Create add-role proposals for tcashAuction etc. (matches migrations/11_addRole.js core intent)
/// @dev For testing/self-managed only; production should create proposals and have multisig sign/execute off-chain.
contract AddRoleProposals is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address mulSig = vm.envAddress("MULSIG_PROXY");
        address roles = vm.envAddress("ROLES_PROXY");
        address tcashAuction = vm.envAddress("TCASH_AUCTION_PROXY");

        vm.startBroadcast(pk);
        MulSig ms = MulSig(mulSig);
        Roles r = Roles(roles);

        bytes32 TCASH_BURNER_ROLE = r.TCASH_BURNER();
        // Proposal name aligns with migrations "TCASH_BURNERA"
        ms.proposeToManagePermission("TCASH_BURNERA", tcashAuction);

        vm.stopBroadcast();
        console2.log("Proposal created to add TCASH_BURNER to:", tcashAuction);
    }
}
