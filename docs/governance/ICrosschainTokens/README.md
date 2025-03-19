# ICrosschainTokens

## Structures

### CrosschainTokenInfo

Cross-chain token information structure.

- **token**: `string` — Token name.
- **sourceERC20address**: `address` — Source ERC20 contract address.
- **sourceCrosschainAddress**: `address` — Source cross-chain contract address.
- **sourcechainid**: `uint256` — Source chain ID.
- **targetERC20address**: `address` — Target ERC20 contract address.
- **targetCrosschainAddress**: `address` — Target cross-chain contract address.
- **targetchainid**: `uint256` — Target chain ID.
- **fee**: `uint256` — Transaction fee (e.g., 0.01% - 100%).

---

## Events

### CrosschainToken

Emitted when a cross-chain token configuration is set or updated.

- **Parameters**:
  - `token`: `string` — Token name.
  - `sourceERC20address`: `address` — Source ERC20 contract address.
  - `sourceCrosschainAddress`: `address` — Source cross-chain contract address.
  - `sourcechainid`: `uint256` — Source chain ID.
  - `targetERC20address`: `address` — Target ERC20 contract address.
  - `targetCrosschainAddress`: `address` — Target cross-chain contract address.
  - `targetchainid`: `uint256` — Target chain ID.
  - `fee`: `uint256` — Transaction fee.
  - `chainId`: `uint256` — Current chain ID for storage.

---

## Functions

### setCrosschainToken(string memory token, address sourceERC20address, address sourceCrosschainAddress, uint256 sourcechainid, address targetERC20address, address targetCrosschainAddress, uint256 targetchainid, uint256 fee, uint256 chainId) external

Sets cross-chain token information.

- **Parameters**:
  - `token`: The token name. Must be a non-empty string.
  - `sourceERC20address`: The source chain's ERC20 contract address.
  - `sourceCrosschainAddress`: The source chain's cross-chain contract address.
  - `sourcechainid`: The source chain ID.
  - `targetERC20address`: The target chain's ERC20 contract address.
  - `targetCrosschainAddress`: The target chain's cross-chain contract address.
  - `targetchainid`: The target chain ID.
  - `fee`: The transaction fee (expressed as a percentage or in basis points, e.g., 0.01% - 100%).
  - `chainId`: The current chain ID used for storing this configuration.
- **Notes**:
  - This function stores the provided cross-chain token information in the contract's storage.
  - It emits the `CrosschainToken` event with the token details.

---

### getCrosschainToken(string memory token) external view returns (string memory, address, address, uint256, address, address, uint256, uint256)

Retrieves the cross-chain token information for the current chain.

- **Parameters**:
  - `token`: The token name.
- **Returns**: A tuple containing:
  1. `string`: Token name.
  2. `address`: Source ERC20 contract address.
  3. `address`: Source cross-chain contract address.
  4. `uint256`: Source chain ID.
  5. `address`: Target ERC20 contract address.
  6. `address`: Target cross-chain contract address.
  7. `uint256`: Target chain ID.
  8. `uint256`: Transaction fee.
- **Notes**:
  - The function retrieves token information using the current chain ID (i.e., `block.chainid`).

---

### getCrosschainTokenByChainId(string memory token, uint256 chainId) external view returns (string memory, address, address, uint256, address, address, uint256, uint256)

Retrieves the cross-chain token information for a specific chain ID.

- **Parameters**:
  - `token`: The token name.
  - `chainId`: The chain ID for which to retrieve the token information.
- **Returns**: A tuple containing:
  1. `string`: Token name.
  2. `address`: Source ERC20 contract address.
  3. `address`: Source cross-chain contract address.
  4. `uint256`: Source chain ID.
  5. `address`: Target ERC20 contract address.
  6. `address`: Target cross-chain contract address.
  7. `uint256`: Target chain ID.
  8. `uint256`: Transaction fee.
