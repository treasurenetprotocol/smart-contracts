# CrosschainBridge

## Functions

### initialize(address crosschainTokensContract, address rolesContract)

Initializes the contract with the CrosschainTokens and Roles contract addresses.

- `crosschainTokensContract`: Address of the CrosschainTokens contract.
- `rolesContract`: Address of the Roles contract.

### crossToEth(string calldata token, uint256 amount, uint256 chainId)

Transfers tokens from the current chain to Ethereum.

- `token`: Name of the token to transfer.
- `amount`: Total amount to be transferred (including fee).
- `chainId`: Identifier of the target chain.
Emits a `CrossToEth` event after processing.

### getExpirationBlock(uint256 id) -> uint256

Returns the expiration block number for the specified transaction.

- `id`: Transaction ID.
- Returns: Expiration block number.

### isExpired(uint256 id) -> bool

Checks whether the transaction has expired.

- `id`: Transaction ID.
- Returns: `true` if the current block number is greater than the transaction's expiration block, otherwise `false`.

### isConfirmed(uint256 id) -> bool

Checks if the transaction is confirmed (i.e. reached the available block).

- `id`: Transaction ID.
- Returns: `true` if the current block number is greater than or equal to the available block, otherwise `false`.

### cleanup(uint256 batchSize)

Cleans up old completed transactions in batches.

- `batchSize`: Number of transactions to check and clean up in this operation.

### crossFromEth(uint256 id, string calldata token, uint256 amount, address account, uint256 chainId)

Handles cross-chain transfers from Ethereum.

- `id`: Transaction ID.
- `token`: Name of the token to transfer.
- `amount`: Token amount to be transferred.
- `account`: Address of the transaction initiator.
- `chainId`: Identifier of the source chain.
Requires the caller to have the `CROSSCHAIN_SENDER` role.
Emits a `CrossFromEth` event after processing.

### confirmFromEth(uint256 id)

Confirms a cross-chain transfer from Ethereum.

- `id`: Transaction ID.
Requires the caller to have the `CROSSCHAIN_SENDER` role and that the transaction exists, is not processed, and is not expired.
Emits a `ConfirmFromEth` event after confirmation.

### getCurrentId() -> uint256
Returns the current transaction ID counter.

- Returns: The current transaction ID.

### getRecord(uint256 id) -> (string token, uint256 amount, uint256 fee, uint256 startBlock, uint256 expirationBlock, uint256 availableBlock, bool isProcessed)

Retrieves the complete record of a specific transaction.

- `id`: Transaction ID.
- Returns:
    - `token`: Token name.
    - `amount`: Transferred amount.
    - `fee`: Fee charged.
    - `startBlock`: Block number when the transaction was initiated.
    - `expirationBlock`: Block number when the transaction expires.
    - `availableBlock`: Block number after which the transaction is considered confirmed.
    - `isProcessed`: Boolean indicating if the transaction has been processed.


### crossRollback(uint256 id, address account, string calldata token, uint256 chainId, uint256 amount)

Rolls back a cross-chain transaction and returns the assets to the user.

- `id`: Transaction ID.
- `account`: Address to receive the rollback funds.
- `token`: Name of the token to rollback.
- `chainId`: Identifier of the chain.
- `amount`: Amount to rollback.

Emits a `CrossRollback` event after processing.

### parseId(uint256 id) -> (uint256 chainId, uint256 sequenceId)

Parses a transaction ID into its constituent chain ID and sequence number.

- `id`: Transaction ID.
- Returns:
    - `chainId`: The chain identifier (upper bits).
    - `sequenceId`: The sequence number (lower bits).

Emits a `CrossRollback` event after processing.

## Events

### CrossToEth(uint256 indexed id, address indexed account, string token, uint256 sourcechainid, uint256 targetchainid, address sourceERC20address, address targetERC20address, uint256 amount, uint256 fee, uint256 availableBlock, uint256 timeoutBlock, uint256 chainId )

Emitted when a token transfer from the current chain to Ethereum is initiated.

- `id`: Unique transaction identifier.
- `account`: Address of the sender.
- `token`: Token name.
- `sourcechainid`: ID of the source chain.
- `targetchainid`: ID of the target chain.
- `sourceERC20address`: ERC20 token address on the source chain.
- `targetERC20address`: ERC20 token address on the target chain.
- `amount`: Transferred amount (excluding fee).
- `fee`: Fee amount deducted.
- `availableBlock`: Block number from which the transaction can be confirmed.
- `timeoutBlock`: Expiration block number for the transaction.
- `chainId`: Identifier of the target chain provided by the user.

### CrossFromEth(uint256 indexed id, address indexed account, string token, uint256 amount )

Emitted when a token transfer from Ethereum to the current chain is processed.

- `id`: Unique transaction identifier.
- `account`: Address of the transaction initiator.
- `token`: Token name.
- `amount`: Amount transferred.

### ConfirmFromEth(uint256 indexed id)

Emitted when a cross-chain transaction from Ethereum is confirmed.  

- `id`: Unique transaction identifier.



### CrossRollback(uint256 indexed id, address indexed account, string token, uint256 amount )

Emitted when a cross-chain transaction is rolled back.

- `id`: Unique transaction identifier.
- `account`: Address receiving the rollback funds.
- `token`: Token name.
- `amount`: Amount rolled back.


