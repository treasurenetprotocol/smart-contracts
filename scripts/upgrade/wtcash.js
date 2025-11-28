const WTCASH = artifacts.require('WTCASH');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade WTCASH contract implementation.
 * Note: This script only upgrades the implementation, storage is preserved.
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting WTCASH upgrade...');
    let wtcashAddress;

    try {
      const wtcashInstance = await WTCASH.deployed();
      wtcashAddress = wtcashInstance.address;
      console.log(`WTCASH address from deployed(): ${wtcashAddress}`);
    } catch (error) {
      console.log('Cannot get WTCASH address from deployed(), trying env...');
      const envVarName = `${network.toUpperCase()}_WTCASH_ADDRESS`;
      wtcashAddress = process.env[envVarName] || process.env.WTCASH_ADDRESS;
      if (wtcashAddress) {
        console.log(`WTCASH address from env: ${wtcashAddress}`);
      }
    }

    if (!wtcashAddress || wtcashAddress === '' || wtcashAddress.includes('...')) {
      console.error(`Error: No valid WTCASH address for network ${network}`);
      console.error(`Set ${network.toUpperCase()}_WTCASH_ADDRESS or WTCASH_ADDRESS env var.`);
      return;
    }

    console.log(`Network: ${network}, WTCASH address: ${wtcashAddress}`);

    if (!network) {
      throw new Error('No network specified, use --network');
    }

    const upgradedWTCASH = await upgradeProxy(wtcashAddress, WTCASH, { deployer });
    console.log('WTCASH upgraded:', upgradedWTCASH.address);

    try {
      fs.appendFileSync('upgraded_contracts.txt', `WTCASH=${upgradedWTCASH.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Error writing file:', err);
    }
  } catch (error) {
    console.error('Error upgrading WTCASH:', error);
  }
}; 