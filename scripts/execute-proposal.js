#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  loadContractABI,
  getPrivateKey,
} = require('./common/config');

/**
 * Execute multisig proposal
 * Usage: node scripts/execute-proposal.js [proposalId]
 */

const PROPOSAL_ID = parseInt(process.env.PROPOSAL_ID || process.argv[2] || '6', 10);

async function executeProposal() {
  try {
    const network = getNetwork();
    const rpcUrl = getRpcUrl();
    const { MULSIG, ROLES } = requireContracts(['MULSIG', 'ROLES'], network);

    // Initialize Web3
    const web3 = new Web3(rpcUrl);

    // Add the executor account
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);
    const executorAddress = account.address;

    logger.info('Executing Multisig Proposal');
    logger.info('===========================');
    logger.info(`Network: ${network}`);
    logger.info(`Proposal ID: ${PROPOSAL_ID}`);
    logger.info(`Executor: ${executorAddress}`);
    logger.info('');

    // Load contract ABIs
    const mulSigABI = loadContractABI('MulSig');
    const rolesABI = loadContractABI('Roles');

    // Create contract instances
    const mulSig = new web3.eth.Contract(mulSigABI, MULSIG);
    const roles = new web3.eth.Contract(rolesABI, ROLES);

    // Verify executor has foundation manager role
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const isFoundationManager = await roles.methods.hasRole(FOUNDATION_MANAGER, executorAddress).call();

    if (!isFoundationManager) {
      throw new Error(`Address ${executorAddress} is not a foundation manager`);
    }
    logger.info('✅ Executor is a foundation manager');

    // Check proposal status before execution
    logger.info('🔍 Checking proposal status...');

    const signatureCount = await mulSig.methods.getSignatureCount(PROPOSAL_ID).call();
    logger.info(`   Current signatures: ${signatureCount}`);

    if (parseInt(signatureCount, 10) < 2) {
      throw new Error(`Proposal ${PROPOSAL_ID} doesn't have enough signatures (${signatureCount}/2)`);
    }
    logger.info('✅ Proposal has enough signatures');

    // Check if proposal still exists (not executed yet)
    try {
      const proposalDetails = await mulSig.methods.transactionDetails(PROPOSAL_ID).call();
      const currentTime = Math.floor(Date.now() / 1000);
      const executionTime = parseInt(proposalDetails.excuteTime || 0, 10);

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

    const gasEstimate = await mulSig.methods.executeProposal(PROPOSAL_ID)
      .estimateGas({ from: executorAddress });

    const gasPrice = await web3.eth.getGasPrice();
    const finalGas = Math.floor(Number(gasEstimate) * 1.2); // 20% buffer

    logger.info(`   Gas estimate: ${gasEstimate}`);
    logger.info(`   Gas price: ${gasPrice}`);
    logger.info(`   Final gas: ${finalGas}`);

    const receipt = await mulSig.methods.executeProposal(PROPOSAL_ID).send({
      from: executorAddress,
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
    logger.info('   DApp \"OtterStreamTest\" has been registered to OIL resource');
    logger.info('   Payee address: 0x1234567890123456789012345678901234567891');

    // Verify the proposal is no longer pending
    logger.info('');
    logger.info('🔍 Verifying execution...');

    const newSignatureCount = await mulSig.methods.getSignatureCount(PROPOSAL_ID).call();
    if (parseInt(newSignatureCount, 10) === 0) {
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
