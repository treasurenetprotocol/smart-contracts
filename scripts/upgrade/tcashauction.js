const { logger } = require('@treasurenet/logging-middleware');

const TCashAuction = artifacts.require('TCashAuction');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCashAuction contract
 * Note: This script only upgrades the implementation and does not modify storage
 */
module.exports = async function (deployer, network, accounts) {
  try {
    logger.info('Starting TCashAuction upgrade...');

    // Get currently deployed TCashAuction address
    let tcashAuctionAddress;

    try {
      // Try using deployed() helper
      const tcashAuctionInstance = await TCashAuction.deployed();
      tcashAuctionAddress = tcashAuctionInstance.address;
      logger.info(`Found TCashAuction via deployed(): ${tcashAuctionAddress}`);
    } catch (error) {
      logger.info('Could not resolve via deployed(), trying environment variables...');

      // Try reading from environment
      const envVarName = `${network.toUpperCase()}_TCASHAUCTION_ADDRESS`;
      tcashAuctionAddress = process.env[envVarName] || process.env.TCASHAUCTION_ADDRESS;

      if (tcashAuctionAddress) {
        logger.info(`Found TCashAuction via env var: ${tcashAuctionAddress}`);
      }
    }

    // Validate address
    if (!tcashAuctionAddress || tcashAuctionAddress === '' || tcashAuctionAddress.includes('...')) {
      logger.error(`Error: no valid TCashAuction address provided for network ${network}`);
      logger.error(`Deploy first or set ${network.toUpperCase()}_TCASHAUCTION_ADDRESS or TCASHAUCTION_ADDRESS`);
      return;
    }

    logger.info(`Network: ${network}, current address: ${tcashAuctionAddress}`);

    // Ensure network flag is present
    if (!network) {
      throw new Error('Network not specified; use --network flag');
    }

    // Execute upgrade
    const upgradedTCashAuction = await upgradeProxy(tcashAuctionAddress, TCashAuction, {
      deployer,
    });

    logger.info('TCashAuction upgraded:', upgradedTCashAuction.address);

    // Write address to file
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashAuction=${upgradedTCashAuction.address}\n`);
      logger.info('Address written to upgraded_contracts.txt');
    } catch (err) {
      logger.error('Failed to write file:', err);
    }
  } catch (error) {
    logger.error('Error upgrading TCashAuction:', error);
  }
};
