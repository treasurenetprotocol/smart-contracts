#!/usr/bin/env node
const { logger } = require('@treasurenet/logging-middleware');

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Execute multisig proposal
 * Usage: node scripts/execute-proposal.js [proposalId]
 */

// ===== Configuration Section =====
// dev
// const CONFIG = {
//     PROPOSAL_ID: process.argv[2] ? parseInt(process.argv[2]) : 4,  // Get from command line or default to 4

//     // Network configuration
//     RPC_URL: "http://127.0.0.1:8555",

//     // Contract addresses
//     MULSIG_ADDRESS: "0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c",
//     ROLES_ADDRESS: "0xa1Bf87580F2bfb1e3FC1ecC6bB773DBA48DF136C",

//     // Foundation manager address (the one with private key)
//     EXECUTOR_ADDRESS: "0x6A79824E6be14b7e5Cb389527A02140935a76cD5",
//     EXECUTOR_PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
// };

// pro
const CONFIG = {
  // PROPOSAL_ID: process.argv[2] ? parseInt(process.argv[2]) : 4,  // Get from command line or default to 4
  PROPOSAL_ID: 6,
  // Network configuration
  RPC_URL: 'https://rpc.treasurenet.io',

  // Contract addresses
  MULSIG_ADDRESS: '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70',
  ROLES_ADDRESS: '0x6916BC198C8A1aD890Ad941947231D424Bfae682',

  // Foundation manager address (the one with private key)
  EXECUTOR_ADDRESS: '0x7ec62BC5062FA1d94F27775d211a3585Ca4048AE',
  EXECUTOR_PRIVATE_KEY: '0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6',
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

async function executeProposal() {
  try {
    logger.info('Executing Multisig Proposal');
    logger.info('===========================');
    logger.info(`Proposal ID: ${CONFIG.PROPOSAL_ID}`);
    logger.info(`Executor: ${CONFIG.EXECUTOR_ADDRESS}`);
    logger.info('');

    // Initialize Web3
    const web3 = new Web3(CONFIG.RPC_URL);

    // Add the executor account
    const account = web3.eth.accounts.privateKeyToAccount(CONFIG.EXECUTOR_PRIVATE_KEY);
    web3.eth.accounts.wallet.add(account);

    // Load contract ABIs
    const mulSigABI = loadContractABI('MulSig');
    const rolesABI = loadContractABI('Roles');

    // Create contract instances
    const mulSig = new web3.eth.Contract(mulSigABI, CONFIG.MULSIG_ADDRESS);
    const roles = new web3.eth.Contract(rolesABI, CONFIG.ROLES_ADDRESS);

    // Verify executor has foundation manager role
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const isFoundationManager = await roles.methods.hasRole(FOUNDATION_MANAGER, CONFIG.EXECUTOR_ADDRESS).call();

    if (!isFoundationManager) {
      throw new Error(`Address ${CONFIG.EXECUTOR_ADDRESS} is not a foundation manager`);
    }
    logger.info('✅ Executor is a foundation manager');

    // Check proposal status before execution
    logger.info('🔍 Checking proposal status...');

    const signatureCount = await mulSig.methods.getSignatureCount(CONFIG.PROPOSAL_ID).call();
    logger.info(`   Current signatures: ${signatureCount}`);

    if (parseInt(signatureCount) < 2) {
      throw new Error(`Proposal ${CONFIG.PROPOSAL_ID} doesn't have enough signatures (${signatureCount}/2)`);
    }
    logger.info('✅ Proposal has enough signatures');

    // Check if proposal still exists (not executed yet)
    try {
      const proposalDetails = await mulSig.methods.transactionDetails(CONFIG.PROPOSAL_ID).call();
      const currentTime = Math.floor(Date.now() / 1000);
      const executionTime = parseInt(proposalDetails.excuteTime || 0);

      if (executionTime > 0 && executionTime > currentTime) {
        const waitTime = executionTime - currentTime;
        throw new Error(`Proposal execution time not reached. Need to wait ${waitTime} more seconds.`);
      }
      logger.info('✅ Proposal is ready for execution');
    } catch (error) {
      if (error.message.includes('execution time not reached')) {
        throw error;
      }
      // If transactionDetails fails, the proposal might not exist or be executed
      logger.info('⚠️  Cannot get proposal details (might be executed or deleted)');
    }

    // Execute the proposal
    logger.info('🚀 Executing proposal...');

    const gasEstimate = await mulSig.methods.executeProposal(CONFIG.PROPOSAL_ID)
      .estimateGas({ from: CONFIG.EXECUTOR_ADDRESS });

    const gasPrice = await web3.eth.getGasPrice();
    const finalGas = Math.floor(Number(gasEstimate) * 1.2); // 20% buffer

    logger.info(`   Gas estimate: ${gasEstimate}`);
    logger.info(`   Gas price: ${gasPrice}`);
    logger.info(`   Final gas: ${finalGas}`);

    const receipt = await mulSig.methods.executeProposal(CONFIG.PROPOSAL_ID).send({
      from: CONFIG.EXECUTOR_ADDRESS,
      gas: finalGas,
      gasPrice: Number(gasPrice),
    });

    logger.info('');
    logger.info('🎉 Proposal executed successfully!');
    logger.info(`   Transaction hash: ${receipt.transactionHash}`);
    logger.info(`   Block number: ${receipt.blockNumber}`);
    logger.info(`   Gas used: ${receipt.gasUsed}`);

    // Check events
    if (receipt.events && receipt.events.ProposalExecuted) {
      logger.info(`   Event: ProposalExecuted(${receipt.events.ProposalExecuted.returnValues.proposalId})`);
    }

    logger.info('');
    logger.info('✅ DApp registration completed!');
    logger.info('   DApp "OtterStreamTest" has been registered to OIL resource');
    logger.info('   Payee address: 0x1234567890123456789012345678901234567891');

    // Verify the proposal is no longer pending
    logger.info('');
    logger.info('🔍 Verifying execution...');

    const newSignatureCount = await mulSig.methods.getSignatureCount(CONFIG.PROPOSAL_ID).call();
    if (parseInt(newSignatureCount) === 0) {
      logger.info('✅ Proposal has been removed from pending list');
    } else {
      logger.info('⚠️  Proposal might still be in system (this could be normal)');
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  executeProposal();
}

module.exports = executeProposal;
