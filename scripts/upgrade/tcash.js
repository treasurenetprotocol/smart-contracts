#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

function resolveAddress(entry, state) {
  return resolveContract(entry, state, 'TCASH');
}

async function main() {
  logger.info('Starting TCash upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const tcashAddress = resolveAddress(entry, state, networkName);
  if (!tcashAddress || tcashAddress === '' || tcashAddress.includes('...')) {
    throw new Error(`No valid TCash address in deployments/${networkName}.json; seed it before upgrading.`);
  }

  logger.info(`Network: ${networkName}, proxy address: ${tcashAddress}`);

  const TCash = await ethers.getContractFactory('TCash');
  const upgraded = await upgrades.upgradeProxy(tcashAddress, TCash);
  const impl = await upgrades.erc1967.getImplementationAddress(tcashAddress).catch(() => null);

  logger.info(`TCash upgraded. Proxy=${tcashAddress}${impl ? ` impl=${impl}` : ''}`);
  try {
    fs.appendFileSync('upgraded_contracts.txt', `TCash=${tcashAddress}\n`);
    logger.info('Address written to upgraded_contracts.txt');
  } catch (err) {
    logger.error('Failed to write file:', err);
  }
}

main().catch((error) => {
  logger.error('Error upgrading TCash:', error);
  process.exit(1);
});
