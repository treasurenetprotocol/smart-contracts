#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Manually upgrade Producer contracts by deploying new implementations
 * and updating them through ProxyAdmin - MAINNET VERSION
 * Usage: node scripts/manual-upgrade-producers.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Contract addresses from tnmainnet.md
    GOVERNANCE_ADDRESS: "0xc69bd55C22664cF319698984211FeD155403C066",
    
    // Foundation manager address (需要填入mainnet的私钥)
    FOUNDATION_MANAGER_ADDRESS: "0x7ec62bc5062fa1d94f27775d211a3585ca4048ae", // 需要填入mainnet的foundation manager地址
    FOUNDATION_MANAGER_PRIVATE_KEY: "0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6", // 需要填入mainnet的私钥
    
    // Known Producer addresses from tnmainnet.md
    PRODUCER_ADDRESSES: {
        'OIL': '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
        'GAS': '0x470B0196f597DF699057599D436f7E259688BCd9',
        'ETH': '0x4693c13eF898c50596072db86E420495C1680643',
        'BTC': '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40'
    }
};

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
    {
        "inputs": [
            {"name": "proxy", "type": "address"},
            {"name": "implementation", "type": "address"}
        ],
        "name": "upgrade",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyImplementation",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyAdmin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Load contract ABI and Bytecode
function loadContract(contractName) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        return {
            abi: contractJson.abi,
            bytecode: contractJson.bytecode
        };
    } catch (error) {
        console.error(`Failed to load contract ${contractName}:`, error.message);
        process.exit(1);
    }
}

async function manualUpgrade() {
    try {
        console.log('🌐 手动升级Producer合约 - MAINNET 环境');
        console.log('=====================================');
        console.log(`网络: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`执行账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Validate required configuration
        if (!CONFIG.FOUNDATION_MANAGER_ADDRESS || !CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY) {
            console.error('❌ 错误: 需要填入FOUNDATION_MANAGER_ADDRESS和FOUNDATION_MANAGER_PRIVATE_KEY');
            console.error('请使用有权限的mainnet账户信息更新CONFIG');
            process.exit(1);
        }

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);

        // Add the foundation manager account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);

        // Verify network connectivity
        console.log('🔗 Step 1: 验证网络连接');
        console.log('-------------------------');
        try {
            const networkId = await web3.eth.net.getId();
            const blockNumber = await web3.eth.getBlockNumber();
            console.log(`✅ 网络连接成功`);
            console.log(`   Network ID: ${networkId}`);
            console.log(`   当前区块: ${blockNumber}`);
            
            if (networkId !== 5570) {
                console.warn(`⚠️  警告: 期望Network ID为5570 (Treasurenet Mainnet), 当前为 ${networkId}`);
            }
        } catch (error) {
            console.error(`❌ 网络连接失败: ${error.message}`);
            process.exit(1);
        }

        // Check account balance
        const balance = await web3.eth.getBalance(CONFIG.FOUNDATION_MANAGER_ADDRESS);
        const balanceInUnit = web3.utils.fromWei(balance, 'ether');
        console.log(`   账户余额: ${balanceInUnit} UNIT`);
        
        if (parseFloat(balanceInUnit) < 0.5) {
            console.warn(`⚠️  警告: 账户余额较低 (${balanceInUnit} UNIT), 部署合约可能需要较多gas费用`);
        }

        console.log('');
        console.log('🔍 Step 2: 检查当前实现合约');
        console.log('-----------------------------');

        const results = [];

        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n📋 ${kind} Producer: ${proxyAddress}`);

            try {
                // Try to find ProxyAdmin by checking proxy admin
                const proxyCode = await web3.eth.getCode(proxyAddress);
                if (proxyCode === '0x') {
                    throw new Error(`No contract found at proxy address ${proxyAddress}`);
                }

                // Try to get current implementation
                // For EIP-1967 proxies, implementation is stored at specific slot
                const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
                const implementationData = await web3.eth.getStorageAt(proxyAddress, implementationSlot);
                const currentImplementation = '0x' + implementationData.slice(-40);
                
                console.log(`   当前实现: ${currentImplementation}`);
                
                results.push({
                    kind,
                    proxyAddress,
                    currentImplementation,
                    status: 'found'
                });

            } catch (error) {
                console.log(`   ❌ 检查失败: ${error.message}`);
                results.push({
                    kind,
                    proxyAddress,
                    status: 'error',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🚀 Step 3: 部署新实现合约 (MAINNET)');
        console.log('------------------------------------');

        // Important mainnet warning
        console.log('⚠️  重要提醒: 这是MAINNET环境的合约部署！');
        console.log('将会部署新的Producer实现合约，请确认网络和账户正确。');
        console.log('');

        const deployedImplementations = {};

        for (const [kind, config] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n🔧 部署 ${kind}Producer 新实现... (MAINNET)`);

            try {
                // Load contract
                const contractName = kind === 'OIL' ? 'OilProducer' :
                                   kind === 'GAS' ? 'GasProducer' :
                                   kind === 'ETH' ? 'EthProducer' : 'BtcProducer';
                
                const contract = loadContract(contractName);
                console.log(`   加载合约: ${contractName}`);

                // Create contract instance for deployment
                const contractInstance = new web3.eth.Contract(contract.abi);

                // Estimate deployment gas
                const deployData = contractInstance.deploy({
                    data: contract.bytecode
                }).encodeABI();

                const gasEstimate = await web3.eth.estimateGas({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    data: deployData
                });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.5); // Higher buffer for mainnet
                
                console.log(`   Gas估算: ${gasEstimate} (带缓冲: ${gasWithBuffer})`);
                console.log(`   Gas价格: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   预估费用: ${estimatedCost} UNIT`);

                // Deploy new implementation
                const deployedContract = await contractInstance.deploy({
                    data: contract.bytecode
                }).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                const implementationAddress = deployedContract.options.address;
                console.log(`   ✅ 部署成功！`);
                console.log(`   实现地址: ${implementationAddress}`);
                console.log(`   交易哈希: ${deployedContract.transactionHash}`);
                
                const actualCost = await web3.eth.getTransactionReceipt(deployedContract.transactionHash);
                console.log(`   实际Gas使用: ${actualCost.gasUsed}`);
                console.log(`   实际费用: ${web3.utils.fromWei((BigInt(actualCost.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                deployedImplementations[kind] = implementationAddress;

                // Wait for confirmation
                console.log(`   ⏳ 等待确认 (30秒)...`);
                await new Promise(resolve => setTimeout(resolve, 30000));

            } catch (error) {
                console.log(`   ❌ 部署失败: ${error.message}`);
                deployedImplementations[kind] = null;
            }
        }

        console.log('');
        console.log('🧪 Step 4: 验证部署结果');
        console.log('-----------------------');

        const successfulDeployments = [];
        
        for (const [kind, implementationAddress] of Object.entries(deployedImplementations)) {
            if (implementationAddress) {
                console.log(`✅ ${kind}: ${implementationAddress}`);
                successfulDeployments.push({ kind, implementationAddress });
                
                // Verify contract code
                const code = await web3.eth.getCode(implementationAddress);
                if (code.length > 10) { // More than just '0x'
                    console.log(`   ✅ 合约代码验证成功`);
                } else {
                    console.log(`   ❌ 合约代码验证失败`);
                }
            } else {
                console.log(`❌ ${kind}: 部署失败`);
            }
        }

        console.log('');
        console.log('📊 部署结果总结 - MAINNET');
        console.log('========================');

        console.log(`✅ 成功部署: ${successfulDeployments.length} 个实现合约`);
        console.log(`❌ 部署失败: ${Object.keys(deployedImplementations).length - successfulDeployments.length} 个实现合约`);

        if (successfulDeployments.length > 0) {
            console.log('\n🎉 新实现合约部署完成！');
            console.log('\n📋 部署的新实现地址:');
            successfulDeployments.forEach(({ kind, implementationAddress }) => {
                console.log(`${kind}: ${implementationAddress}`);
            });

            console.log('\n📝 下一步操作:');
            console.log('1. 更新 upgrade-via-proxyadmin.js 脚本中的 newImplementation 地址');
            console.log('2. 找到ProxyAdmin合约地址并更新配置');
            console.log('3. 运行升级脚本进行代理升级');
            console.log('4. 运行 fix-mulsig-addresses.js 设置_mulSig地址');

            console.log('\n💡 升级配置模板:');
            console.log('```javascript');
            console.log('UPGRADES: {');
            successfulDeployments.forEach(({ kind, implementationAddress }) => {
                const proxyAddress = CONFIG.PRODUCER_ADDRESSES[kind];
                console.log(`    '${kind}': {`);
                console.log(`        proxy: '${proxyAddress}',`);
                console.log(`        newImplementation: '${implementationAddress}'`);
                console.log(`    },`);
            });
            console.log('}');
            console.log('```');
        }

        console.log('\n🌍 Mainnet部署完成！');
        console.log('请保存所有合约地址和交易哈希以备审计使用。');

    } catch (error) {
        console.error('❌ 部署失败:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    manualUpgrade();
}

module.exports = manualUpgrade; 