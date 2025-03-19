# NoExpense

Manages expense-related functionality without implementing actual deposit, withdrawal, or penalty logic. This abstract contract serves as a stub implementation.

## Enums

### Action
Defines the type of expense action.
- `NotSet`: No action is set.
- `Deposite`: A deposit action.
- `Withdraw`: A withdrawal action.
- `Penalty`: A penalty action.

### Status
Represents the status of a depositor.
- `NotSet`: No status has been set.
- `Normal`: The depositor is in normal status.
- `Abnormal`: The depositor is in abnormal status.

## Structs

### Depositor
Holds information about a depositor.
- `uint256 margin`: The current margin (or deposit balance) of the depositor.
- `address debtor`: The address that is considered the debtor if in abnormal status.
- `Status status`: The current status of the depositor.

## Events

### ExpenseHistory(uint256 time, address operator, Action _type, string content, uint256 tokens)
Emitted when an expense-related action occurs (deposit, withdrawal, or penalty).
- `time`: The timestamp when the event is emitted.
- `operator`: The address of the operator performing the action.
- `_type`: The type of action (Deposite, Withdraw, or Penalty).
- `content`: A descriptive string for the action.
- `tokens`: The number of tokens involved in the action.

## Functions

### _isDepositor(address _account) -> bool
Checks whether the given address is registered as a depositor.
- `_account`: The address to check.
- **Returns:**  
  - `bool`: `true` if the depositor's status is not `NotSet`; otherwise, `false`.

### prepay() -> bool
Allows a user to prepay (deposit) funds into the contract.
- **Payable:** Accepts Ether.
- **Returns:**  
  - `bool`: Returns `true` (stub implementation).

### withdraw(uint256 amount) -> bool
Allows a user to withdraw funds from the contract.
- `amount`: The amount of Ether to withdraw.
- **Payable:** Accepts Ether along with the call.
- **Returns:**  
  - `bool`: Returns `true` (stub implementation).

### _penalty(address account, uint256 value, uint256 percent) -> uint256
Calculates and applies a penalty for a given account.
- `account`: The address of the depositor.
- `value`: The reference value for penalty calculation.
- `percent`: The penalty percentage.
- **Returns:**  
  - `uint256`: Returns `0` (stub implementation).

### marginOf(address _account) -> (uint256, Status)
Retrieves the margin and status of a depositor.
- `_account`: The address of the depositor.
- **Returns:**  
  - `uint256`: The margin (deposit balance) of the depositor (always returns `0` in this implementation).
  - `Status`: The status of the depositor (always returns `Normal` in this implementation).
