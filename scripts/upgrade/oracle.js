const Oracle = artifacts.require('Oracle');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade Oracle contract implementation.
 * Note: This script only upgrades the implementation, storage is preserved.
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log('Starting Oracle upgrade...');
    let oracleAddress;

    try {
      const oracleInstance = await Oracle.deployed();
      oracleAddress = oracleInstance.address;
      console.log(`Oracle address from deployed(): ${oracleAddress}`);
    } catch (error) {
      console.log('Cannot get Oracle address from deployed(), trying env...');
      const envVarName = `${network.toUpperCase()}_ORACLE_ADDRESS`;
      oracleAddress = process.env[envVarName] || process.env.ORACLE_ADDRESS;
      if (oracleAddress) {
        console.log(`Oracle address from env: ${oracleAddress}`);
      }
    }
  

    if (!oracleAddress || oracleAddress === '' || oracleAddress.includes('...')) {
      console.error(`Error: No valid Oracle address for network ${network}`);
      console.error(`Set ${network.toUpperCase()}_ORACLE_ADDRESS or ORACLE_ADDRESS env var.`);
      return;
    }

    console.log(`Network: ${network}, Oracle address: ${oracleAddress}`);

    if (!network) {
      throw new Error('No network specified, use --network');
    }

    const upgradedOracle = await upgradeProxy(oracleAddress, Oracle, { deployer });
    console.log('Oracle upgraded:', upgradedOracle.address);

    try {
      fs.appendFileSync('upgraded_contracts.txt', `Oracle=${upgradedOracle.address}\n`);
      console.log('Address written to upgraded_contracts.txt');
    } catch (err) {
      console.error('Error writing file:', err);
    }
  } catch (error) {
    console.error('Error upgrading Oracle:', error);
  }
}; 