const { ethers, upgrades } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Starting TCashLoan contract upgrade...");

  // Get the contract factory
  const TCashLoan = await ethers.getContractFactory("TCashLoan");
  
  // Get proxy contract address from environment variables
  const PROXY_ADDRESS = process.env.TCASHLOAN_PROXY_ADDRESS;
  
  if (!PROXY_ADDRESS) {
    throw new Error("Please set the TCASHLOAN_PROXY_ADDRESS environment variable in the .env file");
  }
  
  console.log(`Preparing to upgrade contract at address ${PROXY_ADDRESS}`);
  
  // Perform the upgrade
  const upgradedContract = await upgrades.upgradeProxy(PROXY_ADDRESS, TCashLoan);
  await upgradedContract.deployed();
  
  console.log("TCashLoan contract upgraded successfully!");
  console.log(`Upgraded contract address: ${upgradedContract.address}`);
  
  // Wait a bit to ensure the transaction is confirmed
  console.log("Waiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 60000)); // wait 60 seconds
  
  // Try to verify the contract (if supported on the network)
  try {
    console.log("Attempting to verify the contract...");
    await run("verify:verify", {
      address: upgradedContract.address,
      constructorArguments: []
    });
    console.log("Contract verification succeeded!");
  } catch (error) {
    console.log("Contract verification failed or is not supported on this network:", error.message);
  }
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error during upgrade:", error);
    process.exit(1);
  });
