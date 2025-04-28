const { setupCrosschainTokens } = require('./setup-crosschain-tokens');

// Configuration for different networks
const config = {
    // Ganache1 network configuration
    treasurenet: {
        rpcUrl: 'https://dev.testnet.treasurenet.io',
        sourceNetworkName: 'treasurenet',
        sourceChainId: 6666,
        sourceChain: {
            unit: '0x0000000000000000000000000000000000000000', // UNIT token address
            bridge: '0xe501CD75BA83798ECB408900034FF9BAC4926d5E', // Bridge contract address
            tcash: '0x09ca1ea264eE5751b88860A4e8788D18835647d5' // TCash token address
        },
        targetChain: {
            unit: '0x749145576124fde7770Ea6E2aB28A22Feac2b7Db', // WUNIT token address
            bridge: '0x74A8a0089D88e23435dBd2B8BB7Ba54060cd9903', // Bridge contract address
            tcash: '0x90141734C8e770dFb4ABFbaCFfe384114f48025f' // wTCash token address
        },
        targetChainId: 6566,
        mulSig: '0xF8808B377b264408f31C6aaFA122DD7992A2ec42', // MultiSig contract address
        roles: '0x4aD6427eD31Fc7eF5A142260CAc3592604882C1d', // Roles contract address
        crosschainTokens: '0xDdbe4c5E8633383B42b0CF2045eB744e469F044b' // CrosschainTokens contract address
    },
    ethereum: {
        rpcUrl: 'https://dev2.testnet.treasurenet.io',
        sourceNetworkName: 'ethereum',
        sourceChainId: 6566,
        sourceChain: {
            unit: '0x749145576124fde7770Ea6E2aB28A22Feac2b7Db', // UNIT token address
            bridge: '0x74A8a0089D88e23435dBd2B8BB7Ba54060cd9903', // Bridge contract address
            tcash: '0x90141734C8e770dFb4ABFbaCFfe384114f48025f' // wTCash token address
        },
        targetChain: {
            unit: '0x0000000000000000000000000000000000000000', // WUNIT token address
            bridge: '0xe501CD75BA83798ECB408900034FF9BAC4926d5E', // Bridge contract address
            tcash: '0x09ca1ea264eE5751b88860A4e8788D18835647d5' // TCash token address
        },
        targetChainId: 6666,
        mulSig: '0xb0c8A661D75E03335aC1837F09105423B308B34b', // MultiSig contract address
        roles: '0x6795357619dfD5663b3DCa34889F18cDB4342d45', // Roles contract address
        crosschainTokens: '0x8Fc8d557D73a718ee3485ed82d19a46B7912a6CF' // CrosschainTokens contract address
    }
    // Add more network configurations here if needed
};

async function main() {
    try {
        console.log('Starting crosschain token setup...');
        
        // Select the network configuration
        const networkConfig = config.treasurenet; // Change this to select different network
        
        console.log('Using configuration:', {
            network: 'treasurenet',
            sourceChainId: networkConfig.sourceChainId,
            targetChainId: networkConfig.targetChainId
        });



        // Execute the setup
        await setupCrosschainTokens(networkConfig);

        const networkConfigEthereum = config.ethereum; // Change this to select different network
        await setupCrosschainTokens(networkConfigEthereum);
        
        console.log('Crosschain token setup completed successfully!');
    } catch (error) {
        console.error('Error during setup:', error);
        process.exit(1);
    }
}

// Execute the main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 