const WTCASH = artifacts.require("WTCASH");
const WUNIT = artifacts.require("WUNIT");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {
  // 部署包装版代币 (检查WTCASH和WUNIT的初始化函数具体要求)
  const wtcash = await deployProxy(WTCASH, [], { deployer });
  console.log("WTCASH部署成功:", wtcash.address);
  fs.appendFileSync(
    "contracts.txt",
    `const WTCASH_ADDRESS='${wtcash.address}'\n`
  );
  const wunit = await deployProxy(WUNIT, [], { deployer });
  console.log("WUNIT部署成功:", wunit.address);
  fs.appendFileSync(
    "contracts.txt",
    `const WUNIT_ADDRESS='${wunit.address}'\n`
  );
};
