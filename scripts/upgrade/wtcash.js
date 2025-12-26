#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract, primeSecretsManager, shouldUseSecretsManager } = require('../deploy/utils');

function resolveAddress(entry, state, networkName) {
  const envVarName = `${networkName.toUpperCase()}_WTCASH_ADDRESS`;
  return (
    resolveContract(entry, state, 'WTCASH', networkName) ||
    process.env[envVarName] ||
    process.env.WTCASH_ADDRESS
  );
}

async function main() {
  logger.info('Starting WTCASH upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  await primeSecretsManager(networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  const wtcashAddress = resolveAddress(entry, state, networkName);
  if (!wtcashAddress || wtcashAddress === '' || wtcashAddress.includes('...')) {
    if (shouldUseSecretsManager()) {
      throw new Error(`Error: no valid WTCASH address from Secrets Manager for network ${networkName}`);
    }
    throw new Error(`No valid WTCASH address for network ${networkName}; set ${networkName.toUpperCase()}_WTCASH_ADDRESS or WTCASH_ADDRESS`);
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
