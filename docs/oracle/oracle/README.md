# Oracle

## Functions

### initialize(address _roleContract)

Initializes the Oracle contract.

- `_roleContract`: Address of the role management contract.


### createOracleRequest(address \_callbackAddress,bytes4 \_callbackFunctionId,uint256 \_nonce) -> bytes32

Creates a new Oracle request.

- `_callbackAddress`: Address of the callback contract
- `_callbackFunctionId`: Function ID of the callback
- `_nonce`: Nonce value

- `bytes32`: ID of the new request

### cancelOracleRequest(bytes32 \_requestId,address \_callbackAddress,bytes4 \_callbackFuncId) -> bytes32

Cancels an existing Oracle request.

- `_requestId`: ID of the request
- `_callbackAddress`: Address of the callback contract
- `_callbackFuncId`: Function ID of the callback

- `bytes32`: ID of the canceled request

### setCurrencyValue(bytes32 \_currencyKind,uint256 \_currencyValue)

Sets the value for a currency kind.

- `_currencyKind`: Kind of the currency
- `_currencyValue`: Value of the currency

### getCurrencyValue(bytes32 \_currencyKind) -> uint256

Gets the value for a currency kind.

- `_currencyKind`: Kind of the currency

- `uint256`: Value of the currency

## Events

### OracleRequest(address requester,bytes32 requesterid,address callbackAddress,bytes4 callbackFunctionId);

Emitted when an Oracle request is created.

- `requester`: Address of the requester
- `requesterid`: ID of the request
- `callbackAddress`: Address of the callback contract
- `callbackFunctionId`: Function ID of the callback

### CancelOracleRequest(address requester, bytes32 requestid);

Emitted when an Oracle request is canceled.

- `requester`: Address of the requester
- `requestid`: ID of the canceled request