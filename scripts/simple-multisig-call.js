#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  getUserAddress,
} = require('./common/config');
/**
 * Simplified multisig call script
 * Based on the existing AWS KMS infrastructure
 */

const chainId = Number(process.env.CHAIN_ID || process.env.CHAINID || 6666);
const proposalId = Number(process.env.PROPOSAL_ID || 4);

async function main() {
  logger.info('🚀 Simplified multisig call script');
  logger.info('=====================================\n');

  try {
    const network = getNetwork();
    const rpcUrl = getRpcUrl();
    const { MULSIG } = requireContracts(['MULSIG'], network);
    const awsAccount = getUserAddress();

    // Connect to the network
    const web3 = new Web3(rpcUrl);
    const contract = new web3.eth.Contract([
      { inputs: [{ type: 'uint256', name: 'proposalId' }], name: 'signTransaction', outputs: [], stateMutability: 'nonpayable', type: 'function' },
      { inputs: [{ type: 'uint256', name: 'proposalId' }], name: 'getSignatureCount', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
      { inputs: [{ type: 'uint256', name: 'proposalId' }, { type: 'address', name: 'signer' }], name: 'hasAlreadySigned', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
    ], MULSIG);

    // Check the network
    const networkId = await web3.eth.net.getId();
    logger.info(`✅ Network connected: ${networkId}`);
    logger.info(`Network label: ${network}`);

    // Check signature status
    const [signatureCount, alreadySigned] = await Promise.all([
      contract.methods.getSignatureCount(proposalId).call(),
      contract.methods.hasAlreadySigned(proposalId, awsAccount).call(),
    ]);

    logger.info('📊 Current status:');
    logger.info(`   Proposal ID: ${proposalId}`);
    logger.info(`   Signatures: ${Number(signatureCount)}/2`);
    logger.info(`   AWS account signed: ${alreadySigned ? 'Yes' : 'No'}`);

    if (alreadySigned) {
      logger.info('\n✅ AWS account has already signed this proposal');
      return;
    }

    // Prepare transaction data
    const methodData = contract.methods.signTransaction(proposalId).encodeABI();
    const [nonce, gasPrice, gasEstimate] = await Promise.all([
      web3.eth.getTransactionCount(awsAccount),
      web3.eth.getGasPrice(),
      contract.methods.signTransaction(proposalId).estimateGas({ from: awsAccount }),
    ]);

    const txData = {
      to: MULSIG,
      data: methodData,
      gas: Math.floor(Number(gasEstimate) * 1.2),
      gasPrice: Number(gasPrice),
      nonce: Number(nonce),
      value: 0,
      chainId,
    };

    logger.info('\n📋 Transaction info:');
    logger.info(`   Contract address: ${txData.to}`);
    logger.info('   Method: signTransaction(uint256)');
    logger.info(`   Params: [${proposalId}]`);
    logger.info(`   Sender: ${awsAccount}`);
    logger.info(`   Gas limit: ${txData.gas}`);
    logger.info(`   Gas price: ${txData.gasPrice}`);
    logger.info(`   Nonce: ${txData.nonce}`);
    logger.info(`   Call data: ${txData.data}`);

    logger.info('\n🔧 Use the existing AWS KMS infrastructure:');
    logger.info('-------------------------------------');
    logger.info('// Based on your helper.js and current code structure');
    logger.info(`
const contractAddress = '${MULSIG}';
const methodName = 'signTransaction';
const methodSignature = 'signTransaction(uint256)';
const params = [${proposalId}];
const fromAddress = '${awsAccount}';
const gasLimit = ${txData.gas};
const gasPrice = ${txData.gasPrice};
const nonce = ${txData.nonce};
const chainId = ${chainId};

// Use your existing contract call flow
// Refer to the pattern in processRollbackRecord
        `);

    logger.info('🚀 Next steps:');
    logger.info('1. Integrate the above parameters into your existing KMS signing flow');
    logger.info('2. Sign and send the transaction');
    logger.info('3. Wait for confirmation');
    logger.info('4. Verify the signature count becomes 2/2');
  } catch (error) {
    logger.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main().catch(logger.error);
}

module.exports = { main };
