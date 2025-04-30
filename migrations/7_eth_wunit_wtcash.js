const WTCASH = artifacts.require("WTCASH");
const WUNIT = artifacts.require("WUNIT");

const CrosschainTokens = artifacts.require("CrosschainTokens");
const CrosschainBridge = artifacts.require("CrosschainBridge");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {
  // 获取已部署的CrosschainBridge合约地址作为brider
  const crosschainBridge = await CrosschainBridge.deployed();
  const crosschainTokens = await CrosschainTokens.deployed();
  
  // 准备操作员数组，至少包含CrosschainBridge地址作为操作员
  const operators = [crosschainBridge.address,crosschainTokens.address];
  
  // 部署包装版代币，传入operators数组进行初始化
  const wtcash = await deployProxy(WTCASH, [operators], { deployer });
  console.log("WTCASH部署成功:", wtcash.address);
  fs.appendFileSync(
    "contracts.txt",
    `const WTCASH_ADDRESS='${wtcash.address}'\n`
  );
  
  const wunit = await deployProxy(WUNIT, [operators], { deployer });
  console.log("WUNIT部署成功:", wunit.address);
  fs.appendFileSync(
    "contracts.txt",
    `const WUNIT_ADDRESS='${wunit.address}'\n`
  );
};
