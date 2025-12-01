#!/usr/bin/env node

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Debug proposal data and treasure configuration
 * Usage: node scripts/debug-proposal-data.js [proposalId]
 */

// ===== Configuration Section =====
const CONFIG = {
    PROPOSAL_ID: process.argv[2] ? parseInt(process.argv[2]) : 4,
    
    // Network configuration
    RPC_URL: "http://127.0.0.1:8555",
    
    // Contract addresses
    MULSIG_ADDRESS: "0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c",
    GOVERNANCE_ADDRESS: "0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7",
    
    // Foundation manager address
    EXECUTOR_ADDRESS: "0x6A79824E6be14b7e5Cb389527A02140935a76cD5",
    EXECUTOR_PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
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

async function debugProposalData() {
    try {
        console.log('Debug Proposal Data & Treasure Configuration');
        console.log('============================================');
        console.log(`Proposal ID: ${CONFIG.PROPOSAL_ID}`);
        console.log('');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);

        // Add the executor account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.EXECUTOR_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);

        // Load contract ABIs
        const mulSigABI = loadContractABI('MulSig');
        const governanceABI = loadContractABI('Governance');

        // Create contract instances
        const mulSig = new web3.eth.Contract(mulSigABI, CONFIG.MULSIG_ADDRESS);
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        console.log('🔍 1. Check Governance Contract Treasure Configuration');
        console.log('------------------------------------------------------');

        // Test different treasure kinds
        const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
        
        for (const kind of treasureKinds) {
            try {
                const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
                console.log(`✅ ${kind}:`);
                console.log(`   Producer Address: ${treasureInfo[0] || treasureInfo.producer || 'N/A'}`);
                console.log(`   Production Data Address: ${treasureInfo[1] || treasureInfo.productionData || 'N/A'}`);
            } catch (error) {
                console.log(`❌ ${kind}: ${error.message}`);
            }
        }

        console.log('');
        console.log('🔍 2. Get Historical Events for Proposal Creation');
        console.log('-------------------------------------------------');

        try {
            // Look for ProposalCreated events
            const events = await mulSig.getPastEvents('AllEvents', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            
            const proposalEvents = events.filter(event => 
                event.returnValues && 
                (event.returnValues.proposalId === CONFIG.PROPOSAL_ID.toString() ||
                 event.returnValues.id === CONFIG.PROPOSAL_ID.toString())
            );
            
            console.log(`Found ${proposalEvents.length} events for proposal ${CONFIG.PROPOSAL_ID}:`);
            
            proposalEvents.forEach((event, index) => {
                console.log(`\n   Event ${index + 1}: ${event.event}`);
                console.log(`   Block: ${event.blockNumber}`);
                console.log(`   Transaction: ${event.transactionHash}`);
                console.log(`   Return Values:`, JSON.stringify(event.returnValues, null, 4));
            });
            
        } catch (error) {
            console.log(`❌ Error getting events: ${error.message}`);
        }

        console.log('');
        console.log('🔍 3. Try to Access Proposal Storage Directly');
        console.log('---------------------------------------------');

        // Try to manually access proposal data using different approaches
        try {
            // Method 1: Direct storage access (if available)
            console.log('Attempting direct storage access...');
            
            // Calculate storage slot for proposals[_proposalId]
            // proposals is at slot 0 in the contract
            const proposalSlot = web3.utils.soliditySha3(
                { type: 'uint256', value: CONFIG.PROPOSAL_ID },
                { type: 'uint256', value: 0 }
            );
            
            console.log(`Proposal storage slot: ${proposalSlot}`);
            
            // Try to read some storage slots
            for (let i = 0; i < 10; i++) {
                const slot = web3.utils.toBN(proposalSlot).add(web3.utils.toBN(i)).toString(16);
                const paddedSlot = '0x' + slot.padStart(64, '0');
                
                try {
                    const storageValue = await web3.eth.getStorageAt(CONFIG.MULSIG_ADDRESS, paddedSlot);
                    if (storageValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                        console.log(`   Slot ${i}: ${storageValue}`);
                        
                        // Try to decode as different types
                        if (i === 0) { // proposer address
                            console.log(`     Decoded as address: ${web3.utils.toChecksumAddress('0x' + storageValue.slice(-40))}`);
                        } else if (i === 5) { // _type
                            console.log(`     Decoded as uint256: ${web3.utils.toBN(storageValue).toString()}`);
                        }
                    }
                } catch (error) {
                    console.log(`   Slot ${i}: Error reading storage`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Storage access failed: ${error.message}`);
        }

        console.log('');
        console.log('🔍 4. Test Treasure Registration Function');
        console.log('-----------------------------------------');

        // Test if we can call registerDAppConnect directly on a known producer
        try {
            const oilTreasure = await governance.methods.getTreasureByKind('OIL').call();
            if (oilTreasure[0] && oilTreasure[0] !== '0x0000000000000000000000000000000000000000') {
                console.log(`✅ OIL Producer found at: ${oilTreasure[0]}`);
                
                // Load Producer ABI
                const producerABI = loadContractABI('Producer');
                const producer = new web3.eth.Contract(producerABI, oilTreasure[0]);
                
                // Test if registerDAppConnect function exists
                const registerFn = producer.options.jsonInterface.find(
                    item => item.name === 'registerDAppConnect' && item.type === 'function'
                );
                
                if (registerFn) {
                    console.log('✅ registerDAppConnect function exists in Producer');
                    console.log(`   Inputs: ${registerFn.inputs.map(i => `${i.type} ${i.name}`).join(', ')}`);
                    
                    // Test call (should fail due to onlyMulSig but will show if function exists)
                    try {
                        await producer.methods.registerDAppConnect('TestDApp', '0x1234567890123456789012345678901234567891').call({
                            from: CONFIG.EXECUTOR_ADDRESS
                        });
                        console.log('✅ Function call succeeded (unexpected)');
                    } catch (error) {
                        if (error.message.includes('onlyMulSig') || error.message.includes('Ownable')) {
                            console.log('✅ Function exists but requires MulSig permission (expected)');
                        } else {
                            console.log(`❌ Function call failed: ${error.message}`);
                        }
                    }
                } else {
                    console.log('❌ registerDAppConnect function not found in Producer');
                }
            } else {
                console.log('❌ OIL Producer not found or is zero address');
            }
        } catch (error) {
            console.log(`❌ Error testing treasure registration: ${error.message}`);
        }

        console.log('');
        console.log('🔍 5. Simulate Proposal Execution Step by Step');
        console.log('----------------------------------------------');

        try {
            // Try to simulate what executeProposal does
            console.log('Simulating executeProposal logic...');
            
            // Since we can't access proposal storage directly, let's check if the error
            // happens at the treasure lookup stage
            console.log('Testing governance.getTreasureByKind("OIL")...');
            const treasureInfo = await governance.methods.getTreasureByKind('OIL').call();
            console.log(`Producer Address: ${treasureInfo[0]}`);
            console.log(`Production Data Address: ${treasureInfo[1]}`);
            
            if (treasureInfo[0] === '0x0000000000000000000000000000000000000000') {
                console.log('❌ FOUND THE ISSUE: OIL treasure kind returns zero address!');
                console.log('   This means "OIL" treasure kind is not registered in Governance contract');
                console.log('   The proposal will fail at: require(producerAddr != address(0), "treasure not found with proposal\'s treasure kind")');
            } else {
                console.log('✅ OIL treasure kind exists, issue might be elsewhere');
            }
            
        } catch (error) {
            console.log(`❌ Simulation failed: ${error.message}`);
        }

        console.log('');
        console.log('📋 DEBUGGING SUMMARY');
        console.log('===================');
        console.log('Check the results above to identify the root cause:');
        console.log('');
        console.log('1. If OIL treasure returns zero address → Need to register OIL treasure first');
        console.log('2. If registerDAppConnect function missing → Wrong contract version');
        console.log('3. If proposal storage is empty → Proposal creation failed');
        console.log('4. If events show wrong parameters → Proposal created incorrectly');

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    debugProposalData();
}

module.exports = debugProposalData; 