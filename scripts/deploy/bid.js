#!/usr/bin/env node
const { network } = require('hardhat');
const { getPaths, loadState, record } = require('./utils');
const { ethers, upgrades } = require('hardhat');

async function main() {
  const paths = getPaths(network.name);
  let state = loadState(paths, network.name);

  const Bid = await ethers.getContractFactory('Bid');
  const instance = await upgrades.deployProxy(Bid, [], { initializer: 'initialize' });
  const tx = instance.deploymentTransaction();
  const receipt = await tx.wait();
  const address = await instance.getAddress();

  state = record(paths, state, 'BID', address, receipt.blockNumber, tx.hash);
  console.log('Bid deployed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
