#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  loadContractABI,
} = require('./common/config');

/**
 * Check multisig proposal status (env-driven, no CLI args)
 */

const PROPOSAL_ID = Number(process.env.PROPOSAL_ID || 4);

async function multisigProposalStatus() {
  try {
    logger.info('Checking Multisig Proposal Status');
    logger.info('=================================');
    logger.info(`Proposal ID: ${PROPOSAL_ID}`);
    logger.info(`Network: ${getNetwork()}`);
    logger.info(`RPC URL: ${getRpcUrl()}`);
    logger.info('');

    // Initialize Web3
    const web3 = new Web3(getRpcUrl());

    // Load contract ABIs
    const mulSigABI = loadContractABI('MulSig');
    const rolesABI = loadContractABI('Roles');
    const governanceABI = loadContractABI('Governance');

    const { MULSIG, ROLES, GOVERNANCE } = requireContracts(['MULSIG', 'ROLES', 'GOVERNANCE'], getNetwork());

    // Create contract instances
    const mulSig = new web3.eth.Contract(mulSigABI, MULSIG);
    const roles = new web3.eth.Contract(rolesABI, ROLES);
    const governance = new web3.eth.Contract(governanceABI, GOVERNANCE);

    // Get proposal details
    try {
      const proposalDetails = await mulSig.methods.transactionDetails(PROPOSAL_ID).call();

      logger.info('📋 Proposal Details:');
      logger.info(`   Name: ${proposalDetails.name || 'N/A'}`);
      const execTime = Number(proposalDetails.excuteTime || proposalDetails.executeTime || 0);
      logger.info(`   Execution Time: ${execTime ? new Date(execTime * 1000).toLocaleString() : 'N/A'}`);
      logger.info('');
    } catch (error) {
      logger.info('⚠️  Could not get proposal details (proposal might not exist or be executed)');
    }

    // Get signature information
    const [signatureCountRaw, fmThresholdRaw] = await Promise.all([
      mulSig.methods.getSignatureCount(PROPOSAL_ID).call(),
      governance.methods.fmThreshold().call(),
    ]);
    const signatureCount = Number(signatureCountRaw);
    const fmThreshold = Number(fmThresholdRaw || 0);

    logger.info('🖊️  Signature Status:');
    logger.info(`   Current signatures: ${signatureCount}`);
    logger.info(`   Required signatures: ${fmThreshold}`);
    if (fmThreshold > 0) {
      logger.info(`   Progress: ${signatureCount}/${fmThreshold} (${((signatureCount / fmThreshold) * 100).toFixed(1)}%)`);
    }
    logger.info('');

    // Get foundation managers and check who has signed
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const foundationManagerCount = Number(
      await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call(),
    );

    logger.info('👥 Foundation Managers:');
    for (let i = 0; i < foundationManagerCount; i++) {
      const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
      const hasSigned = await mulSig.methods.hasAlreadySigned(PROPOSAL_ID, manager).call();
      const status = hasSigned ? '✅ Signed' : '⏳ Pending';
      logger.info(`   ${i + 1}. ${manager} - ${status}`);
    }
    logger.info('');

    // Check if proposal can be executed
    if (signatureCount >= fmThreshold && fmThreshold > 0) {
      logger.info('🎉 Status: Proposal has enough signatures!');

      try {
        const proposalDetails = await mulSig.methods.transactionDetails(PROPOSAL_ID).call();
        const currentTime = Math.floor(Date.now() / 1000);
        const executionTime = Number(proposalDetails.excuteTime || proposalDetails.executeTime || 0);

        if (executionTime > currentTime) {
          const waitTime = executionTime - currentTime;
          logger.info(`⏰ Waiting for confirmation period: ${waitTime} seconds remaining`);
          logger.info(`⏰ Can execute after: ${new Date(executionTime * 1000).toLocaleString()}`);
        } else {
          logger.info('✅ Ready for execution!');
          logger.info('');
          logger.info('To execute the proposal, run:');
          logger.info('node scripts/execute-proposal.js');
        }
      } catch (error) {
        logger.info('⚠️  Proposal might already be executed or deleted');
      }
    } else {
      const needed = Math.max(fmThreshold - signatureCount, 0);
      logger.info(`⏳ Status: Need ${needed} more signature${needed === 1 ? '' : 's'}`);
      logger.info('');
      logger.info('To sign the proposal, foundation managers can run:');
      logger.info('node scripts/kms-multisig-signer.js (或其他签名流程)');
    }

    // Check pending proposals
    try {
      const pendingProposals = await mulSig.methods.getPendingProposals().call();
      logger.info('');
      logger.info(`📝 Total pending proposals: ${pendingProposals.length}`);
      if (pendingProposals.length > 0) {
        logger.info('   Pending proposal IDs:', pendingProposals.join(', '));
      }
    } catch (error) {
      logger.info('⚠️  Could not get pending proposals list');
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  multisigProposalStatus();
}

module.exports = multisigProposalStatus;
