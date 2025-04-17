const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const TCashAuction = artifacts.require('TCashAuction');

/**
 * 添加tcashAuction地址作为TCASH_BURNER角色的多签提案脚本
 * 该脚本将创建提案，由基金会管理员签名并执行
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('开始创建多签提案，添加tcashAuction为TCASH_BURNER...');
    
    // 获取部署的合约实例
    const mulSig = await MulSig.deployed();
    const roles = await Roles.deployed();
    const tcashAuction = await TCashAuction.deployed();
    
    console.log(`MulSig地址: ${mulSig.address}`);
    console.log(`Roles地址: ${roles.address}`);
    console.log(`TCashAuction地址: ${tcashAuction.address}`);
    
    // 检查TCASH_BURNER常量
    const TCASH_BURNER_ROLE = await roles.TCASH_BURNER();
    console.log(`TCASH_BURNER角色哈希: ${TCASH_BURNER_ROLE}`);
    
    // 检查tcashAuction是否已经有TCASH_BURNER角色
    const hasRole = await roles.hasRole(TCASH_BURNER_ROLE, tcashAuction.address);
    if (hasRole) {
      console.log('TCashAuction已经拥有TCASH_BURNER角色，无需添加');
      return;
    }
    
    // 获取基金会管理员
    const FOUNDATION_MANAGER = await roles.FOUNDATION_MANAGER();
    const foundationManagers = await roles.getRoleMemberArray(FOUNDATION_MANAGER);
    console.log(`基金会管理员列表: ${foundationManagers}`);
    
    if (foundationManagers.length === 0) {
      console.error('错误: 没有找到基金会管理员账户，无法创建多签提案');
      return;
    }
    
    // 选择第一个基金会管理员作为提案者
    const proposer = foundationManagers[0];
    console.log(`使用 ${proposer} 作为提案者`);
    
    // 设置交易发送者为提案者
    const txOptions = { from: proposer };
    
    // 创建提案 - 添加TCASH_BURNER权限 (使用"TCASH_BURNERA"作为操作名称，表示添加TCASH_BURNER角色)
    console.log(`创建提案，为 ${tcashAuction.address} 添加TCASH_BURNER角色...`);
    const proposalTx = await mulSig.proposeToManagePermission("TCASH_BURNERA", tcashAuction.address, txOptions);
    
    // 获取提案ID (从事件中提取)
    const proposalId = proposalTx.logs.find(log => log.event === 'ManagePermission').args.proposalId;
    console.log(`创建的提案ID: ${proposalId}`);
    
    // 获取提案的所需签名数量
    const governance = await artifacts.require('Governance').deployed();
    const fmThreshold = await governance.fmThreshold();
    console.log(`提案所需的签名数量: ${fmThreshold}`);
    
    // 对提案进行签名 (只有在测试网络或开发环境中才执行)
    if (network === 'development' || network === 'test') {
      console.log('在测试环境中进行签名和执行');
      
      // 签署提案 - 由所有基金会管理员签名，直到达到阈值
      const requiredSignatures = Math.min(foundationManagers.length, fmThreshold.toNumber());
      
      for (let i = 0; i < requiredSignatures; i++) {
        const signerAddress = foundationManagers[i];
        console.log(`签名者 ${i+1}: ${signerAddress} 正在签署提案...`);
        await mulSig.signTransaction(proposalId, { from: signerAddress });
        
        // 获取当前签名数量
        const signatureCount = await mulSig.getSignatureCount(proposalId);
        console.log(`当前签名数量: ${signatureCount}`);
      }
      
      // 检查提案是否已执行时间
      let proposalDetails = await mulSig.transactionDetails(proposalId);
      console.log(`提案执行时间: ${proposalDetails.executeTime}`);
      
      // 如果在测试网络中，我们可能需要快进时间
      // 在真实网络中，这需要等待确认期
      if (network === 'development') {
        console.log('等待确认期...');
        // 在测试环境中，我们可以手动增加时间（如果使用ganache）
        // 在真实网络中，这需要等待
      }
      
      // 等待确认期过后执行提案
      console.log('执行提案...');
      await mulSig.executeProposal(proposalId, txOptions);
      console.log('提案已成功执行');
      
      // 验证是否已授予角色
      const roleGranted = await roles.hasRole(TCASH_BURNER_ROLE, tcashAuction.address);
      console.log(`TCashAuction现在拥有TCASH_BURNER角色: ${roleGranted}`);
    } else {
      console.log(`
在生产环境中运行:
1. 已创建提案ID: ${proposalId}
2. 请基金会管理员通过多签应用签署并执行此提案
3. 提案需要至少 ${fmThreshold} 个签名
4. 签名后需要等待确认期
5. 确认期后可以执行提案
      `);
    }
    
    console.log('脚本执行完成');
  } catch (error) {
    console.error('添加角色时出错:', error);
  }
};
