# IGovernorUpgradeable

## Functions

### name() -> string

Name of the governor instance (used in building the ERC712 domain separator).

- `string`: Name of the governor instance

### version() -> string

Gets the version of the governor instance.

- `string`: Version of the governor instance

### COUNTING_MODE() -> string

Describes the possible `support` values for `castVote` and the way these votes are counted.

- `string`: URL-encoded sequence of key-value pairs describing vote options and interpretation

### hashProposal(address\[\] memory targets,bytes\[\] memory calldatas,bytes32 descriptionHash) -> uint256

Hashing function used to (re)build the proposal id from the proposal details.

- `targets`: Array of target contract addresses
- `calldatas`: Array of contract call data
- `descriptionHash`: Hash of the proposal description

- `uint256`: ID of the proposal

### state(uint256 proposalId) -> ProposalState

Gets the current state of a proposal.

- `proposalId`: ID of the proposal

- `ProposalState`: Current state of the proposal

### proposalSnapshot(uint256 proposalId) -> uint256

Gets the block number used to retrieve user's votes and quorum.

- `proposalId`: ID of the proposal

- `uint256`: Block number

### proposalDeadline(uint256 proposalId) -> uint256

Block number at which votes close.

> \[!TIP\]   
> Votes close at the end of this block, so it is possible to cast a vote during this block.

- `proposalId`: ID of the proposal

- `uint256`: Block number

### updateDelay(uint256 newDelay)

Updates the proposal voting delay.

- `newDelay`: New voting delay value

### votingDelay() -> uint256

Gets the current proposal voting delay.

- `uint256`: Current voting delay value

### votingPeriod() -> uint256

Delay, in number of blocks, between the vote start and vote ends.

> \[!WARNING\]   
> The {votingDelay} can delay the start of the vote. 
> This must be considered when setting the voting duration compared to the voting delay.

- `uint256`: Current voting period value

### quorum(uint256 blockNumber) -> uint256

Minimum number of cast voted required for a proposal to be successful.

> \[!WARNING\]   
> The `blockNumber` parameter corresponds to the snapshot used for counting vote.
> This allows to scale the quorum depending on values such as the totalSupply of a token at this block (see {ERC20Votes}).

- `blockNumber`: Block number for the snapshot

- `uint256`: Quorum value

### hasVoted(uint256 proposalId,address account) -> bool

Checks if a voter has voted on a proposal.

- `proposalId`: ID of the proposal
- `account`: Voter's account address

- `bool`: `true` if the voter has voted, `false` otherwise

### propose(address\[\] memory targets,bytes\[\] memory calldatas,string memory description) -> uint256

Creates a new proposal.

- `targets`: Array of target contract addresses
- `calldatas`: Array of contract call data
- `description`: Description of the proposal

- `uint256`: ID of the proposal

### queue(address\[\] memory targets,bytes\[\] memory calldatas,bytes32 descriptionHash) -> uint256

Moves a successful proposal to the queued state.

- `targets`: Array of target contract addresses
- `calldatas`: Array of contract call data
- `descriptionHash`: Hash of the proposal description

- `uint256`: ID of the proposal

### manualExecuted(uint256 proposalId) -> uint256

Manually executes a proposal.

- `proposalId`: ID of the proposal

- `uint256`: ID of the proposal

### execute(address\[\] memory targets,bytes\[\] memory calldatas,bytes32 descriptionHash) -> uint256

Executes a successful proposal.

> \[!TIP\]   
> Some module can modify the requirements for execution, for example by adding an additional timelock.

- `targets`: Array of target contract addresses
- `calldatas`: Array of contract call data
- `descriptionHash`: Hash of the proposal description

- `uint256`: ID of the proposal

### castVote(uint256 proposalId,uint8 support) -> uint256

Casts a vote for a proposal.

- `proposalId`: ID of the proposal
- `support`: Support type (Against, For, Abstain)

- `uint256`: Voting balance

### withdraw(uint256 proposalId) -> uint256

Withdraws the voting tokens after the proposal is finalized.

- `proposalId`: ID of the proposal

- `uint256`: Withdrawn balance

## Enums

### ProposalState

- `Pending`: Proposal is pending
- `Active`: Proposal is active
- `Canceled`: Proposal is canceled
- `Defeated`: Proposal is defeated
- `Succeeded`: Proposal is succeeded
- `Queued`: Proposal is queued
- `Expired`: Proposal is expired
- `Executed`: Proposal is executed
- `ManualExecuted`:Proposal is queued

## Events

### ProposalCreated(uint256 proposalId,address proposer,address\[\] targets,bytes\[\] calldatas,uint256 startBlock,uint256 endBlock,string description);

Emitted when a proposal is created.

- `proposalId`: ID of the proposal
- `proposer`: Address of the proposer
- `targets`: Array of target contract addresses
- `calldatas`: Array of contract call data
- `startBlock`: Start block of the proposal
- `endBlock`: End block of the proposal
- `description`: Description of the proposal

### ProposalQueued(uint256 proposalId, uint256 eta);

Emitted when a proposal is queued.

- `proposalId`: ID of the proposal
- `eta`: Estimated time of execution

### ProposalCanceled(uint256 proposalId);

Emitted when a proposal is canceled.

- `proposalId`: ID of the canceled proposal

### ProposalExecuted(uint256 proposalId);

Emitted when a proposal is executed.

- `proposalId`: ID of the executed proposal

### ProposalManualExecuted(uint256 proposalId);

Emitted when a proposal is manually executed.

- `proposalId`: ID of the manually executed proposal

### VoteCast(address indexed voter,uint256 proposalId,uint8 support,uint256 weight);

Emitted when a vote is cast without params.

> \[!WARNING\]   
> `support` values should be seen as buckets.  
> Their interpretation depends on the voting module used.

- `voter`: Address of the voter
- `proposalId`: ID of the proposal
- `support`: Support type (Against, For, Abstain)
- `weight`: Weight of the vote

### Withdrawed(uint256 proposalId, address voter, uint256 amount);

Emitted when a voter withdraws their tokens.

- `proposalId`: ID of the proposal
- `voter`: Address of the voter
- `amount`: Amount of tokens withdrawn