#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const { getRpcUrl, getNetwork, requireContracts } = require('./common/config');

/**
 * Find ProxyAdmin address for Producer contracts
 */

async function findProxyAdmin() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['OIL_PRODUCER', 'GAS_PRODUCER', 'ETH_PRODUCER', 'BTC_PRODUCER'],
      network,
    );

    logger.info('🔍 Finding ProxyAdmin address');
    logger.info('=====================');
    logger.info(`Network: ${network}`);

    const web3 = new Web3(getRpcUrl());

    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

    const proxyAdmins = new Set();

    for (const [kind, proxyAddress] of Object.entries(contracts)) {
      logger.info(`\n📋 Checking ${kind} Producer: ${proxyAddress}`);

      try {
        const adminData = await web3.eth.getStorageAt(proxyAddress, adminSlot);
        const adminAddress = `0x${adminData.slice(-40).toLowerCase()}`;

        const implData = await web3.eth.getStorageAt(proxyAddress, implementationSlot);
        const implAddress = `0x${implData.slice(-40).toLowerCase()}`;

        logger.info(`   Implementation address: ${implAddress}`);
        logger.info(`   Admin address: ${adminAddress}`);

        if (adminAddress !== '0x0000000000000000000000000000000000000000') {
          proxyAdmins.add(adminAddress);

          const adminCode = await web3.eth.getCode(adminAddress);
          if (adminCode !== '0x') {
            logger.info('   ✅ Admin contract exists');
          } else {
            logger.info('   ❌ Admin contract does not exist');
          }
        } else {
          logger.info('   ⚠️  Admin address not found');
        }
      } catch (error) {
        logger.info(`   ❌ Check failed: ${error.message}`);
      }
    }

    logger.info('\n📊 Summary');
    logger.info('==========');

    if (proxyAdmins.size === 0) {
      logger.info('❌ No ProxyAdmin addresses found');
    } else if (proxyAdmins.size === 1) {
      const adminAddress = Array.from(proxyAdmins)[0];
      logger.info(`✅ Found a single ProxyAdmin address: ${adminAddress}`);
    } else {
      logger.info('⚠️  Found multiple admin addresses:');
      proxyAdmins.forEach((admin) => {
        logger.info(`   - ${admin}`);
      });
    }

    logger.info('\n🔍 Extra check: try calling admin() directly');
    logger.info('----------------------------------');

    const proxyABI = [
      {
        inputs: [],
        name: 'admin',
        outputs: [{ name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    ];

    for (const [kind, proxyAddress] of Object.entries(contracts)) {
      try {
        const proxy = new web3.eth.Contract(proxyABI, proxyAddress);
        const admin = await proxy.methods.admin().call();
        logger.info(`${kind}: ${admin}`);
        proxyAdmins.add(admin.toLowerCase());
      } catch (error) {
        logger.info(`${kind}: direct call failed (${error.message})`);
      }
    }

    if (proxyAdmins.size === 1) {
      const finalAdmin = Array.from(proxyAdmins)[0];
      logger.info(`\n🎯 Final confirmed ProxyAdmin address: ${finalAdmin}`);
    }
  } catch (error) {
    logger.error('❌ Lookup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  findProxyAdmin();
}

module.exports = findProxyAdmin;
