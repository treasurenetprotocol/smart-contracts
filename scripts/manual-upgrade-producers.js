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
 * Manually upgrade producer proxies via governance/proxyAdmin
 */

const PROXY_ADMIN_ADDRESS = process.env.PROXY_ADMIN_ADDRESS || '';

async function main() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['GOVERNANCE', 'OIL_PRODUCER', 'GAS_PRODUCER', 'ETH_PRODUCER', 'BTC_PRODUCER'],
      network,
    );

    if (!PROXY_ADMIN_ADDRESS) {
      throw new Error('PROXY_ADMIN_ADDRESS env is required');
    }

    const web3 = new Web3(getRpcUrl());
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);

    logger.info('Manual Producer Upgrade');
    logger.info('======================');
    logger.info(`Network: ${network}`);
    logger.info(`ProxyAdmin: ${PROXY_ADMIN_ADDRESS}`);
    logger.info(`Executor: ${account.address}`);

    const PROXY_ADMIN_ABI = [
      { inputs: [{ name: 'proxy', type: 'address' }, { name: 'implementation', type: 'address' }], name: 'upgrade', outputs: [], stateMutability: 'nonpayable', type: 'function' },
      { inputs: [{ name: 'proxy', type: 'address' }], name: 'getProxyImplementation', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
      { inputs: [{ name: 'proxy', type: 'address' }], name: 'owner', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
    ];
    const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, PROXY_ADMIN_ADDRESS);

    const producers = {
      OIL: contracts.OIL_PRODUCER,
      GAS: contracts.GAS_PRODUCER,
      ETH: contracts.ETH_PRODUCER,
      BTC: contracts.BTC_PRODUCER,
    };

    logger.info('Producers:', producers);
    logger.info('⚠️  Provide NEW_IMPL_OIL/GAS/ETH/BTC env vars to perform upgrades.');

    for (const [kind, proxy] of Object.entries(producers)) {
      const newImpl = process.env[`NEW_IMPL_${kind}`];
      logger.info(`\n${kind} proxy: ${proxy}`);

      const currentImpl = await proxyAdmin.methods.getProxyImplementation(proxy).call();
      logger.info(`Current impl: ${currentImpl}`);

      if (!newImpl) {
        logger.info('No NEW_IMPL provided; skipping upgrade.');
        continue;
      }

      logger.info(`Upgrading to: ${newImpl}`);
      const tx = await proxyAdmin.methods.upgrade(proxy, newImpl).send({
        from: account.address,
        gas: 500000,
      });
      logger.info(`✅ Upgraded ${kind} via tx ${tx.transactionHash}`);
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
