/**
 * 简化的多签调用脚本
 * 基于现有的AWS KMS基础设施
 */

const { Web3 } = require('web3');

// 配置
const CONFIG = {
    rpcUrl: 'http://127.0.0.1:8555',
    chainId: 6666,
    multisigContract: '0xED54E6944B2a89A13F3CcF0fc08ba7DB54Fd0A8c',
    proposalId: 4,
    awsAccount: '0x09EDA46FFCec4656235391dd298875B82aA458A9'
};

// 多签合约ABI（仅需要的方法）
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
    console.log('🚀 简化多签调用脚本');
    console.log('=====================================\n');

    try {
        // 连接网络
        const web3 = new Web3(CONFIG.rpcUrl);
        const contract = new web3.eth.Contract(MULTISIG_ABI, CONFIG.multisigContract);

        // 检查网络
        const networkId = await web3.eth.net.getId();
        console.log(`✅ 网络连接成功: ${networkId}`);

        // 检查签名状态
        const [signatureCount, alreadySigned] = await Promise.all([
            contract.methods.getSignatureCount(CONFIG.proposalId).call(),
            contract.methods.hasAlreadySigned(CONFIG.proposalId, CONFIG.awsAccount).call()
        ]);

        console.log(`📊 当前状态:`);
        console.log(`   提案ID: ${CONFIG.proposalId}`);
        console.log(`   签名数: ${Number(signatureCount)}/2`);
        console.log(`   AWS账户已签名: ${alreadySigned ? '是' : '否'}`);

        if (alreadySigned) {
            console.log('\n✅ AWS账户已经签名过此提案');
            return;
        }

        // 准备交易数据
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

        console.log('\n📋 交易信息:');
        console.log(`   合约地址: ${txData.to}`);
        console.log(`   方法: signTransaction(uint256)`);
        console.log(`   参数: [${CONFIG.proposalId}]`);
        console.log(`   发送者: ${CONFIG.awsAccount}`);
        console.log(`   Gas限制: ${txData.gas}`);
        console.log(`   Gas价格: ${txData.gasPrice}`);
        console.log(`   Nonce: ${txData.nonce}`);
        console.log(`   调用数据: ${txData.data}`);

        console.log('\n🔧 使用现有AWS KMS基础设施:');
        console.log('-------------------------------------');
        console.log('// 基于你的 helper.js 和现有代码结构');
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

// 使用你现有的合约调用流程
// 参考 processRollbackRecord 中的模式
        `);

        console.log('🚀 下一步行动:');
        console.log('1. 将上述参数集成到你的现有KMS签名流程中');
        console.log('2. 执行签名和发送交易');
        console.log('3. 等待交易确认');
        console.log('4. 验证签名数变为 2/2');

    } catch (error) {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    }
}

// 运行脚本
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, CONFIG, MULTISIG_ABI }; 