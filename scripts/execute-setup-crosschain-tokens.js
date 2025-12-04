const { logger } = require('@treasurenet/logging-middleware');
const { setupCrosschainTokens } = require('./setup-crosschain-tokens');

// Configuration for different networks
const config = {
  // Ganache1 network configuration
  treasurenet: {
    rpcUrl: 'http://127.0.0.1:8555',
    sourceNetworkName: 'treasurenet',
    sourceChainId: 6666,
    sourceChain: {
      unit: '0x0000000000000000000000000000000000000000', // UNIT token address
      bridge: '0xCBD6B4FCfbcBfEbE60c11Ce035054824c0A63AC6', // Bridge contract address
      tcash: '0x830f39E20F0aB5e54C3EA2A0Acd3139Cc1c3698A', // TCash token address
    },
    targetChain: {
      unit: '0x8Fc8d557D73a718ee3485ed82d19a46B7912a6CF', // WUNIT token address
      bridge: '0xdC5AEA0014a2ff768F60f39A357F15a6D070f8C9', // Bridge contract address
      tcash: '0x53819C1F1752F46Ccd5FC062DD7FaF764C514f55', // wTCash token address
    },
    targetChainId: 6566,
    mulSig: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c', // MultiSig contract address
    roles: '0xa1Bf87580F2bfb1e3FC1ecC6bB773DBA48DF136C', // Roles contract address
    crosschainTokens: '0x00ed2199Be0F8A6e2AF06E47e427341A3632f2F7', // CrosschainTokens contract address
  },
  ethereum: {
    rpcUrl: 'http://127.0.0.1:8545',
    sourceNetworkName: 'ethereum',
    sourceChainId: 6566,
    sourceChain: {
      unit: '0x8Fc8d557D73a718ee3485ed82d19a46B7912a6CF', // UNIT token address
      bridge: '0xdC5AEA0014a2ff768F60f39A357F15a6D070f8C9', // Bridge contract address
      tcash: '0x53819C1F1752F46Ccd5FC062DD7FaF764C514f55', // wTCash token address
    },
    targetChain: {
      unit: '0x0000000000000000000000000000000000000000', // WUNIT token address
      bridge: '0xCBD6B4FCfbcBfEbE60c11Ce035054824c0A63AC6', // Bridge contract address
      tcash: '0x830f39E20F0aB5e54C3EA2A0Acd3139Cc1c3698A', // TCash token address
    },
    targetChainId: 6666,
    mulSig: '0x178027804d6F1DDf1e450c28aC740E475C39A67e', // MultiSig contract address
    roles: '0x044Bff8568B43c184E05FBf033d8904757df54d2', // Roles contract address
    crosschainTokens: '0xe642eeB1903ff349D48c48daEF3Ef426a43feF95', // CrosschainTokens contract address
  },
  // Add more network configurations here if needed
};

async function main() {
  try {
    logger.info('Starting crosschain token setup...');

    // Select the network configuration
    const networkConfig = config.treasurenet; // Change this to select different network

    logger.info('Using configuration:', {
      network: 'treasurenet',
      sourceChainId: networkConfig.sourceChainId,
      targetChainId: networkConfig.targetChainId,
    });

    // Execute the setup
    await setupCrosschainTokens(networkConfig);

    const networkConfigEthereum = config.ethereum; // Change this to select different network
    await setupCrosschainTokens(networkConfigEthereum);

    logger.info('Crosschain token setup completed successfully!');
  } catch (error) {
    logger.error('Error during setup:', error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(error);
    process.exit(1);
  });

