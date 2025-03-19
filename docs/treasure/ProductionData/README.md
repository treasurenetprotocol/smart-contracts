# ProductionData

Core contract for managing production data. It integrates with Oracle services to obtain asset values and trusted production data, and with Producer contracts to handle production data submitted by producers. It also implements expense management (via inheritance from Expense).

It inherits from:
- `Context`
- `Initializable`
- `OracleClient`
- `IProductionData`
- `Expense`

It uses role-based access control through the `_roleController` (an instance of `IRoles`) and interacts with other contracts such as `IParameterInfo`, `IOracle`, `IProducer`, and `ITAT`.

---

## Constants

- **FEEDER**: `bytes32` constant used to verify that the caller has the Feeder role.
- **FOUNDATION_MANAGER**: `bytes32` constant representing the Foundation Manager role.

---

## Functions

### __ProductionDataInitialize(string memory _treasureKind, address _oracleContract, address _rolesContract, address _parameterInfoContract, address _producerContract, address _tatContract) -> void  
Initializes the ProductionData contract with the required parameters.
- `_treasureKind`: Asset type (treasure) that this contract handles.
- `_oracleContract`: Address of the Oracle contract.
- `_rolesContract`: Address of the role management contract.
- `_parameterInfoContract`: Address of the ParameterInfo contract (for platform configuration).
- `_producerContract`: Address of the Producer management contract.
- `_tatContract`: Address of the TAT contract.
- **Behavior:**  
  - Calls `__ExpenseInitialize` (inherited from Expense) and `__oracleClientInitialize`.
  - Sets the internal variable `TREASURE_KIND`.
  - Initializes interfaces for roles, parameter info, producer, and TAT.

---

### registerAssetValueRequest() -> bytes32  
Registers a request with the Oracle for the trusted asset value.
- **Returns:**  
  - `bytes32`: The Oracle request ID for pulling the asset value.
- **Behavior:**  
  - Requires that there is no pending asset value request.
  - Generates a nonce and sends an Oracle request using `_sendOracleRequest`.
  - Emits a `RegisterAssetValueRequest` event with the asset type and request ID.

---

### cancelAssetValueRequest() -> bool  
Cancels the pending Oracle request for asset value.
- **Returns:**  
  - `bool`: `true` if the cancellation was successful.
- **Behavior:**  
  - Cancels the Oracle request via `_cancelOracleRequest` and resets the stored request ID.
  - Emits a `CancleAssetValueRequest` event.

---

### getAssetValueRequestID() -> bytes32  
Retrieves the current Oracle request ID for the asset value.
- **Returns:**  
  - `bytes32`: The current asset value request ID.

---

### receiveAssetValue(bytes32 _requestId, uint256 _date, uint256 _value) -> uint256  
Receives asset value data from the Oracle (called by an account with the Feeder role).
- `_requestId`: The Oracle request ID.
- `_date`: The date (formatted as YYMMDD) for which the asset value applies.
- `_value`: The asset value provided by the Oracle.
- **Returns:**  
  - `uint256`: The asset value after processing.
- **Access Control:**  
  - Only callable by an account with the Feeder role (enforced by `onlyFeeder`).
- **Behavior:**  
  - Validates the request ID and date format.
  - If `_value` is zero, retrieves the asset value via `_getAssetValue`.
  - Otherwise, increments an internal counter.
  - Stores the asset value via `_setResourceValue`.
  - Emits a `ReceiveAssetValue` event.

---

### getAssetValue(uint256 _date) -> uint256  
Queries the asset value for a specific date.
- `_date`: The date (formatted as YYMMDD) to query.
- **Returns:**  
  - `uint256`: The asset value for the specified date.
- **Behavior:**  
  - Calls the internal function `_getAssetValue`.

---

### _getAssetValue(uint256 _date) -> uint256  
Internal function that computes the asset value for a given date.
- `_date`: The date to query.
- **Returns:**  
  - `uint256`: The computed asset value.
- **Behavior:**  
  - If a direct asset value is stored for the date, returns it.
  - Otherwise, computes an average from a set of recent asset values (using the last 10 values if available; otherwise, averages all available values).

---

### registerTrustedDataRequest(bytes32 _uniqueId) -> bytes32  
Registers a trusted production data request with the Oracle for a specific producer.
- `_uniqueId`: The unique identifier of the producer.
- **Returns:**  
  - `bytes32`: The Oracle request ID for pulling trusted production data.
- **Access Control:**  
  - Only callable by the Producer contract (enforced by `onlyProducerContract`).
- **Behavior:**  
  - Requires that no trusted data request is already pending for the producer.
  - Generates a nonce, sends an Oracle request using `_sendOracleRequest`, and stores the request ID.
  - Emits a `RegisterTrustedDataRequest` event with the asset type, producer ID, and request ID.

---

### cancelTrustedDataRequest(bytes32 _uniqueId) -> bool  
Cancels a pending trusted production data request for a given producer.
- `_uniqueId`: The unique identifier of the producer.
- **Returns:**  
  - `bool`: `true` if the cancellation was successful.
- **Access Control:**  
  - Only callable by the Producer contract.
- **Behavior:**  
  - Retrieves and deletes the stored Oracle request ID for the producer.
  - Cancels the Oracle request via `_cancelOracleRequest`.
  - Emits a `CancleTrustedDataRequest` event.

---

### getTDRequestID(bytes32 _uniqueId) -> bytes32  
Retrieves the trusted data request ID for a specific producer.
- `_uniqueId`: The unique identifier of the producer.
- **Returns:**  
  - `bytes32`: The trusted production data request ID.

---

### receiveTrustedProductionData(bytes32 _requestId, bytes32 _uniqueId, ProduceData memory _produceData) -> bytes32  
Stub function to receive trusted production data from the Oracle.
- `_requestId`: The Oracle request ID.
- `_uniqueId`: The unique identifier of the producer.
- `_produceData`: The production data received.
- **Returns:**  
  - `bytes32`: (Intended to return the producer's unique ID, though actual implementation is deferred.)
- **Access Control:**  
  - Should be callable only by an account with the Feeder role (implementation expected in a subclass).

---

### setProductionData(bytes32 _uniqueId, ProduceData memory _produceData) -> void  
Allows a producer to actively upload production data.
- `_uniqueId`: The unique identifier of the producer.
- `_produceData`: The production data submitted by the producer.
- **Access Control:**  
  - Callable only when the producer is active (enforced by `onlyWhenActive`).
- **Behavior:**  
  - (Implementation deferred; intended to process and record production data provided by the producer.)

---

### getProductionData(bytes32 _uniqueId, uint256 month) -> ProduceData  
Retrieves the production data for a specific producer and month.
- `_uniqueId`: The unique identifier of the producer.
- `month`: The month for which the production data is required.
- **Returns:**  
  - `ProduceData`: The production data for the specified producer and month.
- **Behavior:**  
  - (Implementation deferred; intended to search and return the matching production data.)

---

### clearing(bytes32 _uniqueId, uint256 _month) -> void  
Conducts the clearing process for production data, which may include verifying data and minting rewards.
- `_uniqueId`: The unique identifier of the producer.
- `_month`: The month for which the production data is being cleared.
- **Access Control:**  
  - Callable only when the producer is active (enforced by `onlyWhenActive`).
- **Behavior:**  
  - Calls internal hooks `_beforeClearing`, `_clearing`, and `_afterClearing` in sequence.
  - Emits `ClearingReward` and `ClearingPenalty` events as appropriate.
  
---

### _beforeClearing(bytes32 _uniqueId) -> IProducer.ProducerCore  
Internal function executed before clearing production data.
- `_uniqueId`: The unique identifier of the producer.
- **Returns:**  
  - `IProducer.ProducerCore`: The core details of the producer.
- **Behavior:**  
  - Checks that the caller is the producer’s owner and returns the producer details.

---

### _clearing(bytes32 _uniqueId, uint256 _month) -> bool  
Internal function that performs the main clearing logic for production data.
- `_uniqueId`: The unique identifier of the producer.
- `_month`: The production month to be cleared.
- **Returns:**  
  - `bool`: `true` if the clearing process completes successfully.
- **Note:**  
  - Implementation is deferred (must be provided by a subclass).

---

### _afterClearing(bytes32 _uniqueId, uint256 _month) -> void  
Internal hook function executed after the clearing process.
- `_uniqueId`: The unique identifier of the producer.
- `_month`: The production month for which clearing was performed.
- **Note:**  
  - Implementation is deferred (can be overridden by a subclass).

---

### _getProducer(bytes32 _uniqueId) -> IProducer.ProducerCore  
Internal utility function to retrieve producer details.
- `_uniqueId`: The unique identifier of the producer.
- **Returns:**  
  - `IProducer.ProducerCore`: The core details of the producer.
- **Behavior:**  
  - Calls the Producer contract’s `getProducer` function and reverts if the producer is not found.

---

### _reward(bytes32 uniqueId, address[] memory accounts, uint256[] memory amounts) -> uint256  
Internal function to distribute rewards by minting tokens through the TAT contract.
- `uniqueId`: The unique identifier of the producer.
- `accounts`: Array of account addresses to receive rewards.
- `amounts`: Array of reward amounts corresponding to each account.
- **Returns:**  
  - `uint256`: The total reward amount distributed.
- **Behavior:**  
  - Iterates over the provided accounts and mints rewards via the TAT contract.
  - Requires that the accounts and amounts arrays have the same length.
