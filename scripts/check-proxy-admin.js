#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Check Proxy Admin information for Producer contracts
 * Usage: node scripts/check-proxy-admin.js
 */

// ===== Configuration Section =====
const CONFIG = {
  // Network configuration
  RPC_URL: 'http://127.0.0.1:8555',

  // Contract addresses
  GOVERNANCE_ADDRESS: '0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7',

  // Foundation manager address
  FOUNDATION_MANAGER_ADDRESS: '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
  FOUNDATION_MANAGER_PRIVATE_KEY: '0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2',
};

// Transparent Proxy ABI
const TRANSPARENT_PROXY_ABI = [
  {
    inputs: [],
    name: 'admin',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'implementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Load contract ABI
function loadContractABI(contractName) {
  try {
    const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
    const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    return contractJson.abi;
  } catch (error) {
    logger.error(`Failed to load ABI for ${contractName}:`, error.message);
    process.exit(1);
  }
}

async function checkProxyAdmin() {
  try {
    logger.info('Checking Proxy Admin info for Producer contracts');
    logger.info('==================================');
    logger.info(`Current account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
    logger.info('');

    // Initialize Web3
    const web3 = new Web3(CONFIG.RPC_URL);

    // Add the foundation manager account
    const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    // Load governance contract
    const governanceABI = loadContractABI('Governance');
    const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

    logger.info('🔍 Fetching Producer contract addresses...');
    logger.info('--------------------------');

    // Get Producer addresses from governance
    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
    const producerInfo = {};

    for (const kind of treasureKinds) {
      try {
        const treasureInfo = await governance.getTreasureByKind(kind);
        producerInfo[kind] = {
          producer: treasureInfo[0],
          productionData: treasureInfo[1],
        };
        logger.info(`${kind} Producer: ${treasureInfo[0]}`);
      } catch (error) {
        logger.info(`❌ ${kind}: ${error.message}`);
      }
    }

    logger.info('');
    logger.info('🔍 Inspecting Proxy Admin info...');
    logger.info('-------------------------');

    for (const [kind, info] of Object.entries(producerInfo)) {
      if (!info.producer || info.producer === '0x0000000000000000000000000000000000000000') {
        logger.info(`⏭️  ${kind}: skipping - contract address not found`);
        continue;
      }

      logger.info(`\n📋 ${kind} Producer: ${info.producer}`);

      try {
        // Try to get admin info using different methods

        // Method 1: Try calling admin() directly on the proxy
        logger.info('   Method 1: Call admin() directly on proxy...');
        try {
          const proxy = new web3.eth.Contract(TRANSPARENT_PROXY_ABI, info.producer);
          const admin = await proxy.methods.admin().call();
          logger.info(`   ✅ Proxy admin: ${admin}`);

          // Also get implementation
          try {
            const implementation = await proxy.methods.implementation().call();
            logger.info(`   📄 Implementation: ${implementation}`);
          } catch (implError) {
            logger.info(`   ⚠️  Unable to fetch implementation: ${implError.message}`);
          }
        } catch (directError) {
          logger.info(`   ❌ Direct call failed: ${directError.message}`);

          // Method 2: Try with ProxyAdmin contract
          logger.info('   Method 2: Inspect ProxyAdmin contract...');

          // Try to find ProxyAdmin by checking storage slots
          // Admin address is typically stored at slot 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
          const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
          try {
            const adminData = await web3.eth.getStorageAt(info.producer, adminSlot);
            const adminAddress = `0x${adminData.slice(-40)}`;

            if (adminAddress !== '0x0000000000000000000000000000000000000000') {
              logger.info(`   ✅ Admin from storage: ${web3.utils.toChecksumAddress(adminAddress)}`);
            } else {
              logger.info('   ❌ Storage slot empty');
            }
          } catch (storageError) {
            logger.info(`   ❌ Failed to read storage: ${storageError.message}`);
          }
        }

        // Method 3: Check if current account can upgrade
        logger.info('   Method 3: Check upgrade permissions for current account...');
        try {
          // Try to estimate gas for upgradeProxy call
          // This is a hacky way to check permissions without actually upgrading
          const producerABI = loadContractABI('OilProducer'); // Use any producer ABI
          const tempContract = new web3.eth.Contract(producerABI, info.producer);

          // Try to call a management function to test permissions
          const gasEstimate = await tempContract.methods.setMulSigContract(CONFIG.FOUNDATION_MANAGER_ADDRESS)
            .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

          logger.info(`   ✅ Current account has management permission (gas estimate: ${gasEstimate})`);
        } catch (permError) {
          logger.info(`   ❌ Permission check failed: ${permError.message}`);
        }
      } catch (error) {
        logger.info(`   ❌ Check failed: ${error.message}`);
      }
    }

    logger.info('');
    logger.info('🔍 Checking OpenZeppelin network manifests...');
    logger.info('-------------------------------');

    // Check if .openzeppelin directory exists
    const openzeppelinDir = path.join(process.cwd(), '.openzeppelin');
    if (fs.existsSync(openzeppelinDir)) {
      logger.info(`✅ .openzeppelin directory exists: ${openzeppelinDir}`);

      // Look for network manifest files
      const files = fs.readdirSync(openzeppelinDir);
      logger.info(`📁 Files: ${files.join(', ')}`);

      // Check for network-specific files
      const networkFiles = files.filter((f) => f.includes('6666') || f.includes('treasurenet'));
      if (networkFiles.length > 0) {
        logger.info(`🌐 Network files: ${networkFiles.join(', ')}`);

        // Try to read and parse manifest
        for (const file of networkFiles) {
          try {
            const filePath = path.join(openzeppelinDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const manifest = JSON.parse(content);

            logger.info(`\n📄 Contents of ${file}:`);
            logger.info(`   Admin: ${manifest.admin?.address || 'N/A'}`);
            logger.info(`   Proxy count: ${Object.keys(manifest.proxies || {}).length}`);

            if (manifest.proxies) {
              for (const [proxyAddr, proxyInfo] of Object.entries(manifest.proxies)) {
                logger.info(`   Proxy ${proxyAddr}: ${proxyInfo.kind || 'unknown'}`);
              }
            }
          } catch (parseError) {
            logger.info(`   ❌ Failed to parse ${file}: ${parseError.message}`);
          }
        }
      } else {
        logger.info('⚠️  No network manifest files found');
      }
    } else {
      logger.info('❌ .openzeppelin directory does not exist');
    }

    logger.info('');
    logger.info('💡 Suggested actions');
    logger.info('===========');
    logger.info('1. If the proxy admin differs from the current account:');
    logger.info('   - Use the correct admin account');
    logger.info('   - Or request the admin to transfer ownership');
    logger.info('');
    logger.info('2. If network manifests are the issue:');
    logger.info('   - Delete the .openzeppelin directory and reinitialize');
    logger.info('   - Or edit the manifest files manually');
    logger.info('');
    logger.info('3. Alternatives:');
    logger.info('   - Upgrade directly via the ProxyAdmin contract');
    logger.info('   - Or perform the upgrade via a multisig proposal');
  } catch (error) {
    logger.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  checkProxyAdmin();
}

module.exports = checkProxyAdmin;
