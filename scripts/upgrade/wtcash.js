const { logger } = require('@treasurenet/logging-middleware');

const WTCASH = artifacts.require('WTCASH');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade WTCASH contract implementation.
 * Note: This script only upgrades the implementation, storage is preserved.
 */
module.exports = async function (deployer, network, accounts) {
  try {
    logger.info('Starting WTCASH upgrade...');
    let wtcashAddress;

    try {
      const wtcashInstance = await WTCASH.deployed();
      wtcashAddress = wtcashInstance.address;
      logger.info(`WTCASH address from deployed(): ${wtcashAddress}`);
    } catch (error) {
      logger.info('Cannot get WTCASH address from deployed(), trying env...');
      const envVarName = `${network.toUpperCase()}_WTCASH_ADDRESS`;
      wtcashAddress = process.env[envVarName] || process.env.WTCASH_ADDRESS;
      if (wtcashAddress) {
        logger.info(`WTCASH address from env: ${wtcashAddress}`);
      }
    }

    if (!wtcashAddress || wtcashAddress === '' || wtcashAddress.includes('...')) {
      logger.error(`Error: No valid WTCASH address for network ${network}`);
      logger.error(`Set ${network.toUpperCase()}_WTCASH_ADDRESS or WTCASH_ADDRESS env var.`);
      return;
    }

    logger.info(`Network: ${network}, WTCASH address: ${wtcashAddress}`);

    if (!network) {
      throw new Error('No network specified, use --network');
    }

    const upgradedWTCASH = await upgradeProxy(wtcashAddress, WTCASH, { deployer });
    logger.info('WTCASH upgraded:', upgradedWTCASH.address);

    try {
      fs.appendFileSync('upgraded_contracts.txt', `WTCASH=${upgradedWTCASH.address}\n`);
      logger.info('Address written to upgraded_contracts.txt');
    } catch (err) {
      logger.error('Error writing file:', err);
    }
  } catch (error) {
    logger.error('Error upgrading WTCASH:', error);
  }
};
