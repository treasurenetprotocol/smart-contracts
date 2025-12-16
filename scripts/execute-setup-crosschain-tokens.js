#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const {
  getNetwork,
  getRpcUrl,
  requireContracts,
  getPrivateKey,
} = require('./common/config');
const { setupCrosschainTokens } = require('./setup-crosschain-tokens');

/**
 * Drive cross-chain token setup using env + deployments.
 *
 * Required env:
 *   TARGET_CHAIN_ID
 *   TARGET_UNIT
 *   TARGET_BRIDGE
 *   TARGET_TCASH
 * Optional:
 *   SOURCE_CHAIN_ID (default: provider chainId)
 *   SOURCE_UNIT (default: 0x0 for native)
 *   SOURCE_BRIDGE (default: CROSSCHAIN_BRIDGE from deployments)
 *   SOURCE_TCASH (default: TCASH from deployments)
 *   SOURCE_NETWORK_NAME / TARGET_NETWORK_NAME (labels only)
 */
async function main() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['MULSIG', 'ROLES', 'CROSSCHAIN_TOKENS', 'CROSSCHAIN_BRIDGE', 'TCASH', 'WTCASH', 'WUNIT'],
      network,
    );

    const sourceNetworkName = process.env.SOURCE_NETWORK_NAME || network;
    const targetNetworkName = process.env.TARGET_NETWORK_NAME || 'target';

    const targetChainId = parseInt(process.env.TARGET_CHAIN_ID || '0', 10);
    if (!targetChainId) throw new Error('TARGET_CHAIN_ID is required');

    const targetConfig = {
      unit: process.env.TARGET_UNIT,
      bridge: process.env.TARGET_BRIDGE,
      tcash: process.env.TARGET_TCASH,
    };
    if (!targetConfig.unit || !targetConfig.bridge || !targetConfig.tcash) {
      throw new Error('TARGET_UNIT, TARGET_BRIDGE, TARGET_TCASH are required');
    }

    const sourceChainId = parseInt(process.env.SOURCE_CHAIN_ID || '0', 10);

    const addresses = {
      rpcUrl: getRpcUrl(),
      sourceNetworkName,
      targetNetworkName,
      sourceChainId: sourceChainId || undefined,
      targetChainId,
      sourceChain: {
        unit: process.env.SOURCE_UNIT || '0x0000000000000000000000000000000000000000',
        bridge: process.env.SOURCE_BRIDGE || contracts.CROSSCHAIN_BRIDGE,
        tcash: process.env.SOURCE_TCASH || contracts.TCASH,
      },
      targetChain: targetConfig,
      mulSig: contracts.MULSIG,
      roles: contracts.ROLES,
      crosschainTokens: contracts.CROSSCHAIN_TOKENS,
      signerKey: getPrivateKey(),
    };

    logger.info('Starting crosschain token setup...');
    logger.info(`Network: ${network}`);
    logger.info(`Source network label: ${sourceNetworkName}`);
    logger.info(`Target network label: ${targetNetworkName}`);

    await setupCrosschainTokens(addresses);

    logger.info('Crosschain token setup completed successfully!');
  } catch (error) {
    logger.error('Error during setup:', error);
    process.exit(1);
  }
}

// Execute the main function
if (require.main === module) {
  main();
}

module.exports = { main };
