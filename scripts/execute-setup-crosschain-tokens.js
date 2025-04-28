const { setupCrosschainTokens } = require('./setup-crosschain-tokens');

// Configuration for different networks
const config = {
    // Ganache1 network configuration
    treasurenet: {
        rpcUrl: 'https://rpc.treasurenet.io',
        sourceNetworkName: 'treasurenet',
        sourceChainId: 1337,
        sourceChain: {
            unit: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // UNIT token address
            bridge: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Bridge contract address
        },
        targetChain: {
            unit: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // WUNIT token address
            bridge: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Bridge contract address
        },
        targetChainId: 1338,
        mulSig: '0xCf7Ed3TestAde236D1f0b1101', // MultiSig contract address
        roles: '0xDc64a140Aa3E981100a9becA4E685f962f0211', // Roles contract address
        crosschainTokens: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' // CrosschainTokens contract address
    },
    ethereum: {
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
        sourceNetworkName: 'ethereum',
        sourceChainId: 1,
        sourceChain: {
            unit: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // UNIT token address
            bridge: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Bridge contract address
        },
        targetChain: {
            unit: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // WUNIT token address
            bridge: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'  // Bridge contract address
        },
        targetChainId: 1,
        mulSig: '0xCf7Ed3TestAde236D1f0b1101', // MultiSig contract address
        roles: '0xDc64a140Aa3E981100a9becA4E685f962f0211', // Roles contract address
        crosschainTokens: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' // CrosschainTokens contract address
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

        const networkConfig2 = config.ethereum; // Change this to select different network
        await setupCrosschainTokens(networkConfig2);
        
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