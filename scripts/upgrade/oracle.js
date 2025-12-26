#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

function resolveAddress(entry, state) {
  return resolveContract(entry, state, 'ORACLE');
}

async function main() {
  logger.info('Starting Oracle upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const oracleAddress = resolveAddress(entry, state);
  if (!oracleAddress || oracleAddress === '' || oracleAddress.includes('...')) {
    throw new Error(`No valid Oracle address in deployments/${networkName}.json; seed it before upgrading.`);
  }

  logger.info(`Network: ${networkName}, proxy address: ${oracleAddress}`);

  const Oracle = await ethers.getContractFactory('Oracle');
  const upgraded = await upgrades.upgradeProxy(oracleAddress, Oracle);
  const impl = await upgrades.erc1967.getImplementationAddress(oracleAddress).catch(() => null);

  logger.info(`Oracle upgraded. Proxy=${oracleAddress}${impl ? ` impl=${impl}` : ''}`);
  try {
    fs.appendFileSync('upgraded_contracts.txt', `Oracle=${oracleAddress}\n`);
    logger.info('Address written to upgraded_contracts.txt');
  } catch (err) {
    logger.error('Error writing file:', err);
  }
}

main().catch((error) => {
  logger.error('Error upgrading Oracle:', error);
  process.exit(1);
});
