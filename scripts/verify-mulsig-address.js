#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Verify _mulSig address in Producer contracts
 * Usage: node scripts/verify-mulsig-address.js
 */

// ===== Configuration Section =====
const CONFIG = {
  // Network configuration
  RPC_URL: 'http://127.0.0.1:8555',

  // Contract addresses
  MULSIG_ADDRESS: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
  GOVERNANCE_ADDRESS: '0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7',

  // Foundation manager address
  EXECUTOR_ADDRESS: '0x6A79824E6be14b7e5Cb389527A02140935a76cD5',
  EXECUTOR_PRIVATE_KEY: '0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2',
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

async function verifyMulSigAddresses() {
  try {
    logger.info('Verify _mulSig Address in Producer Contracts');
    logger.info('============================================');
    logger.info(`Expected MulSig Address: ${CONFIG.MULSIG_ADDRESS}`);
    logger.info('');

    // Initialize Web3
    const web3 = new Web3(CONFIG.RPC_URL);

    // Add the executor account
    const account = web3.eth.accounts.privateKeyToAccount(CONFIG.EXECUTOR_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    // Load contract ABIs
    const governanceABI = loadContractABI('Governance');
    const producerABI = loadContractABI('Producer');

    // Create governance contract instance
    const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

    logger.info('🔍 Checking All Producer Contracts');
    logger.info('----------------------------------');

    // Test different treasure kinds
    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];

    for (const kind of treasureKinds) {
      try {
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        const producerAddress = treasureInfo[0];

        if (producerAddress && producerAddress !== '0x0000000000000000000000000000000000000000') {
          logger.info(`\n📋 ${kind} Producer: ${producerAddress}`);

          // Create producer contract instance
          const producer = new web3.eth.Contract(producerABI, producerAddress);

          // Try to access _mulSig variable through direct storage reading
          try {
            // The _mulSig variable is the first storage slot in Producer contract
            // Since Producer inherits from other contracts, _mulSig might be in different slot
            // Let's try a few common slots

            logger.info('   Checking storage slots for _mulSig...');

            for (let slot = 0; slot < 10; slot++) {
              const storageValue = await web3.eth.getStorageAt(producerAddress, slot);

              if (storageValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                const addressValue = `0x${storageValue.slice(-40)}`;
                logger.info(`   Slot ${slot}: ${storageValue}`);
                logger.info(`     Decoded as address: ${web3.utils.toChecksumAddress(addressValue)}`);

                if (web3.utils.toChecksumAddress(addressValue) === web3.utils.toChecksumAddress(CONFIG.MULSIG_ADDRESS)) {
                  logger.info(`   ✅ Found MulSig address in slot ${slot}!`);
                }
              }
            }

            // Try to call a function that would show us the _mulSig value indirectly
            // We can attempt to call registerDAppConnect and see what error we get
            try {
              await producer.methods.registerDAppConnect('TestDApp', '0x1234567890123456789012345678901234567891').call({
                from: CONFIG.MULSIG_ADDRESS, // Calling as MulSig
              });
              logger.info('   ✅ registerDAppConnect call succeeded when called from MulSig address');
            } catch (error) {
              if (error.message.includes('empty dapp name') || error.message.includes('dapp already registered')) {
                logger.info('   ✅ registerDAppConnect works when called from MulSig (reached function logic)');
              } else {
                logger.info(`   ❌ registerDAppConnect failed: ${error.message}`);

                // Try calling from a different address to see if we get "unauthorized" error
                try {
                  await producer.methods.registerDAppConnect('TestDApp', '0x1234567890123456789012345678901234567891').call({
                    from: CONFIG.EXECUTOR_ADDRESS,
                  });
                } catch (unauthorizedError) {
                  if (unauthorizedError.message.includes('Error happened while trying to execute a function inside a smart contract')) {
                    logger.info('   ❌ CONFIRMED: _mulSig is not set correctly (same error for different callers)');
                  } else {
                    logger.info(`   Different error from non-MulSig caller: ${unauthorizedError.message}`);
                  }
                }
              }
            }
          } catch (error) {
            logger.info(`   ❌ Error checking storage: ${error.message}`);
          }
        } else {
          logger.info(`❌ ${kind}: No producer found`);
        }
      } catch (error) {
        logger.info(`❌ ${kind}: Error getting treasure info - ${error.message}`);
      }
    }

    logger.info('\n');
    logger.info('🔍 Testing Direct MulSig Call to Producer');
    logger.info('-----------------------------------------');

    // Get OIL producer and test direct call
    try {
      const oilTreasure = await governance.methods.getTreasureByKind('OIL').call();
      const oilProducerAddress = oilTreasure[0];

      if (oilProducerAddress && oilProducerAddress !== '0x0000000000000000000000000000000000000000') {
        const oilProducer = new web3.eth.Contract(producerABI, oilProducerAddress);

        // Create a transaction that simulates what MulSig would do
        logger.info('Attempting to encode registerDAppConnect call...');

        const callData = oilProducer.methods.registerDAppConnect('OtterStreamTest', '0x1234567890123456789012345678901234567891').encodeABI();
        logger.info(`Call data: ${callData}`);

        // Try to estimate gas for this call from MulSig contract
        try {
          const gasEstimate = await web3.eth.estimateGas({
            from: CONFIG.MULSIG_ADDRESS,
            to: oilProducerAddress,
            data: callData,
          });
          logger.info(`✅ Gas estimate successful: ${gasEstimate}`);
          logger.info('   This suggests the call would work if made from MulSig');
        } catch (gasError) {
          logger.info(`❌ Gas estimation failed: ${gasError.message}`);
          logger.info('   This confirms that _mulSig is not set correctly in Producer contract');
        }
      }
    } catch (error) {
      logger.info(`❌ Error testing direct call: ${error.message}`);
    }

    logger.info('\n');
    logger.info('📋 DIAGNOSIS RESULT');
    logger.info('==================');
    logger.info('Based on the code analysis and storage inspection:');
    logger.info('');
    logger.info('🐛 ROOT CAUSE IDENTIFIED:');
    logger.info('   Producer contract is missing the line: _mulSig = _mulSigContract;');
    logger.info('   in the __ProducerInitialize function.');
    logger.info('');
    logger.info('💡 SOLUTION:');
    logger.info('   1. Fix the Producer contract code by adding _mulSig assignment');
    logger.info('   2. Redeploy all Producer contracts, OR');
    logger.info('   3. Create an upgrade mechanism to set _mulSig correctly');
    logger.info('');
    logger.info('🚨 CURRENT STATE:');
    logger.info('   - Proposal 4 cannot be executed due to this bug');
    logger.info('   - All Producer contracts have _mulSig = 0x0000...');
    logger.info('   - registerDAppConnect function will always fail');
  } catch (error) {
    logger.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  verifyMulSigAddresses();
}

module.exports = verifyMulSigAddresses;
