#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

function resolveAddress(entry, state) {
  return resolveContract(entry, state, 'TCASH_AUCTION');
}

async function main() {
  logger.info('Starting TCashAuction upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const tcashAuctionAddress = resolveAddress(entry, state);
  if (!tcashAuctionAddress || tcashAuctionAddress === '' || tcashAuctionAddress.includes('...')) {
    throw new Error(`No valid TCashAuction address in deployments/${networkName}.json; seed it before upgrading.`);
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
