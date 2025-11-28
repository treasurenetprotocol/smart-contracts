#!/usr/bin/env node

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Manually upgrade Producer contracts by deploying new implementations
 * and updating them through ProxyAdmin - MAINNET VERSION
 * Usage: node scripts/manual-upgrade-producers.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Contract addresses from tnmainnet.md
    GOVERNANCE_ADDRESS: "0xc69bd55C22664cF319698984211FeD155403C066",
    
    // Foundation manager address (enter the mainnet key)
    FOUNDATION_MANAGER_ADDRESS: "0x7ec62bc5062fa1d94f27775d211a3585ca4048ae", // mainnet foundation manager address
    FOUNDATION_MANAGER_PRIVATE_KEY: "", // corresponding mainnet private key
    
    // Known Producer addresses from tnmainnet.md
    PRODUCER_ADDRESSES: {
        'OIL': '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
        'GAS': '0x470B0196f597DF699057599D436f7E259688BCd9',
        'ETH': '0x4693c13eF898c50596072db86E420495C1680643',
        'BTC': '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40'
    }
};

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
    {
        "inputs": [
            {"name": "proxy", "type": "address"},
            {"name": "implementation", "type": "address"}
        ],
        "name": "upgrade",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyImplementation",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyAdmin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Load contract ABI and Bytecode
function loadContract(contractName) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        return {
            abi: contractJson.abi,
            bytecode: contractJson.bytecode
        };
    } catch (error) {
        console.error(`Failed to load contract ${contractName}:`, error.message);
        process.exit(1);
    }
}

async function manualUpgrade() {
    try {
        console.log('🌐 Manually upgrading Producer contracts - MAINNET');
        console.log('=====================================');
        console.log(`Network: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`Executor account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Validate required configuration
        if (!CONFIG.FOUNDATION_MANAGER_ADDRESS || !CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY) {
            console.error('❌ Error: FOUNDATION_MANAGER_ADDRESS and FOUNDATION_MANAGER_PRIVATE_KEY are required');
            console.error('Please update CONFIG with a mainnet account that has permissions');
            process.exit(1);
        }

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);

        // Add the foundation manager account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);

        // Verify network connectivity
        console.log('🔗 Step 1: Verify network connectivity');
        console.log('-------------------------');
        try {
            const networkId = await web3.eth.net.getId();
            const blockNumber = await web3.eth.getBlockNumber();
            console.log(`✅ Network connection successful`);
            console.log(`   Network ID: ${networkId}`);
            console.log(`   Current block: ${blockNumber}`);
            
            if (networkId !== 5570) {
                console.warn(`⚠️  Warning: Expected Network ID 5570 (Treasurenet Mainnet), got ${networkId}`);
            }
        } catch (error) {
            console.error(`❌ Network connection failed: ${error.message}`);
            process.exit(1);
        }

        // Check account balance
        const balance = await web3.eth.getBalance(CONFIG.FOUNDATION_MANAGER_ADDRESS);
        const balanceInUnit = web3.utils.fromWei(balance, 'ether');
        console.log(`   Account balance: ${balanceInUnit} UNIT`);
        
        if (parseFloat(balanceInUnit) < 0.5) {
            console.warn(`⚠️  Warning: Balance is low (${balanceInUnit} UNIT); deploying may require more gas`);
        }

        console.log('');
        console.log('🔍 Step 2: Check current implementations');
        console.log('-----------------------------');

        const results = [];

        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n📋 ${kind} Producer: ${proxyAddress}`);

            try {
                // Try to find ProxyAdmin by checking proxy admin
                const proxyCode = await web3.eth.getCode(proxyAddress);
                if (proxyCode === '0x') {
                    throw new Error(`No contract found at proxy address ${proxyAddress}`);
                }

                // Try to get current implementation
                // For EIP-1967 proxies, implementation is stored at specific slot
                const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
                const implementationData = await web3.eth.getStorageAt(proxyAddress, implementationSlot);
                const currentImplementation = '0x' + implementationData.slice(-40);
                
                console.log(`   Current implementation: ${currentImplementation}`);
                
                results.push({
                    kind,
                    proxyAddress,
                    currentImplementation,
                    status: 'found'
                });

            } catch (error) {
                console.log(`   ❌ Check failed: ${error.message}`);
                results.push({
                    kind,
                    proxyAddress,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🚀 Step 3: Deploy new implementation contracts (MAINNET)');
        console.log('------------------------------------');

        // Important mainnet warning
        console.log('⚠️  Important: Deploying in MAINNET!');
        console.log('New Producer implementation contracts will be deployed; verify network and account.');
        console.log('');

        const deployedImplementations = {};

        for (const [kind, config] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n🔧 Deploying ${kind}Producer new implementation... (MAINNET)`);

            try {
                // Load contract
                const contractName = kind === 'OIL' ? 'OilProducer' :
                                   kind === 'GAS' ? 'GasProducer' :
                                   kind === 'ETH' ? 'EthProducer' : 'BtcProducer';
                
                const contract = loadContract(contractName);
                console.log(`   Loading contract: ${contractName}`);

                // Create contract instance for deployment
                const contractInstance = new web3.eth.Contract(contract.abi);

                // Estimate deployment gas
                const deployData = contractInstance.deploy({
                    data: contract.bytecode
                }).encodeABI();

                const gasEstimate = await web3.eth.estimateGas({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    data: deployData
                });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.5); // Higher buffer for mainnet
                
                console.log(`   Gas estimate: ${gasEstimate} (with buffer: ${gasWithBuffer})`);
                console.log(`   Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   Estimated cost: ${estimatedCost} UNIT`);

                // Deploy new implementation
                const deployedContract = await contractInstance.deploy({
                    data: contract.bytecode
                }).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                const implementationAddress = deployedContract.options.address;
                console.log(`   ✅ Deployment succeeded!`);
                console.log(`   Implementation: ${implementationAddress}`);
                console.log(`   Tx hash: ${deployedContract.transactionHash}`);
                
                const actualCost = await web3.eth.getTransactionReceipt(deployedContract.transactionHash);
                console.log(`   Gas used: ${actualCost.gasUsed}`);
                console.log(`   Actual cost: ${web3.utils.fromWei((BigInt(actualCost.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                deployedImplementations[kind] = implementationAddress;

                // Wait for confirmation
                console.log(`   ⏳ Waiting for confirmation (30 seconds)...`);
                await new Promise(resolve => setTimeout(resolve, 30000));

            } catch (error) {
                console.log(`   ❌ Deployment failed: ${error.message}`);
                deployedImplementations[kind] = null;
            }
        }

        console.log('');
        console.log('🧪 Step 4: Verify deployment results');
        console.log('-----------------------');

        const successfulDeployments = [];
        
        for (const [kind, implementationAddress] of Object.entries(deployedImplementations)) {
            if (implementationAddress) {
                console.log(`✅ ${kind}: ${implementationAddress}`);
                successfulDeployments.push({ kind, implementationAddress });
                
                // Verify contract code
                const code = await web3.eth.getCode(implementationAddress);
                if (code.length > 10) { // More than just '0x'
                    console.log(`   ✅ Contract code verified`);
                } else {
                    console.log(`   ❌ Contract code verification failed`);
                }
            } else {
                console.log(`❌ ${kind}: deployment failed`);
            }
        }

        console.log('');
        console.log('📊 Deployment summary - MAINNET');
        console.log('========================');

        console.log(`✅ Successful deployments: ${successfulDeployments.length} implementation(s)`);
        console.log(`❌ Failed deployments: ${Object.keys(deployedImplementations).length - successfulDeployments.length} implementation(s)`);

        if (successfulDeployments.length > 0) {
            console.log('\n🎉 New implementations deployed!');
            console.log('\n📋 New implementation addresses:');
            successfulDeployments.forEach(({ kind, implementationAddress }) => {
                console.log(`${kind}: ${implementationAddress}`);
            });

            console.log('\n📝 Next steps:');
            console.log('1. Update newImplementation addresses in upgrade-via-proxyadmin.js');
            console.log('2. Locate the ProxyAdmin contract address and update configuration');
            console.log('3. Run the upgrade script to upgrade proxies');
            console.log('4. Run fix-mulsig-addresses.js to set the _mulSig address');

            console.log('\n💡 Upgrade config template:');
            console.log('```javascript');
            console.log('UPGRADES: {');
            successfulDeployments.forEach(({ kind, implementationAddress }) => {
                const proxyAddress = CONFIG.PRODUCER_ADDRESSES[kind];
                console.log(`    '${kind}': {`);
                console.log(`        proxy: '${proxyAddress}',`);
                console.log(`        newImplementation: '${implementationAddress}'`);
                console.log(`    },`);
            });
            console.log('}');
            console.log('```');
        }

        console.log('\n🌍 Mainnet deployment complete!');
        console.log('Please save all contract addresses and transaction hashes for audit.');

    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    manualUpgrade();
}

module.exports = manualUpgrade; 
