#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getPrivateKey,
  getNetwork,
  requireContracts,
} = require('./common/config');

/**
 * Diagnose upgrade issues for Producer contracts
 */

const PROXY_ADMIN_ADDRESS = process.env.PROXY_ADMIN_ADDRESS || '';

async function diagnoseUpgradeIssue() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['GOVERNANCE', 'OIL_PRODUCER', 'GAS_PRODUCER', 'ETH_PRODUCER', 'BTC_PRODUCER'],
      network,
    );

    const rpcUrl = getRpcUrl();
    const web3 = new Web3(rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);

    if (!PROXY_ADMIN_ADDRESS) {
      throw new Error('PROXY_ADMIN_ADDRESS env is required');
    }

    logger.info('🔍 Diagnosing upgrade issues');
    logger.info('========================');
    logger.info(`Network: ${network}`);
    logger.info(`RPC: ${rpcUrl}`);
    logger.info(`Executing account: ${account.address}`);
    logger.info(`ProxyAdmin: ${PROXY_ADMIN_ADDRESS}`);
    logger.info('');

    const PROXY_ADMIN_ABI = [
      { inputs: [{ name: 'proxy', type: 'address' }, { name: 'implementation', type: 'address' }], name: 'upgrade', outputs: [], stateMutability: 'nonpayable', type: 'function' },
      { inputs: [{ name: 'proxy', type: 'address' }], name: 'getProxyImplementation', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
      { inputs: [{ name: 'proxy', type: 'address' }], name: 'getProxyAdmin', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
      { inputs: [], name: 'owner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    ];

    const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, PROXY_ADMIN_ADDRESS);

    try {
      const proxyAdminCode = await web3.eth.getCode(PROXY_ADMIN_ADDRESS);
      if (proxyAdminCode === '0x') {
        logger.info('❌ ProxyAdmin contract does not exist');
        return;
      }
      logger.info('✅ ProxyAdmin contract exists');

      const owner = await proxyAdmin.methods.owner().call();
      logger.info(`ProxyAdmin owner: ${owner}`);
      if (owner.toLowerCase() === account.address.toLowerCase()) {
        logger.info('✅ Current account is the ProxyAdmin owner');
      } else {
        logger.info('❌ Current account is not the ProxyAdmin owner');
      }
    } catch (error) {
      logger.info(`❌ ProxyAdmin check failed: ${error.message}`);
    }

    logger.info('');
    logger.info('🔍 Step 2: Check each proxy admin');
    logger.info('-------------------------------');

    const producers = {
      OIL: contracts.OIL_PRODUCER,
      GAS: contracts.GAS_PRODUCER,
      ETH: contracts.ETH_PRODUCER,
      BTC: contracts.BTC_PRODUCER,
    };

    for (const [kind, proxyAddress] of Object.entries(producers)) {
      logger.info(`\n📋 ${kind} Producer: ${proxyAddress}`);

      try {
        const proxyAdminAddr = await proxyAdmin.methods.getProxyAdmin(proxyAddress).call();
        logger.info(`   Proxy admin: ${proxyAdminAddr}`);

        if (proxyAdminAddr.toLowerCase() === PROXY_ADMIN_ADDRESS.toLowerCase()) {
          logger.info('   ✅ Admin address correct');
        } else {
          logger.info('   ❌ Admin address mismatch');
        }

        const currentImpl = await proxyAdmin.methods.getProxyImplementation(proxyAddress).call();
        logger.info(`   Current implementation: ${currentImpl}`);
      } catch (error) {
        logger.info(`   ❌ Check failed: ${error.message}`);
      }
    }

    logger.info('');
    logger.info('🔍 Step 3: Check account status');
    logger.info('-----------------------');

    const balance = await web3.eth.getBalance(account.address);
    const balanceInUnit = web3.utils.fromWei(balance, 'ether');
    logger.info(`Account balance: ${balanceInUnit} UNIT`);
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  diagnoseUpgradeIssue();
}

module.exports = diagnoseUpgradeIssue;
