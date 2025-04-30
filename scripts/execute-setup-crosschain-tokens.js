const { setupCrosschainTokens } = require('./setup-crosschain-tokens');

// Configuration for different networks
const config = {
    // Ganache1 network configuration
    treasurenet: {
        // rpcUrl: 'https://dev.testnet.treasurenet.io',
        rpcUrl: 'https://rpc.treasurenet.io',
        sourceNetworkName: 'treasurenet',
        sourceChainId: 5570,
        sourceChain: {
            unit: '0x0000000000000000000000000000000000000000', // UNIT token address
            bridge: '0xd7867407B63fF97103E31683a0fF5945a7041649', // Bridge contract address
            tcash: '0xD25Eb7D9e1ff9E74b57a599EC85688854c81B0Aa' // TCash token address
        },
        targetChain: {
            unit: '0x7EB551DB5C42A4d96f3E5Fe819f831D45FC409cF', // WUNIT token address
            bridge: '0x5dD2A3F881aD634415B371aE3B31F70DAC2538Cc', // Bridge contract address
            tcash: '0x7C858943f2BCCe86f56aF146e28881eD32fC5030' // wTCash token address
        },
        targetChainId: 1,
        mulSig: '0xb73eCa559c2606A37365eA8f66CC6157D344Ffe5', // MultiSig contract address
        roles: '0x5dD2A3F881aD634415B371aE3B31F70DAC2538Cc', // Roles contract address
        crosschainTokens: '0x57a823F89907b27ca141197e9e0Ec44B446E6C65' // CrosschainTokens contract address
    },
    ethereum: {
        rpcUrl: 'https://mainnet.infura.io/v3/b48b6730598247c889a8dd841d941e3b',
        sourceNetworkName: 'ethereum',
        sourceChainId: 1,
        sourceChain: {
            unit: '0x7EB551DB5C42A4d96f3E5Fe819f831D45FC409cF', // UNIT token address
            bridge: '0x5dD2A3F881aD634415B371aE3B31F70DAC2538Cc', // Bridge contract address
            tcash: '0x7C858943f2BCCe86f56aF146e28881eD32fC5030' // wTCash token address
        },
        targetChain: {
            unit: '0x0000000000000000000000000000000000000000', // WUNIT token address
            bridge: '0xd7867407B63fF97103E31683a0fF5945a7041649', // Bridge contract address
            tcash: '0xD25Eb7D9e1ff9E74b57a599EC85688854c81B0Aa' // TCash token address
        },
        targetChainId: 5570,
        mulSig: '0xABaF45c363D9156AD04D8c5a139BDFB1FB168B96', // MultiSig contract address
        roles: '0x32375a14E0a93888B8442f1230A9E8df41362743', // Roles contract address
        crosschainTokens: '0x72F3476736dE03ad799B9c23C6C9B236B0Ad6380' // CrosschainTokens contract address
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