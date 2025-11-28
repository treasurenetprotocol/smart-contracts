# User Role Management Scripts

This document explains how to use the scripts to add a user to every role.

## Add a User to All Roles

The system contains these roles:
- ADMIN
- FOUNDATION_MANAGER
- AUCTION_MANAGER
- FEEDER
- CROSSCHAIN_SENDER
- TCASH_MINTER
- TCASH_BURNER

Adding a user to all roles involves three steps:
1. Create proposals
2. Sign proposals (multiple signatures required to meet the threshold)
3. Execute proposals (after the waiting period)

## Script Usage

### 1. Create proposals

This script creates one proposal per role to add the specified user.

```bash
# Set environment variables
export MULSIG_ADDRESS=0x... # multisig contract address

# Run the script
npx hardhat run scripts/add_user_to_roles.js --network <network>
```

After running, the script outputs proposal IDs. Record them for later steps.

### 2. Sign proposals

Use this script to sign proposals. Per governance rules, enough FOUNDATION_MANAGER signatures are required before execution.

```bash
# Set environment variables
export MULSIG_ADDRESS=0x... # multisig contract address
export PROPOSAL_IDS=1,2,3,4,5,6,7 # replace with actual proposal IDs, comma-separated
export ACTION=sign

# Run the script
npx hardhat run scripts/sign_execute_proposals.js --network <network>
```

Multiple FOUNDATION_MANAGER accounts should run this script, each with their own private key.

### 3. Execute proposals

Once proposals have enough signatures and the waiting time has passed, execute them:

```bash
# Set environment variables
export MULSIG_ADDRESS=0x... # multisig contract address
export PROPOSAL_IDS=1,2,3,4,5,6,7 # replace with actual proposal IDs, comma-separated
export ACTION=execute

# Run the script
npx hardhat run scripts/sign_execute_proposals.js --network <network>
```

## Notes

1. Accounts running the scripts must have the FOUNDATION_MANAGER role.
2. Proposal execution requires waiting for the configured confirmation time.
3. If a proposal was already executed or deleted, the operation will fail.

## Verification

Verify that the user was added by calling the Roles contract `hasRole` function:

```solidity
// Check whether the user has the specified role
bool hasRole = rolesContract.hasRole(roleId, userAddress);
```

## Full Example

Example end-to-end flow:

1. Create proposals:
```bash
export MULSIG_ADDRESS=0x123...
npx hardhat run scripts/add_user_to_roles.js --network mainnet
# Output: Proposal IDs: 42, 43, 44, 45, 46, 47, 48
```

2. Multiple FOUNDATION_MANAGER accounts sign:
```bash
export MULSIG_ADDRESS=0x123...
export PROPOSAL_IDS=42,43,44,45,46,47,48
export ACTION=sign
npx hardhat run scripts/sign_execute_proposals.js --network mainnet
```

3. After the confirmation window, execute:
```bash
export MULSIG_ADDRESS=0x123...
export PROPOSAL_IDS=42,43,44,45,46,47,48
export ACTION=execute
npx hardhat run scripts/sign_execute_proposals.js --network mainnet
```

After these steps, user 0x09eda46ffcec4656235391dd298875b82aa458a9 is added to every role.
