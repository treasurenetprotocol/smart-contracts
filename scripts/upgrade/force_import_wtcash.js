const { logger } = require('@treasurenet/logging-middleware');
const { forceImport } = require('@openzeppelin/truffle-upgrades');

const WTCASH = artifacts.require('WTCASH');

module.exports = async function (deployer, network, accounts) {
  const proxyAddress = '0x5293caC8b36FeDDAB87988F076db441bbb99D144';
  await forceImport(proxyAddress, WTCASH);
  logger.info('forceImport done');
};
