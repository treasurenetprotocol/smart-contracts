/**
 * Create with smart-contracts
 * Author: Chris(ChrisChiu)
 * Date: 2025/4/24
 * Desc:
 */

const TokenLocker = artifacts.require("TokenLocker");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

const fs = require("fs");

module.exports = async function (deployer) {
  const tokenLocker = await deployProxy(TokenLocker, { initializer: false }, { deployer });
  console.log("TokenLocker:", tokenLocker.address);

  await tokenLocker.initialize();

  fs.appendFileSync("contracts.txt", "const TokenLocker='" + tokenLocker.address + "'\n");
};

