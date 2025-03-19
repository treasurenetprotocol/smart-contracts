# SimpleClient

## Functions
### initialize(address _oracleContract, address _rolesContract)

Initializes the SimpleClient contract with the specified Oracle and Roles contract addresses.

- `_oracleContract`: Address of the Oracle contract.
- `_rolesContract`: Address of the Roles contract.
### oracle() -> address

Returns the address of the Oracle contract.

- `address`: Address of the Oracle contract

### requesterid() -> bytes32

Returns the current request ID to pull asset value.

- `bytes32`: Current request ID

### registerAssetValueRequest() -> bytes32

Registers a request to pull the asset value from the Oracle.

- `bytes32`: ID of the sent request

### receiveAssetValue(bytes32 \_requestId,uint256 \_date,uint256 \_value)

Receives the asset value from the Oracle.

- `_requestId`: ID of the Oracle request
- `_date`: Date of the asset value
- `_value`: Value of the asset

### getAssetValue(uint256 \_date) -> uint256

Gets the asset value for a given date.

- `_date`: Date of the asset value

- `uint256`: Value of the asset

## Structs

### AssetValue

- `uint256 Date`: Date of the asset value
- `uint256 Value`: Value of the asset
- `uint256 Timestamp`: Timestamp of the value setting

## Events

### OracleRequest(address requester,bytes32 requesterid,address callbackAddress,bytes4 callbackFunctionId);

Emitted when an Oracle request is sent.

- `requester`: Address of the requester
- `requesterid`: ID of the request
- `callbackAddress`: Address of the callback contract
- `callbackFunctionId`: Function ID of the callback

### AssetValueSet(bytes32 requesterid, uint256 Date, uint256 Value);

Emitted when an asset value is received.

- `requesterid`: ID of the request
- `Date`: Date of the asset value
- `Value`: Value of the asset