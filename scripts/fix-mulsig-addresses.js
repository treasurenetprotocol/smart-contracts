#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getPrivateKey,
  getNetwork,
  requireContracts,
  loadContractABI,
} = require('./common/config');

/**
 * Fix _mulSig addresses in all Producer contracts
 * Usage: node scripts/fix-mulsig-addresses.js
 */

async function fixMulSigAddresses() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['MULSIG', 'GOVERNANCE', 'ROLES', 'OIL_PRODUCER', 'GAS_PRODUCER', 'ETH_PRODUCER', 'BTC_PRODUCER'],
      network,
    );

    const rpcUrl = getRpcUrl();
    const web3 = new Web3(rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);

    logger.info('🌐 Fixing Producer contract _mulSig addresses');
    logger.info('===============================================');
    logger.info(`Network: ${network}`);
    logger.info(`RPC URL: ${rpcUrl}`);
    logger.info(`Target MulSig address: ${contracts.MULSIG}`);
    logger.info(`Foundation Manager: ${account.address}`);
    logger.info('');

    const balance = await web3.eth.getBalance(account.address);
    const balanceInUnit = web3.utils.fromWei(balance, 'ether');
    logger.info(`   Account balance: ${balanceInUnit} UNIT`);

    const governanceABI = loadContractABI('Governance');
    const producerABI = loadContractABI('Producer');
    const rolesABI = loadContractABI('Roles');

    const governance = new web3.eth.Contract(governanceABI, contracts.GOVERNANCE);
    const roles = new web3.eth.Contract(rolesABI, contracts.ROLES);

    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const hasPermission = await roles.methods.hasRole(FOUNDATION_MANAGER, account.address).call();

    if (!hasPermission) {
      throw new Error(`Address ${account.address} does not have FOUNDATION_MANAGER role`);
    }
    logger.info('✅ Foundation Manager permission verified');

    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
    const results = [];

    for (const kind of treasureKinds) {
      try {
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        const producerAddress = treasureInfo[0];

        if (!producerAddress || producerAddress === '0x0000000000000000000000000000000000000000') {
          results.push({ kind, status: 'skip', message: 'Producer not found' });
          continue;
        }

        const producer = new web3.eth.Contract(producerABI, producerAddress);
        logger.info(`\n🔧 Fixing ${kind} Producer: ${producerAddress}`);

        const currentMulSigSlot = await web3.eth.getStorageAt(producerAddress, 0);
        const currentMulSig = `0x${currentMulSigSlot.slice(-40)}`;
        logger.info(`Current _mulSig (slot0 decoded): ${currentMulSig}`);

        const tx = await producer.methods.setMulSigContract(contracts.MULSIG).send({
          from: account.address,
          gas: 300000,
        });

        logger.info(`✅ Updated _mulSig via transaction: ${tx.transactionHash}`);
        results.push({ kind, status: 'ok', tx: tx.transactionHash });
      } catch (error) {
        logger.info(`❌ ${kind}: ${error.message}`);
        results.push({ kind, status: 'error', message: error.message });
      }
    }

    logger.info('\n📋 Summary');
    results.forEach((r) => {
      logger.info(`${r.kind}: ${r.status} ${r.message || r.tx || ''}`);
    });
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  fixMulSigAddresses();
}

module.exports = fixMulSigAddresses;
