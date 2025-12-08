#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

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

async function debugProposalData() {
  try {
    logger.info('Debug Proposal Data & Treasure Configuration');
    logger.info('============================================');
    logger.info(`Proposal ID: ${CONFIG.PROPOSAL_ID}`);
    logger.info('');

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

    logger.info('🔍 1. Check Governance Contract Treasure Configuration');
    logger.info('------------------------------------------------------');

    // Test different treasure kinds
    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];

    for (const kind of treasureKinds) {
      try {
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        logger.info(`✅ ${kind}:`);
        logger.info(`   Producer Address: ${treasureInfo[0] || treasureInfo.producer || 'N/A'}`);
        logger.info(`   Production Data Address: ${treasureInfo[1] || treasureInfo.productionData || 'N/A'}`);
      } catch (error) {
        logger.info(`❌ ${kind}: ${error.message}`);
      }
    }

    logger.info('');
    logger.info('🔍 2. Get Historical Events for Proposal Creation');
    logger.info('-------------------------------------------------');

    try {
      // Look for ProposalCreated events
      const events = await mulSig.getPastEvents('AllEvents', {
        fromBlock: 0,
        toBlock: 'latest',
      });

      const proposalEvents = events.filter((event) =>
        event.returnValues &&
                (event.returnValues.proposalId === CONFIG.PROPOSAL_ID.toString() ||
                 event.returnValues.id === CONFIG.PROPOSAL_ID.toString()));

      logger.info(`Found ${proposalEvents.length} events for proposal ${CONFIG.PROPOSAL_ID}:`);

      proposalEvents.forEach((event, index) => {
        logger.info(`\n   Event ${index + 1}: ${event.event}`);
        logger.info(`   Block: ${event.blockNumber}`);
        logger.info(`   Transaction: ${event.transactionHash}`);
        logger.info('   Return Values:', JSON.stringify(event.returnValues, null, 4));
      });
    } catch (error) {
      logger.info(`❌ Error getting events: ${error.message}`);
    }

    logger.info('');
    logger.info('🔍 3. Try to Access Proposal Storage Directly');
    logger.info('---------------------------------------------');

    // Try to manually access proposal data using different approaches
    try {
      // Method 1: Direct storage access (if available)
      logger.info('Attempting direct storage access...');

      // Calculate storage slot for proposals[_proposalId]
      // proposals is at slot 0 in the contract
      const proposalSlot = web3.utils.soliditySha3(
        { type: 'uint256', value: CONFIG.PROPOSAL_ID },
        { type: 'uint256', value: 0 },
      );

      logger.info(`Proposal storage slot: ${proposalSlot}`);

      // Try to read some storage slots
      for (let i = 0; i < 10; i++) {
        const slot = web3.utils.toBN(proposalSlot).add(web3.utils.toBN(i)).toString(16);
        const paddedSlot = `0x${slot.padStart(64, '0')}`;

        try {
          const storageValue = await web3.eth.getStorageAt(CONFIG.MULSIG_ADDRESS, paddedSlot);
          if (storageValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            logger.info(`   Slot ${i}: ${storageValue}`);

            // Try to decode as different types
            if (i === 0) { // proposer address
              logger.info(`     Decoded as address: ${web3.utils.toChecksumAddress(`0x${storageValue.slice(-40)}`)}`);
            } else if (i === 5) { // _type
              logger.info(`     Decoded as uint256: ${web3.utils.toBN(storageValue).toString()}`);
            }
          }
        } catch (error) {
          logger.info(`   Slot ${i}: Error reading storage`);
        }
      }
    } catch (error) {
      logger.info(`❌ Storage access failed: ${error.message}`);
    }

    logger.info('');
    logger.info('🔍 4. Test Treasure Registration Function');
    logger.info('-----------------------------------------');

    // Test if we can call registerDAppConnect directly on a known producer
    try {
      const oilTreasure = await governance.methods.getTreasureByKind('OIL').call();
      if (oilTreasure[0] && oilTreasure[0] !== '0x0000000000000000000000000000000000000000') {
        logger.info(`✅ OIL Producer found at: ${oilTreasure[0]}`);

        // Load Producer ABI
        const producerABI = loadContractABI('Producer');
        const producer = new web3.eth.Contract(producerABI, oilTreasure[0]);

        // Test if registerDAppConnect function exists
        const registerFn = producer.options.jsonInterface.find(
          (item) => item.name === 'registerDAppConnect' && item.type === 'function',
        );

        if (registerFn) {
          logger.info('✅ registerDAppConnect function exists in Producer');
          logger.info(`   Inputs: ${registerFn.inputs.map((i) => `${i.type} ${i.name}`).join(', ')}`);

          // Test call (should fail due to onlyMulSig but will show if function exists)
          try {
            await producer.methods.registerDAppConnect('TestDApp', '0x1234567890123456789012345678901234567891').call({
              from: CONFIG.EXECUTOR_ADDRESS,
            });
            logger.info('✅ Function call succeeded (unexpected)');
          } catch (error) {
            if (error.message.includes('onlyMulSig') || error.message.includes('Ownable')) {
              logger.info('✅ Function exists but requires MulSig permission (expected)');
            } else {
              logger.info(`❌ Function call failed: ${error.message}`);
            }
          }
        } else {
          logger.info('❌ registerDAppConnect function not found in Producer');
        }
      } else {
        logger.info('❌ OIL Producer not found or is zero address');
      }
    } catch (error) {
      logger.info(`❌ Error testing treasure registration: ${error.message}`);
    }

    logger.info('');
    logger.info('🔍 5. Simulate Proposal Execution Step by Step');
    logger.info('----------------------------------------------');

    try {
      // Try to simulate what executeProposal does
      logger.info('Simulating executeProposal logic...');

      // Since we can't access proposal storage directly, let's check if the error
      // happens at the treasure lookup stage
      logger.info('Testing governance.getTreasureByKind("OIL")...');
      const treasureInfo = await governance.methods.getTreasureByKind('OIL').call();
      logger.info(`Producer Address: ${treasureInfo[0]}`);
      logger.info(`Production Data Address: ${treasureInfo[1]}`);

      if (treasureInfo[0] === '0x0000000000000000000000000000000000000000') {
        logger.info('❌ FOUND THE ISSUE: OIL treasure kind returns zero address!');
        logger.info('   This means "OIL" treasure kind is not registered in Governance contract');
        logger.info('   The proposal will fail at: require(producerAddr != address(0), "treasure not found with proposal\'s treasure kind")');
      } else {
        logger.info('✅ OIL treasure kind exists, issue might be elsewhere');
      }
    } catch (error) {
      logger.info(`❌ Simulation failed: ${error.message}`);
    }

    logger.info('');
    logger.info('📋 DEBUGGING SUMMARY');
    logger.info('===================');
    logger.info('Check the results above to identify the root cause:');
    logger.info('');
    logger.info('1. If OIL treasure returns zero address → Need to register OIL treasure first');
    logger.info('2. If registerDAppConnect function missing → Wrong contract version');
    logger.info('3. If proposal storage is empty → Proposal creation failed');
    logger.info('4. If events show wrong parameters → Proposal created incorrectly');
  } catch (error) {
    logger.error('❌ Debug failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  debugProposalData();
}

module.exports = debugProposalData;
