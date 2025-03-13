# Mulsig

## Functions

### initialize(address \_daoContract,address \_governanceContract,address \_roleContract,address \_parameterInfoContract,address \_crosschainTokensContract,uint256 \_confirmation)

Initializes the MulSig contract.

- `_daoContract`: DAO contract address
- `_governanceContract`: Governance contract address
- `_roleContract`: Roles contract address
- `_parameterInfoContract`: ParameterInfo contract address
- `_confirmation`: Confirmation duration in minutes

### proposeToManagePermission(string memory \_name, address \_account) -> bool

Propose to manage permissions for a user.

- `_name`: Operation type(FMD,FMA,FEEDERD,FEEDERA)
- `_account`: Account address
- `bool`: Whether the proposal was successfully initiated

### proposeToAddResource(string memory \_name,address \_producer,address \_productionData) -> bool

Propose to add a new treasure asset.

- `_name`: Asset name
- `_producer`: Producer contract address
- `_productionData`: Production data contract address
- `bool`: Whether the proposal was successfully initiated

### proposeToRegisterDApp(string memory \_treasure,string memory \_dapp,address \_payee) -> bool

Propose to register a new DApp.

- `_treasure`: Treasure name
- `_dapp`: DApp name
- `_payee`: DApp payee address
- `bool`: Whether the proposal was successfully initiated

### proposeToSetPlatformConfig(string memory \_name, uint256 \_value) -> bool

Propose to modify platform configuration.

- `_name`: Configuration key
- `_value`: Configuration value

- `bool`: Whether the proposal was successfully initiated

### proposeToSetDiscountConfig(uint256 b1,uint256 b2,uint256 b3,uint256 b4,uint256 b5,uint256 b6) -> bool

Propose to modify discount information.

- `b1`: API data
- `b2`: sulphur acidity data
- `b3`: discount[0]
- `b4`: discount[1]
- `b5`: discount[2]
- `b6`: discount[3]

- `bool`: Whether the proposal was successfully initiated

### getPendingProposals() -> uint256\[\]

Get the list of pending proposals.

- `uint256[]`: List of pending proposal IDs

### signTransaction(uint256 \_proposalId) -> bool

Sign a proposal as a Foundation Manager.

- `_proposalId`: Proposal ID

- `bool`: Whether the request was successful

### excuteProposal(uint256 \_proposalId) -> bool

Execute a proposal that has received enough signatures.

- `_proposalId`: Proposal ID

- `bool`: Whether the request was successful

### transactionDetails(uint256 \_proposalId) -> ProposalResponse

Get detailed information about a proposal based on its ID.

- `_proposalId`: Unique identifier for the proposal

- `ProposalResponse`: Detailed information about the proposal

### deleteProposals(uint256 \_proposalId)

Delete a proposal.

- `_proposalId`: Proposal ID

### proposeToSetCrosschainToken(string memory token, address sourceERC20address, address sourceCrosschainAddress, uint256 sourcechainid, address targetERC20address, address targetCrosschainAddress, uint256 targetchainid, uint256 fee, uint256 chainId) -> bool

Proposes to set a new crosschain token configuration.

- `token`: Name of the crosschain token.
- `sourceERC20address`: Address of the source chain ERC20 token contract.
- `sourceCrosschainAddress`: Crosschain address on the source chain.
- `sourcechainid`: Source chain identifier.
- `targetERC20address`: Address of the target chain ERC20 token contract.
- `targetCrosschainAddress`: Crosschain address on the target chain.
- `targetchainid`: Target chain identifier.
- `fee`: Fee amount associated with the crosschain token.
- `chainId`: Identifier for the chain on which the token is set.
- `Returns`: `bool` indicating whether the proposal was successfully initiated.
### getSignatureCount(uint256 _proposalId) -> uint8

Returns the number of signatures that have been collected for a specific proposal.

- `_proposalId`: The unique identifier of the proposal.
- `Returns`: `uint8` count of signatures.
### hasAlreadySigned(uint256 _proposalId, address _signer) -> bool

Checks if the specified address has already signed the given proposal.

- `_proposalId`: The unique identifier of the proposal.
- `_signer`: The address to check.
- `Returns`: `bool` — `true` if the address has already signed, `false` otherwise.

## Structs

### proposal

- `address proposer`: Address of the proposer
- `string name`: Name or type of the proposal
- `address _add`: Address to add
- `uint256 value`: Value for platform configuration
- `IParameterInfo.PriceDiscountConfig data`: For discount configuration
- `uint256 _type`: Type of the proposal (1: adminPermission, 2: addResource, 3: dataConfig, 4: discountConfig, 5: registerDApp)
- `uint8 signatureCount`: Count of received signatures
- `uint256 excuteTime`: Time at which the proposal can be executed
- `address producer`: Address of the producer contract
- `address productionData`: Address of the production data contract
- `mapping(address => uint8) signatures`: Mapping of signers to signature status
- `string treasureKind`: Kind of treasure to register
- `address payee`: Payee address for DApp registration

### ProposalResponse

- `string name`: Name of the proposal
- `address _add`: Address to add
- `uint256 a1`: API data
- `uint256 a2`: sulphur acidity data
- `uint256 a3`: discount[0]
- `uint256 a4`: discount[1]
- `uint256 a5`: discount[2]
- `uint256 a6`: discount[3]
- `uint256 executeTime`: Time at which the proposal can be executed

## Events

### ManagePermission(uint256 proposalId, address proposer, string name, address \_add);

Emitted when a new proposal is initiated to manage permissions.

- `proposalId`: Proposal ID
- `proposer`: Address of the proposer
- `name`: Type of operation
- `_add`: Account address

### AddResource(uint256 proposalId, address proposer, string name, address producerContract, address productionContract);

Emitted when a new proposal is initiated to add a treasure asset.

- `proposalId`: Proposal ID
- `proposer`: Address of the proposer
- `name`: Asset name
- `_producer`: Producer contract address
- `_productionData`: Production data contract address

### RegisterDApp(uint256 proposalId, address proposer, string treasure, string dapp, address payee);

Emitted when a new proposal is initiated to register a DApp.

- `proposalId`: Proposal ID
- `proposer`: Address of the proposer
- `treasure`: Treasure name
- `dapp`: DApp name
- `payee`: DApp payee address

### SetPlatformConfig(uint256 proposalId, address proposer, string name, uint256 \_value);

Emitted when a new proposal is initiated to modify the platform configuration.

- `proposalId`: Proposal ID
- `proposer`: Address of the proposer
- `name`: Configuration key
- `_value`: Configuration value

### SetDiscountConfig(uint256 proposalId, address proposer, IParameterInfo.PriceDiscountConfig config);

Emitted when a new proposal is initiated to modify discount information.

- `proposalId`: Proposal ID
- `proposer`: Address of the proposer
- `config`: `IParameterInfo.PriceDiscountConfig` discount configuratio

### ProposalSigned(uint256 proposalId, address signer);

Emitted when a Foundation Manager signs a proposal.

- `proposalId`: Proposal ID
- `signer`: Address of the signer

### ProposalExecuted(uint256 proposalId);

Emitted when a proposal is executed.

- `proposalId`: Proposal ID

### SetCrosschainTokenProposed(uint256 proposalId, address proposer, string token)

Emitted when a proposal to set a crosschain token configuration is initiated.

- `proposalId`: Proposal ID.
- `proposer`: Address of the proposer.
- `token`: Name of the crosschain token.