# Roles

## Functions

### initialize(address _mulSigContract,address[] memory managers,address[] memory auctionManagers,address[] memory feeders)

Initializes the Roles contract.

- `_mulSigContract`: Multi-signature contract address
- `managers`: Array of foundation manager addresses
- `auctionManagers`: Array of auction manager addresses
- `feeders`: Array of feeder addresses
- `crosschainSenders`：Array of accounts for the `CROSSCHAIN_SENDER` role

### CROSSCHAIN_SENDER() -> bytes32

Returns the identifier for the CROSSCHAIN_SENDER role.

- `bytes32`: Role identifier for CROSSCHAIN_SENDER.



### getRoleMemberCount(bytes32 role) -> uint256

Returns the number of accounts that have a specific role.

- `role`: The role identifier.

- `uint256`: The count of accounts holding the role.



### getRoleMember(bytes32 role, uint256 index) -> address

Returns the account address that holds a specific role at a given index.

- `role`: The role identifier.
- `index`: The index in the list of accounts with the role.

- `address`: The account address.