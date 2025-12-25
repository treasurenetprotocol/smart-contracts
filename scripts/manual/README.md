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
