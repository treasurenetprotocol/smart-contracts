const TCashLoan = artifacts.require('TCashLoan');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 升级TCashLoan合约
 * 注意：这个脚本仅升级合约实现，不会修改存储的数据
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('开始升级TCashLoan合约...');
    // 获取当前已部署的TCashLoan合约地址
    let tcashLoanAddress;
    
    try {
      // 尝试使用deployed()方法获取已部署的TCashLoan实例
      const tcashLoanInstance = await TCashLoan.deployed();
      tcashLoanAddress = tcashLoanInstance.address;
      console.log(`通过deployed()方法获取到TCashLoan地址: ${tcashLoanAddress}`);
    } catch (error) {
      console.log('无法通过deployed()获取合约地址，尝试使用环境变量...');
      
      // 尝试从环境变量获取地址
      const envVarName = `${network.toUpperCase()}_TCASHLOAN_ADDRESS`;
      tcashLoanAddress = process.env[envVarName] || process.env.TCASHLOAN_ADDRESS;
      
      if (tcashLoanAddress) {
        console.log(`从环境变量获取到TCashLoan地址: ${tcashLoanAddress}`);
      }
    }
    
    // 检查地址是否有效
    if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
      console.error(`错误: 没有为网络 ${network} 提供有效的TCashLoan合约地址`);
      console.error(`请先部署合约或设置环境变量 ${network.toUpperCase()}_TCASHLOAN_ADDRESS 或 TCASHLOAN_ADDRESS`);
      return;
    }
    
    console.log(`网络: ${network}，当前地址: ${tcashLoanAddress}`);
    
    // 确保网络已正确设置
    if (!network) {
      throw new Error('未指定网络，请确保使用 --network 参数');
    }
    
    // 执行合约升级
    const upgradedTCashLoan = await upgradeProxy(tcashLoanAddress, TCashLoan, { 
      deployer
    });
    
    console.log('TCashLoan升级成功:', upgradedTCashLoan.address);
    
    // 将地址写入文件
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashLoan=${upgradedTCashLoan.address}\n`);
      console.log('地址信息已写入 upgraded_contracts.txt 文件');
    } catch (err) {
      console.error('写入文件时出错:', err);
    }
    
  } catch (error) {
    console.error('升级TCashLoan时出错:', error);
  }
}; 