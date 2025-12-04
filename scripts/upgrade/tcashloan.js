const { logger } = require('@treasurenet/logging-middleware');

const TCashLoan = artifacts.require('TCashLoan');
const { upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Upgrade the TCashLoan contract
 * Note: This script only upgrades the implementation and does not modify storage
 */
module.exports = async function (deployer, network, accounts) {
  try {
    logger.info('Starting TCashLoan upgrade...');
    // Get currently deployed TCashLoan address
    let tcashLoanAddress;

    try {
      // Try to get deployed() instance
      const tcashLoanInstance = await TCashLoan.deployed();
      tcashLoanAddress = tcashLoanInstance.address;
      logger.info(`Found TCashLoan via deployed(): ${tcashLoanAddress}`);
    } catch (error) {
      logger.info('Could not resolve via deployed(), trying environment variables...');

      // Try reading from env vars
      const envVarName = `${network.toUpperCase()}_TCASHLOAN_ADDRESS`;
      tcashLoanAddress = process.env[envVarName] || process.env.TCASHLOAN_ADDRESS;

      if (tcashLoanAddress) {
        logger.info(`Found TCashLoan via env var: ${tcashLoanAddress}`);
      }
    }

    // Validate address
    if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
      logger.error(`Error: no valid TCashLoan address provided for network ${network}`);
      logger.error(`Deploy the contract first or set ${network.toUpperCase()}_TCASHLOAN_ADDRESS or TCASHLOAN_ADDRESS`);
      return;
    }

    logger.info(`Network: ${network}, current address: ${tcashLoanAddress}`);

    // Ensure network flag is present
    if (!network) {
      throw new Error('Network not specified; use --network flag');
    }

    // Perform upgrade
    const upgradedTCashLoan = await upgradeProxy(tcashLoanAddress, TCashLoan, {
      deployer,
    });

    logger.info('TCashLoan upgraded:', upgradedTCashLoan.address);

    // Persist address info
    try {
      fs.appendFileSync('upgraded_contracts.txt', `TCashLoan=${upgradedTCashLoan.address}\n`);
      logger.info('Address written to upgraded_contracts.txt');
    } catch (err) {
      logger.error('Failed to write file:', err);
    }
  } catch (error) {
    logger.error('Error upgrading TCashLoan:', error);
  }
};
