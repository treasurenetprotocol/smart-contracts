#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Upgrade Producer contracts via ProxyAdmin
 * Usage: node scripts/upgrade-via-proxyadmin.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Discovered addresses (需要查找mainnet的ProxyAdmin地址)
    PROXY_ADMIN_ADDRESS: "0xb6281f28a463c4d7f6b022609a9f7bfeabd86323", // 需要填入mainnet的ProxyAdmin地址
    
    // Foundation manager address (需要填入mainnet的私钥)
    FOUNDATION_MANAGER_ADDRESS: "0xd6cAdb2E5150e4114e5E321CE195db209f1882ac", // 需要填入mainnet的foundation manager地址
    FOUNDATION_MANAGER_PRIVATE_KEY: "0xdfe85efff760bb70e1c4b2e20886ab65753ecebbbb30bb90ae5dc62615b64470", // 需要填入mainnet的私钥
    
    // Producer addresses from mainnet (from tnmainnet.md)
    UPGRADES: {
        'OIL': {
            proxy: '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
            newImplementation: '0x5d840312eE45680022A4C371fb72a93a31EA47CD'
        },
        'GAS': {
            proxy: '0x470B0196f597DF699057599D436f7E259688BCd9',
            newImplementation: '0x0E767DDE97547c43fe4E1831bf905EA2C6cf58FF'
        },
        'ETH': {
            proxy: '0x4693c13eF898c50596072db86E420495C1680643',
            newImplementation: '0xe0eA5259BABD288F86a68a3cCBF7E2D999B2711c'
        },
        'BTC': {
            proxy: '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40',
            newImplementation: '0xBB6ABcCb5807B75076A48eBDED80F3427eB449Bc'
        }
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
    },
    {
        "inputs": [],
        "name": "owner",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Load contract ABI
function loadContractABI(contractName) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        return contractJson.abi;
    } catch (error) {
        console.error(`Failed to load ABI for ${contractName}:`, error.message);
        process.exit(1);
    }
}

async function upgradeViaProxyAdmin() {
    try {
        console.log('🌐 通过ProxyAdmin升级Producer合约 - MAINNET 环境');
        console.log('================================================');
        console.log(`网络: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`ProxyAdmin地址: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
        console.log(`执行账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Validate required configuration
        if (!CONFIG.PROXY_ADMIN_ADDRESS) {
            console.error('❌ 错误: 需要填入PROXY_ADMIN_ADDRESS');
            console.error('请在mainnet环境中查找ProxyAdmin合约地址并更新CONFIG');
            process.exit(1);
        }

        if (!CONFIG.FOUNDATION_MANAGER_ADDRESS || !CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY) {
            console.error('❌ 错误: 需要填入FOUNDATION_MANAGER_ADDRESS和FOUNDATION_MANAGER_PRIVATE_KEY');
            console.error('请使用有权限的mainnet账户信息更新CONFIG');
            process.exit(1);
        }

        // Check if new implementations are provided
        const missingImplementations = [];
        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            if (!config.newImplementation) {
                missingImplementations.push(kind);
            }
        }

        if (missingImplementations.length > 0) {
            console.error('❌ 错误: 以下Producer缺少新实现地址:');
            missingImplementations.forEach(kind => {
                console.error(`  - ${kind}: 需要先部署新实现合约`);
            });
            console.error('\n💡 请先使用 manual-upgrade-producers.js 部署新实现合约');
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
        
        if (parseFloat(balanceInUnit) < 0.1) {
            console.warn(`⚠️  警告: 账户余额较低 (${balanceInUnit} UNIT), 可能不足以支付gas费用`);
        }

        // Create ProxyAdmin contract instance
        const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, CONFIG.PROXY_ADMIN_ADDRESS);

        console.log('');
        console.log('🔍 Step 2: 验证ProxyAdmin权限');
        console.log('-----------------------------');

        try {
            // Check who owns the ProxyAdmin
            const owner = await proxyAdmin.methods.owner().call();
            console.log(`ProxyAdmin owner: ${owner}`);
            
            if (owner.toLowerCase() === CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
                console.log('✅ 当前账户是ProxyAdmin的owner');
            } else {
                console.log('❌ 当前账户不是ProxyAdmin的owner');
                console.log('💡 在mainnet环境中，可能需要通过多签操作或使用正确的owner账户');
                console.log(`   当前账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
                console.log(`   ProxyAdmin owner: ${owner}`);
                
                // Ask user to confirm
                console.log('⚠️  警告: 权限不匹配，是否继续尝试升级? (可能会失败)');
                console.log('建议检查权限配置或使用正确的账户');
            }
        } catch (error) {
            console.log(`⚠️  无法检查ProxyAdmin owner: ${error.message}`);
            console.log('继续尝试升级...');
        }

        console.log('');
        console.log('🔍 Step 3: 验证当前实现地址');
        console.log('----------------------------');

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            console.log(`\n📋 ${kind} Producer:`);
            console.log(`   代理地址: ${config.proxy}`);
            console.log(`   新实现地址: ${config.newImplementation}`);

            try {
                const currentImpl = await proxyAdmin.methods.getProxyImplementation(config.proxy).call();
                console.log(`   ✅ 当前实现: ${currentImpl}`);
                
                if (currentImpl.toLowerCase() === config.newImplementation.toLowerCase()) {
                    console.log(`   ✅ 已经是最新实现`);
                    config.needsUpgrade = false;
                } else {
                    console.log(`   🔄 需要升级`);
                    config.needsUpgrade = true;
                }
            } catch (error) {
                console.log(`   ❌ 无法获取当前实现: ${error.message}`);
                config.needsUpgrade = true;
            }
        }

        console.log('');
        console.log('🚀 Step 4: 执行升级 (MAINNET - 谨慎操作!)');
        console.log('--------------------------------------------');

        // Final confirmation for mainnet
        console.log('⚠️  重要提醒: 这是MAINNET环境的合约升级操作!');
        console.log('请确认以下信息正确:');
        console.log(`- 网络: Treasurenet Mainnet (${await web3.eth.net.getId()})`);
        console.log(`- 执行账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log(`- ProxyAdmin: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
        console.log('');

        const results = [];

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            if (!config.needsUpgrade) {
                console.log(`⏭️  跳过 ${kind}: 已经是最新版本`);
                results.push({ kind, status: 'skipped', reason: 'Already up to date' });
                continue;
            }

            console.log(`\n🔧 升级 ${kind} Producer... (MAINNET)`);

            try {
                // Estimate gas with higher buffer for mainnet
                const gasEstimate = await proxyAdmin.methods.upgrade(config.proxy, config.newImplementation)
                    .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.5); // Higher buffer for mainnet
                
                console.log(`   Gas估算: ${gasEstimate} (带缓冲: ${gasWithBuffer})`);
                console.log(`   Gas价格: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   预估费用: ${estimatedCost} UNIT`);

                // Execute upgrade
                const receipt = await proxyAdmin.methods.upgrade(config.proxy, config.newImplementation).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                console.log(`   ✅ 升级成功！`);
                console.log(`   交易哈希: ${receipt.transactionHash}`);
                console.log(`   Gas使用: ${receipt.gasUsed}`);
                console.log(`   实际费用: ${web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                results.push({
                    kind,
                    status: 'success',
                    transactionHash: receipt.transactionHash,
                    gasUsed: receipt.gasUsed
                });

                // Wait longer for mainnet confirmation
                console.log(`   ⏳ 等待确认 (30秒)...`);
                await new Promise(resolve => setTimeout(resolve, 30000));

            } catch (error) {
                console.log(`   ❌ 升级失败: ${error.message}`);
                results.push({
                    kind,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🧪 Step 5: 验证升级结果');
        console.log('-----------------------');

        for (const [kind, config] of Object.entries(CONFIG.UPGRADES)) {
            console.log(`\n🔍 验证 ${kind} Producer...`);

            try {
                // Check implementation
                const currentImpl = await proxyAdmin.methods.getProxyImplementation(config.proxy).call();
                console.log(`   当前实现: ${currentImpl}`);

                if (currentImpl.toLowerCase() === config.newImplementation.toLowerCase()) {
                    console.log(`   ✅ 实现地址正确`);

                    // Test new function
                    try {
                        const producerABI = loadContractABI(kind === 'OIL' ? 'OilProducer' : 
                                                         kind === 'GAS' ? 'GasProducer' :
                                                         kind === 'ETH' ? 'EthProducer' : 'BtcProducer');
                        const producer = new web3.eth.Contract(producerABI, config.proxy);

                        // Test setMulSigContract function (mainnet MulSig address)
                        const mainnetMulSig = '0x2c188Cf07c4370F6461066827bd1c6A856ab9B70';
                        const gasEstimate = await producer.methods.setMulSigContract(mainnetMulSig)
                            .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                        console.log(`   ✅ setMulSigContract 函数可用 (gas: ${gasEstimate})`);
                        config.functionWorking = true;

                    } catch (funcError) {
                        console.log(`   ❌ setMulSigContract 函数测试失败: ${funcError.message}`);
                        config.functionWorking = false;
                    }
                } else {
                    console.log(`   ❌ 实现地址不匹配`);
                    config.functionWorking = false;
                }

            } catch (error) {
                console.log(`   ❌ 验证失败: ${error.message}`);
                config.functionWorking = false;
            }
        }

        console.log('');
        console.log('📊 升级结果总结 - MAINNET');
        console.log('========================');

        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
        const skipped = results.filter(r => r.status === 'skipped');

        console.log(`✅ 成功升级: ${successful.length} 个合约`);
        console.log(`❌ 升级失败: ${failed.length} 个合约`);
        console.log(`⏭️  跳过升级: ${skipped.length} 个合约`);

        if (successful.length > 0) {
            console.log('\n✅ 成功升级的合约:');
            successful.forEach(result => {
                const config = CONFIG.UPGRADES[result.kind];
                console.log(`- ${result.kind}: ${result.transactionHash}`);
                console.log(`  新功能: ${config.functionWorking ? '✅ 可用' : '❌ 不可用'}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ 升级失败的合约:');
            failed.forEach(result => {
                console.log(`- ${result.kind}: ${result.error}`);
            });
        }

        const workingContracts = Object.values(CONFIG.UPGRADES).filter(c => c.functionWorking);
        if (workingContracts.length > 0) {
            console.log('\n🎉 升级成功！现在可以设置_mulSig地址:');
            console.log('修改 scripts/fix-mulsig-addresses.js 为mainnet配置后运行:');
            console.log('npm run fix:mulsig:tn-mainnet');
        } else {
            console.log('\n⚠️  升级后新功能仍不可用，可能需要其他方式处理');
        }

        console.log('\n🌍 Mainnet升级完成！');
        console.log('请保存所有交易哈希以备审计使用。');

    } catch (error) {
        console.error('❌ 升级失败:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    upgradeViaProxyAdmin();
}

module.exports = upgradeViaProxyAdmin; 