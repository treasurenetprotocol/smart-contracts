## USTN

## Functions
### initialize(address _rolesContract, address _oracleContract, address _ustnAuctionContract, address _ustnFinanceContract) -> void  
Initializes the USTN contract with the required parameters.  
- `_rolesContract`: The address of the roles contract.  
- `_oracleContract`: The address of the Oracle contract.  
- `_ustnAuctionContract`: The address of the USTNAuction contract.  
- `_ustnFinanceContract`: The address of the USTN Finance contract.

### totalSupply() -> uint256

Get the total circulation of USTN.

- `uint256`: Total supply of the USTN token

### balanceOf(address tokenOwner) -> uint256

Query the USTN balance of the specified tokenOwner account.

- `tokenOwner`: Address of the account to query

- `uint256`: USTN balance of the specified account

### transfer(address to, uint256 tokens) -> bool

Transfer USTN tokens to a specified address.

- `to`: Address to which the tokens are to be transferred
- `tokens`: Amount of tokens to be transferred

- `bool`: Returns `true` if the transfer is successful

### allowance(address tokenOwner, address spender) -> uint256

Query the remaining number of tokens authorized to spender by the tokenowner.

- `tokenOwner`: Address of the token owner
- `spender`: Address of the spender

- `uint256`: Remaining number of tokens authorized

### approve(address spender, uint256 tokens) -> bool

TokenOwner delegates spender to use tokens.

- `spender`: Address of the spender
- `tokens`: Amount of tokens to be approved

- `bool`: Returns **true** if the approval is successful

### transferFrom(address from, address to, uint256 tokens) -> bool

Transfer tokens from one address to another.

- `from`: Address from which the tokens are to be transferred
- `to`: Address to which the tokens are to be transferred
- `tokens`: Amount of tokens to be transferred

- `bool`: Returns **true** if the transfer is successful

### bidCost(address bider, uint amount) -> bool

Transfer USTN tokens from bider to AuctionManager.

> \[!WARNING\]   
> Only allow USTNAuction contract to use.
> Require to get the account address of AuctionManager.

- `bider`: Address of the bidder
- `amount`: Amount of USTN to be transferred

- `bool`: Returns **true** if the operation is successful

### bidBack(address bider, uint amount) -> bool

Transfer USTN tokens from AuctionManager to bider.

> \[!WARNING\]   
> Only allow USTNAuction contract to use.
> Require to get the account address of AuctionManager.

- `bider`: Address of the bidder
- `amount`: Amount of USTN to be transferred

- `bool`: Returns **true** if the operation is successful

### queryAuctionManager() -> address

Query the address of the AuctionManager.

- `address`: Address of the AuctionManager

### reduceTotalSupply(uint amount) -> bool

Reduce the total amount issued by the amount.

> \[!WARNING\]   
> Only allow USTNFinance to use.
> Repay the loan to reduce the bank's additional issuance.

- `amount`: Amount to reduce from the total supply

- `bool`: Returns **true** if the operation is successful

### addTotalSupply(uint amount) -> bool

Increase the total amount issued by the amount.

> \[!WARNING\]   
> Only allow USTNFinance to use.
> The loan interest causes the total issuance to increase.

- `amount`: Amount to add to the total supply

- `bool`: Returns **true** if the operation is successful

### addBalance(address add, uint amount) -> bool

Increase the balance of the specified address.

> \[!WARNING\]   
> Only allow USTNFinance to use.

- `add`: Address to which the balance is to be increased
- `amount`: Amount of USTN to be added

- `bool`: Returns `true` if the operation is successful

### reduceBalance(address add, uint amount) -> bool

Reduce the balance of the specified address.

> \[!WARNING\]   
> Only allow USTNFinance to use.

- `add`: Address from which the balance is to be reduced
- `amount`: Amount of USTN to be reduced

- `bool`: Returns **true** if the operation is successful

### mintRate(uint256 amount) -> uint256

Based on the currency price of OSM, get the ratio of USTN to UNIT.

- `amount`: Amount of USTN for which the rate is to be calculated

- `uint256`: Ratio of USTN to UNIT

### mintBackRate(uint256 amount) -> uint256

Based on the currency price of OSM, get the ratio of UNIT to USTN.

- `amount`: Amount of UNIT for which the rate is to be calculated

- `uint256`: Ratio of UNIT to USTN

### mint() -> bool

Based on the OSM ratio, exchange the USTN of the msg.value value.

- `bool`: Returns **true** if the operation is successful

### mintBack(uint256 tokens) -> bool

Based on the OSM ratio, repurchase the UNIT of the token value.

- `tokens`: Amount of UNIT to be repurchased

- `bool`: Returns **true** if the operation is successful

### burn(address account, uint256 tokens) -> bool

Burns the number of tokens of AuctionManager.

> \[!WARNING\]   
> Only allowed for USTNAuction.
>
> Triggered when receiving the auction item.

- `account`: Address from which the tokens are to be burned
- `tokens`: Amount of tokens to be burned

- `bool`: Returns **true** if the operation is successful

### getOSMValue(bytes32 currencyName) -> uint

Internal function to query the currency value from the Oracle.

- `currencyName`: Name of the currency to query

- `uint`: Currency value from the Oracle

## Events

### convert(uint \_time, address \_user, uint \_unitValueTotal, uint \_USTNAmount, string \_type);

Emitted when there is a conversion of USTN.

- `_time`: The timestamp of the event
- `_user`: The address of the user involved in the conversion
- `_unitValueTotal`: The total value in UNIT currency
- `_USTNAmount`: The amount of USTN tokens involved in the conversion
- `_type`: The type of conversion (mint, mintBack)