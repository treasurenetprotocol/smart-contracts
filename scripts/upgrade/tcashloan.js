#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const fs = require('fs');
const { getPaths, loadState, currentEntry, resolveContract, primeSecretsManager, shouldUseSecretsManager } = require('../deploy/utils');

function resolveAddress(entry, state, networkName) {
  const envVarName = `${networkName.toUpperCase()}_TCASHLOAN_ADDRESS`;
  return (
    resolveContract(entry, state, 'TCASH_LOAN', networkName) ||
    process.env[envVarName] ||
    process.env.TCASHLOAN_ADDRESS
  );
}

async function main() {
  logger.info('Starting TCashLoan upgrade...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  await primeSecretsManager(networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  const tcashLoanAddress = resolveAddress(entry, state, networkName);
  if (!tcashLoanAddress || tcashLoanAddress === '' || tcashLoanAddress.includes('...')) {
    if (shouldUseSecretsManager()) {
      throw new Error(`Error: no valid TCashLoan address from Secrets Manager for network ${networkName}`);
    }
    throw new Error(`No valid TCashLoan address for network ${networkName}; set ${networkName.toUpperCase()}_TCASHLOAN_ADDRESS or TCASHLOAN_ADDRESS`);
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
