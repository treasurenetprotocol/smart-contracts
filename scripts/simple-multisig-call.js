const { logger } = require('@treasurenet/logging-middleware');
/**
 * Simplified multisig call script
 * Based on the existing AWS KMS infrastructure
 */

const Web3 = require('web3');

// Configuration
const CONFIG = {
  rpcUrl: 'http://127.0.0.1:8555',
  chainId: 6666,
  multisigContract: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
  proposalId: 4,
  awsAccount: '0x09EDA46FFCec4656235391dd298875B82aA458A9',
};

// Multisig contract ABI (only the methods we need)
const MULTISIG_ABI = [
  {
    inputs: [{ type: 'uint256', name: 'proposalId' }],
    name: 'signTransaction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'proposalId' }],
    name: 'getSignatureCount',
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ type: 'uint256', name: 'proposalId' }, { type: 'address', name: 'signer' }],
    name: 'hasAlreadySigned',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
];

async function main() {
  logger.info('🚀 Simplified multisig call script');
  logger.info('=====================================\n');

  try {
    // Connect to the network
    const web3 = new Web3(CONFIG.rpcUrl);
    const contract = new web3.eth.Contract(MULTISIG_ABI, CONFIG.multisigContract);

    // Check the network
    const networkId = await web3.eth.net.getId();
    logger.info(`✅ Network connected: ${networkId}`);

    // Check signature status
    const [signatureCount, alreadySigned] = await Promise.all([
      contract.methods.getSignatureCount(CONFIG.proposalId).call(),
      contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call(),
    ]);

    logger.info('📊 Current status:');
    logger.info(`   Proposal ID: ${CONFIG.proposalId}`);
    logger.info(`   Signatures: ${Number(signatureCount)}/2`);
    logger.info(`   AWS account signed: ${alreadySigned ? 'Yes' : 'No'}`);

    if (alreadySigned) {
      logger.info('\n✅ AWS account has already signed this proposal');
      return;
    }

    // Prepare transaction data
    const methodData = contract.methods.signTransaction(CONFIG.proposalId).encodeABI();
    const [nonce, gasPrice, gasEstimate] = await Promise.all([
      web3.eth.getTransactionCount(CONFIG.awsAccount),
      web3.eth.getGasPrice(),
      contract.methods.signTransaction(CONFIG.proposalId).estimateGas({ from: CONFIG.awsAccount }),
    ]);

    const txData = {
      to: CONFIG.multisigContract,
      data: methodData,
      gas: Math.floor(Number(gasEstimate) * 1.2),
      gasPrice: Number(gasPrice),
      nonce: Number(nonce),
      value: 0,
      chainId: CONFIG.chainId,
    };

    logger.info('\n📋 Transaction info:');
    logger.info(`   Contract address: ${txData.to}`);
    logger.info('   Method: signTransaction(uint256)');
    logger.info(`   Params: [${CONFIG.proposalId}]`);
    logger.info(`   Sender: ${CONFIG.awsAccount}`);
    logger.info(`   Gas limit: ${txData.gas}`);
    logger.info(`   Gas price: ${txData.gasPrice}`);
    logger.info(`   Nonce: ${txData.nonce}`);
    logger.info(`   Call data: ${txData.data}`);

    logger.info('\n🔧 Use the existing AWS KMS infrastructure:');
    logger.info('-------------------------------------');
    logger.info('// Based on your helper.js and current code structure');
    logger.info(`
const contractAddress = '${CONFIG.multisigContract}';
const methodName = 'signTransaction';
const methodSignature = 'signTransaction(uint256)';
const params = [${CONFIG.proposalId}];
const fromAddress = '${CONFIG.awsAccount}';
const gasLimit = ${txData.gas};
const gasPrice = ${txData.gasPrice};
const nonce = ${txData.nonce};
const chainId = ${CONFIG.chainId};

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

module.exports = { main, CONFIG, MULTISIG_ABI };
