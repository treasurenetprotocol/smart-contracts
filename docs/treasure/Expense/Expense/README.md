# Expense

Manages expenses and deposits, including actions such as deposits, withdrawals, and penalties.

## Enums

### Action
Defines the type of expense action.
- `NotSet`: No action has been set.
- `Deposite`: Deposit action.
- `Withdraw`: Withdrawal action.
- `Penalty`: Penalty action.

### Status
Represents the status of a depositor.
- `NotSet`: No status has been set.
- `Normal`: The depositor is in normal status.
- `Abnormal`: The depositor is in abnormal status (e.g. has incurred a penalty).

## Structs

### Depositor
Holds information about a depositor.
- `uint256 margin`: The current margin (balance) of the depositor.
- `address debtor`: If in abnormal status, the address that is considered the debtor.
- `Status status`: The status of the depositor (Normal or Abnormal).

## Events

### ExpenseHistory(uint256 time, address operator, Action _type, string content, uint256 tokens);
Emitted whenever an expense-related action occurs (deposit, withdrawal, or penalty).
- `time`: The timestamp when the event was emitted.
- `operator`: The address performing the operation.
- `_type`: The type of action (Deposite, Withdraw, or Penalty).
- `content`: A text description of the operation.
- `tokens`: The amount of tokens involved in the operation.

## Functions

### __ExpenseInitialize(address _parameterInfoContract) -> void
Initializes the Expense contract.
- `_parameterInfoContract`: The address of the ParameterInfo contract used for configuration.

### _isDepositor(address _account) -> bool
Checks if a given address is already registered as a depositor.
- `_account`: The address to check.
- **Returns:**  
  - `bool`: `true` if the depositor's status is not `NotSet`; otherwise, `false`.

### prepay() -> bool
Allows a user to deposit funds into the contract as a prepayment.
- **Payable:** The function accepts Ether.
- **Returns:**  
  - `bool`: `true` if the deposit operation is successful.
- **Behavior:**  
  - If the caller is not yet a depositor (status `NotSet`), it registers them and sets their status to `Normal` with the deposited margin.
  - If already in `Normal` status, it adds the deposited amount to the existing margin.
  - If in `Abnormal` status, it attempts to cover the debt; any excess or shortage is handled accordingly and transfers are made to the debtor.

### withdraw(uint256 amount) -> bool
Allows a depositor in Normal status to withdraw a specified amount of Ether from their deposited margin.
- `amount`: The amount to withdraw.
- **Modifier:**  
  - `onlyDepositorNormal(msg.sender)`: Only a depositor with Normal status can call this function.
- **Returns:**  
  - `bool`: `true` if the withdrawal is successful.
- **Behavior:**  
  - Deducts the withdrawal amount from the depositor's margin and transfers the amount to the caller.

### _penalty(address account, uint256 value, uint256 percent) -> uint256
Applies a penalty on a depositor based on a specified percentage and value.
- `account`: The address of the depositor.
- `value`: The reference value used in the penalty calculation.
- `percent`: The penalty percentage (with precision such that 100% equals 10000).
- **Modifier:**  
  - `onlyDepositorNormal(account)`: The penalty can only be applied if the depositor is in Normal status.
- **Returns:**  
  - `uint256`: The calculated penalty cost.
- **Behavior:**  
  - Calculates the penalty cost based on the provided value, percentage, and a platform configuration parameter (`marginRatio`).
  - If the depositor's margin is sufficient, reduces the margin by the penalty cost; otherwise, sets the status to Abnormal, updates the margin to reflect the shortfall, and designates the contract as the debtor.
  - Emits an ExpenseHistory event with the penalty details.

### marginOf(address _account) -> (uint256, Status)
Retrieves the current margin and status of a depositor.
- `_account`: The address of the depositor.
- **Returns:**  
  - `uint256`: The current margin (balance) of the depositor.
  - `Status`: The status of the depositor.
