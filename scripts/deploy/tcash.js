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
  if (!state.entries || state.entries.length === 0) throw new Error('No deployment entry; run base and producers.');

  const TCash = await ethers.getContractFactory('TCash');
  const WTCASH = await ethers.getContractFactory('WTCASH');
  const WUNIT = await ethers.getContractFactory('WUNIT');
  const TCashLoan = await ethers.getContractFactory('TCashLoan');
  const TCashAuction = await ethers.getContractFactory('TCashAuction');
  const TATManager = await ethers.getContractFactory('TATManager');

  const entry = currentEntry(state);
  const required = ['ROLES', 'ORACLE', 'TAT'];
  required.forEach((k) => {
    const addr = resolveContract(entry, state, k);
    if (!addr) throw new Error(`Missing ${k}; ensure base and producers steps completed`);
  });
  const rolesAddr = resolveContract(entry, state, 'ROLES');
  const oracleAddr = resolveContract(entry, state, 'ORACLE');
  const tatAddr = resolveContract(entry, state, 'TAT');

  const { instance: tcash, address: tcashAddr, blockNumber: tcashBlock, txHash: tcashTx } = await deployProxyWithInfo(TCash, [(await ethers.getSigners())[0].address], { initializer: 'initialize' });
  state = record(paths, state, 'TCASH', tcashAddr, tcashBlock, tcashTx);

  const { instance: wtcash, address: wtcashAddr, blockNumber: wtcashBlock, txHash: wtcashTx } = await deployProxyWithInfo(WTCASH, [[]], { initializer: 'initialize' });
  state = record(paths, state, 'WTCASH', wtcashAddr, wtcashBlock, wtcashTx);

  const { instance: wunit, address: wunitAddr, blockNumber: wunitBlock, txHash: wunitTx } = await deployProxyWithInfo(WUNIT, [[]], { initializer: 'initialize' });
  state = record(paths, state, 'WUNIT', wunitAddr, wunitBlock, wunitTx);

  const { instance: tatManager, address: tatMgrAddr, blockNumber: tatMgrBlock, txHash: tatMgrTx } = await deployProxyWithInfo(TATManager, [rolesAddr], { initializer: 'initialize' });
  state = record(paths, state, 'TAT_MANAGER', tatMgrAddr, tatMgrBlock, tatMgrTx);

  const { instance: tcashLoan, address: tcashLoanAddr, blockNumber: tcashLoanBlock, txHash: tcashLoanTx } = await deployProxyWithInfo(TCashLoan, [], { initializer: false });
  state = record(paths, state, 'TCASH_LOAN', tcashLoanAddr, tcashLoanBlock, tcashLoanTx);

  const { instance: tcashAuction, address: tcashAuctionAddr, blockNumber: tcashAuctionBlock, txHash: tcashAuctionTx } = await deployProxyWithInfo(
    TCashAuction,
    [rolesAddr, tcashAddr, tcashLoanAddr],
    { initializer: 'initialize' },
  );
  state = record(paths, state, 'TCASH_AUCTION', tcashAuctionAddr, tcashAuctionBlock, tcashAuctionTx);

  await (await tcash.setRoles(rolesAddr)).wait();
  await (await tcash.setOracle(oracleAddr)).wait();

  logger.info('Step 3 complete. TCash stack deployed; tcashLoan remains uninitialized for later wiring.');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
