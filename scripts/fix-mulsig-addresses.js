#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Fix _mulSig addresses in all Producer contracts
 * Usage: node scripts/fix-mulsig-addresses.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Contract addresses from tnmainnet.md
    MULSIG_ADDRESS: "0x2c188Cf07c4370F6461066827bd1c6A856ab9B70",
    GOVERNANCE_ADDRESS: "0xc69bd55C22664cF319698984211FeD155403C066",
    
    // Foundation manager address (fill in the mainnet private key)
    FOUNDATION_MANAGER_ADDRESS: "0x7ec62bc5062fa1d94f27775d211a3585ca4048ae", // account with Foundation Manager permissions
    FOUNDATION_MANAGER_PRIVATE_KEY: "" // corresponding private key
};

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

async function fixMulSigAddresses() {
    try {
        console.log('🌐 Fixing Producer contract _mulSig addresses - MAINNET');
        console.log('===============================================');
        console.log(`Network: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`Target MulSig address: ${CONFIG.MULSIG_ADDRESS}`);
        console.log(`Foundation Manager: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
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
        
        if (parseFloat(balanceInUnit) < 0.05) {
            console.warn(`⚠️  Warning: Low balance (${balanceInUnit} UNIT), may be insufficient for gas`);
        }

        // Load contract ABIs
        const governanceABI = loadContractABI('Governance');
        const producerABI = loadContractABI('Producer');

        // Create governance contract instance
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        console.log('');
        console.log('🔍 Step 2: Verify Foundation Manager permissions');
        console.log('--------------------------------------');

        // Check Foundation Manager role (using mainnet Roles address)
        const rolesABI = loadContractABI('Roles');
        const roles = new web3.eth.Contract(rolesABI, "0x6916BC198C8A1aD890Ad941947231D424Bfae682");
        
        const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
        const hasPermission = await roles.methods.hasRole(FOUNDATION_MANAGER, CONFIG.FOUNDATION_MANAGER_ADDRESS).call();
        
        if (!hasPermission) {
            throw new Error(`Address ${CONFIG.FOUNDATION_MANAGER_ADDRESS} does not have FOUNDATION_MANAGER role`);
        }
        console.log('✅ Foundation Manager permission verified');

        console.log('');
        console.log('🔧 Step 3: Fix all Producer contracts (MAINNET)');
        console.log('------------------------------------------');

        // Get all treasure kinds and their producer addresses
        const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
        const results = [];

        for (const kind of treasureKinds) {
            console.log(`\n📋 Handling ${kind} Producer...`);

            try {
                // Get producer address from governance
                const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
                const producerAddress = treasureInfo[0];

                if (producerAddress === '0x0000000000000000000000000000000000000000') {
                    console.log(`   ⚠️  ${kind} Producer does not exist, skipping`);
                    results.push({ kind, status: 'skipped', reason: 'Producer not found' });
                    continue;
                }

                console.log(`   Producer address: ${producerAddress}`);

                // Create producer contract instance
                const producer = new web3.eth.Contract(producerABI, producerAddress);

                // Check current _mulSig value
                let currentMulSig;
                try {
                    currentMulSig = await producer.methods.getMulSigContract().call();
                    console.log(`   Current _mulSig: ${currentMulSig}`);
                } catch (error) {
                    console.log(`   ❌ Unable to fetch current _mulSig: ${error.message}`);
                    console.log(`   💡 This may indicate the contract has not been upgraded yet`);
                    results.push({ kind, status: 'failed', error: 'Contract not upgraded' });
                    continue;
                }

                // Check if already correct
                if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
                    console.log(`   ✅ _mulSig already correct, skipping`);
                    results.push({ kind, status: 'skipped', reason: 'Already correct' });
                    continue;
                }

                // Estimate gas for setMulSigContract
                const gasEstimate = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS)
                    .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.3);
                
                console.log(`   Gas estimate: ${gasEstimate} (with buffer: ${gasWithBuffer})`);
                console.log(`   Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   Estimated cost: ${estimatedCost} UNIT`);

                // Execute setMulSigContract
                const receipt = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                console.log(`   ✅ Set successfully!`);
                console.log(`   Tx hash: ${receipt.transactionHash}`);
                console.log(`   Gas used: ${receipt.gasUsed}`);
                console.log(`   Actual cost: ${web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                results.push({
                    kind,
                    status: 'success',
                    transactionHash: receipt.transactionHash,
                    gasUsed: receipt.gasUsed
                });

                // Wait for confirmation
                console.log(`   ⏳ Waiting for confirmation (15 seconds)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

            } catch (error) {
                console.log(`   ❌ Failed to set: ${error.message}`);
                results.push({
                    kind,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🧪 Step 4: Verify results');
        console.log('-----------------------');

        for (const kind of treasureKinds) {
            console.log(`\n🔍 Verifying ${kind} Producer...`);

            try {
                const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
                const producerAddress = treasureInfo[0];

                if (producerAddress === '0x0000000000000000000000000000000000000000') {
                    console.log(`   ⏭️  ${kind} Producer does not exist, skipping verification`);
                    continue;
                }

                const producer = new web3.eth.Contract(producerABI, producerAddress);
                const currentMulSig = await producer.methods.getMulSigContract().call();

                console.log(`   Current _mulSig: ${currentMulSig}`);

                if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
                    console.log(`   ✅ _mulSig address correct`);
                } else {
                    console.log(`   ❌ _mulSig address incorrect`);
                    console.log(`      Expected: ${CONFIG.MULSIG_ADDRESS}`);
                    console.log(`      Actual: ${currentMulSig}`);
                }

            } catch (error) {
                console.log(`   ❌ Verification failed: ${error.message}`);
            }
        }

        console.log('');
        console.log('📊 Fix results summary - MAINNET');
        console.log('========================');

        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
        const skipped = results.filter(r => r.status === 'skipped');

        console.log(`✅ Fixed successfully: ${successful.length} Producer(s)`);
        console.log(`❌ Failed to fix: ${failed.length} Producer(s)`);
        console.log(`⏭️  Skipped: ${skipped.length} Producer(s)`);

        if (successful.length > 0) {
            console.log('\n✅ Successfully fixed Producers:');
            successful.forEach(result => {
                console.log(`- ${result.kind}: ${result.transactionHash}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ Producers that failed to fix:');
            failed.forEach(result => {
                console.log(`- ${result.kind}: ${result.error}`);
            });
        }

        if (successful.length > 0) {
            console.log('\n🎉 _mulSig address fix completed!');
            console.log('All multisig operations should now work as expected.');
            console.log('\n💡 You can retry proposals that previously failed');
        }

        console.log('\n🌍 Mainnet fix complete!');
        console.log('Please save all transaction hashes for audit purposes.');

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    fixMulSigAddresses();
}

module.exports = fixMulSigAddresses; 
