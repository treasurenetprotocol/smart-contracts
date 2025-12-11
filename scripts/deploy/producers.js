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
  if (!state.entries || state.entries.length === 0) throw new Error('No deployment entry; run base first.');

  const MulSig = await ethers.getContractFactory('MulSig');
  const Roles = await ethers.getContractFactory('Roles');
  const Oracle = await ethers.getContractFactory('Oracle');
  const Governance = await ethers.getContractFactory('Governance');
  const TAT = await ethers.getContractFactory('TAT');
  const OilProducer = await ethers.getContractFactory('OilProducer');
  const GasProducer = await ethers.getContractFactory('GasProducer');
  const EthProducer = await ethers.getContractFactory('EthProducer');
  const BtcProducer = await ethers.getContractFactory('BtcProducer');
  const OilData = await ethers.getContractFactory('OilData');
  const GasData = await ethers.getContractFactory('GasData');
  const EthData = await ethers.getContractFactory('EthData');
  const BtcData = await ethers.getContractFactory('BtcData');

  const entry = currentEntry(state);
  const required = ['MULSIG', 'ROLES', 'PARAMETER_INFO', 'ORACLE'];
  required.forEach((k) => {
    const addr = resolveContract(entry, state, k);
    if (!addr) throw new Error(`Missing ${k}; ensure base step completed`);
  });
  const mulSig = MulSig.attach(resolveContract(entry, state, 'MULSIG'));
  const roles = Roles.attach(resolveContract(entry, state, 'ROLES'));
  const oracle = Oracle.attach(resolveContract(entry, state, 'ORACLE'));

  const { instance: oilProducer, address: opAddr, blockNumber: opBlock, txHash: opTx } = await deployProxyWithInfo(OilProducer, [], { initializer: false });
  state = record(paths, state, 'OIL_PRODUCER', opAddr, opBlock, opTx);
  const { instance: oilData, address: odAddr, blockNumber: odBlock, txHash: odTx } = await deployProxyWithInfo(OilData, [], { initializer: false });
  state = record(paths, state, 'OIL_DATA', odAddr, odBlock, odTx);

  const { instance: gasProducer, address: gpAddr, blockNumber: gpBlock, txHash: gpTx } = await deployProxyWithInfo(GasProducer, [], { initializer: false });
  state = record(paths, state, 'GAS_PRODUCER', gpAddr, gpBlock, gpTx);
  const { instance: gasData, address: gdAddr, blockNumber: gdBlock, txHash: gdTx } = await deployProxyWithInfo(GasData, [], { initializer: false });
  state = record(paths, state, 'GAS_DATA', gdAddr, gdBlock, gdTx);

  const { instance: ethProducer, address: epAddr, blockNumber: epBlock, txHash: epTx } = await deployProxyWithInfo(EthProducer, [], { initializer: false });
  state = record(paths, state, 'ETH_PRODUCER', epAddr, epBlock, epTx);
  const { instance: ethData, address: edAddr, blockNumber: edBlock, txHash: edTx } = await deployProxyWithInfo(EthData, [], { initializer: false });
  state = record(paths, state, 'ETH_DATA', edAddr, edBlock, edTx);

  const { instance: btcProducer, address: bpAddr, blockNumber: bpBlock, txHash: bpTx } = await deployProxyWithInfo(BtcProducer, [], { initializer: false });
  state = record(paths, state, 'BTC_PRODUCER', bpAddr, bpBlock, bpTx);
  const { instance: btcData, address: bdAddr, blockNumber: bdBlock, txHash: bdTx } = await deployProxyWithInfo(BtcData, [], { initializer: false });
  state = record(paths, state, 'BTC_DATA', bdAddr, bdBlock, bdTx);

  const govArgs = [
    resolveContract(entry, state, 'DAO'),
    resolveContract(entry, state, 'MULSIG'),
    resolveContract(entry, state, 'ROLES'),
    resolveContract(entry, state, 'PARAMETER_INFO'),
    ['OIL', 'GAS', 'ETH', 'BTC'],
    [opAddr, gpAddr, epAddr, bpAddr],
    [odAddr, gdAddr, edAddr, bdAddr],
  ];
  const { instance: gov, address: govAddr, blockNumber: govBlock, txHash: govTx } = await deployProxyWithInfo(Governance, govArgs, { initializer: 'initialize' });
  state = record(paths, state, 'GOVERNANCE', govAddr, govBlock, govTx);

  const { instance: tat, address: tatAddr, blockNumber: tatBlock, txHash: tatTx } = await deployProxyWithInfo(TAT, ['Rep', 'REP', govAddr], { initializer: 'initialize' });
  state = record(paths, state, 'TAT', tatAddr, tatBlock, tatTx);

  const mulSigAddr = resolveContract(entry, state, 'MULSIG');
  const rolesAddr = resolveContract(entry, state, 'ROLES');
  const oracleAddr = resolveContract(entry, state, 'ORACLE');
  const parameterInfoAddr = resolveContract(entry, state, 'PARAMETER_INFO');

  await oilProducer.initialize(mulSigAddr, rolesAddr, 'OIL', odAddr, [], []);
  await oilData.initialize('OIL', oracleAddr, rolesAddr, parameterInfoAddr, opAddr, tatAddr);

  await gasProducer.initialize(mulSigAddr, rolesAddr, 'GAS', gdAddr, [], []);
  await gasData.initialize('GAS', oracleAddr, rolesAddr, parameterInfoAddr, gpAddr, tatAddr);

  await ethProducer.initialize(mulSigAddr, rolesAddr, 'ETH', edAddr, [], []);
  await ethData.initialize('ETH', oracleAddr, rolesAddr, parameterInfoAddr, epAddr, tatAddr);

  await btcProducer.initialize(mulSigAddr, rolesAddr, 'BTC', bdAddr, [], []);
  await btcData.initialize('BTC', oracleAddr, rolesAddr, parameterInfoAddr, bpAddr, tatAddr);

  logger.info('Producers/Data/Governance/TAT deployed and initialized.');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
