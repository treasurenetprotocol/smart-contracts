#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Upgrade Producer contracts via ProxyAdmin
 * Usage: node scripts/upgrade-via-proxyadmin.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Discovered addresses (fill in the mainnet ProxyAdmin address)
    PROXY_ADMIN_ADDRESS: "0xb6281f28a463c4d7f6b022609a9f7bfeabd86323", // replace with mainnet ProxyAdmin
    
    // Foundation manager address (fill in the mainnet key)
    FOUNDATION_MANAGER_ADDRESS: "0xd6cAdb2E5150e4114e5E321CE195db209f1882ac", // mainnet foundation manager address
    FOUNDATION_MANAGER_PRIVATE_KEY: "", // mainnet private key
    
    // Producer addresses from mainnet (from tnmainnet.md)
    UPGRADES: {
        'OIL': {
            proxy: '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
            newImplementation: '0x5d840312eE45680022A4C371fb72a93a31EA47CD'
        },
        'GAS': {
            proxy: '0x470B0196f597DF699057599D436f7E259688BCd9',
            newImplementation: '0x0E767DDE97547c43fe4E1831bf905EA2C6cf58FF'
        },
        'ETH': {
            proxy: '0x4693c13eF898c50596072db86E420495C1680643',
            newImplementation: '0xe0eA5259BABD288F86a68a3cCBF7E2D999B2711c'
        },
        'BTC': {
            proxy: '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40',
            newImplementation: '0xBB6ABcCb5807B75076A48eBDED80F3427eB449Bc'
        }
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
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Load contract ABI
function loadContractABI(contractName) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        return contractJson.abi;
    } catch (error) {
        console.error(`Failed to load ABI for ${contractName}:`, error.message);
        process.exit(1);
    }
}

async function upgradeViaProxyAdmin() {
    try {
        console.log('🌐 Upgrade Producer contracts via ProxyAdmin - MAINNET');
        console.log('================================================');
        console.log(`Network: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`ProxyAdmin address: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
        console.log(`Executor account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Validate required configuration
        if (!CONFIG.PROXY_ADMIN_ADDRESS) {
            console.error('❌ Error: PROXY_ADMIN_ADDRESS is required');
            console.error('Please locate the ProxyAdmin address on mainnet and update CONFIG');
            process.exit(1);
        }

        if (!CONFIG.FOUNDATION_MANAGER_ADDRESS || !CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY) {
            console.error('❌ Error: FOUNDATION_MANAGER_ADDRESS and FOUNDATION_MANAGER_PRIVATE_KEY are required');
            console.error('Please update CONFIG with a privileged mainnet account');
            process.exit(1);
        }

        // Check if new implementations are provided
        const missingImplementations = [];
        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            if (!config.newImplementation) {
                missingImplementations.push(kind);
            }
        }

        if (missingImplementations.length > 0) {
            console.error('❌ Error: missing new implementation addresses for:');
            missingImplementations.forEach(kind => {
                console.error(`  - ${kind}: deploy a new implementation first`);
            });
            console.error('\n💡 Deploy new implementations with manual-upgrade-producers.js first');
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
        
        if (parseFloat(balanceInUnit) < 0.1) {
            console.warn(`⚠️  Warning: Low balance (${balanceInUnit} UNIT), gas may be insufficient`);
        }

        // Create ProxyAdmin contract instance
        const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, CONFIG.PROXY_ADMIN_ADDRESS);

        console.log('');
        console.log('🔍 Step 2: Validate ProxyAdmin permissions');
        console.log('-----------------------------');

        try {
            // Check who owns the ProxyAdmin
            const owner = await proxyAdmin.methods.owner().call();
            console.log(`ProxyAdmin owner: ${owner}`);
            
            if (owner.toLowerCase() === CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
                console.log('✅ Current account is the ProxyAdmin owner');
            } else {
                console.log('❌ Current account is not the ProxyAdmin owner');
                console.log('💡 On mainnet you may need multisig or the correct owner account');
                console.log(`   Current account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
                console.log(`   ProxyAdmin owner: ${owner}`);
                
                // Warn about mismatch
                console.log('⚠️  Warning: Permission mismatch; continuing may fail');
                console.log('Consider fixing permissions or using the correct account');
            }
        } catch (error) {
            console.log(`⚠️  Unable to check ProxyAdmin owner: ${error.message}`);
            console.log('Proceeding with upgrade attempt...');
        }

        console.log('');
        console.log('🔍 Step 3: Verify current implementation addresses');
        console.log('----------------------------');

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            console.log(`\n📋 ${kind} Producer:`);
            console.log(`   Proxy: ${config.proxy}`);
            console.log(`   New implementation: ${config.newImplementation}`);

            try {
                const currentImpl = await proxyAdmin.methods.getProxyImplementation(config.proxy).call();
                console.log(`   ✅ Current implementation: ${currentImpl}`);
                
                if (currentImpl.toLowerCase() === config.newImplementation.toLowerCase()) {
                    console.log(`   ✅ Already on latest implementation`);
                    config.needsUpgrade = false;
                } else {
                    console.log(`   🔄 Needs upgrade`);
                    config.needsUpgrade = true;
                }
            } catch (error) {
                console.log(`   ❌ Unable to fetch current implementation: ${error.message}`);
                config.needsUpgrade = true;
            }
        }

        console.log('');
        console.log('🚀 Step 4: Execute upgrades (MAINNET - use caution!)');
        console.log('--------------------------------------------');

        // Final confirmation for mainnet
        console.log('⚠️  Important: mainnet contract upgrade in progress!');
        console.log('Confirm the following are correct:');
        console.log(`- Network: Treasurenet Mainnet (${await web3.eth.net.getId()})`);
        console.log(`- Executor: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log(`- ProxyAdmin: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
        console.log('');

        const results = [];

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            if (!config.needsUpgrade) {
                console.log(`⏭️  Skipping ${kind}: already latest version`);
                results.push({ kind, status: 'skipped', reason: 'Already up to date' });
                continue;
            }

            console.log(`\n🔧 Upgrading ${kind} Producer... (MAINNET)`);

            try {
                // Estimate gas with higher buffer for mainnet
                const gasEstimate = await proxyAdmin.methods.upgrade(config.proxy, config.newImplementation)
                    .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.5); // Higher buffer for mainnet
                
                console.log(`   Gas estimate: ${gasEstimate} (with buffer: ${gasWithBuffer})`);
                console.log(`   Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   Estimated cost: ${estimatedCost} UNIT`);

                // Execute upgrade
                const receipt = await proxyAdmin.methods.upgrade(config.proxy, config.newImplementation).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                console.log(`   ✅ Upgrade successful!`);
                console.log(`   Tx hash: ${receipt.transactionHash}`);
                console.log(`   Gas used: ${receipt.gasUsed}`);
                console.log(`   Actual cost: ${web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                results.push({
                    kind,
                    status: 'success',
                    transactionHash: receipt.transactionHash,
                    gasUsed: receipt.gasUsed
                });

                // Wait longer for mainnet confirmation
                console.log(`   ⏳ Waiting for confirmation (30 seconds)...`);
                await new Promise(resolve => setTimeout(resolve, 30000));

            } catch (error) {
                console.log(`   ❌ Upgrade failed: ${error.message}`);
                results.push({
                    kind,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🧪 Step 5: Verify upgrade results');
        console.log('-----------------------');

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            console.log(`\n🔍 Verifying ${kind} Producer...`);

            try {
                // Check implementation
                const currentImpl = await proxyAdmin.methods.getProxyImplementation(config.proxy).call();
                console.log(`   Current implementation: ${currentImpl}`);

                if (currentImpl.toLowerCase() === config.newImplementation.toLowerCase()) {
                    console.log(`   ✅ Implementation address correct`);

                    // Test new function
                    try {
                        const producerABI = loadContractABI(kind === 'OIL' ? 'OilProducer' : 
                                                         kind === 'GAS' ? 'GasProducer' :
                                                         kind === 'ETH' ? 'EthProducer' : 'BtcProducer');
                        const producer = new web3.eth.Contract(producerABI, config.proxy);

                        // Test setMulSigContract function (mainnet MulSig address)
                        const mainnetMulSig = '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70';
                        const gasEstimate = await producer.methods.setMulSigContract(mainnetMulSig)
                            .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                        console.log(`   ✅ setMulSigContract works (gas: ${gasEstimate})`);
                        config.functionWorking = true;

                    } catch (funcError) {
                        console.log(`   ❌ setMulSigContract test failed: ${funcError.message}`);
                        config.functionWorking = false;
                    }
                } else {
                    console.log(`   ❌ Implementation mismatch`);
                    config.functionWorking = false;
                }

            } catch (error) {
                console.log(`   ❌ Verification failed: ${error.message}`);
                config.functionWorking = false;
            }
        }

        console.log('');
        console.log('📊 Upgrade summary - MAINNET');
        console.log('========================');

        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
        const skipped = results.filter(r => r.status === 'skipped');

        console.log(`✅ Successful upgrades: ${successful.length} contract(s)`);
        console.log(`❌ Failed upgrades: ${failed.length} contract(s)`);
        console.log(`⏭️  Skipped upgrades: ${skipped.length} contract(s)`);

        if (successful.length > 0) {
            console.log('\n✅ Contracts upgraded successfully:');
            successful.forEach(result => {
                const config = CONFIG.UPGRADES[result.kind];
                console.log(`- ${result.kind}: ${result.transactionHash}`);
                console.log(`  New function: ${config.functionWorking ? '✅ Available' : '❌ Unavailable'}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ Contracts that failed to upgrade:');
            failed.forEach(result => {
                console.log(`- ${result.kind}: ${result.error}`);
            });
        }

        const workingContracts = Object.values(CONFIG.UPGRADES).filter(c => c.functionWorking);
        if (workingContracts.length > 0) {
            console.log('\n🎉 Upgrades succeeded! You can now set the _mulSig address:');
            console.log('Update scripts/fix-mulsig-addresses.js for mainnet and run:');
            console.log('npm run fix:mulsig:tn-mainnet');
        } else {
            console.log('\n⚠️  New functionality still unavailable after upgrade; further action may be required');
        }

        console.log('\n🌍 Mainnet upgrade complete!');
        console.log('Please save all transaction hashes for audit.');

    } catch (error) {
        console.error('❌ Upgrade failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    upgradeViaProxyAdmin();
}

module.exports = upgradeViaProxyAdmin; 
