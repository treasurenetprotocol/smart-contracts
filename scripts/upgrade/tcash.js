#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract, primeSecretsManager, shouldUseSecretsManager } = require('../deploy/utils');

function resolveAddress(entry, state, networkName) {
  const envVarName = `${networkName.toUpperCase()}_TCASH_ADDRESS`;
  return (
    resolveContract(entry, state, 'TCASH', networkName) ||
    process.env[envVarName] ||
    process.env.TCASH_ADDRESS
  );
}

async function main() {
  logger.info('Starting TCash upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  await primeSecretsManager(networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  const tcashAddress = resolveAddress(entry, state, networkName);
  if (!tcashAddress || tcashAddress === '' || tcashAddress.includes('...')) {
    if (shouldUseSecretsManager()) {
      throw new Error(`Error: no valid TCash address from Secrets Manager for network ${networkName}`);
    }
    throw new Error(`No valid TCash address for network ${networkName}; set ${networkName.toUpperCase()}_TCASH_ADDRESS or TCASH_ADDRESS`);
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
