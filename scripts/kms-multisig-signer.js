require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
/**
 * AWS KMS multisig call script
 * Built on the proven @web3-kms-signer library
 */

const Web3 = require('web3');
const { Signer } = require('@web3-kms-signer/core');
const { KMSWallets } = require('@web3-kms-signer/kms-wallets');
const { KMSProviderAWS } = require('@web3-kms-signer/kms-provider-aws');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  getEnv,
  getUserAddress,
} = require('./common/config');

// AWS KMS configuration
const awsConfig = {
  kms: {
    keyId: getEnv('AWS_KMS_KEY_ID'),
    accessKeyId: getEnv('AWS_KMS_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('AWS_KMS_SECRET_ACCESS_KEY'),
    region: getEnv('AWS_KMS_REGION', 'us-west-1'),
  },
};

// Network config (dev)
// const CONFIG = {
//     rpcUrl: 'http://127.0.0.1:8555',
//     chainId: 6666,
//     multisigContract: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
//     proposalId: 5,
//     awsAccount: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
// };

const resolveContracts = () => {
  try {
    return requireContracts(['MULSIG'], getNetwork());
  } catch {
    return {};
  }
};

const CONFIG = {
  rpcUrl: getRpcUrl(),
  chainId: Number(getEnv('CHAIN_ID', '6666')),
  multisigContract: getEnv('CONTRACT_ADDRESS') || resolveContracts().MULSIG,
  proposalId: Number(getEnv('PROPOSAL_ID', '6')),
  awsAccount: getEnv('FROM_ADDRESS') || getUserAddress(),
};

if (!CONFIG.multisigContract) {
  throw new Error('CONTRACT_ADDRESS is required (or ensure MULSIG exists in deployments)');
}

// Multisig contract ABI
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

/**
 * Multisig caller class - based on a proven pattern
 */
class MultisigSigner {
  constructor() {
    this.web3 = new Web3(CONFIG.rpcUrl);
    this.provider = new KMSProviderAWS({
      region: awsConfig.kms.region,
      credentials: {
        accessKeyId: awsConfig.kms.accessKeyId,
        secretAccessKey: awsConfig.kms.secretAccessKey,
      },
    });
    this.signer = new Signer(new KMSWallets(this.provider), +CONFIG.chainId);
    this.contract = new this.web3.eth.Contract(MULTISIG_ABI, CONFIG.multisigContract);
  }

  /**
     * Get Ethereum address - based on your getEthereumAddress helper
     */
  async getEthereumAddress() {
    try {
      // Use KMSWallets to get the address
      const wallet = this.provider;
      const publicKey = await wallet.getPublicKey({ KeyId: awsConfig.kms.keyId });

      // This needs your getEthereumAddress helper; return configured address for now
      return CONFIG.awsAccount;
    } catch (error) {
      throw new Error(`Failed to get Ethereum address: ${error.message}`);
    }
  }

  /**
     * Calculate gas parameters - based on your calculateGasParameters pattern
     */
  async calculateGasParameters(web3, contract, methodName, params, senderAddress) {
    try {
      logger.info('🔍 Calculating gas parameters...');

      const gasEstimate = await contract.methods[methodName](...params)
        .estimateGas({ from: senderAddress });

      const gasPrice = await web3.eth.getGasPrice();

      // Add 20% gas buffer
      const finalGas = Math.floor(Number(gasEstimate) * 1.2);
      const adjustedGasPrice = Number(gasPrice);

      logger.info(`   Gas estimate: ${gasEstimate}`);
      logger.info(`   Final gas: ${finalGas}`);
      logger.info(`   Gas price: ${adjustedGasPrice}`);

      return {
        finalGas,
        adjustedGasPrice,
      };
    } catch (error) {
      throw new Error(`Gas calculation failed: ${error.message}`);
    }
  }

  /**
     * Create and sign transaction - based on your createAndSignTransaction function
     */
  async createAndSignTransaction(web3, chainId, contractAddress, methodData, gasInfo, senderAddress = null, signer = null) {
    logger.info('🔐 Creating and signing transaction...');

    // Use provided params or defaults
    const finalSenderAddress = senderAddress || CONFIG.awsAccount;
    const finalSigner = signer || this.signer;

    const nonce = await web3.eth.getTransactionCount(finalSenderAddress, 'pending');
    logger.info(`   Nonce: ${nonce}`);

    const txData = {
      nonce: `0x${nonce.toString(16)}`,
      gasPrice: `0x${BigInt(gasInfo.adjustedGasPrice).toString(16)}`,
      gasLimit: `0x${gasInfo.finalGas.toString(16)}`,
      to: contractAddress,
      value: '0x00',
      data: methodData,
    };

    logger.info('   Transaction data prepared');
    logger.info(`   To: ${txData.to}`);
    logger.info(`   Gas Limit: ${parseInt(txData.gasLimit, 16)}`);
    logger.info(`   Gas Price: ${parseInt(txData.gasPrice, 16)}`);

    return await finalSigner.signTransaction({ keyId: awsConfig.kms.keyId }, txData);
  }

  /**
     * Send transaction - based on your sendTransactionWithErrorHandling function
     */
  async sendTransactionWithErrorHandling(web3, signedTx, proposalId) {
    logger.info('📤 Sending signed transaction...');

    try {
      const result = await web3.eth.sendSignedTransaction(signedTx);

      logger.info('✅ Transaction sent!');
      logger.info(`   Tx hash: ${result.transactionHash}`);
      logger.info(`   Block number: ${result.blockNumber}`);
      logger.info(`   Gas used: ${result.gasUsed}`);

      return result;
    } catch (error) {
      // Handle timeout cases that still return a hash
      if (error.message && error.message.includes('Transaction was not mined within')) {
        const txHashMatch = error.message.match(/Transaction Hash: (0x[a-fA-F0-9]{64})/);
        if (txHashMatch && txHashMatch[1]) {
          const txHash = txHashMatch[1];
          logger.info(`⚠️  Transaction timed out but has hash: ${txHash}`);
          return { transactionHash: txHash, status: 'pending' };
        }
      }

      logger.error('❌ Transaction failed to send:', error.message);
      throw error;
    }
  }

  /**
     * Check signature status
     */
  async checkSignatureStatus() {
    logger.info('📊 Checking signature status...');

    const [signatureCount, alreadySigned] = await Promise.all([
      this.contract.methods.getSignatureCount(CONFIG.proposalId).call(),
      this.contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call(),
    ]);

    logger.info(`   Proposal ID: ${CONFIG.proposalId}`);
    logger.info(`   Current signatures: ${Number(signatureCount)}/2`);
    logger.info(`   AWS account signed: ${alreadySigned ? 'Yes' : 'No'}`);

    return {
      signatureCount: Number(signatureCount),
      alreadySigned,
    };
  }

  /**
     * Execute multisig signing - main routine
     */
  async signMultisigProposal() {
    logger.info('🚀 Starting multisig signing...');
    logger.info('=====================================\n');

    try {
      // 1. Check network connection
      const networkId = await this.web3.eth.net.getId();
      logger.info(`✅ Connected to network: ${networkId}`);

      if (networkId !== CONFIG.chainId) {
        logger.warn(`⚠️  Network ID mismatch: expected ${CONFIG.chainId}, got ${networkId}`);
      }

      // 2. Check signature status
      const status = await this.checkSignatureStatus();

      if (status.alreadySigned) {
        logger.info('\n✅ AWS account has already signed this proposal!');
        return;
      }

      if (status.signatureCount >= 2) {
        logger.info('\n✅ Proposal already has enough signatures!');
        return;
      }

      // 3. Calculate gas parameters
      const gasInfo = await this.calculateGasParameters(
        this.web3,
        this.contract,
        'signTransaction',
        [CONFIG.proposalId],
        CONFIG.awsAccount,
      );

      // 4. Encode method data
      const methodData = this.contract.methods.signTransaction(CONFIG.proposalId).encodeABI();
      logger.info(`✅ Method data encoded: ${methodData.slice(0, 20)}...`);

      // 5. Create and sign transaction
      const signedTx = await this.createAndSignTransaction(
        this.web3,
        CONFIG.chainId,
        CONFIG.multisigContract,
        methodData,
        gasInfo,
        CONFIG.awsAccount,
        this.signer,
      );

      logger.info('✅ Transaction signed');

      // 6. Send transaction
      const result = await this.sendTransactionWithErrorHandling(
        this.web3,
        signedTx,
        CONFIG.proposalId,
      );

      // 7. Verify result
      logger.info('\n🔍 Verifying signature result...');
      const newStatus = await this.checkSignatureStatus();

      if (newStatus.signatureCount > status.signatureCount) {
        logger.info(`🎉 Signature succeeded! Current signatures: ${newStatus.signatureCount}/2`);
      }

      return result;
    } catch (error) {
      logger.error('❌ Multisig signing failed:', error.message);
      throw error;
    }
  }
}

/**
 * Main entry
 */
async function main() {
  try {
    const signer = new MultisigSigner();
    await signer.signMultisigProposal();
  } catch (error) {
    logger.error('❌ Script execution failed:', error.message);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main().catch(logger.error);
}

module.exports = {
  MultisigSigner,
  CONFIG,
  awsConfig,
};
