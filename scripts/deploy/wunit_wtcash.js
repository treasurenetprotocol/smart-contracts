#!/usr/bin/env node
const { ethers, upgrades, network } = require('hardhat');
const { getPaths, loadState, currentEntry, record } = require('./utils');

async function main() {
  const paths = getPaths(network.name);
  let state = loadState(paths, network.name);
  if (!state.entries || state.entries.length === 0) throw new Error('No deployment entry; run base first.');

  const WTCASH = await ethers.getContractFactory('WTCASH');
  const WUNIT = await ethers.getContractFactory('WUNIT');

  const operators = [];

  const wtcash = await upgrades.deployProxy(WTCASH, [operators], { initializer: 'initialize' });
  const wtcashTx = wtcash.deploymentTransaction();
  const wtcashReceipt = await wtcashTx.wait();
  const wtcashAddr = await wtcash.getAddress();
  state = record(paths, state, 'WTCASH', wtcashAddr, wtcashReceipt.blockNumber, wtcashTx.hash);

  const wunit = await upgrades.deployProxy(WUNIT, [operators], { initializer: 'initialize' });
  const wunitTx = wunit.deploymentTransaction();
  const wunitReceipt = await wunitTx.wait();
  const wunitAddr = await wunit.getAddress();
  state = record(paths, state, 'WUNIT', wunitAddr, wunitReceipt.blockNumber, wunitTx.hash);

  console.log('WTCASH and WUNIT deployed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
