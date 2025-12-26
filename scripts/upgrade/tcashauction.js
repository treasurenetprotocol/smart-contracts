#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract, primeSecretsManager, shouldUseSecretsManager } = require('../deploy/utils');

function resolveAddress(entry, state, networkName) {
  const envVarName = `${networkName.toUpperCase()}_TCASHAUCTION_ADDRESS`;
  return (
    resolveContract(entry, state, 'TCASH_AUCTION', networkName) ||
    process.env[envVarName] ||
    process.env.TCASHAUCTION_ADDRESS
  );
}

async function main() {
  logger.info('Starting TCashAuction upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  await primeSecretsManager(networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  const tcashAuctionAddress = resolveAddress(entry, state, networkName);
  if (!tcashAuctionAddress || tcashAuctionAddress === '' || tcashAuctionAddress.includes('...')) {
    if (shouldUseSecretsManager()) {
      throw new Error(`Error: no valid TCashAuction address from Secrets Manager for network ${networkName}`);
    }
    throw new Error(`No valid TCashAuction address for network ${networkName}; set ${networkName.toUpperCase()}_TCASHAUCTION_ADDRESS or TCASHAUCTION_ADDRESS`);
  }

  logger.info(`Network: ${networkName}, proxy address: ${tcashAuctionAddress}`);

  const TCashAuction = await ethers.getContractFactory('TCashAuction');
  const upgraded = await upgrades.upgradeProxy(tcashAuctionAddress, TCashAuction);
  const impl = await upgrades.erc1967.getImplementationAddress(tcashAuctionAddress).catch(() => null);

  logger.info(`TCashAuction upgraded. Proxy=${tcashAuctionAddress}${impl ? ` impl=${impl}` : ''}`);
  try {
    fs.appendFileSync('upgraded_contracts.txt', `TCashAuction=${tcashAuctionAddress}\n`);
    logger.info('Address written to upgraded_contracts.txt');
  } catch (err) {
    logger.error('Failed to write file:', err);
  }
}

main().catch((error) => {
  logger.error('Error upgrading TCashAuction:', error);
  process.exit(1);
});
