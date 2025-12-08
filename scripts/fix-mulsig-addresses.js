#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Fix _mulSig addresses in all Producer contracts
 * Usage: node scripts/fix-mulsig-addresses.js
 */

// ===== Configuration Section =====
const CONFIG = {
  // Network configuration for Mainnet
  RPC_URL: 'https://rpc.treasurenet.io',

  // Contract addresses from tnmainnet.md
  MULSIG_ADDRESS: '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70',
  GOVERNANCE_ADDRESS: '0xc69bd55C22664cF319698984211FeD155403C066',

  // Foundation manager address (fill in the mainnet private key)
  FOUNDATION_MANAGER_ADDRESS: '0x7ec62bc5062fa1d94f27775d211a3585ca4048ae', // account with Foundation Manager permissions
  FOUNDATION_MANAGER_PRIVATE_KEY: '', // corresponding private key
};

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

async function fixMulSigAddresses() {
  try {
    logger.info('🌐 Fixing Producer contract _mulSig addresses - MAINNET');
    logger.info('===============================================');
    logger.info('Network: Treasurenet Mainnet');
    logger.info(`RPC URL: ${CONFIG.RPC_URL}`);
    logger.info(`Target MulSig address: ${CONFIG.MULSIG_ADDRESS}`);
    logger.info(`Foundation Manager: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
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

    if (parseFloat(balanceInUnit) < 0.05) {
      logger.warn(`⚠️  Warning: Low balance (${balanceInUnit} UNIT), may be insufficient for gas`);
    }

    // Load contract ABIs
    const governanceABI = loadContractABI('Governance');
    const producerABI = loadContractABI('Producer');

    // Create governance contract instance
    const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

    logger.info('');
    logger.info('🔍 Step 2: Verify Foundation Manager permissions');
    logger.info('--------------------------------------');

    // Check Foundation Manager role (using mainnet Roles address)
    const rolesABI = loadContractABI('Roles');
    const roles = new web3.eth.Contract(rolesABI, '0x6916BC198C8A1aD890Ad941947231D424Bfae682');

    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const hasPermission = await roles.methods.hasRole(FOUNDATION_MANAGER, CONFIG.FOUNDATION_MANAGER_ADDRESS).call();

    if (!hasPermission) {
      throw new Error(`Address ${CONFIG.FOUNDATION_MANAGER_ADDRESS} does not have FOUNDATION_MANAGER role`);
    }
    logger.info('✅ Foundation Manager permission verified');

    logger.info('');
    logger.info('🔧 Step 3: Fix all Producer contracts (MAINNET)');
    logger.info('------------------------------------------');

    // Get all treasure kinds and their producer addresses
    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
    const results = [];

    for (const kind of treasureKinds) {
      logger.info(`\n📋 Handling ${kind} Producer...`);

      try {
        // Get producer address from governance
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        const producerAddress = treasureInfo[0];

        if (producerAddress === '0x0000000000000000000000000000000000000000') {
          logger.info(`   ⚠️  ${kind} Producer does not exist, skipping`);
          results.push({ kind, status: 'skipped', reason: 'Producer not found' });
          continue;
        }

        logger.info(`   Producer address: ${producerAddress}`);

        // Create producer contract instance
        const producer = new web3.eth.Contract(producerABI, producerAddress);

        // Check current _mulSig value
        let currentMulSig;
        try {
          currentMulSig = await producer.methods.getMulSigContract().call();
          logger.info(`   Current _mulSig: ${currentMulSig}`);
        } catch (error) {
          logger.info(`   ❌ Unable to fetch current _mulSig: ${error.message}`);
          logger.info('   💡 This may indicate the contract has not been upgraded yet');
          results.push({ kind, status: 'failed', error: 'Contract not upgraded' });
          continue;
        }

        // Check if already correct
        if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
          logger.info('   ✅ _mulSig already correct, skipping');
          results.push({ kind, status: 'skipped', reason: 'Already correct' });
          continue;
        }

        // Estimate gas for setMulSigContract
        const gasEstimate = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS)
          .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

        const gasPrice = await web3.eth.getGasPrice();
        const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.3);

        logger.info(`   Gas estimate: ${gasEstimate} (with buffer: ${gasWithBuffer})`);
        logger.info(`   Gas price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);

        const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
        logger.info(`   Estimated cost: ${estimatedCost} UNIT`);

        // Execute setMulSigContract
        const receipt = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS).send({
          from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
          gas: gasWithBuffer,
          gasPrice: Number(gasPrice),
        });

        logger.info('   ✅ Set successfully!');
        logger.info(`   Tx hash: ${receipt.transactionHash}`);
        logger.info(`   Gas used: ${receipt.gasUsed}`);
        logger.info(`   Actual cost: ${web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

        results.push({
          kind,
          status: 'success',
          transactionHash: receipt.transactionHash,
          gasUsed: receipt.gasUsed,
        });

        // Wait for confirmation
        logger.info('   ⏳ Waiting for confirmation (15 seconds)...');
        await new Promise((resolve) => setTimeout(resolve, 15000));
      } catch (error) {
        logger.info(`   ❌ Failed to set: ${error.message}`);
        results.push({
          kind,
          status: 'failed',
          error: error.message,
        });
      }
    }

    logger.info('');
    logger.info('🧪 Step 4: Verify results');
    logger.info('-----------------------');

    for (const kind of treasureKinds) {
      logger.info(`\n🔍 Verifying ${kind} Producer...`);

      try {
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        const producerAddress = treasureInfo[0];

        if (producerAddress === '0x0000000000000000000000000000000000000000') {
          logger.info(`   ⏭️  ${kind} Producer does not exist, skipping verification`);
          continue;
        }

        const producer = new web3.eth.Contract(producerABI, producerAddress);
        const currentMulSig = await producer.methods.getMulSigContract().call();

        logger.info(`   Current _mulSig: ${currentMulSig}`);

        if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
          logger.info('   ✅ _mulSig address correct');
        } else {
          logger.info('   ❌ _mulSig address incorrect');
          logger.info(`      Expected: ${CONFIG.MULSIG_ADDRESS}`);
          logger.info(`      Actual: ${currentMulSig}`);
        }
      } catch (error) {
        logger.info(`   ❌ Verification failed: ${error.message}`);
      }
    }

    logger.info('');
    logger.info('📊 Fix results summary - MAINNET');
    logger.info('========================');

    const successful = results.filter((r) => r.status === 'success');
    const failed = results.filter((r) => r.status === 'failed');
    const skipped = results.filter((r) => r.status === 'skipped');

    logger.info(`✅ Fixed successfully: ${successful.length} Producer(s)`);
    logger.info(`❌ Failed to fix: ${failed.length} Producer(s)`);
    logger.info(`⏭️  Skipped: ${skipped.length} Producer(s)`);

    if (successful.length > 0) {
      logger.info('\n✅ Successfully fixed Producers:');
      successful.forEach((result) => {
        logger.info(`- ${result.kind}: ${result.transactionHash}`);
      });
    }

    if (failed.length > 0) {
      logger.info('\n❌ Producers that failed to fix:');
      failed.forEach((result) => {
        logger.info(`- ${result.kind}: ${result.error}`);
      });
    }

    if (successful.length > 0) {
      logger.info('\n🎉 _mulSig address fix completed!');
      logger.info('All multisig operations should now work as expected.');
      logger.info('\n💡 You can retry proposals that previously failed');
    }

    logger.info('\n🌍 Mainnet fix complete!');
    logger.info('Please save all transaction hashes for audit purposes.');
  } catch (error) {
    logger.error('❌ Fix failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixMulSigAddresses();
}

module.exports = fixMulSigAddresses;
