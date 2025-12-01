#!/usr/bin/env node
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
  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const TCashLoan = await ethers.getContractFactory('TCashLoan');
  const TCash = await ethers.getContractFactory('TCash');
  const TAT = await ethers.getContractFactory('TAT');
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

  const mulSig = MulSig.attach(resolveContract(entry, state, 'MULSIG'));
  const roles = Roles.attach(resolveContract(entry, state, 'ROLES'));
  const oracle = Oracle.attach(resolveContract(entry, state, 'ORACLE'));
  const parameterInfo = ParameterInfo.attach(resolveContract(entry, state, 'PARAMETER_INFO'));
  const tcash = TCash.attach(resolveContract(entry, state, 'TCASH'));
  const tcashLoan = TCashLoan.attach(resolveContract(entry, state, 'TCASH_LOAN'));
  const tat = TAT.attach(resolveContract(entry, state, 'TAT'));

  const { instance: crosschainTokens, address: cctAddr, blockNumber: cctBlock, txHash: cctTx } = await deployProxyWithInfo(
    CrosschainTokens,
    ['0x0000000000000000000000000000000000000000'],
    { initializer: 'initialize' }
  );
  state = record(paths, state, 'CROSSCHAIN_TOKENS', cctAddr, cctBlock, cctTx);

  const { instance: crosschainBridge, address: ccbAddr, blockNumber: ccbBlock, txHash: ccbTx } = await deployProxyWithInfo(
    CrosschainBridge,
    [cctAddr, resolveContract(entry, state, 'ROLES')],
    { initializer: 'initialize' }
  );
  state = record(paths, state, 'CROSSCHAIN_BRIDGE', ccbAddr, ccbBlock, ccbTx);

  await crosschainTokens.setMulSig(resolveContract(entry, state, 'MULSIG'));

  await mulSig.initialize(
    resolveContract(entry, state, 'DAO'),
    resolveContract(entry, state, 'GOVERNANCE'),
    resolveContract(entry, state, 'ROLES'),
    resolveContract(entry, state, 'PARAMETER_INFO'),
    cctAddr,
    5
  );
  console.log('MulSig initialized');

  await roles.initialize(
    entry.contracts.MULSIG.address,
    [
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9'
    ],
    [
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9'
    ],
    [
      entry.contracts.ORACLE.address,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9'
    ],
    [
      ccbAddr,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9'
    ],
    [
      entry.contracts.TCASH.address,
      entry.contracts.TCASH_LOAN.address,
      entry.contracts.TCASH_AUCTION.address,
      '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
      '0x09eda46ffcec4656235391dd298875b82aa458a9',
      ccbAddr,
      cctAddr
    ]
  );
  console.log('Roles initialized');

  await tcashLoan.initialize(
    resolveContract(entry, state, 'TCASH'),
    resolveContract(entry, state, 'ROLES'),
    resolveContract(entry, state, 'PARAMETER_INFO'),
    resolveContract(entry, state, 'ORACLE'),
    resolveContract(entry, state, 'TAT')
  );

  // ensure setAuctionContract is sent from owner
  const loanOwner = await tcashLoan.owner();
  const signers = await ethers.getSigners();
  const ownerSigner = signers.find((s) => s.address.toLowerCase() === loanOwner.toLowerCase());
  if (!ownerSigner) {
    throw new Error(`Owner ${loanOwner} not available in local signers; cannot setAuctionContract`);
  }
  await tcashLoan.connect(ownerSigner).setAuctionContract(resolveContract(entry, state, 'TCASH_AUCTION'));

  const FOUNDATION_MANAGER_ROLE = await roles.FOUNDATION_MANAGER();
  if (!(await roles.hasRole(FOUNDATION_MANAGER_ROLE, (await ethers.getSigners())[0].address))) {
    await roles.grantRole(FOUNDATION_MANAGER_ROLE, (await ethers.getSigners())[0].address);
    console.log(`Granted FOUNDATION_MANAGER to ${(await ethers.getSigners())[0].address}`);
  }

  await oracle.updatePrice('UNIT', ethers.parseEther('0.5'));
  await oracle.updatePrice('TCASH', ethers.parseEther('0.5'));
  console.log('Oracle prices initialized');

  console.log('Step 5 complete. Crosschain stack deployed and initialized.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
