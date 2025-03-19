# CrosschainTokens

## Functions

### initialize(address mulSigAddress)

Initializes the CrosschainTokens contract.

- `Parameters`:
  - `mulSigAddress`: Address of the MulSig contract.
- `Notes`:
  - Must be called only once during deployment.
  - Sets the `_mulSig` state variable.

### setCrosschainToken(string memory token,address sourceERC20address,address sourceCrosschainAddress,uint256 sourcechainid,address targetERC20address,address targetCrosschainAddress,uint256 targetchainid,uint256 fee,uint256 chainId) external onlyMulSig

Sets (or updates) the cross-chain token configuration for a specific chain.

- `Parameters`:
  - `token`: The token name. Must be a non-empty string.
  - `sourceERC20address`: The ERC20 contract address on the source chain.
  - `sourceCrosschainAddress`: The cross-chain contract address on the source chain.
  - `sourcechainid`: The chain ID of the source chain.
  - `targetERC20address`: The ERC20 contract address on the target chain.
  - `targetCrosschainAddress`: The cross-chain contract address on the target chain.
  - `targetchainid`: The chain ID of the target chain.
  - `fee`: The transaction fee (expressed as a percentage or in basis points, e.g., 0.01% - 100%).
  - `chainId`: The chain ID used for storing this configuration.
- `Behavior`:
  - Stores the provided cross-chain token information in `_crosschainTokens` using `chainId` and `token` as keys.
  - Emits the `CrosschainToken` event (as defined in the `ICrosschainTokens` interface) with the token details.


### getCrosschainToken(string memory token) public view returns (string memory,address,address,uint256,address,address,uint256,uint256)

Retrieves the cross-chain token information for the current chain.

- `Parameters`:
  - `token`: The token name.
- `Returns`: A tuple containing:
  1. `string`: Token name.
  2. `address`: Source ERC20 contract address.
  3. `address`: Source cross-chain contract address.
  4. `uint256`: Source chain ID.
  5. `address`: Target ERC20 contract address.
  6. `address`: Target cross-chain contract address.
  7. `uint256`: Target chain ID.
  8. `uint256`: Fee amount.
- `Notes`:
  - The function automatically uses `block.chainid` to locate the token information for the current chain.



### getCrosschainTokenByChainId(string memory token,uint256 chainId) public view returns (string memory,address,address,uint256,address,address,uint256,uint256)

Retrieves the cross-chain token information for a specific chain ID.

- `Parameters`:
  - `token`: The token name.
  - `chainId`: The chain ID for which to retrieve the token information.
- `Returns`: A tuple containing:
  1. `string`: Token name.
  2. `address`: Source ERC20 contract address.
  3. `address`: Source cross-chain contract address.
  4. `uint256`: Source chain ID.
  5. `address`: Target ERC20 contract address.
  6. `address`: Target cross-chain contract address.
  7. `uint256`: Target chain ID.
  8. `uint256`: Fee amount.


### setMulSig(address mulSigAddress) external onlyOwner

Sets the MulSig contract address.

- `Parameters`:
  - `mulSigAddress`: The address of the MulSig contract.
- `Behavior`:
  - Can only be set by the contract owner.
  - Can only be set once (if `_mulSig` is already set, the function will revert).


## Events

The contract emits the following event as defined in the `ICrosschainTokens` interface:

### CrosschainToken

Emitted when a cross-chain token configuration is set or updated.

- `Parameters`:
  - `token`: The token name.
  - `sourceERC20address`: Source ERC20 contract address.
  - `sourceCrosschainAddress`: Source cross-chain contract address.
  - `sourcechainid`: Source chain ID.
  - `targetERC20address`: Target ERC20 contract address.
  - `targetCrosschainAddress`: Target cross-chain contract address.
  - `targetchainid`: Target chain ID.
  - `fee`: Fee amount.
  - `chainId`: Chain ID used for storing this configuration.

*Note*: This event is emitted within the `setCrosschainToken` function.


