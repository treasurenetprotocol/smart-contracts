#!/usr/bin/env node

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Pure Node.js script for registering DApp through multisig
 * No Truffle dependency required
 * Usage: node scripts/register-dapp-node.js
 */

// ===== Configuration Section =====
//dev
// const CONFIG = {
//     TREASURE_KIND: "OIL",  // Treasure type (OIL/GAS/ETH/BTC)
//     DAPP_NAME: "OTTER",  // DApp name
//     PAYEE_ADDRESS: "0x10da0cdaf4ad7b6667e1a4aad4083aa4b7139cbb",  // DApp payee address
    
//     // Network configuration
//     RPC_URL: "http://127.0.0.1:8555",  // Change this to your RPC endpoint
//     NETWORK_NAME: "development",  // Used for environment detection
    
//     // Contract addresses (update these with your deployed contract addresses)
//     MULSIG_ADDRESS: "0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c",
//     ROLES_ADDRESS: "0xa1Bf87580F2bfb1e3FC1ecC6bB773DBA48DF136C",
//     GOVERNANCE_ADDRESS: "0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7",
    
//     // Private key of a foundation manager (for signing transactions)
//     PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
// };

// pro
const CONFIG = {
    TREASURE_KIND: "OIL",  // Treasure type (OIL/GAS/ETH/BTC)
    DAPP_NAME: "OTTER",  // DApp name
    PAYEE_ADDRESS: "0x10da0cdaf4ad7b6667e1a4aad4083aa4b7139cbb",  // DApp payee address
    
    // Network configuration
    RPC_URL: "https://rpc.treasurenet.io",  // Change this to your RPC endpoint
    NETWORK_NAME: "development",  // Used for environment detection
    
    // Contract addresses (update these with your deployed contract addresses)
    MULSIG_ADDRESS: "0x2c188Cf07c4370F6461066827bd1c6A856ab9B70",
    ROLES_ADDRESS: "0x6916BC198C8A1aD890Ad941947231D424Bfae682",
    GOVERNANCE_ADDRESS: "0xc69bd55C22664cF319698984211FeD155403C066",
    
    // Private key of a foundation manager (for signing transactions)
    PRIVATE_KEY: "0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6"
};

// Load contract ABIs
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

// Get contract address from build files
function getContractAddress(contractName, networkId) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        
        if (contractJson.networks && contractJson.networks[networkId]) {
            return contractJson.networks[networkId].address;
        }
        return null;
    } catch (error) {
        console.error(`Failed to get address for ${contractName}:`, error.message);
        return null;
    }
}

async function registerDApp() {
    try {
        console.log('DApp Registration via Multisig (Node.js)');
        console.log('=========================================');
        console.log(`Configuration:`);
        console.log(`  Treasure Kind: ${CONFIG.TREASURE_KIND}`);
        console.log(`  DApp Name: ${CONFIG.DAPP_NAME}`);
        console.log(`  Payee Address: ${CONFIG.PAYEE_ADDRESS}`);
        console.log(`  RPC URL: ${CONFIG.RPC_URL}`);
        console.log('');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);
        
        // Validate payee address
        if (!web3.utils.isAddress(CONFIG.PAYEE_ADDRESS)) {
            throw new Error('Invalid payee address format');
        }

        // Add account from private key
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;
        
        console.log(`Using account: ${account.address}`);

        // Get network ID
        const networkId = await web3.eth.net.getId();
        console.log(`Network ID: ${networkId}`);

        // Get contract addresses
        let mulSigAddress = CONFIG.MULSIG_ADDRESS || getContractAddress('MulSig', networkId);
        let rolesAddress = CONFIG.ROLES_ADDRESS || getContractAddress('Roles', networkId);
        let governanceAddress = CONFIG.GOVERNANCE_ADDRESS || getContractAddress('Governance', networkId);

        if (!mulSigAddress || !rolesAddress || !governanceAddress) {
            console.error('Contract addresses not found. Please update CONFIG section with deployed addresses:');
            console.error(`MulSig: ${mulSigAddress || 'NOT FOUND'}`);
            console.error(`Roles: ${rolesAddress || 'NOT FOUND'}`);
            console.error(`Governance: ${governanceAddress || 'NOT FOUND'}`);
            process.exit(1);
        }

        // Load contract ABIs
        const mulSigABI = loadContractABI('MulSig');
        const rolesABI = loadContractABI('Roles');
        const governanceABI = loadContractABI('Governance');

        // Create contract instances
        const mulSig = new web3.eth.Contract(mulSigABI, mulSigAddress);
        const roles = new web3.eth.Contract(rolesABI, rolesAddress);
        const governance = new web3.eth.Contract(governanceABI, governanceAddress);

        console.log(`Contract addresses:`);
        console.log(`  MulSig: ${mulSigAddress}`);
        console.log(`  Roles: ${rolesAddress}`);
        console.log(`  Governance: ${governanceAddress}`);
        console.log('');

        // Validate treasure kind
        try {
            const treasureInfo = await governance.methods.getTreasureByKind(CONFIG.TREASURE_KIND).call();
            if (treasureInfo[0] === '0x0000000000000000000000000000000000000000') {
                throw new Error(`Treasure kind "${CONFIG.TREASURE_KIND}" not found`);
            }
            console.log(`Treasure "${CONFIG.TREASURE_KIND}" producer: ${treasureInfo[0]}`);
        } catch (error) {
            console.error(`Failed to validate treasure: ${error.message}`);
            process.exit(1);
        }

        // Get foundation managers
        const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
        const foundationManagerCount = await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call();
        
        if (foundationManagerCount === 0) {
            throw new Error('No foundation managers found');
        }

        const foundationManagers = [];
        for (let i = 0; i < foundationManagerCount; i++) {
            const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
            foundationManagers.push(manager);
        }

        console.log(`Foundation managers (${foundationManagers.length}):`);
        foundationManagers.forEach((manager, i) => {
            console.log(`  ${i + 1}. ${manager}`);
        });

        // Check if current account is a foundation manager
        if (!foundationManagers.includes(account.address)) {
            console.error(`Error: Account ${account.address} is not a foundation manager`);
            console.error('Please use a foundation manager private key');
            process.exit(1);
        }

        console.log(`✓ Using foundation manager: ${account.address}`);
        console.log('');

        // Create proposal
        console.log(`Creating proposal to register DApp "${CONFIG.DAPP_NAME}" for treasure "${CONFIG.TREASURE_KIND}"...`);
        
        const proposalTx = await mulSig.methods.proposeToRegisterDApp(
            CONFIG.TREASURE_KIND,
            CONFIG.DAPP_NAME,
            CONFIG.PAYEE_ADDRESS
        ).send({ 
            from: account.address,
            gas: 500000
        });

        // Get proposal ID from event
        const proposalId = proposalTx.events.RegisterDApp.returnValues.proposalId;
        console.log(`✓ Proposal created with ID: ${proposalId}`);

        // Get signature threshold
        const fmThreshold = await governance.methods.fmThreshold().call();
        console.log(`Required signatures: ${fmThreshold}`);
        console.log('');

        // Auto-sign and execute in test environment
        if (CONFIG.NETWORK_NAME === 'development' || CONFIG.NETWORK_NAME === 'test' || CONFIG.NETWORK_NAME === 'ganache') {
            console.log('Running in test environment - auto-signing and executing proposal');

            const requiredSignatures = Math.min(foundationManagers.length, parseInt(fmThreshold));

            // Sign with available foundation managers
            let signedCount = 0;
            for (let i = 0; i < foundationManagers.length && signedCount < requiredSignatures; i++) {
                const managerAddress = foundationManagers[i];
                
                // Check if already signed
                const hasAlreadySigned = await mulSig.methods.hasAlreadySigned(proposalId, managerAddress).call();
                if (hasAlreadySigned) {
                    console.log(`${managerAddress} has already signed`);
                    signedCount++;
                    continue;
                }

                // Only sign if we have the private key for this manager (current account)
                if (managerAddress === account.address) {
                    console.log(`${managerAddress} signing...`);
                    await mulSig.methods.signTransaction(proposalId).send({ 
                        from: account.address,
                        gas: 200000
                    });
                    signedCount++;
                    
                    const signCount = await mulSig.methods.getSignatureCount(proposalId).call();
                    console.log(`   Signatures: ${signCount}/${fmThreshold}`);
                } else {
                    console.log(`⚠️  Need ${managerAddress} to sign (different private key required)`);
                }
            }

            const finalSignCount = await mulSig.methods.getSignatureCount(proposalId).call();
            console.log(`\nTotal signatures collected: ${finalSignCount}/${fmThreshold}`);

            if (parseInt(finalSignCount) >= parseInt(fmThreshold)) {
                // Wait for confirmation period and execute
                console.log('\nWaiting for confirmation period...');
                
                // Get proposal details
                const proposalDetails = await mulSig.methods.transactionDetails(proposalId).call();
                const currentTime = Math.floor(Date.now() / 1000);
                const executionTime = parseInt(proposalDetails.excuteTime);
                
                if (executionTime > currentTime) {
                    const waitTime = executionTime - currentTime;
                    console.log(`Need to wait ${waitTime} seconds before execution`);
                    
                    // In test environment, we can advance time
                    if (CONFIG.NETWORK_NAME === 'development' || CONFIG.NETWORK_NAME === 'ganache') {
                        try {
                            await web3.currentProvider.send({
                                jsonrpc: "2.0",
                                method: "evm_increaseTime",
                                params: [waitTime + 1],
                                id: new Date().getTime()
                            });
                            await web3.currentProvider.send({
                                jsonrpc: "2.0",
                                method: "evm_mine",
                                id: new Date().getTime()
                            });
                            console.log('⏰ Time advanced for testing');
                        } catch (timeError) {
                            console.log('⚠️  Could not advance time, waiting naturally...');
                            await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
                        }
                    } else {
                        console.log('⏰ Waiting naturally...');
                        await new Promise(resolve => setTimeout(resolve, (waitTime + 1) * 1000));
                    }
                }

                console.log('Executing proposal...');
                await mulSig.methods.executeProposal(proposalId).send({ 
                    from: account.address,
                    gas: 500000
                });

                console.log('✅ Proposal executed successfully!');
                console.log(`✅ DApp "${CONFIG.DAPP_NAME}" registered for treasure "${CONFIG.TREASURE_KIND}"`);
                
                // Generate DApp ID
                const dappId = web3.utils.keccak256(
                    web3.utils.encodePacked(CONFIG.DAPP_NAME, CONFIG.PAYEE_ADDRESS)
                );
                console.log(`📝 DApp ID: ${dappId}`);

            } else {
                console.log('\n⚠️  Not enough signatures collected for automatic execution');
                console.log('Additional foundation managers need to sign manually');
            }

        } else {
            // Production environment - just show instructions
            console.log('\n=== PRODUCTION ENVIRONMENT ===');
            console.log(`📋 Proposal ID: ${proposalId}`);
            console.log(`📝 Required signatures: ${fmThreshold}`);
            
            // Generate DApp ID for reference
            const dappId = web3.utils.keccak256(
                web3.utils.encodePacked(CONFIG.DAPP_NAME, CONFIG.PAYEE_ADDRESS)
            );
            console.log(`📝 DApp ID (will be generated after execution): ${dappId}`);
            console.log(`📝 Short DApp ID: ${dappId.slice(0, 10)}`);
            
            console.log('\nNext steps:');
            console.log('1. Foundation managers need to sign the proposal');
            console.log('2. Wait for confirmation period after enough signatures');
            console.log('3. Execute the proposal');
            console.log('\n🖊️  Signing commands for foundation managers:');
            foundationManagers.forEach((manager, i) => {
                console.log(`${i + 1}. mulSig.methods.signTransaction(${proposalId}).send({from: "${manager}"})`);
            });
            console.log(`\n⚡ Execution command:`);
            console.log(`mulSig.methods.executeProposal(${proposalId}).send({from: "foundation_manager_address"})`);
        }

        console.log('\n🎉 Script execution completed');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    registerDApp();
}

module.exports = registerDApp; 