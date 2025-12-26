#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const { getPaths, loadState, currentEntry, resolveContract } = require('../deploy/utils');

const PRODUCER_CONTRACTS = {
  OIL: 'OilProducer',
  GAS: 'GasProducer',
  ETH: 'EthProducer',
  BTC: 'BtcProducer',
};

function resolveGovernanceAddress(entry, state) {
  return resolveContract(entry, state, 'GOVERNANCE');
}

async function main() {
  logger.info('Starting Producer upgrades...');
  const networkName = network.name;
  const paths = getPaths(networkName);
  const state = loadState(paths, networkName);
  const entry = state.entries && state.entries.length ? currentEntry(state) : null;

  if (!entry) {
    throw new Error(`No deployment entry found in deployments/${networkName}.json; seed it before upgrading.`);
  }

  const governanceAddress = resolveGovernanceAddress(entry, state);
  if (!governanceAddress || governanceAddress === '' || governanceAddress.includes('...')) {
    throw new Error(`No valid Governance address in deployments/${networkName}.json; seed it before upgrading.`);
  }

  logger.info(`Network: ${networkName}, Governance: ${governanceAddress}`);
  const governance = await ethers.getContractAt('Governance', governanceAddress);

  const producerAddresses = {};
  for (const kind of Object.keys(PRODUCER_CONTRACTS)) {
    try {
      const treasureInfo = await governance.getTreasureByKind(kind);
      producerAddresses[kind] = treasureInfo[0];
      logger.info(`${kind} Producer: ${treasureInfo[0]}`);
    } catch (error) {
      logger.info(`Could not fetch ${kind} Producer address: ${error.message}`);
    }
  }

  const results = [];
  for (const [kind, contractName] of Object.entries(PRODUCER_CONTRACTS)) {
    try {
      const proxyAddress = producerAddresses[kind];
      if (!proxyAddress || proxyAddress === '0x0000000000000000000000000000000000000000') {
        logger.info(`Skipping ${contractName}: proxy address not found`);
        results.push({ contract: contractName, status: 'skipped', reason: 'No proxy address found' });
        continue;
      }

      logger.info(`Upgrading ${contractName} at ${proxyAddress}...`);
      const Factory = await ethers.getContractFactory(contractName);
      await upgrades.upgradeProxy(proxyAddress, Factory);
      const impl = await upgrades.erc1967.getImplementationAddress(proxyAddress).catch(() => null);

      logger.info(`✅ ${contractName} upgraded${impl ? ` (impl ${impl})` : ''}`);
      results.push({ contract: contractName, status: 'success', proxyAddress, implementation: impl });
    } catch (error) {
      logger.info(`❌ ${contractName} upgrade failed: ${error.message}`);
      results.push({ contract: contractName, status: 'failed', error: error.message });
    }
  }

  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');
  const skipped = results.filter((r) => r.status === 'skipped');

  logger.info(`Upgrade summary -> success: ${successful.length}, failed: ${failed.length}, skipped: ${skipped.length}`);
  if (failed.length > 0) {
    failed.forEach((r) => logger.info(`Failed ${r.contract}: ${r.error}`));
  }
}

main().catch((error) => {
  logger.error('Error upgrading Producers:', error);
  process.exit(1);
});
