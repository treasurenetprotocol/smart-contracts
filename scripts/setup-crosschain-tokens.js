const { Web3 } = require("web3");

// 导入合约 ABI
const MulSig = require("../build/contracts/MulSig.json");
const Roles = require("../build/contracts/Roles.json");
const CrosschainTokens = require("../build/contracts/CrosschainTokens.json");

// 封装多签提案流程
async function proposeCrosschainToken(
  mulSig,
  roles,
  crosschainTokens,
  params,
  FOUNDATION_MANAGER,
  sender,
  web3Instance
) {
  console.log("Creating proposal with params:", {
    token: params[0],
    sourceERC20: params[1],
    sourceCrosschain: params[2],
    sourceChainId: params[3],
    targetERC20: params[4],
    targetCrosschain: params[5],
    targetChainId: params[6],
    fee: params[7],
    chainId: params[8],
  });

  // 验证合约地址
  console.log("Contract addresses:", {
    mulSig: mulSig.options.address,
    roles: roles.options.address,
    crosschainTokens: crosschainTokens.options.address,
  });

  // 添加权限检查
  const hasRole = await roles.methods
    .hasRole(FOUNDATION_MANAGER, sender)
    .call();
  if (!hasRole) {
    throw new Error(`Account ${sender} does not have FOUNDATION_MANAGER role`);
  }
  console.log(`Account ${sender} has FOUNDATION_MANAGER role`);

  // 提交提案
  try {
    const gasPrice = await web3Instance.eth.getGasPrice();

    const tx = await mulSig.methods
      .proposeToSetCrosschainToken(
        params[0], // token
        params[1], // sourceERC20address
        params[2], // sourceCrosschainAddress
        params[3], // sourcechainid
        params[4], // targetERC20address
        params[5], // targetCrosschainAddress
        params[6], // targetchainid
        params[7], // fee
        params[8] // chainId
      )
      .send({
        from: sender,
        gas: 500000,
        gasPrice: '400000000', // 0.4 gwei
      });
    console.log("Proposal created successfully:", tx.transactionHash);
  } catch (error) {
    console.error("Error details:", error);
    if (error.message.includes("revert")) {
      console.error("Revert reason:", error.message);
    }
    throw error;
  }

  // 等待提案创建
  await sleep(10 * 1000);

  // 获取并签名提案
  const pendingProposals = await mulSig.methods
    .getPendingProposals()
    .call({ from: sender });
  if (pendingProposals.length > 0) {
    const proposalId = pendingProposals[pendingProposals.length - 1];
    console.log("Got proposal ID:", proposalId.toString());

    // 获取所有基金会管理员
    const managers = await roles.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();

    // 为每个基金会管理员签名
    for (const manager of managers) {
      const hasSigned = await mulSig.methods
        .hasAlreadySigned(proposalId, manager)
        .call();
      if (!hasSigned) {
        try {
          const gasPrice = await web3Instance.eth.getGasPrice();

          await mulSig.methods.signTransaction(proposalId).send({
            from: manager,
            gas: 500000,
            gasPrice: gasPrice,
          });
          console.log(`Manager ${manager} signed successfully`);
        } catch (error) {
          console.error(
            `Failed to get signature from manager ${manager}:`,
            error.message
          );
        }
      }
    }

    // 等待执行时间
    await sleep(8 * 1000);

    // 执行提案
    try {
      console.log("Executing proposal:", proposalId.toString());
      const gasPrice = await web3Instance.eth.getGasPrice();

      const result = await mulSig.methods.executeProposal(proposalId).send({
        from: sender,
        gas: 500000,
        gasPrice: '400000000', // 0.4 gwei
      });
      console.log("Proposal executed successfully:", result.transactionHash);

      // 验证配置
      console.log("Verifying configuration...");
      const tokenInfo = await crosschainTokens.methods
        .getCrosschainTokenByChainId(params[0], params[8])
        .call();
      if (!tokenInfo[0]) {
        throw new Error("Token info is empty after execution");
      }
      console.log(`${params[0]} token info after execution:`, {
        token: tokenInfo[0],
        sourceERC20: tokenInfo[1],
        sourceCrosschain: tokenInfo[2],
        sourceChainId: tokenInfo[3].toString(),
        targetERC20: tokenInfo[4],
        targetCrosschain: tokenInfo[5],
        targetChainId: tokenInfo[6].toString(),
        fee: tokenInfo[7].toString(),
      });
    } catch (error) {
      console.error("Failed to execute proposal:", error);
      throw error;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// 设置跨链代币配置
async function setupCrosschainTokens(addresses) {
  try {
    // 连接到对应网络
    const web3 = new Web3(addresses.rpcUrl);

    // 添加私钥
    const privateKey =
      "";
    await web3.eth.accounts.wallet.add(privateKey);

    // 创建合约实例
    const mulSigInstance = new web3.eth.Contract(MulSig.abi, addresses.mulSig);
    const rolesInstance = new web3.eth.Contract(Roles.abi, addresses.roles);
    const crosschainTokensInstance = new web3.eth.Contract(
      CrosschainTokens.abi,
      addresses.crosschainTokens
    );

    // 获取 FOUNDATION_MANAGER 角色
    const FOUNDATION_MANAGER = web3.utils.keccak256("FOUNDATION_MANAGER");
    const fManagers = await rolesInstance.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();
    console.log("FOUNDATION_MANAGER 角色下的所有成员:", fManagers);

    // 设置跨链代币配置
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === "treasurenet" ? "UNIT" : "WUNIT",
        addresses.sourceChain.unit,
        addresses.sourceChain.bridge,
        addresses.sourceChainId,
        addresses.targetChain.unit,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        5,
        addresses.sourceChainId,
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3
    );

    // 2. Chain2的wUNIT -> Chain1的UNIT (反向配置)
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === "treasurenet" ? "WUNIT" : "UNIT",
        addresses.targetChain.unit, // Chain2的wUNIT地址
        addresses.targetChain.bridge, // Chain2的bridge地址
        addresses.targetChainId, // Chain2的chainId
        addresses.sourceChain.unit, // Chain1的UNIT地址
        addresses.sourceChain.bridge, // Chain1的bridge地址
        addresses.sourceChainId, // Chain1的chainId
        5, // 手续费
        addresses.targetChainId, // 当前chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0], // 使用第一个账户发送交易
      web3
    );

    // 3. Chain1的TCash -> Chain2的wTCash
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === "treasurenet" ? "TCASH" : "WTCASH",
        addresses.sourceChain.tcash, // Chain1的TCash地址
        addresses.sourceChain.bridge, // Chain1的bridge地址
        addresses.sourceChainId, // Chain1的chainId
        addresses.targetChain.tcash, // Chain2的wTCash地址
        addresses.targetChain.bridge, // Chain2的bridge地址
        addresses.targetChainId, // Chain2的chainId
        5, // 手续费
        addresses.sourceChainId, // 当前chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3
    );

    // 4. Chain2的wTCash -> Chain1的TCash (反向配置)
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === "treasurenet" ? "WTCASH" : "TCASH",
        addresses.targetChain.tcash, // Chain2的wTCash地址
        addresses.targetChain.bridge, // Chain2的bridge地址
        addresses.targetChainId, // Chain2的chainId
        addresses.sourceChain.tcash, // Chain1的TCash地址
        addresses.sourceChain.bridge, // Chain1的bridge地址
        addresses.sourceChainId, // Chain1的chainId
        5, // 手续费
        addresses.targetChainId, // 当前chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3
    );

  } catch (error) {
    console.error("Setup failed:", error);
    throw error;
  }
}

module.exports = {
  setupCrosschainTokens,
};
