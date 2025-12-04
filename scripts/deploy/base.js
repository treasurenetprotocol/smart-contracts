#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');
const { ethers, upgrades, network } = require('hardhat');
const { getPaths, loadState, startNewEntry, record } = require('./utils');

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
  state = startNewEntry(state, network.name);

  const DAO = await ethers.getContractFactory('DAO');
  const MulSig = await ethers.getContractFactory('MulSig');
  const Roles = await ethers.getContractFactory('Roles');
  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const Oracle = await ethers.getContractFactory('Oracle');

  const { instance: dao, address: daoAddr, blockNumber: daoBlock, txHash: daoTx } = await deployProxyWithInfo(DAO, [], { initializer: false });
  state = record(paths, state, 'DAO', daoAddr, daoBlock, daoTx);

  const { instance: mulSig, address: mulSigAddr, blockNumber: mulSigBlock, txHash: mulSigTx } = await deployProxyWithInfo(MulSig, [], { initializer: false });
  state = record(paths, state, 'MULSIG', mulSigAddr, mulSigBlock, mulSigTx);

  const { instance: roles, address: rolesAddr, blockNumber: rolesBlock, txHash: rolesTx } = await deployProxyWithInfo(Roles, [], { initializer: false });
  state = record(paths, state, 'ROLES', rolesAddr, rolesBlock, rolesTx);

  const { instance: parameterInfo, address: parameterInfoAddr, blockNumber: piBlock, txHash: piTx } = await deployProxyWithInfo(ParameterInfo, [], { initializer: false });
  state = record(paths, state, 'PARAMETER_INFO', parameterInfoAddr, piBlock, piTx);

  const { instance: oracle, address: oracleAddr, blockNumber: oracleBlock, txHash: oracleTx } = await deployProxyWithInfo(Oracle, [], { initializer: false });
  state = record(paths, state, 'ORACLE', oracleAddr, oracleBlock, oracleTx);

  await (await dao.initialize('DAO', 2, 10)).wait();
  await (await parameterInfo.initialize(mulSigAddr)).wait();
  await (await oracle.initialize(rolesAddr)).wait();
  logger.info('Base components initialized');
  logger.info('Base step complete. Entry recorded to deployments JSON.');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
