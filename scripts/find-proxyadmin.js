#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');

/**
 * Find ProxyAdmin address for mainnet Producer contracts
 */

const CONFIG = {
  RPC_URL: 'https://rpc.treasurenet.io',

  // Producer proxy addresses
  PRODUCER_ADDRESSES: {
    OIL: '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
    GAS: '0x470B0196f597DF699057599D436f7E259688BCd9',
    ETH: '0x4693c13eF898c50596072db86E420495C1680643',
    BTC: '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40',
  },
};

async function findProxyAdmin() {
  try {
    logger.info('🔍 Finding ProxyAdmin address');
    logger.info('=====================');

    const web3 = new Web3(CONFIG.RPC_URL);

    // EIP-1967 storage slots
    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
    const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

    const proxyAdmins = new Set();

    for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
      logger.info(`\n📋 Checking ${kind} Producer: ${proxyAddress}`);

      try {
        // Read admin from storage slot
        const adminData = await web3.eth.getStorageAt(proxyAddress, adminSlot);
        const adminAddress = `0x${adminData.slice(-40).toLowerCase()}`;

        // Read implementation from storage slot
        const implData = await web3.eth.getStorageAt(proxyAddress, implementationSlot);
        const implAddress = `0x${implData.slice(-40).toLowerCase()}`;

        logger.info(`   Implementation address: ${implAddress}`);
        logger.info(`   Admin address: ${adminAddress}`);

        if (adminAddress !== '0x0000000000000000000000000000000000000000') {
          proxyAdmins.add(adminAddress);

          // Verify admin contract exists
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
      logger.info('💡 Possible reasons:');
      logger.info('   - Not using the standard OpenZeppelin proxy');
      logger.info('   - Different proxy architecture');
      logger.info('   - Need another method to locate the admin');
    } else if (proxyAdmins.size === 1) {
      const adminAddress = Array.from(proxyAdmins)[0];
      logger.info(`✅ Found a single ProxyAdmin address: ${adminAddress}`);
      logger.info('\n🎉 Use this address to update upgrade-via-proxyadmin.js:');
      logger.info(`   PROXY_ADMIN_ADDRESS: "${adminAddress}",`);
    } else {
      logger.info('⚠️  Found multiple admin addresses:');
      proxyAdmins.forEach((admin) => {
        logger.info(`   - ${admin}`);
      });
      logger.info('💡 Need to confirm which ProxyAdmin is correct');
    }

    // Additional check: try to call admin() function directly
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

    for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
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
