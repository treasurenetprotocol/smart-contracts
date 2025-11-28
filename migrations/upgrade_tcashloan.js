const TCashLoan = artifacts.require('TCashLoan');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCashLoan contract
 * Note: this script only upgrades the implementation and does not alter stored data
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting TCashLoan upgrade...');
    
    // Get the currently deployed TCashLoan address
    let tcashLoanAddress;
    
    try {
      // Attempt to get the deployed TCashLoan instance via deployed()
      const tcashLoanInstance = await TCashLoan.deployed();
      tcashLoanAddress = tcashLoanInstance.address;
      console.log(`Retrieved TCashLoan address via deployed(): ${tcashLoanAddress}`);
    } catch (error) {
      console.log('Unable to get address via deployed(), trying environment variables...');
    }
    
    // Validate address
    if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
      console.error(`Error: No valid TCashLoan contract address provided for network ${network}`);
      console.error(`Please deploy the contract or set ${network.toUpperCase()}_TCASHLOAN_ADDRESS or TCASHLOAN_ADDRESS`);
      return;
    }
    
    console.log(`Preparing to upgrade TCashLoan, network: ${network}, current address: ${tcashLoanAddress}`);
    
    // Execute upgrade
    const upgradedTCashLoan = await upgradeProxy(tcashLoanAddress, TCashLoan, { deployer });
    
    console.log('TCashLoan upgraded successfully:', upgradedTCashLoan.address);
    
    // Write address to file
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashLoan=${upgradedTCashLoan.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Error writing to file:', err);
    }
    
  } catch (error) {
    console.error('Error upgrading TCashLoan:', error);
  }
};
