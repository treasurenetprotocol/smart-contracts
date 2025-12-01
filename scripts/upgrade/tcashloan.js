const TCashLoan = artifacts.require('TCashLoan');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCashLoan contract
 * Note: This script only upgrades the implementation and does not modify storage
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting TCashLoan upgrade...');
    // Get currently deployed TCashLoan address
    let tcashLoanAddress;
    
    try {
      // Try to get deployed() instance
      const tcashLoanInstance = await TCashLoan.deployed();
      tcashLoanAddress = tcashLoanInstance.address;
      console.log(`Found TCashLoan via deployed(): ${tcashLoanAddress}`);
    } catch (error) {
      console.log('Could not resolve via deployed(), trying environment variables...');
      
      // Try reading from env vars
      const envVarName = `${network.toUpperCase()}_TCASHLOAN_ADDRESS`;
      tcashLoanAddress = process.env[envVarName] || process.env.TCASHLOAN_ADDRESS;
      
      if (tcashLoanAddress) {
        console.log(`Found TCashLoan via env var: ${tcashLoanAddress}`);
      }
    }
    
    // Validate address
    if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
      console.error(`Error: no valid TCashLoan address provided for network ${network}`);
      console.error(`Deploy the contract first or set ${network.toUpperCase()}_TCASHLOAN_ADDRESS or TCASHLOAN_ADDRESS`);
      return;
    }
    
    console.log(`Network: ${network}, current address: ${tcashLoanAddress}`);
    
    // Ensure network flag is present
    if (!network) {
      throw new Error('Network not specified; use --network flag');
    }
    
    // Perform upgrade
    const upgradedTCashLoan = await upgradeProxy(tcashLoanAddress, TCashLoan, { 
      deployer
    });
    
    console.log('TCashLoan upgraded:', upgradedTCashLoan.address);
    
    // Persist address info
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashLoan=${upgradedTCashLoan.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Failed to write file:', err);
    }
    
  } catch (error) {
    console.error('Error upgrading TCashLoan:', error);
  }
};
