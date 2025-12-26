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
 * Execute multisig proposal (env-driven, no CLI args)
 */

const PROPOSAL_ID = Number(process.env.PROPOSAL_ID || 4);

async function multisigProposalExecute() {
  try {
    const network = getNetwork();
    const rpcUrl = getRpcUrl();
    const { MULSIG, ROLES, GOVERNANCE } = requireContracts(['MULSIG', 'ROLES', 'GOVERNANCE'], network);

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
    const governanceABI = loadContractABI('Governance');

    // Create contract instances
    const mulSig = new web3.eth.Contract(mulSigABI, MULSIG);
    const roles = new web3.eth.Contract(rolesABI, ROLES);
    const governance = new web3.eth.Contract(governanceABI, GOVERNANCE);

    // Verify executor has foundation manager role
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const isFoundationManager = await roles.methods.hasRole(FOUNDATION_MANAGER, executorAddress).call();

    if (!isFoundationManager) {
      throw new Error(`Address ${executorAddress} is not a foundation manager`);
    }
    logger.info('✅ Executor is a foundation manager');

    // Check proposal status before execution
    logger.info('🔍 Checking proposal status...');

    const [signatureCountRaw, fmThresholdRaw] = await Promise.all([
      mulSig.methods.getSignatureCount(PROPOSAL_ID).call(),
      governance.methods.fmThreshold().call(),
    ]);
    const signatureCount = Number(signatureCountRaw);
    const fmThreshold = Number(fmThresholdRaw || 0);

    logger.info(`   Current signatures: ${signatureCount}`);
    logger.info(`   Required signatures: ${fmThreshold}`);

    if (signatureCount < fmThreshold || fmThreshold === 0) {
      throw new Error(`Proposal ${PROPOSAL_ID} doesn't have enough signatures (${signatureCount}/${fmThreshold})`);
    }
    logger.info('✅ Proposal has enough signatures');

    // Check if proposal still exists (not executed yet)
    try {
      const proposalDetails = await mulSig.methods.transactionDetails(PROPOSAL_ID).call();
      const currentTime = Math.floor(Date.now() / 1000);
      const executionTime = Number(proposalDetails.excuteTime || proposalDetails.executeTime || 0);

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

    // Verify the proposal is no longer pending
    logger.info('');
    logger.info('🔍 Verifying execution...');

    const newSignatureCount = await mulSig.methods.getSignatureCount(PROPOSAL_ID).call();
    if (Number(newSignatureCount) === 0) {
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
  multisigProposalExecute();
}

module.exports = multisigProposalExecute;
