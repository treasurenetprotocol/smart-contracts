const { logger } = require('@treasurenet/logging-middleware');

const Oracle = artifacts.require('Oracle');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade Oracle contract implementation.
 * Note: This script only upgrades the implementation, storage is preserved.
 */
module.exports = async function (deployer, network, accounts) {
  try {
    logger.info('Starting Oracle upgrade...');
    let oracleAddress;

    try {
      const oracleInstance = await Oracle.deployed();
      oracleAddress = oracleInstance.address;
      logger.info(`Oracle address from deployed(): ${oracleAddress}`);
    } catch (error) {
      logger.info('Cannot get Oracle address from deployed(), trying env...');
      const envVarName = `${network.toUpperCase()}_ORACLE_ADDRESS`;
      oracleAddress = process.env[envVarName] || process.env.ORACLE_ADDRESS;
      if (oracleAddress) {
        logger.info(`Oracle address from env: ${oracleAddress}`);
      }
    }


    if (!oracleAddress || oracleAddress === '' || oracleAddress.includes('...')) {
      logger.error(`Error: No valid Oracle address for network ${network}`);
      logger.error(`Set ${network.toUpperCase()}_ORACLE_ADDRESS or ORACLE_ADDRESS env var.`);
      return;
    }

    logger.info(`Network: ${network}, Oracle address: ${oracleAddress}`);

    if (!network) {
      throw new Error('No network specified, use --network');
    }

    const upgradedOracle = await upgradeProxy(oracleAddress, Oracle, { deployer });
    logger.info('Oracle upgraded:', upgradedOracle.address);

    try {
      fs.appendFileSync('upgraded_contracts.txt', `Oracle=${upgradedOracle.address}\n`);
      logger.info('Address written to upgraded_contracts.txt');
    } catch (err) {
      logger.error('Error writing file:', err);
    }
  } catch (error) {
    logger.error('Error upgrading Oracle:', error);
  }
};
