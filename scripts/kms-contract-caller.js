/**
 * AWS KMS contract call script - built on existing infrastructure
 * Using option 1: direct contract call mode
 */

const AWS = require('aws-sdk');
const Web3 = require('web3');
const { keccak256 } = require('js-sha3');
const asn1 = require('asn1.js');

// AWS KMS configuration
const AWS_CONFIG = {
    KMS_KEY_ID: '',
    KMS_ACCESS_KEY_ID: '',
    KMS_SECRET_ACCESS_KEY: '',
    KMS_REGION: 'us-west-1'
};

// Network configuration
const NETWORK_CONFIG = {
    rpcUrl: 'http://127.0.0.1:8555',
    chainId: 6666
};

// Multisig call parameters
const MULTISIG_PARAMS = {
    contractAddress: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
    methodSignature: 'signTransaction(uint256)',
    params: [4],
    fromAddress: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
};

// Initialize AWS KMS
AWS.config.update({
    accessKeyId: AWS_CONFIG.KMS_ACCESS_KEY_ID,
    secretAccessKey: AWS_CONFIG.KMS_SECRET_ACCESS_KEY,
    region: AWS_CONFIG.KMS_REGION
});

const kms = new AWS.KMS();
const web3 = new Web3(NETWORK_CONFIG.rpcUrl);

// ASN.1 structure definition
const EcdsaPubKey = asn1.define('EcdsaPubKey', function () {
    this.seq().obj(
        this.key('algo').seq().obj(
            this.key('a').objid(),
            this.key('b').objid(),
        ),
        this.key('pubKey').bitstr(),
    );
});

/**
 * Helper utilities - mirroring your helper.js pattern
 */
class KMSHelper {
    /**
     * Get Ethereum address
     */
    static async getEthereumAddress() {
        try {
            const response = await kms.getPublicKey({ KeyId: AWS_CONFIG.KMS_KEY_ID }).promise();
            const res = EcdsaPubKey.decode(response.PublicKey, 'der');
            let pubKeyBuffer = res.pubKey.data;
            pubKeyBuffer = pubKeyBuffer.slice(1); // remove 0x04 prefix
            const address = keccak256(pubKeyBuffer);
            const buf2 = Buffer.from(address, 'hex');
            const ethAddr = `0x${buf2.slice(-20).toString('hex')}`;
            return ethAddr;
        } catch (error) {
            throw new Error(`Failed to get Ethereum address: ${error.message}`);
        }
    }

    /**
     * Sign transaction hash
     */
    static async signTransactionHash(messageHash) {
        try {
            const params = {
                KeyId: AWS_CONFIG.KMS_KEY_ID,
                Message: Buffer.from(messageHash.slice(2), 'hex'),
                SigningAlgorithm: 'ECDSA_SHA_256',
                MessageType: 'DIGEST',
            };

            const result = await kms.sign(params).promise();
            return result.Signature;
        } catch (error) {
            throw new Error(`KMS signing failed: ${error.message}`);
        }
    }

    /**
     * Parse DER signature
     */
    static parseDERSignature(derSignature) {
        const signature = Buffer.from(derSignature);
        let offset = 2; // skip 0x30 and total length
        
        // Read R
        const rLength = signature[offset + 1];
        offset += 2;
        let r = signature.slice(offset, offset + rLength);
        offset += rLength;
        
        // Read S
        const sLength = signature[offset + 1];
        offset += 2;
        let s = signature.slice(offset, offset + sLength);
        
        // Remove leading zeros and ensure 32 bytes
        r = this.normalizeSignatureComponent(r);
        s = this.normalizeSignatureComponent(s);
        
        return { r, s };
    }

    /**
     * Normalize signature component
     */
    static normalizeSignatureComponent(component) {
        // Remove leading zeros
        while (component.length > 1 && component[0] === 0x00) {
            component = component.slice(1);
        }
        
        // Ensure 32 bytes
        if (component.length < 32) {
            const padded = Buffer.alloc(32);
            component.copy(padded, 32 - component.length);
            return padded;
        }
        
        return component.slice(-32);
    }

    /**
     * Convert to Ethereum signature format
     */
    static async derToEthSignature(derSignature, messageHash) {
        const { r, s } = this.parseDERSignature(derSignature);
        
        // Normalize s value
        const secp256k1n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
        const sBigInt = BigInt('0x' + s.toString('hex'));
        
        let normalizedS = s;
        if (sBigInt > secp256k1n / 2n) {
            const normalizedSBigInt = secp256k1n - sBigInt;
            normalizedS = Buffer.from(normalizedSBigInt.toString(16).padStart(64, '0'), 'hex');
        }
        
        // Try different recovery values
        for (let recovery = 0; recovery < 2; recovery++) {
            const v = recovery + 27;
            const signature = `0x${r.toString('hex')}${normalizedS.toString('hex')}${v.toString(16).padStart(2, '0')}`;
            
            try {
                const recoveredAddress = web3.eth.accounts.recover(messageHash, signature);
                const expectedAddress = await this.getEthereumAddress();
                
                if (recoveredAddress.toLowerCase() === expectedAddress.toLowerCase()) {
                    return signature;
                }
            } catch (e) {
                continue;
            }
        }
        
        throw new Error('Unable to generate a valid Ethereum signature');
    }
}

/**
 * Contract caller - following your processRollbackRecord pattern
 */
class ContractCaller {
    /**
     * Call contract method - main function
     */
    static async callContractMethod(params) {
        const {
            contractAddress,
            methodSignature,
            params: methodParams,
            fromAddress,
            gasLimit = null,
            gasPrice = null
        } = params;

        console.log('🚀 Starting contract call...');
        console.log(`   Contract: ${contractAddress}`);
        console.log(`   Method: ${methodSignature}`);
        console.log(`   Params: [${methodParams.join(', ')}]`);
        console.log(`   From: ${fromAddress}`);

        try {
            // 1. Verify address matches
            const kmsAddress = await KMSHelper.getEthereumAddress();
            if (kmsAddress.toLowerCase() !== fromAddress.toLowerCase()) {
                throw new Error(`Address mismatch: KMS=${kmsAddress}, expected=${fromAddress}`);
            }
            console.log('✅ Address verification passed');

            // 2. Build transaction data
            const txData = await this.buildTransactionData(params);
            console.log('✅ Transaction data built');

            // 3. Sign transaction
            const signedTx = await this.signTransaction(txData);
            console.log('✅ Transaction signed');

            // 4. Send transaction
            const receipt = await this.sendTransaction(signedTx);
            console.log('✅ Transaction sent');

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                receipt: receipt
            };

        } catch (error) {
            console.error('❌ Contract call failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Build transaction data
     */
    static async buildTransactionData(params) {
        const { contractAddress, methodSignature, params: methodParams } = params;

        // Construct method call data
        const methodId = web3.utils.keccak256(methodSignature).slice(0, 10);
        const encodedParams = web3.eth.abi.encodeParameters(['uint256'], methodParams);
        const data = methodId + encodedParams.slice(2);

        // Get transaction parameters
        const [nonce, gasPrice, gasEstimate] = await Promise.all([
            web3.eth.getTransactionCount(params.fromAddress),
            web3.eth.getGasPrice(),
            web3.eth.estimateGas({
                to: contractAddress,
                data: data,
                from: params.fromAddress
            })
        ]);

        return {
            to: contractAddress,
            data: data,
            gas: Math.floor(Number(gasEstimate) * 1.2), // 20% buffer
            gasPrice: Number(gasPrice),
            nonce: Number(nonce),
            value: 0,
            chainId: NETWORK_CONFIG.chainId
        };
    }

    /**
     * Sign transaction
     */
    static async signTransaction(txData) {
        console.log('🔐 Signing transaction...');

        // Build transaction hash
        const tx = {
            nonce: web3.utils.toHex(txData.nonce),
            gasPrice: web3.utils.toHex(txData.gasPrice),
            gas: web3.utils.toHex(txData.gas),
            to: txData.to,
            value: web3.utils.toHex(txData.value),
            data: txData.data,
            chainId: txData.chainId
        };

        // Generate transaction hash
        const tempSignedTx = await web3.eth.accounts.signTransaction(tx, '0x' + '0'.repeat(64));
        const messageHash = tempSignedTx.messageHash;

        console.log('   Message hash:', messageHash);

        // Sign with KMS
        const derSignature = await KMSHelper.signTransactionHash(messageHash);
        
        // Convert to Ethereum format
        const ethSignature = await KMSHelper.derToEthSignature(derSignature, messageHash);

        // Build the final signed transaction
        const signedTx = await web3.eth.accounts.signTransaction(tx, ethSignature);
        
        return signedTx.rawTransaction;
    }

    /**
     * Send transaction
     */
    static async sendTransaction(rawTransaction) {
        console.log('📤 Sending transaction to network...');
        
        const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
        
        console.log(`   Tx hash: ${receipt.transactionHash}`);
        console.log(`   Block number: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
        
        return receipt;
    }
}

/**
 * Main entry
 */
async function main() {
    console.log('🚀 KMS contract caller starting...');
    console.log('=====================================\n');

    try {
        // Execute multisig call
        const result = await ContractCaller.callContractMethod(MULTISIG_PARAMS);

        if (result.success) {
            console.log('\n🎉 Multisig call succeeded!');
            console.log(`   Tx hash: ${result.transactionHash}`);
            console.log(`   Block number: ${result.blockNumber}`);
            console.log(`   Gas used: ${result.gasUsed}`);
            console.log('\n✅ Proposal 4 should now have 2/2 signatures!');
        } else {
            console.log('\n❌ Multisig call failed:', result.error);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Run script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    KMSHelper,
    ContractCaller,
    MULTISIG_PARAMS,
    AWS_CONFIG
}; 
