# BtcData

## Functions
### initialize(string memory _treasureKind, address _oracleContract, address _rolesContract, address _parameterInfoContract, address _producerContract, address _tatContract)

Initializes the BtcData contract with the required parameters.

- `_treasureKind`: The type of treasure this contract handles.
- `_oracleContract`: Address of the Oracle contract.
- `_rolesContract`: Address of the Roles contract.
- `_parameterInfoContract`: Address of the Parameter Info contract.
- `_producerContract`: Address of the Producer contract.
- `_tatContract`: Address of the TAT contract.

### setProductionData(bytes32 \_uniqueId,ProduceData \_produceData)  -> \_uniqueId
Sets the production data for a given uniqueId.
> \[!WARNING\]   
> The Producer must be in Active state  
> Only the owner of the Producer can send the transaction  

- `_uniqueId`: The unique identifier for the producer
- `_produceData`: The production data for the producer

### getProductionData(bytes32 \_uniqueId,uint256 month) -> ProduceData
Gets the production data for a given uniqueId and month.

- `_uniqueId`: The unique identifier for the producer
- `month`: The month for which the production data is required
- `ProduceData`: The production data for the producer

### registerAssetValueRequest() -> bytes32
Registers a request for asset value.
- `_requestId`: The unique identifier for this kind of treasure


### receiveAssetValue(bytes32 \_requestId,uint256 \_date,uint256 \_value) -> uint256

Receives the asset value for a given request id.
> \[!WARNING\]  
> Only Feeder can send the transaction  

> \[!TIP\]  
> `_requestId` can get it from the listening of `RegisterAssetValueRequest` event  

- `_requestId`: The unique identifier for this kind of treasure
- `_date`: The date for which the asset value is required
- `_value`: The asset value

### getAssetValue(uint256 \_date) -> uint256
Gets the asset value for a given date.
- `_date`: The date for which the asset value is required
- `uint256`: The asset value

### receiveTrustedProductionData(bytes32 \_requestId,bytes32 \_uniqueId,ProduceData memory \_produceData) -> bytes32
Receives the **trusted** production data for a given request id.
> [!WARNING]  
> The Producer must be in Active state  
> Only Feeder can send the transaction  

- `_requestId`: The unique identifier for this kind of treasure
- `_uniqueId`: The unique identifier for the producer
- `_produceData`: The production data for the producer
- `bytes32`: The unique identifier for the producer

### clearing(bytes32 \_uniqueId, uint256 \_month) ->  \_uniqueId
Clears the production data for a given uniqueId and month.
>\[!WARNING\]  
> The Producer must be in Active state  
> only **Producer's owner** can send this request.  

- `_uniqueId`: The unique identifier for the producer
- `_month`: The month for which the production data is cleared
- `_uniqueId`: The unique identifier for the producer

## Structs

>\[!TIP\]  
> The month field is stored in uint256.  
> For example, May 2023 is recorded as 202305 (YYYYMM)  
> date field, stored in uint256  
> For example, May 10, 2023 is recorded as 20230510 (YYYYMM)  

### ProduceData

- `bytes32 uniqueId`: The producer uniqueid
- `uint256 counterId`: The counter id
- `address account`: The producer account
- `uint256 amount`: The amount this date
- `uint256 price`: The price this date
- `uint256 date`: The date
- `uint256 month`: The month
- `string miner`: The miner(only For BtcMinting and EthMinting)
- `uint256 blockNumber`: The block number(only For BtcMinting and EthMinting)
- `uint256 blockReward`: The block reward(only For BtcMinting and EthMinting)
- `ProduceDataStatus status`: The status of the production data

### AssetValue

- `uint256 Date`: The date
- `uint256 Value`: The asset value
- `uint256 Timestamp`: The timestamp

## Enums

### ProduceDataStatus
- `UNAUDITED`: The production data is not audited
- `FINISHED`: The production data is audited
- `FAILED`: The production data is failed

## Events

### ProducerProductionData(string treasureKind, bytes32 uniqueId, uint256 month, uint256 date, uint256 amount, uint256 price);
Emitted when the production data is recorded.
- `treasureKind`: The kind of treasure
- `uniqueId`: The unique identifier for the producer
- `month`: The month for which the production data is recorded
- `date`: The date
- `amount`: The amount this date
- `price`: The price this date

### TrustedProductionData(string treasureKind, bytes32 uniqueId, uint256 month, uint256 amount);
Emitted when the production data is trusted.
- `treasureKind`: The kind of treasure
- `uniqueId`: The unique identifier for the producer
- `month`: The month for which the production data is trusted
- `amount`: The amount this date

### ClearingReward(string treausreKind, bytes32 \_uniqueId, uint256 \_month, uint256 rewardAmount);
Emitted when the clearing reward is received.
- `treausreKind`: The kind of treasure
- `_uniqueId`: The unique identifier for the producer
- `_month`: The month for which the production data is cleared
- `rewardAmount`: The clearing reward

### ClearingPenalty(string treausreKind, bytes32 \_uniqueId, uint256 \_month, uint256 penaltyAmount, uint256 percent);
Emitted when the clearing penalty is received.
- `treausreKind`: The kind of treasure
- `_uniqueId`: The unique identifier for the producer
- `_month`: The month for which the production data is cleared
- `penaltyAmount`: The clearing penalty
- `percent`: The clearing penalty percent

### RegisterTrustedDataRequest(string kind, bytes32 uniqueId, bytes32 requestid);
Emitted when the trusted data request is registered.
- `kind`: The kind of treasure
- `uniqueId`: The unique identifier for the producer
- `requestid`: The unique identifier for this kind of treasure

### ReceiveAssetValue(string treasureKind, uint256 date, uint256 value);
Emitted when the asset value is received.
- `treasureKind`: The kind of treasure
- `date`: The date
- `value`: The asset value

### VerifiedProduction(bytes32 \_uniqueId, uint256 month, uint256 amount);
Emitted when the production data is verified.
- `_uniqueId`: The unique identifier for the producer
- `month`: The month for which the production data is verified
- `amount`: The amount this date