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
