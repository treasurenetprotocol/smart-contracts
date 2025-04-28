/**
 * Upgrade TokenLocker contract
 * Author: Chris(ChrisChiu)
 * Date: 2024/4/28
 * Desc: Upgrade TokenLocker contract to new version
 */

const TokenLocker = artifacts.require("TokenLocker");
const { upgradeProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer) {
  // 获取当前部署的 TokenLocker 合约地址
  const currentTokenLocker = await TokenLocker.deployed();
  console.log("Current TokenLocker address:", currentTokenLocker.address);

  // 升级合约
  const upgradedTokenLocker = await upgradeProxy(
    currentTokenLocker.address,
    TokenLocker,
    { deployer }
  );
  console.log("TokenLocker upgraded to:", upgradedTokenLocker.address);
};
