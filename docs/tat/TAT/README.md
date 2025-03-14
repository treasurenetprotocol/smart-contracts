## TAT

## Functions
### initialize(string memory _name, string memory _symbol, address _governanceContract)

Initializes the TAT token contract.

- `_name`: The name of the TAT token.
- `_symbol`: The symbol of the TAT token.
- `_governanceContract`: Address of the TreasureNet governance contract.

### \_beforeTokenTransfer(address from,address to,uint256 amount)

Hook that is called before any token transfer to ensure the token is not paused.

- `from`: Address from which the tokens are sent
- `to`: Address to which the tokens are sent
- `amount`: Amount of tokens transferred

### mint(string memory \_treasureKind,bytes32 \_uniqueId,address to,uint256 amount)

Mints new TAT tokens.

- `_treasureKind`: Type of the treasure
- `_uniqueId`: Unique identifier for the minting
- `to`: Address to which the tokens are minted
- `amount`: Amount of tokens to mint

### faucet(address user, uint256 amount)

Temporary function to mint TAT tokens (faucet).

- `user`: Address to which the tokens are minted
- `amount`: Amount of tokens to mint

### burn(string memory \_treasureKind, uint256 tokens)

Burns TAT tokens.

- `_treasureKind`: Type of the treasure
- `tokens`: Amount of tokens to burn

### pause()

Pauses the TAT token transfers

### unpause()

Unpauses the TAT token transfers

### stake(address account, uint256 \_amount)

Stakes TAT tokens.

- `account`: Address of the stakeholder
- `_amount`: Amount of tokens to stake

### withdraw(address account, uint256 \_amount)

Withdraws staked TAT tokens.

- `account`: Address of the stakeholder
- `_amount`: Amount of tokens to withdraw

## Events

### TATHistory(string kind, bytes32 uniqueId, address from, address to, uint amount);

Emitted when TAT tokens are transferred.

- `kind`: Type of the treasure
- `uniqueId`: Unique identifier for the transaction
- `from`: Address from which the tokens are sent
- `to`: Address to which the tokens are sent
- `amount`: Amount of tokens transferred