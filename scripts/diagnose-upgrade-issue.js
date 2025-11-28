#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Diagnose upgrade issues for Producer contracts
 */

const CONFIG = {
    RPC_URL: "https://rpc.treasurenet.io",
    PROXY_ADMIN_ADDRESS: "0xb6281f28a463c4d7f6b022609a9f7bfeabd86323",
    FOUNDATION_MANAGER_ADDRESS: "0x7ec62bc5062fa1d94f27775d211a3585ca4048ae",
    FOUNDATION_MANAGER_PRIVATE_KEY: "0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6",
    
    PRODUCER_ADDRESSES: {
        'OIL': '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
        'GAS': '0x470B0196f597DF699057599D436f7E259688BCd9',
        'ETH': '0x4693c13eF898c50596072db86E420495C1680643',
        'BTC': '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40'
    },
    
    NEW_IMPLEMENTATIONS: {
        'OIL': '0x5d840312eE45680022A4C371fb72a93a31EA47CD',
        'GAS': '0x0E767DDE97547c43fe4E1831bf905EA2C6cf58FF',
        'ETH': '0xe0eA5259BABD288F86a68a3cCBF7E2D999B2711c',
        'BTC': '0xBB6ABcCb5807B75076A48eBDED80F3427eB449Bc'
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

async function diagnoseUpgradeIssue() {
    try {
        console.log('🔍 诊断升级问题 - MAINNET');
        console.log('========================');
        
        const web3 = new Web3(CONFIG.RPC_URL);
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        
        console.log(`执行账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log(`ProxyAdmin: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
        console.log('');
        
        // Step 1: Check ProxyAdmin contract
        console.log('🔍 Step 1: 检查ProxyAdmin合约');
        console.log('-----------------------------');
        
        const proxyAdmin = new web3.eth.Contract(PROXY_ADMIN_ABI, CONFIG.PROXY_ADMIN_ADDRESS);
        
        try {
            // Check if ProxyAdmin contract exists
            const proxyAdminCode = await web3.eth.getCode(CONFIG.PROXY_ADMIN_ADDRESS);
            if (proxyAdminCode === '0x') {
                console.log('❌ ProxyAdmin合约不存在');
                return;
            } else {
                console.log('✅ ProxyAdmin合约存在');
            }
            
            // Check ProxyAdmin owner
            const owner = await proxyAdmin.methods.owner().call();
            console.log(`ProxyAdmin owner: ${owner}`);
            
            if (owner.toLowerCase() === CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
                console.log('✅ 当前账户是ProxyAdmin的owner');
            } else {
                console.log('❌ 当前账户不是ProxyAdmin的owner');
                console.log(`   期望: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
                console.log(`   实际: ${owner}`);
            }
            
        } catch (error) {
            console.log(`❌ ProxyAdmin检查失败: ${error.message}`);
        }
        
        // Step 2: Check each proxy's admin
        console.log('');
        console.log('🔍 Step 2: 检查每个代理的管理员');
        console.log('-------------------------------');
        
        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n📋 ${kind} Producer: ${proxyAddress}`);
            
            try {
                // Check proxy admin
                const proxyAdminAddr = await proxyAdmin.methods.getProxyAdmin(proxyAddress).call();
                console.log(`   代理管理员: ${proxyAdminAddr}`);
                
                if (proxyAdminAddr.toLowerCase() === CONFIG.PROXY_ADMIN_ADDRESS.toLowerCase()) {
                    console.log('   ✅ 管理员地址正确');
                } else {
                    console.log('   ❌ 管理员地址不匹配');
                    console.log(`      期望: ${CONFIG.PROXY_ADMIN_ADDRESS}`);
                    console.log(`      实际: ${proxyAdminAddr}`);
                }
                
                // Check current implementation
                const currentImpl = await proxyAdmin.methods.getProxyImplementation(proxyAddress).call();
                console.log(`   当前实现: ${currentImpl}`);
                
            } catch (error) {
                console.log(`   ❌ 检查失败: ${error.message}`);
            }
        }
        
        // Step 3: Test upgrade with gas estimation
        console.log('');
        console.log('🔍 Step 3: 测试升级操作');
        console.log('-----------------------');
        
        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n🧪 测试 ${kind} Producer升级...`);
            
            const newImpl = CONFIG.NEW_IMPLEMENTATIONS[kind];
            
            try {
                // First check if new implementation exists
                const newImplCode = await web3.eth.getCode(newImpl);
                if (newImplCode === '0x') {
                    console.log(`   ❌ 新实现合约不存在: ${newImpl}`);
                    continue;
                }
                console.log(`   ✅ 新实现合约存在`);
                
                // Try gas estimation
                const gasEstimate = await proxyAdmin.methods.upgrade(proxyAddress, newImpl)
                    .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });
                
                console.log(`   ✅ Gas估算成功: ${gasEstimate}`);
                
                // Try to call the function (dry run)
                try {
                    await proxyAdmin.methods.upgrade(proxyAddress, newImpl)
                        .call({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });
                    console.log(`   ✅ 升级调用测试成功`);
                } catch (callError) {
                    console.log(`   ❌ 升级调用测试失败: ${callError.message}`);
                    
                    // Try to decode the error
                    if (callError.message.includes('revert')) {
                        console.log(`   💡 可能的问题: 合约执行被revert`);
                    } else if (callError.message.includes('owner')) {
                        console.log(`   💡 可能的问题: 权限不足，不是owner`);
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ 测试失败: ${error.message}`);
                
                if (error.message.includes('execution reverted')) {
                    console.log(`   💡 可能原因: 权限不足或参数错误`);
                } else if (error.message.includes('insufficient funds')) {
                    console.log(`   💡 可能原因: 账户余额不足`);
                }
            }
        }
        
        // Step 4: Check account balance and permissions
        console.log('');
        console.log('🔍 Step 4: 检查账户状态');
        console.log('-----------------------');
        
        const balance = await web3.eth.getBalance(CONFIG.FOUNDATION_MANAGER_ADDRESS);
        const balanceInUnit = web3.utils.fromWei(balance, 'ether');
        console.log(`账户余额: ${balanceInUnit} UNIT`);
        
        if (parseFloat(balanceInUnit) < 0.01) {
            console.log('⚠️  余额可能不足以支付gas费用');
        }
        
        // Step 5: Alternative upgrade approach
        console.log('');
        console.log('💡 替代方案建议');
        console.log('================');
        
        console.log('如果ProxyAdmin升级失败，可以尝试以下方案:');
        console.log('1. 检查ProxyAdmin的owner是否正确');
        console.log('2. 尝试使用多签方式进行升级');
        console.log('3. 检查是否有其他权限限制');
        console.log('4. 验证新实现合约是否有初始化问题');
        
        console.log('\n🔧 下一步建议:');
        const adminOwner = await proxyAdmin.methods.owner().call();
        if (adminOwner.toLowerCase() !== CONFIG.FOUNDATION_MANAGER_ADDRESS.toLowerCase()) {
            console.log(`需要使用ProxyAdmin owner账户进行升级: ${adminOwner}`);
        } else {
            console.log('权限正确，可能是其他技术问题，建议检查合约代码和参数');
        }
        
    } catch (error) {
        console.error('❌ 诊断失败:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    diagnoseUpgradeIssue();
}

module.exports = diagnoseUpgradeIssue; 