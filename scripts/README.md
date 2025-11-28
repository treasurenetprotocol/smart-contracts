# 用户角色管理脚本

本文档说明如何使用脚本将用户添加到所有角色中。

## 添加用户到所有角色

系统中包含以下角色：
- ADMIN
- FOUNDATION_MANAGER
- AUCTION_MANAGER
- FEEDER
- CROSSCHAIN_SENDER
- TCASH_MINTER
- TCASH_BURNER

添加用户到所有角色需要三个步骤：
1. 创建提案
2. 签名提案（需要多人签名达到阈值）
3. 执行提案（需要等待确认时间）

## 脚本使用说明

### 1. 创建提案

这个脚本会为每个角色创建一个提案，将指定的用户添加到对应角色。

```bash
# 设置环境变量
export MULSIG_ADDRESS=0x... # 多签合约地址

# 运行脚本
npx hardhat run scripts/add_user_to_roles.js --network <network>
```

运行后，脚本会输出每个提案的ID，记录这些ID用于后续步骤。

### 2. 签名提案

这个脚本用于签名提案。按照治理规则，需要足够数量的 FOUNDATION_MANAGER 签名才能执行提案。

```bash
# 设置环境变量
export MULSIG_ADDRESS=0x... # 多签合约地址
export PROPOSAL_IDS=1,2,3,4,5,6,7 # 替换为实际创建的提案ID，以逗号分隔
export ACTION=sign

# 运行脚本
npx hardhat run scripts/sign_execute_proposals.js --network <network>
```

此脚本需要由多个不同的 FOUNDATION_MANAGER 运行，每人使用自己的私钥。

### 3. 执行提案

当提案获得足够的签名并且等待时间结束后，可以执行提案：

```bash
# 设置环境变量
export MULSIG_ADDRESS=0x... # 多签合约地址
export PROPOSAL_IDS=1,2,3,4,5,6,7 # 替换为实际创建的提案ID，以逗号分隔
export ACTION=execute

# 运行脚本
npx hardhat run scripts/sign_execute_proposals.js --network <network>
```

## 注意事项

1. 运行脚本的账户必须拥有 FOUNDATION_MANAGER 角色
2. 执行提案时需要等待足够的确认时间（通常为合约中设置的确认时间）
3. 如果提案已经被执行或被删除，相应的操作将失败

## 验证

可以通过调用 Roles 合约的 `hasRole` 函数验证用户是否已成功添加到对应角色：

```solidity
// 检查用户是否具有指定角色
bool hasRole = rolesContract.hasRole(roleId, userAddress);
```

## 完整流程示例

以下是一个完整的流程示例：

1. 创建提案：
```bash
export MULSIG_ADDRESS=0x123...
npx hardhat run scripts/add_user_to_roles.js --network mainnet
# 输出: 提案IDs: 42, 43, 44, 45, 46, 47, 48
```

2. 多位 FOUNDATION_MANAGER 签名提案：
```bash
export MULSIG_ADDRESS=0x123...
export PROPOSAL_IDS=42,43,44,45,46,47,48
export ACTION=sign
npx hardhat run scripts/sign_execute_proposals.js --network mainnet
```

3. 等待确认时间结束后，执行提案：
```bash
export MULSIG_ADDRESS=0x123...
export PROPOSAL_IDS=42,43,44,45,46,47,48
export ACTION=execute
npx hardhat run scripts/sign_execute_proposals.js --network mainnet
```

完成上述步骤后，用户 0x09eda46ffcec4656235391dd298875b82aa458a9 将被添加到所有角色中。 
