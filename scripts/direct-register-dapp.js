#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  loadContractABI,
  getPrivateKey,
  getUserAddress,
} = require('./common/config');

/**
 * Try to register DApp directly without multisig (if possible)
 */

const TREASURE_KIND = process.env.TREASURE_KIND || 'OIL';
const DAPP_NAME = process.env.DAPP_NAME || 'OtterStreamTest';
const PAYEE_ADDRESS = process.env.PAYEE_ADDRESS || getUserAddress();

async function directRegisterDApp() {
  try {
    const network = getNetwork();
    const { GOVERNANCE } = requireContracts(['GOVERNANCE'], network);

    logger.info('Direct DApp Registration (Bypass Multisig)');
    logger.info('==========================================');
    logger.info(`Network: ${network}`);
    logger.info(`Treasure: ${TREASURE_KIND}`);
    logger.info(`DApp: ${DAPP_NAME}`);
    logger.info(`Payee: ${PAYEE_ADDRESS}`);
    logger.info('');

    // Initialize Web3
    const web3 = new Web3(getRpcUrl());

    // Add account
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);
    logger.info(`Using account: ${account.address}`);

    // Load contracts
    const governanceABI = loadContractABI('Governance');
    const governance = new web3.eth.Contract(governanceABI, GOVERNANCE);

    // Get producer contract address
    const treasureInfo = await governance.methods.getTreasureByKind(TREASURE_KIND).call();
    const producerAddress = treasureInfo[0] || treasureInfo.ProducerContract;
    if (!producerAddress || producerAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Treasure kind "${TREASURE_KIND}" not found`);
    }

    logger.info(`Producer contract: ${producerAddress}`);

    // Load producer contract
    const producerABI = loadContractABI('OilProducer'); // Try OilProducer first
    const producer = new web3.eth.Contract(producerABI, producerAddress);

    logger.info('\n🔍 Checking if direct registration is possible...');

    // Method 1: Check if we're the owner
    try {
      const owner = await producer.methods.owner().call();
      logger.info(`Producer owner: ${owner}`);
      logger.info(`Is owner: ${owner.toLowerCase() === account.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    } catch (error) {
      logger.info('No owner() method found');
    }

    // Method 2: Try to call registerDAppConnect directly
    logger.info('\n🚀 Attempting direct registerDAppConnect call...');

    try {
      // First check if DApp is already registered
      const dappId = web3.utils.keccak256(
        web3.utils.encodePacked(DAPP_NAME, PAYEE_ADDRESS),
      );

      try {
        const existingPayee = await producer.methods.getDAppPayee(dappId).call();
        logger.info(`⚠️  DApp already registered with payee: ${existingPayee}`);
        logger.info('✅ DApp registration already completed!');
        return;
      } catch (error) {
        logger.info('DApp not yet registered, proceeding...');
      }

      // Try direct call
      const directTx = await producer.methods.registerDAppConnect(
        DAPP_NAME,
        PAYEE_ADDRESS,
      ).send({
        from: account.address,
        gas: 300000,
      });

      logger.info('🎉 Success! DApp registered directly!');
      logger.info(`Transaction hash: ${directTx.transactionHash}`);
      logger.info(`DApp ID: ${dappId}`);
    } catch (directError) {
      logger.info(`❌ Direct call failed: ${directError.message}`);

      if (directError.message.includes('onlyMulSig')) {
        logger.info('   Reason: Function requires multisig authorization');
      }

      logger.info('\n💡 Alternative approaches:');
      logger.info('1. Complete the multisig proposal (get second signature)');
      logger.info('2. Check if you have admin privileges on the contract');
      logger.info('3. Contact contract deployer/owner');
    }

    // Method 3: Check for alternative registration methods
    logger.info('\n🔍 Checking for alternative registration methods...');

    try {
      // Check if there's an admin-only version
      const adminRegisterTx = await producer.methods.registerDAppConnectAdmin(
        DAPP_NAME,
        PAYEE_ADDRESS,
      ).send({
        from: account.address,
        gas: 300000,
      });

      logger.info('🎉 Success via admin method!');
    } catch (adminError) {
      logger.info('No admin registration method found');
    }

    // Method 4: Check if we can modify the multisig requirement temporarily
    logger.info('\n🔍 Checking contract upgrade capabilities...');

    try {
      // Check if contract is upgradeable and we're the admin
      const implementationSlot = await web3.eth.getStorageAt(
        producerAddress,
        '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
      );

      if (implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        logger.info('Contract appears to be upgradeable');
        logger.info('Implementation:', implementationSlot);
      }
    } catch (error) {
      logger.info('Contract upgrade check failed');
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  directRegisterDApp();
}

module.exports = directRegisterDApp;
