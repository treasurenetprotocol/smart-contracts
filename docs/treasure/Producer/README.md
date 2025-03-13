# Producer

Core contract for managing producers. It implements functionality for:
- Adding and updating producer information.
- Managing producer status.
- Registering DApps for revenue sharing.
- Linking producers with Otter Stream.

It inherits from `Initializable`, `IProducer`, and `Share`, and uses role-based access control via the `IRoles` interface.

## Functions

### __ProducerInitialize(address _mulSigContract, address _roleContract, string memory _assetType, address _productionDataContract, string[] memory _dappNames, address[] memory _payees) -> void  
Initializes the Producer contract with the required parameters.  
- `_mulSigContract`: Multi-signature contract address.  
- `_roleContract`: Role management contract address.  
- `_assetType`: Type of asset (treasure) this producer handles.  
- `_productionDataContract`: Production data management contract address.  
- `_dappNames`: Array of DApp names to register.  
- `_payees`: Array of payee addresses corresponding to each DApp.  
- **Behavior:**  
  - Validates that the provided contract addresses and asset type are non-zero.  
  - For each DApp, verifies that the DApp name and payee are non-empty, computes a unique DApp ID, registers the DApp, and emits a `RegisterDAppConnect` event.

### addProducer(bytes32 _uniqueId, ProducerCore memory _producer) -> void  
Adds a new producer to the system.  
- `_uniqueId`: Unique identifier for the producer.  
- `_producer`: Producer details (including nickname, owner, API, sulphur, etc.).  
- **Behavior:**  
  - Calls internal hooks `_beforeAddProducer`, `_addProducer`, and `_afterAddProducer` to process the addition.  
  - Emits the `AddProducer` event upon successful addition.

### setProducerStatus(bytes32 _uniqueId, ProducerStatus _newStatus) -> void  
Updates the status of a producer.  
- `_uniqueId`: Unique identifier for the producer.  
- `_newStatus`: New status for the producer (must not be `NotSet`).  
- **Access Control:** Only callable by an account with the Foundation Manager role.  
- **Behavior:**  
  - If setting the status to Active and no trusted data request exists, it registers a trusted data request via the production data contract.  
  - If setting the status to Deactive and a trusted data request exists, it cancels the trusted data request.  
  - Updates the producer status and emits the `SetProducerStatus` event with the relevant Oracle request ID if applicable.

### updateProdcuer(bytes32 _uniqueId, ProducerCore memory _producer) -> void  
Updates the details of an existing producer.  
- `_uniqueId`: Unique identifier for the producer.  
- `_producer`: Updated producer details.  
- **Access Control:**  
  - Only the current owner of the producer can update its details.  
- **Restrictions:**  
  - The producer owner cannot be changed.  
- **Behavior:**  
  - Retrieves the current producer details and ensures the owner remains the same.  
  - Updates the producer information, resets the status to `NotSet`, and emits the `UpdateProducer` event with both the old and new producer details.

### producerStatus(bytes32 _uniqueId) -> ProducerStatus  
Retrieves the status of a producer.  
- `_uniqueId`: Unique identifier for the producer.  
- **Returns:**  
  - `ProducerStatus`: Current status of the producer.

### getProducer(bytes32 _uniqueId) -> (ProducerStatus, ProducerCore memory)  
Retrieves both the status and the core details of a producer.  
- `_uniqueId`: Unique identifier for the producer.  
- **Returns:**  
  - `ProducerStatus`: Status of the producer.  
  - `ProducerCore`: Producer information.  
- **Note:**  
  - If the producer status is `NotSet`, an empty producer structure is returned.

### registerDAppConnect(string memory dapp, address payee) -> bytes32  
Registers a new DApp connection.  
- `dapp`: Name of the DApp.  
- `payee`: Payee address for the DApp.  
- **Returns:**  
  - `bytes32`: Unique identifier (DApp ID) generated for the DApp.  
- **Access Control:**  
  - Must be called by the multi-signature contract (as enforced by the `onlyMulSig` modifier).  
- **Behavior:**  
  - Validates that the DApp name and payee are not empty, computes a unique DApp ID, ensures the DApp isn’t already registered, stores the DApp information, and emits a `RegisterDAppConnect` event.

### getDAppPayee(bytes32 _dappId) -> address  
Retrieves the payee address associated with a given DApp ID.  
- `_dappId`: Unique identifier for the DApp.  
- **Returns:**  
  - `address`: Payee address for the specified DApp.  
- **Behavior:**  
  - Reverts if no DApp is registered with the provided DApp ID.

### link(bytes32[] memory _uniqueIds, bytes32 _key, bytes32 _dappId) -> void  
Links producers with a DApp for Otter Stream integration.  
- `_uniqueIds`: Array of producer unique IDs to be linked.  
- `_key`: Verification code for the linking process.  
- `_dappId`: Unique identifier for the DApp.  
- **Behavior:**  
  - Requires at least one producer unique ID and verifies that the specified DApp is registered.  
  - For each producer, ensures that the producer is active and that the DApp’s payee is among the producer's holders.  
  - Collects holder ratios and producer nicknames, then emits a `Link` event (the event definition is assumed to be provided elsewhere).

## Events

### AddProducer(bytes32 uniqueId, ProducerCore producer)
Emitted when a new producer is added.
- `uniqueId`: Unique identifier for the producer.
- `producer`: The producer's details.

### SetProducerStatus(bytes32 uniqueId, bytes32 requestId, ProducerStatus status)
Emitted when a producer's status is updated.
- `uniqueId`: Unique identifier for the producer.
- `requestId`: Oracle request ID for the trusted data request (if applicable).
- `status`: The new status of the producer.

### UpdateProducer(bytes32 uniqueId, ProducerCore _old, ProducerCore _new)
Emitted when a producer's information is updated.
- `uniqueId`: Unique identifier for the produ
