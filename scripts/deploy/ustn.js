#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const { getPaths, loadState, currentEntry, resolveContract, record } = require('./utils');

async function deployProxyWithInfo(factory, args, opts) {
  const instance = await upgrades.deployProxy(factory, args, opts);
  const tx = instance.deploymentTransaction();
  const receipt = await tx.wait();
  const address = await instance.getAddress();
  return { instance, address, blockNumber: receipt.blockNumber, txHash: tx.hash };
}

async function main() {
  const paths = getPaths(network.name);
  let state = loadState(paths, network.name);
  if (!state.entries || state.entries.length === 0) throw new Error('Missing dependencies; run previous steps.');

  const USTN = await ethers.getContractFactory('USTN');
  const USTNAuction = await ethers.getContractFactory('USTNAuction');
  const USTNFinance = await ethers.getContractFactory('USTNFinance');

  const entry = currentEntry(state);
  const required = ['ROLES', 'ORACLE', 'PARAMETER_INFO'];
  required.forEach((k) => {
    const addr = resolveContract(entry, state, k);
    if (!addr) throw new Error(`Missing ${k}; ensure previous steps completed`);
  });

  const rolesAddr = resolveContract(entry, state, 'ROLES');
  const oracleAddr = resolveContract(entry, state, 'ORACLE');
  const parameterInfoAddr = resolveContract(entry, state, 'PARAMETER_INFO');

  const { instance: ustn, address: ustnAddr, blockNumber: ustnBlock, txHash: ustnTx } = await deployProxyWithInfo(USTN, [], { initializer: false });
  state = record(paths, state, 'USTN', ustnAddr, ustnBlock, ustnTx);

  const { instance: ustnAuction, address: ustnAuctionAddr, blockNumber: ustnAuctionBlock, txHash: ustnAuctionTx } = await deployProxyWithInfo(USTNAuction, [], { initializer: false });
  state = record(paths, state, 'USTN_AUCTION', ustnAuctionAddr, ustnAuctionBlock, ustnAuctionTx);

  const { instance: ustnFinance, address: ustnFinanceAddr, blockNumber: ustnFinanceBlock, txHash: ustnFinanceTx } = await deployProxyWithInfo(USTNFinance, [], { initializer: false });
  state = record(paths, state, 'USTN_FINANCE', ustnFinanceAddr, ustnFinanceBlock, ustnFinanceTx);

  await ustnAuction.initialize(rolesAddr, ustnAddr, ustnFinanceAddr);
  await ustnFinance.initialize(rolesAddr, parameterInfoAddr, oracleAddr, ustnAddr, ustnAuctionAddr);
  await ustn.initialize(rolesAddr, oracleAddr, ustnAuctionAddr, ustnFinanceAddr);

  logger.info('Step 4 complete. USTN stack deployed and initialized.');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
