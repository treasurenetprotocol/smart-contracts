/**
 * Simplified multisig call script
 * Based on the existing AWS KMS infrastructure
 */

const { Web3 } = require('web3');

// Configuration
const CONFIG = {
    rpcUrl: 'http://127.0.0.1:8555',
    chainId: 6666,
    multisigContract: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
    proposalId: 4,
    awsAccount: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
};

// Multisig contract ABI (only the methods we need)
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

async function main() {
    console.log('🚀 Simplified multisig call script');
    console.log('=====================================\n');

    try {
        // Connect to the network
        const web3 = new Web3(CONFIG.rpcUrl);
        const contract = new web3.eth.Contract(MULTISIG_ABI, CONFIG.multisigContract);

        // Check the network
        const networkId = await web3.eth.net.getId();
        console.log(`✅ Network connected: ${networkId}`);

        // Check signature status
        const [signatureCount, alreadySigned] = await Promise.all([
            contract.methods.getSignatureCount(CONFIG.proposalId).call(),
            contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call()
        ]);

        console.log(`📊 Current status:`);
        console.log(`   Proposal ID: ${CONFIG.proposalId}`);
        console.log(`   Signatures: ${Number(signatureCount)}/2`);
        console.log(`   AWS account signed: ${alreadySigned ? 'Yes' : 'No'}`);

        if (alreadySigned) {
            console.log('\n✅ AWS account has already signed this proposal');
            return;
        }

        // Prepare transaction data
        const methodData = contract.methods.signTransaction(CONFIG.proposalId).encodeABI();
        const [nonce, gasPrice, gasEstimate] = await Promise.all([
            web3.eth.getTransactionCount(CONFIG.awsAccount),
            web3.eth.getGasPrice(),
            contract.methods.signTransaction(CONFIG.proposalId).estimateGas({ from: CONFIG.awsAccount })
        ]);

        const txData = {
            to: CONFIG.multisigContract,
            data: methodData,
            gas: Math.floor(Number(gasEstimate) * 1.2),
            gasPrice: Number(gasPrice),
            nonce: Number(nonce),
            value: 0,
            chainId: CONFIG.chainId
        };

        console.log('\n📋 Transaction info:');
        console.log(`   Contract address: ${txData.to}`);
        console.log(`   Method: signTransaction(uint256)`);
        console.log(`   Params: [${CONFIG.proposalId}]`);
        console.log(`   Sender: ${CONFIG.awsAccount}`);
        console.log(`   Gas limit: ${txData.gas}`);
        console.log(`   Gas price: ${txData.gasPrice}`);
        console.log(`   Nonce: ${txData.nonce}`);
        console.log(`   Call data: ${txData.data}`);

        console.log('\n🔧 Use the existing AWS KMS infrastructure:');
        console.log('-------------------------------------');
        console.log('// Based on your helper.js and current code structure');
        console.log(`
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

        console.log('🚀 Next steps:');
        console.log('1. Integrate the above parameters into your existing KMS signing flow');
        console.log('2. Sign and send the transaction');
        console.log('3. Wait for confirmation');
        console.log('4. Verify the signature count becomes 2/2');

    } catch (error) {
        console.error('❌ Script failed:', error.message);
        process.exit(1);
    }
}

// Run script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, CONFIG, MULTISIG_ABI }; 
