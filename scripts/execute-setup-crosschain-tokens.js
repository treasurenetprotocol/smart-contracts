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
            bridge: '0x3bc36829Bd0b9dcDE8a14759657f43074c909eD5', // Bridge contract address
            tcash: '0x7c12Ff2fD9052cb20EE3d435fa21ac42f93A8F92' // TCash token address
        },
        targetChain: {
            unit: '0xE53cC754C1eE55c51D00838246f411038B27710F', // WUNIT token address
            bridge: '0x3238084401723f184Ae7d0568d3CE6Da82253B96', // Bridge contract address
            tcash: '0x21680B5f31117C25B85702d764b9b23786233f89' // wTCash token address
        },
        targetChainId: 1,
        mulSig: '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70', // MultiSig contract address
        roles: '0x6916BC198C8A1aD890Ad941947231D424Bfae682', // Roles contract address
        crosschainTokens: '0x0388cDf7CA31Eb65f14e3C4528d3C5C2FF4b99c5' // CrosschainTokens contract address
    },
    ethereum: {
        rpcUrl: 'https://mainnet.infura.io/v3/b48b6730598247c889a8dd841d941e3b',
        sourceNetworkName: 'ethereum',
        sourceChainId: 1,
        sourceChain: {
            unit: '0xE53cC754C1eE55c51D00838246f411038B27710F', // UNIT token address
            bridge: '0x3238084401723f184Ae7d0568d3CE6Da82253B96', // Bridge contract address
            tcash: '0x21680B5f31117C25B85702d764b9b23786233f89' // wTCash token address
        },
        targetChain: {
            unit: '0x0000000000000000000000000000000000000000', // WUNIT token address
            bridge: '0x3bc36829Bd0b9dcDE8a14759657f43074c909eD5', // Bridge contract address
            tcash: '0x7c12Ff2fD9052cb20EE3d435fa21ac42f93A8F92' // TCash token address
        },
        targetChainId: 5570,
        mulSig: '0xd7527E250c1F581DB2DEE6B4944890FCb2FE9169', // MultiSig contract address
        roles: '0xC72D343c4608d6B22638De54Fe44613F2421c31e', // Roles contract address
        crosschainTokens: '0xba82476c385A066F742D262b68146E76EAB9c8b3' // CrosschainTokens contract address
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