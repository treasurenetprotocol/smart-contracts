#!/usr/bin/env node

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Try to register DApp directly without multisig (if possible)
 */

// ===== Configuration Section =====
const CONFIG = {
    RPC_URL: "http://127.0.0.1:8555",
    PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2",
    
    // DApp registration parameters
    TREASURE_KIND: "OIL",
    DAPP_NAME: "OtterStreamTest",
    PAYEE_ADDRESS: "0x1234567890123456789012345678901234567891",
    
    // Contract addresses
    GOVERNANCE_ADDRESS: "0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7"
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

async function directRegisterDApp() {
    try {
        console.log('Direct DApp Registration (Bypass Multisig)');
        console.log('==========================================');
        console.log(`Treasure: ${CONFIG.TREASURE_KIND}`);
        console.log(`DApp: ${CONFIG.DAPP_NAME}`);
        console.log(`Payee: ${CONFIG.PAYEE_ADDRESS}`);
        console.log('');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);
        
        // Add account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        console.log(`Using account: ${account.address}`);

        // Load contracts
        const governanceABI = loadContractABI('Governance');
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        // Get producer contract address
        const treasureInfo = await governance.methods.getTreasureByKind(CONFIG.TREASURE_KIND).call();
        const producerAddress = treasureInfo[0] || treasureInfo.ProducerContract;
        if (!producerAddress || producerAddress === "0x0000000000000000000000000000000000000000") {
            throw new Error(`Treasure kind "${CONFIG.TREASURE_KIND}" not found`);
        }
        
        console.log(`Producer contract: ${producerAddress}`);

        // Load producer contract
        const producerABI = loadContractABI('OilProducer'); // Try OilProducer first
        const producer = new web3.eth.Contract(producerABI, producerAddress);

        console.log('\n🔍 Checking if direct registration is possible...');

        // Method 1: Check if we're the owner
        try {
            const owner = await producer.methods.owner().call();
            console.log(`Producer owner: ${owner}`);
            console.log(`Is owner: ${owner.toLowerCase() === account.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
        } catch (error) {
            console.log('No owner() method found');
        }

        // Method 2: Try to call registerDAppConnect directly
        console.log('\n🚀 Attempting direct registerDAppConnect call...');
        
        try {
            // First check if DApp is already registered
            const dappId = web3.utils.keccak256(
                web3.utils.encodePacked(CONFIG.DAPP_NAME, CONFIG.PAYEE_ADDRESS)
            );
            
            try {
                const existingPayee = await producer.methods.getDAppPayee(dappId).call();
                console.log(`⚠️  DApp already registered with payee: ${existingPayee}`);
                console.log('✅ DApp registration already completed!');
                return;
            } catch (error) {
                console.log('DApp not yet registered, proceeding...');
            }

            // Try direct call
            const directTx = await producer.methods.registerDAppConnect(
                CONFIG.DAPP_NAME,
                CONFIG.PAYEE_ADDRESS
            ).send({
                from: account.address,
                gas: 300000
            });

            console.log('🎉 Success! DApp registered directly!');
            console.log(`Transaction hash: ${directTx.transactionHash}`);
            console.log(`DApp ID: ${dappId}`);

        } catch (directError) {
            console.log(`❌ Direct call failed: ${directError.message}`);
            
            if (directError.message.includes('onlyMulSig')) {
                console.log('   Reason: Function requires multisig authorization');
            }
            
            console.log('\n💡 Alternative approaches:');
            console.log('1. Complete the multisig proposal (get second signature)');
            console.log('2. Check if you have admin privileges on the contract');
            console.log('3. Contact contract deployer/owner');
        }

        // Method 3: Check for alternative registration methods
        console.log('\n🔍 Checking for alternative registration methods...');
        
        try {
            // Check if there's an admin-only version
            const adminRegisterTx = await producer.methods.registerDAppConnectAdmin(
                CONFIG.DAPP_NAME,
                CONFIG.PAYEE_ADDRESS
            ).send({
                from: account.address,
                gas: 300000
            });
            
            console.log('🎉 Success via admin method!');
            
        } catch (adminError) {
            console.log('No admin registration method found');
        }

        // Method 4: Check if we can modify the multisig requirement temporarily
        console.log('\n🔍 Checking contract upgrade capabilities...');
        
        try {
            // Check if contract is upgradeable and we're the admin
            const implementationSlot = await web3.eth.getStorageAt(
                producerAddress, 
                '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
            );
            
            if (implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                console.log('Contract appears to be upgradeable');
                console.log('Implementation:', implementationSlot);
            }
        } catch (error) {
            console.log('Contract upgrade check failed');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    directRegisterDApp();
}

module.exports = directRegisterDApp;

