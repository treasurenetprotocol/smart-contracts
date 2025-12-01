#!/usr/bin/env node
const { network } = require('hardhat');
const { getPaths, loadState, record } = require('./utils');
const { upgrades, ethers } = require('hardhat');

async function main() {
  const paths = getPaths(network.name);
  let state = loadState(paths, network.name);
  const TokenLocker = await ethers.getContractFactory('TokenLocker');

  const instance = await upgrades.deployProxy(TokenLocker, [], { initializer: 'initialize' });
  const tx = instance.deploymentTransaction();
  const receipt = await tx.wait();
  const address = await instance.getAddress();

  state = record(paths, state, 'TOKENLOCKER', address, receipt.blockNumber, tx.hash);
  console.log('TokenLocker deployed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
