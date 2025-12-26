#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

function resolveAddress(entry, state) {
  return resolveContract(entry, state, 'WTCASH');
}

async function main() {
  logger.info('Starting WTCASH upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const wtcashAddress = resolveAddress(entry, state);
  if (!wtcashAddress || wtcashAddress === '' || wtcashAddress.includes('...')) {
    throw new Error(`No valid WTCASH address in deployments/${networkName}.json; seed it before upgrading.`);
  }

  logger.info(`Network: ${networkName}, proxy address: ${wtcashAddress}`);

  const WTCASH = await ethers.getContractFactory('WTCASH');
  const upgraded = await upgrades.upgradeProxy(wtcashAddress, WTCASH);
  const impl = await upgrades.erc1967.getImplementationAddress(wtcashAddress).catch(() => null);

  logger.info(`WTCASH upgraded. Proxy=${wtcashAddress}${impl ? ` impl=${impl}` : ''}`);
  try {
    fs.appendFileSync('upgraded_contracts.txt', `WTCASH=${wtcashAddress}\n`);
    logger.info('Address written to upgraded_contracts.txt');
  } catch (err) {
    logger.error('Error writing file:', err);
  }
}

main().catch((error) => {
  logger.error('Error upgrading WTCASH:', error);
  process.exit(1);
});
