# Share

Share is the contract for profit distribution. It manages the allocation and transfer of profit-sharing (or “holding”) percentages among producers and their shareholders. This contract defines limits on the number of shareholders and the total share ratio, and implements functions to set, update, transfer, and delete share allocations as well as to calculate earnings for distribution.

---

## Constants

- **MAX_HOLDERS**: `uint256` constant equal to 9  
  The maximum number of shareholders _excluding_ the producer (owner).  
  *Note:* The total number of shareholders including the producer is `MAX_HOLDERS + 1`.

- **MAX_PIECES**: `uint256` constant equal to 100  
  Represents the total share ratio; all holder shares must sum up to at most 100 pieces.

---

## Structs

### Holder
_Holder_ stores information about a shareholder’s allocation.
- **ratio**: `uint256`  
  The share ratio allocated to the holder (in pieces, where 100 pieces represent 100%).
- **flag**: `Flag`  
  An enumeration indicating whether the account is currently a holder.  
  (Typically, `Flag.Holder` indicates an active holder and `Flag.NotHolder` indicates otherwise.)
- **index**: `uint256`  
  The index position of the holder's address in the internal holder addresses array for a given producer.

*Note:* The `Holder` struct is defined in the associated interface (`IShare`) and is used to record the share allocation of each account associated with a producer’s unique ID.

---

## Functions

### maxShares() -> uint256
Returns the maximum number of shareholders, including the producer (owner).
- **Returns:**  
  - `uint256`: Maximum shareholders count, calculated as `MAX_HOLDERS + 1`.

---

### totalHolders(bytes32 _uniqueId) -> uint256
Retrieves the current number of shareholders (excluding the producer owner) for a given producer.
- `_uniqueId`: The unique ID of the producer.
- **Returns:**  
  - `uint256`: The number of shareholders registered for the producer.

---

### totalShared(bytes32 _uniqueId) -> uint256
Retrieves the total share ratio that has been allocated to all shareholders for a given producer.
- `_uniqueId`: The unique ID of the producer.
- **Returns:**  
  - `uint256`: The sum of share ratios allocated to all shareholders (must not exceed `MAX_PIECES`).

---

### isProducerOwner(bytes32 _uniqueId, address _producer) -> bool
Checks whether a given account is the owner of the producer (i.e. the share owner).
- `_uniqueId`: The unique ID of the producer.
- `_producer`: The account address to verify.
- **Returns:**  
  - `bool`: `true` if the specified account is the producer’s owner; otherwise, `false`.

---

### isHolder(bytes32 _uniqueId, address _holder) -> bool
Checks whether a given account is registered as a shareholder for the specified producer.
- `_uniqueId`: The unique ID of the producer.
- `_holder`: The account address to check.
- **Returns:**  
  - `bool`: `true` if the account is a shareholder; otherwise, `false`.

---

### holder(bytes32 _uniqueId, address _holder) -> Holder
Retrieves the share information for a given holder associated with a producer.
- `_uniqueId`: The unique ID of the producer.
- `_holder`: The account address of the holder.
- **Returns:**  
  - `Holder`: The holder’s share details (ratio, flag, and index).

---

### setHolders(bytes32 _uniqueId, address[] memory _holderAddrs, uint256[] memory _ratios) -> void
Sets the shareholders and their corresponding share ratios for a producer.
- `_uniqueId`: The unique ID of the producer.
- `_holderAddrs`: An array of account addresses to be set as shareholders.
- `_ratios`: An array of share ratios (in pieces) corresponding to each holder.
- **Access Control:**  
  - Can only be called by the producer owner (enforced by the `onlyProducerOwner` modifier).
- **Behavior:**  
  - Validates that the length of addresses and ratios arrays are equal.
  - For each holder, calls the internal `_setHolder` function to update share allocation.

---

### splitHolder(bytes32 _uniqueId, address _toHolder, uint256 _ratio) -> (uint256, uint256)
Transfers (splits) a specified portion of share ratio from the caller to another account.
- `_uniqueId`: The unique ID of the producer.
- `_toHolder`: The recipient account address.
- `_ratio`: The number of share pieces to transfer.
- **Returns:**  
  - `(uint256, uint256)`: A tuple containing the sender’s updated share ratio and the recipient’s updated share ratio.
- **Behavior:**  
  - Ensures the recipient address is valid and that the sender has sufficient share ratio.
  - If the recipient is not already a shareholder, adds them to the shareholders list.
  - Emits a `SplitHolder` event upon successful transfer.

---

### deleteHolder(bytes32 _uniqueId, address _holder) -> void
Deletes a shareholder from the producer’s share allocation.
- `_uniqueId`: The unique ID of the producer.
- `_holder`: The account address of the shareholder to delete.
- **Access Control:**  
  - Can only be called by the producer owner.
- **Restrictions:**  
  - The holder’s share ratio must be zero.
- **Behavior:**  
  - Removes the holder’s address from the internal array and deletes the corresponding share record.
  - Decrements the total holder count.
  - Emits a `DeleteHolder` event upon successful deletion.

---

### calculateRewards(bytes32 _uniqueId, uint256 total) -> (address[] memory, uint256[] memory)
Calculates the reward distribution for a producer’s shareholders based on a total earnings amount.
- `_uniqueId`: The unique ID of the producer.
- `total`: The total earnings amount to be distributed.
- **Returns:**  
  - `address[]`: An array of account addresses of all shareholders, including the producer owner.
  - `uint256[]`: An array of reward amounts corresponding to each account.
- **Behavior:**  
  - Iterates over all registered shareholders and computes each share’s reward proportionally to their allocated ratio.
  - The producer (owner) receives the remainder of the total after distributing shares to all other holders.
  
---

## Events

### SetHolder(bytes32 _uniqueId, address _holder, uint256 _ratio, uint256 totalHolders, uint256 totalShared)
Emitted when a shareholder is set or updated.
- `_uniqueId`: The unique ID of the producer.
- `_holder`: The account address of the shareholder.
- `_ratio`: The share ratio assigned to the shareholder.
- `totalHolders`: The updated total number of shareholders for the producer.
- `totalShared`: The updated total share ratio allocated to shareholders.

### SplitHolder(bytes32 _uniqueId, address from, address to, uint256 _ratio)
Emitted when a portion of shares is transferred from one account to another.
- `_uniqueId`: The unique ID of the producer.
- `from`: The sender’s account address.
- `to`: The recipient’s account address.
- `_ratio`: The number of share pieces transferred.

### DeleteHolder(bytes32 _uniqueId, address _holder)
Emitted when a shareholder is removed from the producer’s share allocation.
- `_uniqueId`: The unique ID of the producer.
- `_holder`: The account address of the deleted shareholder.
