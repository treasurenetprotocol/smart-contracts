#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Check Proxy Admin information for Producer contracts
 * Usage: node scripts/check-proxy-admin.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration
    RPC_URL: "http://127.0.0.1:8555",
    
    // Contract addresses
    GOVERNANCE_ADDRESS: "0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7",
    
    // Foundation manager address
    FOUNDATION_MANAGER_ADDRESS: "0x6A79824E6be14b7e5Cb389527A02140935a76cD5",
    FOUNDATION_MANAGER_PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
};

// Standard ProxyAdmin ABI - just the admin function
const PROXY_ADMIN_ABI = [
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyAdmin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Transparent Proxy ABI
const TRANSPARENT_PROXY_ABI = [
    {
        "inputs": [],
        "name": "admin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "implementation",
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

async function checkProxyAdmin() {
    try {
        console.log('Checking Proxy Admin info for Producer contracts');
        console.log('==================================');
        console.log(`Current account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);

        // Add the foundation manager account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);

        // Load governance contract
        const governanceABI = loadContractABI('Governance');
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        console.log('🔍 Fetching Producer contract addresses...');
        console.log('--------------------------');

        // Get Producer addresses from governance
        const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
        const producerInfo = {};
        
        for (const kind of treasureKinds) {
            try {
                const treasureInfo = await governance.getTreasureByKind(kind);
                producerInfo[kind] = {
                    producer: treasureInfo[0],
                    productionData: treasureInfo[1]
                };
                console.log(`${kind} Producer: ${treasureInfo[0]}`);
            } catch (error) {
                console.log(`❌ ${kind}: ${error.message}`);
            }
        }

        console.log('');
        console.log('🔍 Inspecting Proxy Admin info...');
        console.log('-------------------------');

        for (const [kind, info] of Object.entries(producerInfo)) {
            if (!info.producer || info.producer === '0x0000000000000000000000000000000000000000') {
                console.log(`⏭️  ${kind}: skipping - contract address not found`);
                continue;
            }

                console.log(`\n📋 ${kind} Producer: ${info.producer}`);

            try {
                // Try to get admin info using different methods
                
                // Method 1: Try calling admin() directly on the proxy
                console.log('   Method 1: Call admin() directly on proxy...');
                try {
                    const proxy = new web3.eth.Contract(TRANSPARENT_PROXY_ABI, info.producer);
                    const admin = await proxy.methods.admin().call();
                    console.log(`   ✅ Proxy admin: ${admin}`);
                    
                    // Also get implementation
                    try {
                        const implementation = await proxy.methods.implementation().call();
                        console.log(`   📄 Implementation: ${implementation}`);
                    } catch (implError) {
                        console.log(`   ⚠️  Unable to fetch implementation: ${implError.message}`);
                    }
                } catch (directError) {
                    console.log(`   ❌ Direct call failed: ${directError.message}`);
                    
                    // Method 2: Try with ProxyAdmin contract
                    console.log('   Method 2: Inspect ProxyAdmin contract...');
                    
                    // Try to find ProxyAdmin by checking storage slots
                    // Admin address is typically stored at slot 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
                    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
                    try {
                        const adminData = await web3.eth.getStorageAt(info.producer, adminSlot);
                        const adminAddress = '0x' + adminData.slice(-40);
                        
                        if (adminAddress !== '0x0000000000000000000000000000000000000000') {
                            console.log(`   ✅ Admin from storage: ${web3.utils.toChecksumAddress(adminAddress)}`);
                        } else {
                            console.log(`   ❌ Storage slot empty`);
                        }
                    } catch (storageError) {
                        console.log(`   ❌ Failed to read storage: ${storageError.message}`);
                    }
                }

                // Method 3: Check if current account can upgrade
                console.log('   Method 3: Check upgrade permissions for current account...');
                try {
                    // Try to estimate gas for upgradeProxy call
                    // This is a hacky way to check permissions without actually upgrading
                    const producerABI = loadContractABI('OilProducer'); // Use any producer ABI
                    const tempContract = new web3.eth.Contract(producerABI, info.producer);
                    
                    // Try to call a management function to test permissions
                    const gasEstimate = await tempContract.methods.setMulSigContract(CONFIG.FOUNDATION_MANAGER_ADDRESS)
                        .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });
                    
                    console.log(`   ✅ Current account has management permission (gas estimate: ${gasEstimate})`);
                } catch (permError) {
                    console.log(`   ❌ Permission check failed: ${permError.message}`);
                }

            } catch (error) {
                console.log(`   ❌ Check failed: ${error.message}`);
            }
        }

        console.log('');
        console.log('🔍 Checking OpenZeppelin network manifests...');
        console.log('-------------------------------');

        // Check if .openzeppelin directory exists
        const openzeppelinDir = path.join(process.cwd(), '.openzeppelin');
        if (fs.existsSync(openzeppelinDir)) {
            console.log(`✅ .openzeppelin directory exists: ${openzeppelinDir}`);
            
            // Look for network manifest files
            const files = fs.readdirSync(openzeppelinDir);
            console.log(`📁 Files: ${files.join(', ')}`);
            
            // Check for network-specific files
            const networkFiles = files.filter(f => f.includes('6666') || f.includes('treasurenet'));
            if (networkFiles.length > 0) {
                console.log(`🌐 Network files: ${networkFiles.join(', ')}`);
                
                // Try to read and parse manifest
                for (const file of networkFiles) {
                    try {
                        const filePath = path.join(openzeppelinDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const manifest = JSON.parse(content);
                        
                        console.log(`\n📄 Contents of ${file}:`);
                        console.log(`   Admin: ${manifest.admin?.address || 'N/A'}`);
                        console.log(`   Proxy count: ${Object.keys(manifest.proxies || {}).length}`);
                        
                        if (manifest.proxies) {
                            for (const [proxyAddr, proxyInfo] of Object.entries(manifest.proxies)) {
                                console.log(`   Proxy ${proxyAddr}: ${proxyInfo.kind || 'unknown'}`);
                            }
                        }
                    } catch (parseError) {
                        console.log(`   ❌ Failed to parse ${file}: ${parseError.message}`);
                    }
                }
            } else {
                console.log('⚠️  No network manifest files found');
            }
        } else {
            console.log('❌ .openzeppelin directory does not exist');
        }

        console.log('');
        console.log('💡 Suggested actions');
        console.log('===========');
        console.log('1. If the proxy admin differs from the current account:');
        console.log('   - Use the correct admin account');
        console.log('   - Or request the admin to transfer ownership');
        console.log('');
        console.log('2. If network manifests are the issue:');
        console.log('   - Delete the .openzeppelin directory and reinitialize');
        console.log('   - Or edit the manifest files manually');
        console.log('');
        console.log('3. Alternatives:');
        console.log('   - Upgrade directly via the ProxyAdmin contract');
        console.log('   - Or perform the upgrade via a multisig proposal');

    } catch (error) {
        console.error('❌ Check failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    checkProxyAdmin();
}

module.exports = checkProxyAdmin;
