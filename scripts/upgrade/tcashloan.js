#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

function resolveAddress(entry, state) {
  return resolveContract(entry, state, 'TCASH_LOAN');
}

async function main() {
  logger.info('Starting TCashLoan upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const tcashLoanAddress = resolveAddress(entry, state);
  if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
    throw new Error(`No valid TCashLoan address in deployments/${networkName}.json; seed it before upgrading.`);
  }

  logger.info(`Network: ${networkName}, proxy address: ${tcashLoanAddress}`);

  const TCashLoan = await ethers.getContractFactory('TCashLoan');
  const upgraded = await upgrades.upgradeProxy(tcashLoanAddress, TCashLoan);
  const impl = await upgrades.erc1967.getImplementationAddress(tcashLoanAddress).catch(() => null);

  logger.info(`TCashLoan upgraded. Proxy=${tcashLoanAddress}${impl ? ` impl=${impl}` : ''}`);
  try {
    fs.appendFileSync('upgraded_contracts.txt', `TCashLoan=${tcashLoanAddress}\n`);
    logger.info('Address written to upgraded_contracts.txt');
  } catch (err) {
    logger.error('Failed to write file:', err);
  }
}

main().catch((error) => {
  logger.error('Error upgrading TCashLoan:', error);
  process.exit(1);
});
