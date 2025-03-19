const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const TCash = artifacts.require('TCash');
const TCashLoan = artifacts.require('TCashLoan');
const TCashAuction = artifacts.require('TCashAuction');
const TCashOracle = artifacts.require('TCashOracle');
const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const TATManager = artifacts.require('TATManager');

module.exports = async function (deployer, network, accounts) {
  // 部署Roles合约
  const roles = await deployProxy(Roles, [], { deployer });
  console.log('Roles deployed to:', roles.address);

  // 部署ParameterInfo合约
  const parameterInfo = await deployProxy(ParameterInfo, [roles.address], { deployer });
  console.log('ParameterInfo deployed to:', parameterInfo.address);

  // 部署TCashOracle合约
  const tcashOracle = await deployProxy(TCashOracle, [roles.address], { deployer });
  console.log('TCashOracle deployed to:', tcashOracle.address);

  // 部署TCash合约
  const tcash = await deployProxy(TCash, [], { deployer });
  console.log('TCash deployed to:', tcash.address);
  
  // 设置TCash角色合约
  await tcash.setRoles(roles.address);

  // 部署或获取TATManager合约
  let tatManager;
  if (network === 'development') {
    // 在开发环境中部署模拟的TATManager
    tatManager = await deployProxy(TATManager, [roles.address], { deployer });
    console.log('TATManager (mock) deployed to:', tatManager.address);
  } else {
    // 在生产环境中获取已部署的TATManager
    const TATManagerAddress = "输入已部署的TATManager地址"; // 需要替换成实际地址
    tatManager = await TATManager.at(TATManagerAddress);
    console.log('Using existing TATManager at:', tatManager.address);
  }

  // 部署TCashLoan合约
  const tcashLoan = await deployProxy(TCashLoan, [
    tcash.address,
    roles.address,
    parameterInfo.address,
    tcashOracle.address,
    tatManager.address
  ], { deployer });
  console.log('TCashLoan deployed to:', tcashLoan.address);

  // 部署TCashAuction合约
  const tcashAuction = await deployProxy(TCashAuction, [
    tcashLoan.address,
    roles.address
  ], { deployer });
  console.log('TCashAuction deployed to:', tcashAuction.address);

  // 设置合约权限
  await roles.grantRole(await roles.FOUNDATION_MANAGER(), accounts[0]);
  await roles.grantRole(await roles.AUCTION_MANAGER(), tcashAuction.address);
  
  // 设置TCash相关角色
  await roles.grantRole("TCASH_MINTER", tcashLoan.address);
  await roles.grantRole("TCASH_BURNER", tcashLoan.address);
  await roles.grantRole("TCASH_MINTER", accounts[0]); // 管理员也有铸造权限
  await roles.grantRole("TCASH_BURNER", accounts[0]); // 管理员也有销毁权限
}; 