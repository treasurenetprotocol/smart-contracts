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
 * Check multisig proposal status
 * Usage: node scripts/check-proposal.js
 */

const PROPOSAL_ID = parseInt(process.env.PROPOSAL_ID || '4', 10);

async function checkProposal() {
  try {
    logger.info('Checking Multisig Proposal Status');
    logger.info('=================================');
    logger.info(`Proposal ID: ${PROPOSAL_ID}`);
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
      logger.info(`   Name: ${proposalDetails.name}`);
      logger.info(`   Execution Time: ${new Date(parseInt(proposalDetails.excuteTime) * 1000).toLocaleString()}`);
      logger.info('');
    } catch (error) {
      logger.info('⚠️  Could not get proposal details (proposal might not exist or be executed)');
    }

    // Get signature information
    const signatureCount = await mulSig.methods.getSignatureCount(PROPOSAL_ID).call();
    const fmThreshold = await governance.methods.fmThreshold().call();

    logger.info('🖊️  Signature Status:');
    logger.info(`   Current signatures: ${signatureCount}`);
    logger.info(`   Required signatures: ${fmThreshold}`);
    logger.info(`   Progress: ${signatureCount}/${fmThreshold} (${(parseInt(signatureCount) / parseInt(fmThreshold) * 100).toFixed(1)}%)`);
    logger.info('');

    // Get foundation managers and check who has signed
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const foundationManagerCount = await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call();

    logger.info('👥 Foundation Managers:');
    for (let i = 0; i < foundationManagerCount; i++) {
      const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
      const hasSigned = await mulSig.methods.hasAlreadySigned(PROPOSAL_ID, manager).call();
      const status = hasSigned ? '✅ Signed' : '⏳ Pending';
      logger.info(`   ${i + 1}. ${manager} - ${status}`);
    }
    logger.info('');

    // Check if proposal can be executed
    if (parseInt(signatureCount) >= parseInt(fmThreshold)) {
      logger.info('🎉 Status: Proposal has enough signatures!');

      try {
        const proposalDetails = await mulSig.methods.transactionDetails(PROPOSAL_ID).call();
        const currentTime = Math.floor(Date.now() / 1000);
        const executionTime = parseInt(proposalDetails.excuteTime);

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
      const needed = parseInt(fmThreshold) - parseInt(signatureCount);
      logger.info(`⏳ Status: Need ${needed} more signature${needed > 1 ? 's' : ''}`);
      logger.info('');
      logger.info('To sign the proposal, foundation managers can run:');
      logger.info('node scripts/sign-proposal.js');
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
  checkProposal();
}

module.exports = checkProposal;
