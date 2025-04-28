const TCash = artifacts.require('TCash');
const TCashLoan = artifacts.require('TCashLoan');
const TCashAuction = artifacts.require('TCashAuction');
const TATManager = artifacts.require('TATManager');
const Roles = artifacts.require('Roles');
const MulSig = artifacts.require('MulSig');
const Oracle = artifacts.require('Oracle');
const TAT = artifacts.require('TAT');
const ParameterInfo = artifacts.require('ParameterInfo');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");

/**
 * 部署TCash相关合约
 * - TCash: 主要稳定币合约
 * - TCashLoan: TCash借贷合约
 * - TCashAuction: TCash拍卖合约
 * - TATManager: TAT管理合约
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log("部署TCash相关合约...");
    
    // 获取已部署的合约实例
    const roles = await Roles.deployed();
    const mulSig = await MulSig.deployed();
    const oracle = await Oracle.deployed();
    const tat = await TAT.deployed();
    const parameterInfo = await ParameterInfo.deployed();
    
    // 部署TCash - 需要传递初始接收者地址
    const tcash = await deployProxy(TCash, [accounts[0]], { deployer });
    console.log('TCash部署成功:', tcash.address);
    fs.appendFileSync('contracts.txt', `const TCASH_ADDRESS='${tcash.address}'\n`);
    
    // 部署包装版代币 (检查WTCASH和WUNIT的初始化函数具体要求)
      // const wtcash = await deployProxy(WTCASH, [], { deployer });
      // console.log('WTCASH部署成功:', wtcash.address);
      // fs.appendFileSync('contracts.txt', `const WTCASH_ADDRESS='${wtcash.address}'\n`);
      
    // const wunit = await deployProxy(WUNIT, [], { deployer });
    // console.log('WUNIT部署成功:', wunit.address);
    // fs.appendFileSync('contracts.txt', `const WUNIT_ADDRESS='${wunit.address}'\n`);
    
    // 部署TAT管理合约 - 只需要一个roles参数
    const tatManager = await deployProxy(TATManager, [roles.address], { deployer });
    console.log('TATManager部署成功:', tatManager.address);
    fs.appendFileSync('contracts.txt', `const TAT_MANAGER_ADDRESS='${tatManager.address}'\n`);
    
    // 部署TCash借贷合约 - 使用oracle代替tcashOracle
    // const tcashLoan = await deployProxy(TCashLoan, [
    //   tcash.address,
    //   roles.address,
    //   parameterInfo.address,
    //   oracle.address,
    //   tat.address
    // ], { deployer });
    const tcashLoan = await deployProxy(TCashLoan, { initializer: false }, { deployer });
    console.log('TCashLoan部署成功:', tcashLoan.address);
    fs.appendFileSync('contracts.txt', `const TCASH_LOAN_ADDRESS='${tcashLoan.address}'\n`);

    
    
    // 部署TCash拍卖合约 - 只需要两个参数
    const tcashAuction = await deployProxy(TCashAuction, [
      roles.address,
      tcash.address,
      tcashLoan.address,
    ], { deployer });
    console.log('TCashAuction部署成功:', tcashAuction.address);
    fs.appendFileSync('contracts.txt', `const TCASH_AUCTION_ADDRESS='${tcashAuction.address}'\n`);
    
    // // 设置合约关系
    // await tcashLoan.setAuction(tcashAuction.address);
    // await tcashAuction.setLoan(tcashLoan.address);
    
    // 设置TCash关系
    await tcash.setRoles(roles.address);
    await tcash.setOracle(oracle.address);

    await tcash.setAuctionContract(tcashAuction.address)
 
    
    // // 授权TAT管理员
    // const tatInstance = await TAT.at(tat.address);
    // await tatInstance.setMinter(tatManager.address, true);
    
    // 为Oracle设置初始价格
    console.log('初始化Oracle价格数据...');
    
    console.log("TCash相关合约部署完成");
  } catch (error) {
    console.error("部署失败:", error);
  }
}; 