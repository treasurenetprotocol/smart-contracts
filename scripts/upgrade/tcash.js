const TCash = artifacts.require('TCash');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCash contract
 * Note: This script only upgrades the implementation and does not modify storage
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting TCash upgrade...');
    
    // Get currently deployed TCash address
    let tcashAddress;
    
    try {
      // Try using deployed() helper
      const tcashInstance = await TCash.deployed();
      tcashAddress = tcashInstance.address;
      console.log(`Found TCash via deployed(): ${tcashAddress}`);
    } catch (error) {
      console.log('Could not resolve via deployed(), trying environment variables...');
      
      // Try environment variable
      const envVarName = `${network.toUpperCase()}_TCASH_ADDRESS`;
      tcashAddress = process.env[envVarName] || process.env.TCASH_ADDRESS;
      
      if (tcashAddress) {
        console.log(`Found TCash via env var: ${tcashAddress}`);
      }
    }
    
    // Validate address
    if (!tcashAddress || tcashAddress === '' || tcashAddress.includes('...')) {
      console.error(`Error: no valid TCash address provided for network ${network}`);
      console.error(`Deploy first or set ${network.toUpperCase()}_TCASH_ADDRESS or TCASH_ADDRESS`);
      return;
    }
    
    console.log(`Network: ${network}, current address: ${tcashAddress}`);
    
    // Ensure network flag is set
    if (!network) {
      throw new Error('Network not specified; use --network flag');
    }
    
    // Perform upgrade
    const upgradedTCash = await upgradeProxy(tcashAddress, TCash, { 
      deployer
    });
    
    console.log('TCash upgraded:', upgradedTCash.address);
    
    // Write address to file
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCash=${upgradedTCash.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Failed to write file:', err);
    }
    
  } catch (error) {
    console.error('Error upgrading TCash:', error);
  }
};
