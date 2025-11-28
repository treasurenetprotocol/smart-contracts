/**
 * AWS KMS多签调用脚本
 * 基于用户成功的@web3-kms-signer库实现
 */

const { Web3 } = require('web3');
const { Signer } = require('@web3-kms-signer/core');
const { KMSWallets } = require('@web3-kms-signer/kms-wallets');
const { KMSProviderAWS } = require('@web3-kms-signer/kms-provider-aws');

// AWS KMS配置
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

// 网络配置 dev
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
    //提案号。需要每次修改
    proposalId: 6,
    awsAccount: '0x9038e6adaa51239e10c8954fae1fa870ea69f6ea'
};

// 多签合约ABI
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
 * 多签调用器类 - 基于用户成功的模式
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
     * 获取以太坊地址 - 基于你的getEthereumAddress函数
     */
    async getEthereumAddress() {
        try {
            // 使用KMSWallets获取地址
            const wallet = this.provider;
            const publicKey = await wallet.getPublicKey({ KeyId: awsConfig.kms.keyId });
            
            // 这里需要你的getEthereumAddress工具函数
            // 暂时返回配置的地址
            return CONFIG.awsAccount;
        } catch (error) {
            throw new Error(`获取以太坊地址失败: ${error.message}`);
        }
    }

    /**
     * 计算Gas参数 - 基于你的calculateGasParameters模式
     */
    async calculateGasParameters(web3, contract, methodName, params, senderAddress) {
        try {
            console.log('🔍 计算Gas参数...');
            
            const gasEstimate = await contract.methods[methodName](...params)
                .estimateGas({ from: senderAddress });
            
            const gasPrice = await web3.eth.getGasPrice();
            
            // 添加20%的Gas缓冲
            const finalGas = Math.floor(Number(gasEstimate) * 1.2);
            const adjustedGasPrice = Number(gasPrice);
            
            console.log(`   Gas估算: ${gasEstimate}`);
            console.log(`   最终Gas: ${finalGas}`);
            console.log(`   Gas价格: ${adjustedGasPrice}`);
            
            return {
                finalGas,
                adjustedGasPrice
            };
        } catch (error) {
            throw new Error(`Gas计算失败: ${error.message}`);
        }
    }

    /**
     * 创建并签名交易 - 基于你的createAndSignTransaction函数
     */
    async createAndSignTransaction(web3, chainId, contractAddress, methodData, gasInfo, senderAddress = null, signer = null) {
        console.log('🔐 创建并签名交易...');
        
        // 使用提供的参数或默认值
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

        console.log('   交易数据准备完成');
        console.log(`   To: ${txData.to}`);
        console.log(`   Gas Limit: ${parseInt(txData.gasLimit, 16)}`);
        console.log(`   Gas Price: ${parseInt(txData.gasPrice, 16)}`);

        return await finalSigner.signTransaction({ keyId: awsConfig.kms.keyId }, txData);
    }

    /**
     * 发送交易 - 基于你的sendTransactionWithErrorHandling函数
     */
    async sendTransactionWithErrorHandling(web3, signedTx, proposalId) {
        console.log('📤 发送签名交易...');
        
        try {
            const result = await web3.eth.sendSignedTransaction(signedTx);
            
            console.log('✅ 交易发送成功!');
            console.log(`   交易哈希: ${result.transactionHash}`);
            console.log(`   区块号: ${result.blockNumber}`);
            console.log(`   Gas使用: ${result.gasUsed}`);
            
            return result;
        } catch (error) {
            // 处理交易超时但有哈希的情况
            if (error.message && error.message.includes('Transaction was not mined within')) {
                const txHashMatch = error.message.match(/Transaction Hash: (0x[a-fA-F0-9]{64})/);
                if (txHashMatch && txHashMatch[1]) {
                    const txHash = txHashMatch[1];
                    console.log(`⚠️  交易超时但有哈希: ${txHash}`);
                    return { transactionHash: txHash, status: 'pending' };
                }
            }
            
            console.error('❌ 交易发送失败:', error.message);
            throw error;
        }
    }

    /**
     * 检查签名状态
     */
    async checkSignatureStatus() {
        console.log('📊 检查签名状态...');
        
        const [signatureCount, alreadySigned] = await Promise.all([
            this.contract.methods.getSignatureCount(CONFIG.proposalId).call(),
            this.contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call()
        ]);

        console.log(`   提案ID: ${CONFIG.proposalId}`);
        console.log(`   当前签名: ${Number(signatureCount)}/2`);
        console.log(`   AWS账户已签名: ${alreadySigned ? '是' : '否'}`);

        return {
            signatureCount: Number(signatureCount),
            alreadySigned
        };
    }

    /**
     * 执行多签签名 - 主函数
     */
    async signMultisigProposal() {
        console.log('🚀 开始多签签名过程...');
        console.log('=====================================\n');

        try {
            // 1. 检查网络连接
            const networkId = await this.web3.eth.net.getId();
            console.log(`✅ 连接到网络: ${networkId}`);
            
            if (networkId != CONFIG.chainId) {
                console.warn(`⚠️  网络ID不匹配: 期望${CONFIG.chainId}, 实际${networkId}`);
            }

            // 2. 检查签名状态
            const status = await this.checkSignatureStatus();
            
            if (status.alreadySigned) {
                console.log('\n✅ AWS账户已经签名过此提案!');
                return;
            }

            if (status.signatureCount >= 2) {
                console.log('\n✅ 提案已有足够签名!');
                return;
            }

            // 3. 计算Gas参数
            const gasInfo = await this.calculateGasParameters(
                this.web3,
                this.contract,
                'signTransaction',
                [CONFIG.proposalId],
                CONFIG.awsAccount
            );

            // 4. 编码方法数据
            const methodData = this.contract.methods.signTransaction(CONFIG.proposalId).encodeABI();
            console.log(`✅ 方法数据编码完成: ${methodData.slice(0, 20)}...`);

            // 5. 创建并签名交易
            const signedTx = await this.createAndSignTransaction(
                this.web3,
                CONFIG.chainId,
                CONFIG.multisigContract,
                methodData,
                gasInfo,
                CONFIG.awsAccount,
                this.signer
            );

            console.log('✅ 交易签名完成');

            // 6. 发送交易
            const result = await this.sendTransactionWithErrorHandling(
                this.web3,
                signedTx,
                CONFIG.proposalId
            );

            // 7. 验证结果
            console.log('\n🔍 验证签名结果...');
            const newStatus = await this.checkSignatureStatus();
            
            if (newStatus.signatureCount > status.signatureCount) {
                console.log(`🎉 签名成功! 当前签名数: ${newStatus.signatureCount}/2`);
            }

            return result;

        } catch (error) {
            console.error('❌ 多签签名失败:', error.message);
            throw error;
        }
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        const signer = new MultisigSigner();
        await signer.signMultisigProposal();
    } catch (error) {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    }
}

// 运行脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    MultisigSigner,
    CONFIG,
    awsConfig
};

