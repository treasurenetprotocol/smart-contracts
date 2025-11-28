/**
 * AWS KMS multisig call script
 * Built on the proven @web3-kms-signer library
 */

const { Web3 } = require('web3');
const { Signer } = require('@web3-kms-signer/core');
const { KMSWallets } = require('@web3-kms-signer/kms-wallets');
const { KMSProviderAWS } = require('@web3-kms-signer/kms-provider-aws');

// AWS KMS configuration
const awsConfig = {
    //dev
/*    kms: {
        keyId: '',
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-west-1'
    }*/
    //pro
    kms: {
        keyId: '',
        accessKeyId: '',
        secretAccessKey: '',
        region: 'us-west-1'
    }
};

// Network config (dev)
// const CONFIG = {
//     rpcUrl: 'http://127.0.0.1:8555',
//     chainId: 6666,
//     multisigContract: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
//     proposalId: 5,
//     awsAccount: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
// };

const CONFIG = {
    rpcUrl: 'https://rpc.treasurenet.io',
    chainId: 5570,
    multisigContract: '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70',
    // Proposal number; update for each run
    proposalId: 6,
    awsAccount: '0x9038e6adaa51239e10c8954fae1fa870ea69f6ea'
};

// Multisig contract ABI
const MULTISIG_ABI = [
    {
        "inputs": [{"type": "uint256", "name": "proposalId"}],
        "name": "signTransaction",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"type": "uint256", "name": "proposalId"}],
        "name": "getSignatureCount",
        "outputs": [{"type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"type": "uint256", "name": "proposalId"}, {"type": "address", "name": "signer"}],
        "name": "hasAlreadySigned",
        "outputs": [{"type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
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
                secretAccessKey: awsConfig.kms.secretAccessKey
            }
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
            console.log('🔍 Calculating gas parameters...');
            
            const gasEstimate = await contract.methods[methodName](...params)
                .estimateGas({ from: senderAddress });
            
            const gasPrice = await web3.eth.getGasPrice();
            
            // Add 20% gas buffer
            const finalGas = Math.floor(Number(gasEstimate) * 1.2);
            const adjustedGasPrice = Number(gasPrice);
            
            console.log(`   Gas estimate: ${gasEstimate}`);
            console.log(`   Final gas: ${finalGas}`);
            console.log(`   Gas price: ${adjustedGasPrice}`);
            
            return {
                finalGas,
                adjustedGasPrice
            };
        } catch (error) {
            throw new Error(`Gas calculation failed: ${error.message}`);
        }
    }

    /**
     * Create and sign transaction - based on your createAndSignTransaction function
     */
    async createAndSignTransaction(web3, chainId, contractAddress, methodData, gasInfo, senderAddress = null, signer = null) {
        console.log('🔐 Creating and signing transaction...');
        
        // Use provided params or defaults
        let finalSenderAddress = senderAddress || CONFIG.awsAccount;
        let finalSigner = signer || this.signer;

        const nonce = await web3.eth.getTransactionCount(finalSenderAddress, 'pending');
        console.log(`   Nonce: ${nonce}`);

        const txData = {
            nonce: `0x${nonce.toString(16)}`,
            gasPrice: `0x${BigInt(gasInfo.adjustedGasPrice).toString(16)}`,
            gasLimit: `0x${gasInfo.finalGas.toString(16)}`,
            to: contractAddress,
            value: '0x00',
            data: methodData,
        };

        console.log('   Transaction data prepared');
        console.log(`   To: ${txData.to}`);
        console.log(`   Gas Limit: ${parseInt(txData.gasLimit, 16)}`);
        console.log(`   Gas Price: ${parseInt(txData.gasPrice, 16)}`);

        return await finalSigner.signTransaction({ keyId: awsConfig.kms.keyId }, txData);
    }

    /**
     * Send transaction - based on your sendTransactionWithErrorHandling function
     */
    async sendTransactionWithErrorHandling(web3, signedTx, proposalId) {
        console.log('📤 Sending signed transaction...');
        
        try {
            const result = await web3.eth.sendSignedTransaction(signedTx);
            
            console.log('✅ Transaction sent!');
            console.log(`   Tx hash: ${result.transactionHash}`);
            console.log(`   Block number: ${result.blockNumber}`);
            console.log(`   Gas used: ${result.gasUsed}`);
            
            return result;
        } catch (error) {
            // Handle timeout cases that still return a hash
            if (error.message && error.message.includes('Transaction was not mined within')) {
                const txHashMatch = error.message.match(/Transaction Hash: (0x[a-fA-F0-9]{64})/);
                if (txHashMatch && txHashMatch[1]) {
                    const txHash = txHashMatch[1];
                    console.log(`⚠️  Transaction timed out but has hash: ${txHash}`);
                    return { transactionHash: txHash, status: 'pending' };
                }
            }
            
            console.error('❌ Transaction failed to send:', error.message);
            throw error;
        }
    }

    /**
     * Check signature status
     */
    async checkSignatureStatus() {
        console.log('📊 Checking signature status...');
        
        const [signatureCount, alreadySigned] = await Promise.all([
            this.contract.methods.getSignatureCount(CONFIG.proposalId).call(),
            this.contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call()
        ]);

        console.log(`   Proposal ID: ${CONFIG.proposalId}`);
        console.log(`   Current signatures: ${Number(signatureCount)}/2`);
        console.log(`   AWS account signed: ${alreadySigned ? 'Yes' : 'No'}`);

        return {
            signatureCount: Number(signatureCount),
            alreadySigned
        };
    }

    /**
     * Execute multisig signing - main routine
     */
    async signMultisigProposal() {
        console.log('🚀 Starting multisig signing...');
        console.log('=====================================\n');

        try {
            // 1. Check network connection
            const networkId = await this.web3.eth.net.getId();
            console.log(`✅ Connected to network: ${networkId}`);
            
            if (networkId != CONFIG.chainId) {
                console.warn(`⚠️  Network ID mismatch: expected ${CONFIG.chainId}, got ${networkId}`);
            }

            // 2. Check signature status
            const status = await this.checkSignatureStatus();
            
            if (status.alreadySigned) {
                console.log('\n✅ AWS account has already signed this proposal!');
                return;
            }

            if (status.signatureCount >= 2) {
                console.log('\n✅ Proposal already has enough signatures!');
                return;
            }

            // 3. Calculate gas parameters
            const gasInfo = await this.calculateGasParameters(
                this.web3,
                this.contract,
                'signTransaction',
                [CONFIG.proposalId],
                CONFIG.awsAccount
            );

            // 4. Encode method data
            const methodData = this.contract.methods.signTransaction(CONFIG.proposalId).encodeABI();
            console.log(`✅ Method data encoded: ${methodData.slice(0, 20)}...`);

            // 5. Create and sign transaction
            const signedTx = await this.createAndSignTransaction(
                this.web3,
                CONFIG.chainId,
                CONFIG.multisigContract,
                methodData,
                gasInfo,
                CONFIG.awsAccount,
                this.signer
            );

            console.log('✅ Transaction signed');

            // 6. Send transaction
            const result = await this.sendTransactionWithErrorHandling(
                this.web3,
                signedTx,
                CONFIG.proposalId
            );

            // 7. Verify result
            console.log('\n🔍 Verifying signature result...');
            const newStatus = await this.checkSignatureStatus();
            
            if (newStatus.signatureCount > status.signatureCount) {
                console.log(`🎉 Signature succeeded! Current signatures: ${newStatus.signatureCount}/2`);
            }

            return result;

        } catch (error) {
            console.error('❌ Multisig signing failed:', error.message);
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
        console.error('❌ Script execution failed:', error.message);
        process.exit(1);
    }
}

// Run script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    MultisigSigner,
    CONFIG,
    awsConfig
};
