const TCashAuction = artifacts.require('TCashAuction');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCashAuction contract
 * Note: This script only upgrades the implementation and does not modify storage
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting TCashAuction upgrade...');
    
    // Get currently deployed TCashAuction address
    let tcashAuctionAddress;
    
    try {
      // Try using deployed() helper
      const tcashAuctionInstance = await TCashAuction.deployed();
      tcashAuctionAddress = tcashAuctionInstance.address;
      console.log(`Found TCashAuction via deployed(): ${tcashAuctionAddress}`);
    } catch (error) {
      console.log('Could not resolve via deployed(), trying environment variables...');
      
      // Try reading from environment
      const envVarName = `${network.toUpperCase()}_TCASHAUCTION_ADDRESS`;
      tcashAuctionAddress = process.env[envVarName] || process.env.TCASHAUCTION_ADDRESS;
      
      if (tcashAuctionAddress) {
        console.log(`Found TCashAuction via env var: ${tcashAuctionAddress}`);
      }
    }
    
    // Validate address
    if (!tcashAuctionAddress || tcashAuctionAddress === '' || tcashAuctionAddress.includes('...')) {
      console.error(`Error: no valid TCashAuction address provided for network ${network}`);
      console.error(`Deploy first or set ${network.toUpperCase()}_TCASHAUCTION_ADDRESS or TCASHAUCTION_ADDRESS`);
      return;
    }
    
    console.log(`Network: ${network}, current address: ${tcashAuctionAddress}`);
    
    // Ensure network flag is present
    if (!network) {
      throw new Error('Network not specified; use --network flag');
    }
    
    // Execute upgrade
    const upgradedTCashAuction = await upgradeProxy(tcashAuctionAddress, TCashAuction, { 
      deployer
    });
    
    console.log('TCashAuction upgraded:', upgradedTCashAuction.address);
    
    // Write address to file
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashAuction=${upgradedTCashAuction.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Failed to write file:', err);
    }
    
  } catch (error) {
    console.error('Error upgrading TCashAuction:', error);
  }
};
