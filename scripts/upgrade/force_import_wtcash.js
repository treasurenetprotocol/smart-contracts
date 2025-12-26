#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');

async function main() {
  const proxyAddress = process.env.FORCE_IMPORT_WTCASH || '0x5293caC8b36FeDDAB87988F076db441bbb99D144';
  if (!proxyAddress || proxyAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('Invalid proxy address for WTCASH force import');
  }
  const WTCASH = await ethers.getContractFactory('WTCASH');
  await upgrades.forceImport(proxyAddress, WTCASH, { kind: 'transparent' });
  logger.info(`forceImport done for ${proxyAddress} on ${network.name}`);
}

main().catch((error) => {
  logger.error('Error during forceImport WTCASH:', error);
  process.exit(1);
});
