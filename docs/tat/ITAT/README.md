## ITAT

## Functions

### mint(string memory \_treasureKind,bytes32 \_uniqueId,address to,uint256 amount)

Mints new TAT tokens.

- `_treasureKind`: Type of the treasure
- `_uniqueId`: Unique identifier for the minting
- `to`: Address to which the tokens are minted
- `amount`: Amount of tokens to mint

### burn(string memory \_treasureKind, uint256 tokens)

Burns TAT tokens.

- `_treasureKind`: Type of the treasure.
- `to`: Address from which the tokens will be burned.
- `amount`: Amount of tokens to burn.

### paused() -> bool

Checks whether the token transfers are paused.

- `bool`: Returns **true** if the token transfers are paused,**false** otherwise.

### pause()

Pauses the TAT token transfers

### unpause()

Unpauses the TAT token transfers