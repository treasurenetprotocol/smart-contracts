const WTCASH = artifacts.require("WTCASH");
const WUNIT = artifacts.require("WUNIT");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");
const fs = require("fs");

// 重试函数
const retry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.message.includes('Too Many Requests')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2); // 指数退避
    }
    throw error;
  }
};

module.exports = async function (deployer, network, accounts) {
  // 部署 WTCASH
  const wtcash = await retry(() => deployProxy(WTCASH, [], { deployer }));
  console.log("WTCASH部署成功:", wtcash.address);
  fs.appendFileSync("contracts.txt", `const WTCASH_ADDRESS='${wtcash.address}'\n`);

  // 部署 WUNIT
  const wunit = await retry(() => deployProxy(WUNIT, [], { deployer }));
  console.log("WUNIT部署成功:", wunit.address);
  fs.appendFileSync("contracts.txt", `const WUNIT_ADDRESS='${wunit.address}'\n`);
};
