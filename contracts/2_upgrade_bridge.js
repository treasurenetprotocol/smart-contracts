const CrosschainBridge = artifacts.require('CrosschainBridge');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {
  let existingBridgeAddress;
  
  try {
    // 尝试使用deployed()方法获取已部署的CrosschainBridge实例
    const bridgeInstance = await CrosschainBridge.deployed();
    existingBridgeAddress = bridgeInstance.address;
    console.log(`通过deployed()方法获取到CrosschainBridge地址: ${existingBridgeAddress}`);
  } catch (error) {
    console.log('无法通过deployed()获取合约地址，尝试使用环境变量...');
    
    // 如果deployed()失败，则回退到使用环境变量
    const envVarName = `${network.toUpperCase()}_BRIDGE_ADDRESS`;
    existingBridgeAddress = process.env[envVarName];
    
    // 如果没有找到网络特定的环境变量，则尝试使用通用环境变量
    if (!existingBridgeAddress) {
      existingBridgeAddress = process.env.BRIDGE_ADDRESS;
      console.log(`未找到网络特定的环境变量 ${envVarName}，使用通用环境变量 BRIDGE_ADDRESS`);
    } else {
      console.log(`使用网络特定的环境变量 ${envVarName}: ${existingBridgeAddress}`);
    }
  }
  
  // 检查地址是否有效
  if (!existingBridgeAddress || existingBridgeAddress === '' || existingBridgeAddress.includes('...')) {
    console.error(`错误: 没有为网络 ${network} 提供有效的合约地址`);
    console.error(`请先部署合约或设置环境变量 ${network.toUpperCase()}_BRIDGE_ADDRESS 或 BRIDGE_ADDRESS`);
    return;
  }
  
  console.log(`准备升级CrosschainBridge，网络: ${network}，当前地址: ${existingBridgeAddress}`);
  
  // 执行合约升级
  const upgradedBridge = await upgradeProxy(existingBridgeAddress, CrosschainBridge, { deployer });
  
  console.log('CrosschainBridge升级成功:', upgradedBridge.address);
  fs.appendFileSync('contracts.txt', `const UpgradedCrosschainBridge_${network}='${upgradedBridge.address}' // 升级时间: ${new Date().toISOString()}\n`);
  
  // 如果升级后需要调用新的初始化函数或设置新的参数，可以在这里添加
  // const bridgeInstance = await CrosschainBridge.at(upgradedBridge.address);
  // await bridgeInstance.someNewFunction(newParams);
}; 