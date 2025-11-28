const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("开始升级TCashLoan合约...");

  // 获取合约工厂
  const TCashLoan = await ethers.getContractFactory("TCashLoan");
  
  // 从环境变量获取代理合约地址
  const PROXY_ADDRESS = process.env.TCASHLOAN_PROXY_ADDRESS;
  
  if (!PROXY_ADDRESS) {
    throw new Error("请在.env文件中设置TCASHLOAN_PROXY_ADDRESS环境变量");
  }
  
  console.log(`准备升级地址为 ${PROXY_ADDRESS} 的合约`);
  
  // 执行升级
  const upgradedContract = await upgrades.upgradeProxy(PROXY_ADDRESS, TCashLoan);
  await upgradedContract.deployed();
  
  console.log("TCashLoan合约升级成功！");
  console.log(`升级后的合约地址: ${upgradedContract.address}`);
  
  // 等待一段时间以确保交易被确认
  console.log("等待区块确认...");
  await new Promise(resolve => setTimeout(resolve, 60000)); // 等待60秒
  
  // 尝试验证合约（如果在支持的网络上）
  try {
    console.log("尝试验证合约...");
    await run("verify:verify", {
      address: upgradedContract.address,
      constructorArguments: []
    });
    console.log("合约验证成功！");
  } catch (error) {
    console.log("合约验证失败或在此网络不支持验证:", error.message);
  }
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("升级过程中出错:", error);
    process.exit(1);
  }); 