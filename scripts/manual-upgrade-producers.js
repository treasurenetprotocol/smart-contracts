#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

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
  RPC_URL: 'https://rpc.treasurenet.io',

  // Contract addresses from tnmainnet.md
  GOVERNANCE_ADDRESS: '0xc69bd55C22664cF319698984211FeD155403C066',

  // Foundation manager address (enter the mainnet key)
  FOUNDATION_MANAGER_ADDRESS: '0x7ec62bc5062fa1d94f27775d211a3585ca4048ae', // mainnet foundation manager address
  FOUNDATION_MANAGER_PRIVATE_KEY: '', // corresponding mainnet private key

  // Known Producer addresses from tnmainnet.md
  PRODUCER_ADDRESSES: {
    OIL: '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
    GAS: '0x470B0196f597DF699057599D436f7E259688BCd9',
    ETH: '0x4693c13eF898c50596072db86E420495C1680643',
    BTC: '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40',
  },
};

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
  {
    inputs: [
      { name: 'proxy', type: 'address' },
      { name: 'implementation', type: 'address' },
    ],
    name: 'upgrade',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'proxy', type: 'address' }],
    name: 'getProxyImplementation',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'proxy', type: 'address' }],
    name: 'getProxyAdmin',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Load contract ABI and Bytecode
function loadContract(contractName) {
  try {
    const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
    const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    return {
      abi: contractJson.abi,
      bytecode: contractJson.bytecode,
    };
  } catch (error) {
    logger.error(`Failed to load contract ${contractName}:`, error.message);
    process.exit(1);
  }
}

async function manualUpgrade() {
  try {
    logger.info('🌐 Manually upgrading Producer contracts - MAINNET');
    logger.info('=====================================');
    logger.info('Network: Treasurenet Mainnet');
    logger.info(`RPC URL: ${CONFIG.RPC_URL}`);
    logger.info(`Executor account: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
    logger.info('');

    // Validate required configuration
    if (!CONFIG.FOUNDATION_MANAGER_ADDRESS || !CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY) {
      logger.error('❌ Error: FOUNDATION_MANAGER_ADDRESS and FOUNDATION_MANAGER_PRIVATE_KEY are required');
      logger.error('Please update CONFIG with a mainnet account that has permissions');
      process.exit(1);
    }

    // Initialize Web3
    const web3 = new Web3(CONFIG.RPC_URL);

    // Add the foundation manager account
    const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    // Verify network connectivity
    logger.info('🔗 Step 1: Verify network connectivity');
    logger.info('-------------------------');
    try {
      const networkId = await web3.eth.net.getId();
      const blockNumber = await web3.eth.getBlockNumber();
      logger.info('✅ Network connection successful');
      logger.info(`   Network ID: ${networkId}`);
      logger.info(`   Current block: ${blockNumber}`);

      if (networkId !== 5570) {
        logger.warn(`⚠️  Warning: Expected Network ID 5570 (Treasurenet Mainnet), got ${networkId}`);
      }
    } catch (error) {
      logger.error(`❌ Network connection failed: ${error.message}`);
      process.exit(1);
    }

    // Check account balance
    const balance = await web3.eth.getBalance(CONFIG.FOUNDATION_MANAGER_ADDRESS);
    const balanceInUnit = web3.utils.fromWei(balance, 'ether');
    logger.info(`   Account balance: ${balanceInUnit} UNIT`);

    if (parseFloat(balanceInUnit) < 0.5) {
      logger.warn(`⚠️  Warning: Balance is low (${balanceInUnit} UNIT); deploying may require more gas`);
    }

    logger.info('');
    logger.info('🔍 Step 2: Check current implementations');
    logger.info('-----------------------------');

    const results = [];

    for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
      logger.info(`\n📋 ${kind} Producer: ${proxyAddress}`);

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
        const currentImplementation = `0x${implementationData.slice(-40)}`;

        logger.info(`   Current implementation: ${currentImplementation}`);

        results.push({
          kind,
          proxyAddress,
          currentImplementation,
          status: 'found',
        });
      } catch (error) {
        logger.info(`   ❌ Check failed: ${error.message}`);
        results.push({
          kind,
          proxyAddress,
          status: 'error',
          error: error.message,
        });
      }
    }

    logger.info('');
    logger.info('🚀 Step 3: Deploy new implementation contracts (MAINNET)');
    logger.info('------------------------------------');

    // Important mainnet warning
    logger.info('⚠️  Important: Deploying in MAINNET!');
    logger.info('New Producer implementation contracts will be deployed; verify network and account.');
    logger.info('');

    const deployedImplementations = {};

    for (const [kind, config] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
      logger.info(`\n🔧 Deploying ${kind}Producer new implementation... (MAINNET)`);

      try {
        // Load contract
        const contractName = kind === 'OIL' ? 'OilProducer' :
          kind === 'GAS' ? 'GasProducer' :
            kind === 'ETH' ? 'EthProducer' : 'BtcProducer';

        const contract = loadContract(contractName);
        logger.info(`   Loading contract: ${contractName}`);

        // Create contract instance for deployment
        const contractInstance = new web3.eth.Contract(contract.abi);

        // Estimate deployment gas
        const deployData = contractInstance.deploy({
          data: contract.bytecode,
        }).encodeABI();

        const gasEstimate = await web3.eth.estimateGas({
          from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
          data: deployData,
        });

        const gasPrice = await web3.eth.getGasPrice();
        const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.5); // Higher buffer for mainnet

        logger.info(`   Gas estimate: ${gasEstimate} (with buffer: ${gasWithBuffer})`);
        logger.info(`   Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);

        const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
        logger.info(`   Estimated cost: ${estimatedCost} UNIT`);

        // Deploy new implementation
        const deployedContract = await contractInstance.deploy({
          data: contract.bytecode,
        }).send({
          from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
          gas: gasWithBuffer,
          gasPrice: Number(gasPrice),
        });

        const implementationAddress = deployedContract.options.address;
        logger.info('   ✅ Deployment succeeded!');
        logger.info(`   Implementation: ${implementationAddress}`);
        logger.info(`   Tx hash: ${deployedContract.transactionHash}`);

        const actualCost = await web3.eth.getTransactionReceipt(deployedContract.transactionHash);
        logger.info(`   Gas used: ${actualCost.gasUsed}`);
        logger.info(`   Actual cost: ${web3.utils.fromWei((BigInt(actualCost.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

        deployedImplementations[kind] = implementationAddress;

        // Wait for confirmation
        logger.info('   ⏳ Waiting for confirmation (30 seconds)...');
        await new Promise((resolve) => setTimeout(resolve, 30000));
      } catch (error) {
        logger.info(`   ❌ Deployment failed: ${error.message}`);
        deployedImplementations[kind] = null;
      }
    }

    logger.info('');
    logger.info('🧪 Step 4: Verify deployment results');
    logger.info('-----------------------');

    const successfulDeployments = [];

    for (const [kind, implementationAddress] of Object.entries(deployedImplementations)) {
      if (implementationAddress) {
        logger.info(`✅ ${kind}: ${implementationAddress}`);
        successfulDeployments.push({ kind, implementationAddress });

        // Verify contract code
        const code = await web3.eth.getCode(implementationAddress);
        if (code.length > 10) { // More than just '0x'
          logger.info('   ✅ Contract code verified');
        } else {
          logger.info('   ❌ Contract code verification failed');
        }
      } else {
        logger.info(`❌ ${kind}: deployment failed`);
      }
    }

    logger.info('');
    logger.info('📊 Deployment summary - MAINNET');
    logger.info('========================');

    logger.info(`✅ Successful deployments: ${successfulDeployments.length} implementation(s)`);
    logger.info(`❌ Failed deployments: ${Object.keys(deployedImplementations).length - successfulDeployments.length} implementation(s)`);

    if (successfulDeployments.length > 0) {
      logger.info('\n🎉 New implementations deployed!');
      logger.info('\n📋 New implementation addresses:');
      successfulDeployments.forEach(({ kind, implementationAddress }) => {
        logger.info(`${kind}: ${implementationAddress}`);
      });

      logger.info('\n📝 Next steps:');
      logger.info('1. Update newImplementation addresses in upgrade-via-proxyadmin.js');
      logger.info('2. Locate the ProxyAdmin contract address and update configuration');
      logger.info('3. Run the upgrade script to upgrade proxies');
      logger.info('4. Run fix-mulsig-addresses.js to set the _mulSig address');

      logger.info('\n💡 Upgrade config template:');
      logger.info('```javascript');
      logger.info('UPGRADES: {');
      successfulDeployments.forEach(({ kind, implementationAddress }) => {
        const proxyAddress = CONFIG.PRODUCER_ADDRESSES[kind];
        logger.info(`    '${kind}': {`);
        logger.info(`        proxy: '${proxyAddress}',`);
        logger.info(`        newImplementation: '${implementationAddress}'`);
        logger.info('    },');
      });
      logger.info('}');
      logger.info('```');
    }

    logger.info('\n🌍 Mainnet deployment complete!');
    logger.info('Please save all contract addresses and transaction hashes for audit.');
  } catch (error) {
    logger.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  manualUpgrade();
}

module.exports = manualUpgrade;
