/**
 * AWS KMS合约调用脚本 - 基于现有基础设施
 * 使用选项1: 直接合约调用模式
 */

const AWS = require('aws-sdk');
const { Web3 } = require('web3');
const { keccak256 } = require('js-sha3');
const asn1 = require('asn1.js');

// AWS KMS配置
const AWS_CONFIG = {
    KMS_KEY_ID: '',
    KMS_ACCESS_KEY_ID: '',
    KMS_SECRET_ACCESS_KEY: '',
    KMS_REGION: 'us-west-1'
};

// 网络配置
const NETWORK_CONFIG = {
    rpcUrl: 'http://127.0.0.1:8555',
    chainId: 6666
};

// 多签调用参数
const MULTISIG_PARAMS = {
    contractAddress: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
    methodSignature: 'signTransaction(uint256)',
    params: [4],
    fromAddress: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
};

// 初始化AWS KMS
AWS.config.update({
    accessKeyId: AWS_CONFIG.KMS_ACCESS_KEY_ID,
    secretAccessKey: AWS_CONFIG.KMS_SECRET_ACCESS_KEY,
    region: AWS_CONFIG.KMS_REGION
});

const kms = new AWS.KMS();
const web3 = new Web3(NETWORK_CONFIG.rpcUrl);

// ASN.1结构定义
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
 * 工具类 - 基于你现有的helper.js模式
 */
class KMSHelper {
    /**
     * 获取以太坊地址
     */
    static async getEthereumAddress() {
        try {
            const response = await kms.getPublicKey({ KeyId: AWS_CONFIG.KMS_KEY_ID }).promise();
            const res = EcdsaPubKey.decode(response.PublicKey, 'der');
            let pubKeyBuffer = res.pubKey.data;
            pubKeyBuffer = pubKeyBuffer.slice(1); // 移除0x04前缀
            const address = keccak256(pubKeyBuffer);
            const buf2 = Buffer.from(address, 'hex');
            const ethAddr = `0x${buf2.slice(-20).toString('hex')}`;
            return ethAddr;
        } catch (error) {
            throw new Error(`获取以太坊地址失败: ${error.message}`);
        }
    }

    /**
     * 签名交易哈希
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
            throw new Error(`KMS签名失败: ${error.message}`);
        }
    }

    /**
     * 解析DER签名
     */
    static parseDERSignature(derSignature) {
        const signature = Buffer.from(derSignature);
        let offset = 2; // 跳过0x30和长度
        
        // 读取R
        const rLength = signature[offset + 1];
        offset += 2;
        let r = signature.slice(offset, offset + rLength);
        offset += rLength;
        
        // 读取S
        const sLength = signature[offset + 1];
        offset += 2;
        let s = signature.slice(offset, offset + sLength);
        
        // 移除前导零并确保32字节
        r = this.normalizeSignatureComponent(r);
        s = this.normalizeSignatureComponent(s);
        
        return { r, s };
    }

    /**
     * 规范化签名组件
     */
    static normalizeSignatureComponent(component) {
        // 移除前导零
        while (component.length > 1 && component[0] === 0x00) {
            component = component.slice(1);
        }
        
        // 确保32字节
        if (component.length < 32) {
            const padded = Buffer.alloc(32);
            component.copy(padded, 32 - component.length);
            return padded;
        }
        
        return component.slice(-32);
    }

    /**
     * 转换为以太坊签名格式
     */
    static async derToEthSignature(derSignature, messageHash) {
        const { r, s } = this.parseDERSignature(derSignature);
        
        // 规范化s值
        const secp256k1n = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
        const sBigInt = BigInt('0x' + s.toString('hex'));
        
        let normalizedS = s;
        if (sBigInt > secp256k1n / 2n) {
            const normalizedSBigInt = secp256k1n - sBigInt;
            normalizedS = Buffer.from(normalizedSBigInt.toString(16).padStart(64, '0'), 'hex');
        }
        
        // 尝试不同的recovery值
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
        
        throw new Error('无法生成有效的以太坊签名');
    }
}

/**
 * 合约调用器 - 基于你的processRollbackRecord模式
 */
class ContractCaller {
    /**
     * 调用合约方法 - 主要函数
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

        console.log('🚀 开始合约调用...');
        console.log(`   合约: ${contractAddress}`);
        console.log(`   方法: ${methodSignature}`);
        console.log(`   参数: [${methodParams.join(', ')}]`);
        console.log(`   发送者: ${fromAddress}`);

        try {
            // 1. 验证地址匹配
            const kmsAddress = await KMSHelper.getEthereumAddress();
            if (kmsAddress.toLowerCase() !== fromAddress.toLowerCase()) {
                throw new Error(`地址不匹配: KMS=${kmsAddress}, 期望=${fromAddress}`);
            }
            console.log('✅ 地址验证通过');

            // 2. 构建交易数据
            const txData = await this.buildTransactionData(params);
            console.log('✅ 交易数据构建完成');

            // 3. 签名交易
            const signedTx = await this.signTransaction(txData);
            console.log('✅ 交易签名完成');

            // 4. 发送交易
            const receipt = await this.sendTransaction(signedTx);
            console.log('✅ 交易发送成功');

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed,
                receipt: receipt
            };

        } catch (error) {
            console.error('❌ 合约调用失败:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 构建交易数据
     */
    static async buildTransactionData(params) {
        const { contractAddress, methodSignature, params: methodParams } = params;

        // 构建方法调用数据
        const methodId = web3.utils.keccak256(methodSignature).slice(0, 10);
        const encodedParams = web3.eth.abi.encodeParameters(['uint256'], methodParams);
        const data = methodId + encodedParams.slice(2);

        // 获取交易参数
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
     * 签名交易
     */
    static async signTransaction(txData) {
        console.log('🔐 开始签名交易...');

        // 构建交易哈希
        const tx = {
            nonce: web3.utils.toHex(txData.nonce),
            gasPrice: web3.utils.toHex(txData.gasPrice),
            gas: web3.utils.toHex(txData.gas),
            to: txData.to,
            value: web3.utils.toHex(txData.value),
            data: txData.data,
            chainId: txData.chainId
        };

        // 生成交易哈希
        const tempSignedTx = await web3.eth.accounts.signTransaction(tx, '0x' + '0'.repeat(64));
        const messageHash = tempSignedTx.messageHash;

        console.log('   消息哈希:', messageHash);

        // 使用KMS签名
        const derSignature = await KMSHelper.signTransactionHash(messageHash);
        
        // 转换为以太坊格式
        const ethSignature = await KMSHelper.derToEthSignature(derSignature, messageHash);

        // 构建最终的签名交易
        const signedTx = await web3.eth.accounts.signTransaction(tx, ethSignature);
        
        return signedTx.rawTransaction;
    }

    /**
     * 发送交易
     */
    static async sendTransaction(rawTransaction) {
        console.log('📤 发送交易到网络...');
        
        const receipt = await web3.eth.sendSignedTransaction(rawTransaction);
        
        console.log(`   交易哈希: ${receipt.transactionHash}`);
        console.log(`   区块号: ${receipt.blockNumber}`);
        console.log(`   Gas使用: ${receipt.gasUsed}`);
        
        return receipt;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 KMS合约调用器启动...');
    console.log('=====================================\n');

    try {
        // 执行多签调用
        const result = await ContractCaller.callContractMethod(MULTISIG_PARAMS);

        if (result.success) {
            console.log('\n🎉 多签调用成功!');
            console.log(`   交易哈希: ${result.transactionHash}`);
            console.log(`   区块号: ${result.blockNumber}`);
            console.log(`   Gas使用: ${result.gasUsed}`);
            console.log('\n✅ 提案4现在应该有2/2签名了!');
        } else {
            console.log('\n❌ 多签调用失败:', result.error);
            process.exit(1);
        }

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
    KMSHelper,
    ContractCaller,
    MULTISIG_PARAMS,
    AWS_CONFIG
}; 