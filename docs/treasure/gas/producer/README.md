# GasProducer

## Functions

### initialize(address _mulSigContract, address _roleContract, string memory _treasureKind, address _productionDataContract, string[] memory _dappNames, address[] memory _payees) -> void  
Initializes the GasProducer contract with the required parameters.  
- `_mulSigContract`: Address of the multi-signature contract.  
- `_roleContract`: Address of the roles contract.  
- `_treasureKind`: The type of treasure this producer handles.  
- `_productionDataContract`: Address of the production data contract.  
- `_dappNames`: Array of names of dapps.  
- `_payees`: Array of payee addresses.

### addProducer(bytes32 _uniqueId, ProducerCore _producer)

Adds a new producer to the blockchain

- `_uniqueId`: The unique identifier for the producer
- `_producer`: The producer object containing the producer's details

### setProducerStatus(bytes32 _uniqueId, ProducerStatus _newStatus)

Sets the status of a producer
> [!WARNING]  
> only **Foundation Manager** can send this request.

- `_uniqueId`: The unique identifier for the producer
- `_newStatus`: The new status of the producer

### updateProdcuer(bytes32 _uniqueId, ProducerCore _producer)

Updates the details of a producer
> [!WARNING]  
> only **Producer's owner** can send this request.
> Cannot change producer owner

- `_uniqueId`: The unique identifier for the producer
- `_producer`: The producer object containing the producer's details

### producerStatus(bytes32 _uniqueId) -> ProducerStatus

Returns the status of a producer

- `_uniqueId`: The unique identifier for the producer
- `ProducerStatus`: The status of the producer

### getProducer(bytes32 _uniqueId) -> (ProducerStatus, ProducerCore)

Returns the details of a producer
> [!WARNING]
> If the Producer's status is NotSet then all return values will be empty.

- `_uniqueId`: The unique identifier for the producer
- `ProducerStatus`: The status of the producer
- `ProducerCore`: The producer object containing the producer's details

## Structs

### ProducerCore

- `string nickname` : The nickname of the producer
- `address owner`: The owner of the producer
- `uint256 API`: The API of the producer(only For Oil)
- `uint256 sulphur`: The sulphur of the producer(only For Oil)
- `string account;`: The account of the producer(only For EthMinting and BtcMinting)

## Enums

### ProducerStatus

- `NotSet`: The producer has not been set
- `Active`: The producer is active
- `Deactive`: The producer is deactive


## Events

### AddProducer(bytes32 uniqueId, ProducerCore producer);
Emitted when a new producer is added
- `uniqueId`: The unique identifier for the producer
- `producer`: The producer object containing the producer's details

### SetProducerStatus(bytes32 uniqueId, ProducerStatus status);
Emitted when the status of a producer is changed
- `uniqueId`: The unique identifier for the producer
- `status`: The new status of the producer

