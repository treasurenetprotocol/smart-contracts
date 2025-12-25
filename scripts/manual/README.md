## manual 脚本说明

### roles-permission-check.js
- **作用**：读取指定网络的部署文件与 Roles 合约，检查当前私钥地址是否具备 FOUNDATION_MANAGER / ADMIN / DEFAULT_ADMIN_ROLE，并列出当前的 FOUNDATION_MANAGER 成员及角色层级。
- **必需环境变量**：
  - `RPC`：链上 RPC 地址。
  - `PRIVATE_KEY`：用于检查的账户私钥（16 进制，可带或不带 `0x`）。
  - `NETWORK`：部署文件名对应的网络标识（默认 `dev`），需在 `deployments/<NETWORK>.json` 存在。
- **执行方式**：
  1. 在仓库根目录准备 `.env` 或直接导出环境变量：  
     - `export RPC=<your_rpc>`  
     - `export PRIVATE_KEY=<hex_key>`  
     - `export NETWORK=<network_name>` *(可选，默认 dev)*
  2. 运行脚本：`node scripts/manual/roles-permission-check.js`
- **输出内容**：当前账户地址；三个关键角色权限状态；Foundation Manager 管理角色与可管理性；现有 FOUNDATION_MANAGER 成员列表；权限不足时的处理建议。

### multisig-proposal-status.js
- **作用**：查询多签提案状态（签名进度、执行时间、FM 签名明细、待处理提案列表）。
- **必需环境变量**：
  - `RPC`：链上 RPC 地址。
  - `NETWORK`：部署文件名对应的网络标识（默认 `dev`）。
  - `PROPOSAL_ID`：要查询的提案编号（默认 `4`）。
- **执行方式**：
  1. 设置环境变量（可用 `.env` 或导出）：`RPC`、`NETWORK`、`PROPOSAL_ID`。
  2. 运行脚本：`node scripts/manual/multisig-proposal-status.js`
- **输出内容**：提案名称与执行时间；当前/所需签名数与进度百分比；每个 FOUNDATION_MANAGER 的签名状态；可执行性判断（含等待时间）；挂起提案 ID 列表；执行/签名的后续指引。

### multisig-proposal-execute.js
- **作用**：由具备 FOUNDATION_MANAGER 角色的账户执行已满足签名阈值且到达执行时间的多签提案。
- **必需环境变量**：
  - `RPC`：链上 RPC 地址。
  - `NETWORK`：部署文件名对应的网络标识（默认 `dev`）。
  - `PRIVATE_KEY`：执行交易的 Foundation Manager 私钥。
  - `PROPOSAL_ID`：要执行的提案编号（默认 `4`）。
- **执行方式**：
  1. 设置环境变量（`.env` 或导出）：`RPC`、`NETWORK`、`PRIVATE_KEY`、`PROPOSAL_ID`。
  2. 运行脚本：`node scripts/manual/multisig-proposal-execute.js`
- **输出内容**：当前/所需签名数；执行时间检查；执行交易的 gas 估算与哈希；ProposalExecuted 事件；执行后挂起列表的检查提示。

### register-dapp-propose.js
- **作用**：使用 Foundation Manager 账户创建“注册 DApp”类型的多签提案（不自动签名/执行）。
- **必需环境变量**：
  - `RPC`：链上 RPC 地址。
  - `NETWORK`：部署文件名对应的网络标识（默认 `dev`）。
  - `PRIVATE_KEY`：Foundation Manager 私钥（需具备 FOUNDATION_MANAGER 角色）。
  - `TREASURE_KIND`：资源类型（如 `OIL`/`GAS`/`ETH`/`BTC`）。
  - `DAPP_NAME`：DApp 名称。
  - `PAYEE_ADDRESS`：DApp 收款地址。
- **执行方式**：
  1. 设置环境变量：`RPC`、`NETWORK`、`PRIVATE_KEY`、`TREASURE_KIND`、`DAPP_NAME`、`PAYEE_ADDRESS`。
  2. 运行脚本：`node scripts/manual/register-dapp-propose.js`
- **输出内容**：提案 ID、所需签名阈值、FM 列表；创建后会提示用 `multisig-proposal-status.js` 查看进度，用 `multisig-proposal-execute.js` 执行。

### kms-multisig-sign.js
- **作用**：使用 AWS KMS（@web3-kms-signer）对指定多签提案执行 `signTransaction` 并发送交易。
- **必需环境变量**：
  - `RPC`：链上 RPC 地址。
  - `NETWORK`：部署文件名对应的网络标识（用于解析 MULSIG，如未提供 `CONTRACT_ADDRESS`）。
  - `CHAIN_ID`：链 ID（默认 6666）。
  - `CONTRACT_ADDRESS`：MULSIG 地址（可选，默认读取 deployments）。
  - `PROPOSAL_ID`：要签名的提案编号（默认 4）。
  - `FROM_ADDRESS`：KMS 对应的地址（可选，用于校验/发送）。
  - `AWS_KMS_KEY_ID`、`AWS_KMS_ACCESS_KEY_ID`、`AWS_KMS_SECRET_ACCESS_KEY`、`AWS_KMS_REGION`：KMS 相关配置。
- **执行方式**：
  1. 设置以上环境变量（`.env` 或导出）。
  2. 运行脚本：`node scripts/manual/kms-multisig-sign.js`
- **输出内容**：网络/提案信息；签名进度（含阈值）；gas 估算；签名并发送交易的哈希、区块高度、gas 使用；签名后的进度校验。

### crosschain-token-setup-run.js
- **作用**：使用环境变量 + 部署信息驱动跨链 Token 配置流程，调用 helper 生成多签提案并签名/执行（自动）。
- **必需环境变量**：
  - `RPC`、`NETWORK`、`PRIVATE_KEY`（用于签名/执行的 FOUNDATION_MANAGER）。
  - 目标链：`TARGET_CHAIN_ID`、`TARGET_UNIT`、`TARGET_BRIDGE`、`TARGET_TCASH`。
  - 可选：`SOURCE_CHAIN_ID`、`SOURCE_UNIT`、`SOURCE_BRIDGE`、`SOURCE_TCASH`、`SOURCE_NETWORK_NAME`、`TARGET_NETWORK_NAME`。
- **执行方式**：
  1. 设置环境变量（`.env` 或导出）。
  2. 运行：`node scripts/manual/crosschain-token-setup-run.js`
- **输出内容**：源/目标链配置、提案创建/签名/执行日志及结果。

### crosschain-token-setup-helper.js
- **作用**：被 run 脚本调用的助手，按传入地址对象创建跨链 Token 提案、收集 FOUNDATION_MANAGER 签名并执行。
- **入参字段**：`rpcUrl`、`sourceNetworkName`、`targetNetworkName`、`sourceChainId`、`targetChainId`、`sourceChain{unit,bridge,tcash}`、`targetChain{unit,bridge,tcash}`、`mulSig`、`roles`、`crosschainTokens`、`signerKey`。
- **备注**：直接调用时需自行构造以上参数对象；会对 FOUNDATION_MANAGER 角色做校验并依次创建/签名/执行四个方向的跨链 Token 提案。
