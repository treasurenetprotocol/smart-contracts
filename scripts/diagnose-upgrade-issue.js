#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Diagnose upgrade issues for Producer contracts
 */

const CONFIG = {
  RPC_URL: 'https://rpc.treasurenet.io',
  PROXY_ADMIN_ADDRESS: '0xb6281f28a463c4d7f6b022609a9f7bfeabd86323',
  FOUNDATION_MANAGER_ADDRESS: '0x7ec62bc5062fa1d94f27775d211a3585ca4048ae',
  FOUNDATION_MANAGER_PRIVATE_KEY: '0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6',

  PRODUCER_ADDRESSES: {
    OIL: '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
    GAS: '0x470B0196f597DF699057599D436f7E259688BCd9',
    ETH: '0x4693c13eF898c50596072db86E420495C1680643',
    BTC: '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40',
  },

  NEW_IMPLEMENTATIONS: {
    OIL: '0x5d840312eE45680022A4C371fb72a93a31EA47CD',
    GAS: '0x0E767DDE97547c43fe4E1831bf905EA2C6cf58FF',
    ETH: '0xe0eA5259BABD288F86a68a3cCBF7E2D999B2711c',
    BTC: '0xBB6ABcCb5807B75076A48eBDED80F3427eB449Bc',
  },
};

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
  {
    inputs: [
      { name: 'proxy', type: 'address' },
      { name: 'implementation', type: 'address' },
    ],
    name: 'upgrade',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proxy', type: 'address' }],
    name: 'getProxyImplementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'proxy', type: 'address' }],
    name: 'getProxyAdmin',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

async function diagnoseUpgradeIssue() {
  try {
    logger.info('🔍 Diagnosing upgrade issues - MAINNET');
    logger.info('========================');

    const web3 = new Web3(CONFIG.RPC_URL);
    const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    logger.info(`Executing account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
    logger.info(`ProxyAdmin: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
    logger.info('');

    // Step 1: Check ProxyAdmin contract
    logger.info('🔍 Step 1: Check ProxyAdmin contract');
    logger.info('-----------------------------');

    const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, CONFIG.PROXY_ADMIN_ADDRESS);

    try {
      // Check if ProxyAdmin contract exists
      const proxyAdminCode = await web3.eth.getCode(CONFIG.PROXY_ADMIN_ADDRESS);
      if (proxyAdminCode === '0x') {
        logger.info('❌ ProxyAdmin contract does not exist');
        return;
      } else {
        logger.info('✅ ProxyAdmin contract exists');
      }

      // Check ProxyAdmin owner
      const owner = await proxyAdmin.methods.owner().call();
      logger.info(`ProxyAdmin owner: ${owner}`);

      if (owner.toLowerCase() === CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
        logger.info('✅ Current account is the ProxyAdmin owner');
      } else {
        logger.info('❌ Current account is not the ProxyAdmin owner');
        logger.info(`   Expected: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        logger.info(`   Actual: ${owner}`);
      }
    } catch (error) {
      logger.info(`❌ ProxyAdmin check failed: ${error.message}`);
    }

    // Step 2: Check each proxy's admin
    logger.info('');
    logger.info('🔍 Step 2: Check each proxy admin');
    logger.info('-------------------------------');

    for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
      logger.info(`\n📋 ${kind} Producer: ${proxyAddress}`);

      try {
        // Check proxy admin
        const proxyAdminAddr = await proxyAdmin.methods.getProxyAdmin(proxyAddress).call();
        logger.info(`   Proxy admin: ${proxyAdminAddr}`);

        if (proxyAdminAddr.toLowerCase() === CONFIG.PROXY_ADMIN_ADDRESS.toLowerCase()) {
          logger.info('   ✅ Admin address correct');
        } else {
          logger.info('   ❌ Admin address mismatch');
          logger.info(`      Expected: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
          logger.info(`      Actual: ${proxyAdminAddr}`);
        }

        // Check current implementation
        const currentImpl = await proxyAdmin.methods.getProxyImplementation(proxyAddress).call();
        logger.info(`   Current implementation: ${currentImpl}`);
      } catch (error) {
        logger.info(`   ❌ Check failed: ${error.message}`);
      }
    }

    // Step 3: Test upgrade with gas estimation
    logger.info('');
    logger.info('🔍 Step 3: Test upgrade operation');
    logger.info('-----------------------');

    for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
      logger.info(`\n🧪 Testing ${kind} Producer upgrade...`);

      const newImpl = CONFIG.NEW_IMPLEMENTATIONS[kind];

      try {
        // First check if new implementation exists
        const newImplCode = await web3.eth.getCode(newImpl);
        if (newImplCode === '0x') {
          logger.info(`   ❌ New implementation contract not found: ${newImpl}`);
          continue;
        }
        logger.info('   ✅ New implementation contract exists');

        // Try gas estimation
        const gasEstimate = await proxyAdmin.methods.upgrade(proxyAddress, newImpl)
          .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

        logger.info(`   ✅ Gas estimate succeeded: ${gasEstimate}`);

        // Try to call the function (dry run)
        try {
          await proxyAdmin.methods.upgrade(proxyAddress, newImpl)
            .call({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });
          logger.info('   ✅ Upgrade call test succeeded');
        } catch (callError) {
          logger.info(`   ❌ Upgrade call test failed: ${callError.message}`);

          // Try to decode the error
          if (callError.message.includes('revert')) {
            logger.info('   💡 Possible issue: execution reverted');
          } else if (callError.message.includes('owner')) {
            logger.info('   💡 Possible issue: insufficient permissions (not owner)');
          }
        }
      } catch (error) {
        logger.info(`   ❌ Test failed: ${error.message}`);

        if (error.message.includes('execution reverted')) {
          logger.info('   💡 Possible cause: insufficient permissions or invalid parameters');
        } else if (error.message.includes('insufficient funds')) {
          logger.info('   💡 Possible cause: insufficient account balance');
        }
      }
    }

    // Step 4: Check account balance and permissions
    logger.info('');
    logger.info('🔍 Step 4: Check account status');
    logger.info('-----------------------');

    const balance = await web3.eth.getBalance(CONFIG.FOUNDATION_MANAGER_ADDRESS);
    const balanceInUnit = web3.utils.fromWei(balance, 'ether');
    logger.info(`Account balance: ${balanceInUnit} UNIT`);

    if (parseFloat(balanceInUnit) < 0.01) {
      logger.info('⚠️  Balance may be insufficient for gas');
    }

    // Step 5: Alternative upgrade approach
    logger.info('');
    logger.info('💡 Alternative suggestions');
    logger.info('================');

    logger.info('If ProxyAdmin upgrades fail, try the following:');
    logger.info('1. Verify ProxyAdmin owner is correct');
    logger.info('2. Attempt the upgrade through multisig');
    logger.info('3. Check for other permission constraints');
    logger.info('4. Confirm the new implementation has no initialization issues');

    logger.info('\n🔧 Next steps:');
    const adminOwner = await proxyAdmin.methods.owner().call();
    if (adminOwner.toLowerCase() !== CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
      logger.info(`Use the ProxyAdmin owner account to upgrade: ${adminOwner}`);
    } else {
      logger.info('Permissions look correct; investigate contract code and parameters for other issues');
    }
  } catch (error) {
    logger.error('❌ Diagnosis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  diagnoseUpgradeIssue();
}

module.exports = diagnoseUpgradeIssue;
