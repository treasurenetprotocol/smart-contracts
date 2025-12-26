## Manual Scripts Reference

### roles-permission-check.js
- **Purpose:** Read deployments and the Roles contract on the specified network to check whether the current private-key address has FOUNDATION_MANAGER / ADMIN / DEFAULT_ADMIN_ROLE; list current FOUNDATION_MANAGER members and role hierarchy.
- **Required env:**  
  - `RPC`: RPC endpoint.  
  - `PRIVATE_KEY`: Account private key (hex, with or without `0x`).  
  - `NETWORK`: Deployment key (default `dev`), must exist at `deployments/<NETWORK>.json`.
- **How to run:**  
  1) Set env (via `.env` or export): `RPC`, `PRIVATE_KEY`, `NETWORK` (optional, default dev).  
  2) Run: `node scripts/manual/roles-permission-check.js`
- **Output:** Current account address; status of the three roles; FM admin role/hierarchy; FM member list; suggestions when lacking permissions.

### multisig-proposal-status.js
- **Purpose:** Query multisig proposal status (signature progress, execution time, FM signature details, pending list).
- **Required env:** `RPC`, `NETWORK` (default `dev`), `PROPOSAL_ID` (default `4`).
- **How to run:** Set `RPC`, `NETWORK`, `PROPOSAL_ID`; run `node scripts/manual/multisig-proposal-status.js`.
- **Output:** Proposal name/execution time; current/required signatures and percentage; FM signature status; executability (with wait time); pending proposal IDs; next-step guidance.

### multisig-proposal-execute.js
- **Purpose:** Execute a multisig proposal that has met the signature threshold and execution time, using an account with FOUNDATION_MANAGER.
- **Required env:** `RPC`, `NETWORK`, `PRIVATE_KEY` (FM key), `PROPOSAL_ID` (default `4`).
- **How to run:** Set `RPC`, `NETWORK`, `PRIVATE_KEY`, `PROPOSAL_ID`; run `node scripts/manual/multisig-proposal-execute.js`.
- **Output:** Current/required signatures; execution time check; gas estimate and tx hash; ProposalExecuted event; post-execution pending check.

### register-dapp-propose.js
- **Purpose:** Create a “register DApp” multisig proposal using a Foundation Manager account (no auto sign/execute).
- **Required env:** `RPC`, `NETWORK`, `PRIVATE_KEY` (must have FOUNDATION_MANAGER), `TREASURE_KIND` (`OIL`/`GAS`/`ETH`/`BTC`), `DAPP_NAME`, `PAYEE_ADDRESS`.
- **How to run:** Set the above env; run `node scripts/manual/register-dapp-propose.js`.
- **Output:** Proposal ID, required signature threshold, FM list; prompts to check progress via `multisig-proposal-status.js` and execute via `multisig-proposal-execute.js`.

### kms-multisig-sign.js
- **Purpose:** Use AWS KMS (`@web3-kms-signer`) to call `signTransaction` on a multisig proposal and send the tx.
- **Required env:**  
  - `RPC`, `NETWORK` (to resolve MULSIG if `CONTRACT_ADDRESS` not set), `CHAIN_ID` (default 6666), `CONTRACT_ADDRESS` (optional), `PROPOSAL_ID` (default 4), `FROM_ADDRESS` (optional, KMS address).  
  - KMS credentials: `AWS_KMS_KEY_ID`, `AWS_KMS_ACCESS_KEY_ID`, `AWS_KMS_SECRET_ACCESS_KEY`, `AWS_KMS_REGION`.
- **How to run:** Set the env; run `node scripts/manual/kms-multisig-sign.js`.
- **Output:** Network/proposal info; signature progress (with threshold when available); gas estimate; signed tx hash/block/gas used; post-sign progress check.

### crosschain-token-setup-run.js
- **Purpose:** Drive cross-chain token setup using env + deployments, invoking the helper to auto-create/sign/execute multisig proposals.
- **Required env:**  
  - `RPC`, `NETWORK`, `PRIVATE_KEY` (Foundation Manager signing/executing).  
  - Target chain: `TARGET_CHAIN_ID`, `TARGET_UNIT`, `TARGET_BRIDGE`, `TARGET_TCASH`.  
  - Optional: `SOURCE_CHAIN_ID`, `SOURCE_UNIT`, `SOURCE_BRIDGE`, `SOURCE_TCASH`, `SOURCE_NETWORK_NAME`, `TARGET_NETWORK_NAME`.
- **How to run:** Set env; run `node scripts/manual/crosschain-token-setup-run.js`.
- **Output:** Source/target config; proposal creation/sign/execute logs and results.

### crosschain-token-setup-helper.js
- **Purpose:** Helper for the run script: create cross-chain token proposals, collect FOUNDATION_MANAGER signatures, and execute.
- **Input object:** `rpcUrl`, `sourceNetworkName`, `targetNetworkName`, `sourceChainId`, `targetChainId`, `sourceChain{unit,bridge,tcash}`, `targetChain{unit,bridge,tcash}`, `mulSig`, `roles`, `crosschainTokens`, `signerKey`.
- **Note:** When calling directly, construct the object yourself; it checks FOUNDATION_MANAGER role and creates/signs/executes four directional token proposals.

### multisig-sign-info.js
- **Purpose:** Show signature status of a proposal and generate `signTransaction` on-chain parameters for external signing systems (e.g., custom KMS flow).
- **Required env:** `RPC`, `NETWORK` (default `dev`), `CHAIN_ID` (default 6666), `PROPOSAL_ID` (default 4).
- **How to run:** Set `RPC`, `NETWORK`, `CHAIN_ID`, `PROPOSAL_ID`; run `node scripts/manual/multisig-sign-info.js`.
- **Output:** Network/proposal signature status (count, whether current account has signed) and full tx parameters (`to`/`data`/`gas`/`gasPrice`/`nonce`/`chainId`) for external signing.
