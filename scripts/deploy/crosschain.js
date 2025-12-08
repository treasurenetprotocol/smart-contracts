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
  if (!state.entries || state.entries.length === 0) throw new Error('No deployment entry; run previous steps.');

  const MulSig = await ethers.getContractFactory('MulSig');
  const Roles = await ethers.getContractFactory('Roles');
  const Oracle = await ethers.getContractFactory('Oracle');
  const TCashLoan = await ethers.getContractFactory('TCashLoan');
  const CrosschainTokens = await ethers.getContractFactory('CrosschainTokens');
  const CrosschainBridge = await ethers.getContractFactory('CrosschainBridge');

  const entry = currentEntry(state);
  const required = ['DAO', 'MULSIG', 'ROLES', 'PARAMETER_INFO', 'ORACLE', 'GOVERNANCE', 'TCASH', 'TCASH_LOAN', 'TCASH_AUCTION', 'TAT'];
  required.forEach((k) => {
    const addr = resolveContract(entry, state, k);
    if (!addr) {
      throw new Error(`Missing ${k}; ensure previous steps completed`);
    }
  });

  const provider = ethers.provider;
  for (const key of required) {
    const addr = resolveContract(entry, state, key);
    const code = await provider.getCode(addr);
    if (!code || code === '0x') {
      throw new Error(`Address for ${key} (${addr}) has no contract code on ${network.name}; rerun earlier steps`);
    }
  }

  const mulSigAddr = resolveContract(entry, state, 'MULSIG');
  const rolesAddr = resolveContract(entry, state, 'ROLES');
  const oracleAddr = resolveContract(entry, state, 'ORACLE');
  const parameterInfoAddr = resolveContract(entry, state, 'PARAMETER_INFO');
  const tcashAddr = resolveContract(entry, state, 'TCASH');
  const tcashLoanAddr = resolveContract(entry, state, 'TCASH_LOAN');
  const tcashAuctionAddr = resolveContract(entry, state, 'TCASH_AUCTION');
  const tatAddr = resolveContract(entry, state, 'TAT');

  const mulSig = MulSig.attach(mulSigAddr);
  const roles = Roles.attach(rolesAddr);
  const oracle = Oracle.attach(oracleAddr);
  const tcashLoan = TCashLoan.attach(tcashLoanAddr);

  const { instance: crosschainTokens, address: cctAddr, blockNumber: cctBlock, txHash: cctTx } = await deployProxyWithInfo(
    CrosschainTokens,
    ['0x0000000000000000000000000000000000000000'],
    { initializer: 'initialize' },
  );
  state = record(paths, state, 'CROSSCHAIN_TOKENS', cctAddr, cctBlock, cctTx);

  const { instance: crosschainBridge, address: ccbAddr, blockNumber: ccbBlock, txHash: ccbTx } = await deployProxyWithInfo(
    CrosschainBridge,
    [cctAddr, rolesAddr],
    { initializer: 'initialize' },
  );
  state = record(paths, state, 'CROSSCHAIN_BRIDGE', ccbAddr, ccbBlock, ccbTx);

  await (await crosschainTokens.setMulSig(mulSigAddr)).wait();

  await (await mulSig.initialize(
    resolveContract(entry, state, 'DAO'),
    resolveContract(entry, state, 'GOVERNANCE'),
    rolesAddr,
    parameterInfoAddr,
    cctAddr,
    5,
  )).wait();
  logger.info('MulSig initialized');

  await (await roles.initialize(
    mulSigAddr,
    [
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
    ],
    [
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
    ],
    [
      oracleAddr,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
    ],
    [
      ccbAddr,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
    ],
    [
      tcashAddr,
      tcashLoanAddr,
      tcashAuctionAddr,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
      ccbAddr,
      cctAddr,
    ],
  )).wait();

  const tcashMinterRole = await roles.TCASH_MINTER();
  const tcashBurnerRole = await roles.TCASH_BURNER();
  if (!(await roles.hasRole(tcashMinterRole, tcashLoanAddr)) || !(await roles.hasRole(tcashBurnerRole, tcashLoanAddr))) {
    throw new Error(`TCashLoan ${tcashLoanAddr} missing TCASH_MINTER/TCASH_BURNER after Roles.initialize`);
  }
  logger.info(`Roles initialized; TCashLoan granted minter/burner at ${tcashLoanAddr}`);
  logger.info('Roles initialized');

  await (await tcashLoan.initialize(
    tcashAddr,
    rolesAddr,
    parameterInfoAddr,
    oracleAddr,
    tatAddr,
  )).wait();

  // ensure setAuctionContract is sent from owner
  const loanOwner = await tcashLoan.owner();
  const signers = await ethers.getSigners();
  const ownerSigner = signers.find((s) => s.address.toLowerCase() === loanOwner.toLowerCase());
  if (!ownerSigner) {
    throw new Error(`Owner ${loanOwner} not available in local signers; cannot setAuctionContract`);
  }
  await (await tcashLoan.connect(ownerSigner).setAuctionContract(resolveContract(entry, state, 'TCASH_AUCTION'))).wait();

  const FOUNDATION_MANAGER_ROLE = await roles.FOUNDATION_MANAGER();
  if (!(await roles.hasRole(FOUNDATION_MANAGER_ROLE, (await ethers.getSigners())[0].address))) {
    await (await roles.grantRole(FOUNDATION_MANAGER_ROLE, (await ethers.getSigners())[0].address)).wait();
    logger.info(`Granted FOUNDATION_MANAGER to ${(await ethers.getSigners())[0].address}`);
  }

  await (await oracle.updatePrice('UNIT', ethers.parseEther('0.5'))).wait();
  await (await oracle.updatePrice('TCASH', ethers.parseEther('0.5'))).wait();
  logger.info('Oracle prices initialized');

  logger.info('Step 5 complete. Crosschain stack deployed and initialized.');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});
