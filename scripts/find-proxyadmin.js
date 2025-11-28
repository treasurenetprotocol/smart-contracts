#!/usr/bin/env node

const { Web3 } = require('web3');

/**
 * Find ProxyAdmin address for mainnet Producer contracts
 */

const CONFIG = {
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Producer proxy addresses
    PRODUCER_ADDRESSES: {
        'OIL': '0x05DbA5c8a040ee706e22ddBEAc2887998B2b149d',
        'GAS': '0x470B0196f597DF699057599D436f7E259688BCd9',
        'ETH': '0x4693c13eF898c50596072db86E420495C1680643',
        'BTC': '0xDDD221b4Dca0E7d1CE876893316A3c8beD3d5f40'
    }
};

async function findProxyAdmin() {
    try {
        console.log('🔍 查找ProxyAdmin地址');
        console.log('=====================');
        
        const web3 = new Web3(CONFIG.RPC_URL);
        
        // EIP-1967 storage slots
        const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
        const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
        
        const proxyAdmins = new Set();
        
        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            console.log(`\n📋 检查 ${kind} Producer: ${proxyAddress}`);
            
            try {
                // Read admin from storage slot
                const adminData = await web3.eth.getStorageAt(proxyAddress, adminSlot);
                const adminAddress = '0x' + adminData.slice(-40).toLowerCase();
                
                // Read implementation from storage slot  
                const implData = await web3.eth.getStorageAt(proxyAddress, implementationSlot);
                const implAddress = '0x' + implData.slice(-40).toLowerCase();
                
                console.log(`   实现地址: ${implAddress}`);
                console.log(`   管理员地址: ${adminAddress}`);
                
                if (adminAddress !== '0x0000000000000000000000000000000000000000') {
                    proxyAdmins.add(adminAddress);
                    
                    // Verify admin contract exists
                    const adminCode = await web3.eth.getCode(adminAddress);
                    if (adminCode !== '0x') {
                        console.log(`   ✅ 管理员合约存在`);
                    } else {
                        console.log(`   ❌ 管理员合约不存在`);
                    }
                } else {
                    console.log(`   ⚠️  未找到管理员地址`);
                }
                
            } catch (error) {
                console.log(`   ❌ 检查失败: ${error.message}`);
            }
        }
        
        console.log('\n📊 结果总结');
        console.log('===========');
        
        if (proxyAdmins.size === 0) {
            console.log('❌ 未找到任何ProxyAdmin地址');
            console.log('💡 可能的原因:');
            console.log('   - 使用的不是标准的OpenZeppelin代理');
            console.log('   - 代理架构不同');
            console.log('   - 需要其他方式查找管理员');
        } else if (proxyAdmins.size === 1) {
            const adminAddress = Array.from(proxyAdmins)[0];
            console.log(`✅ 找到统一的ProxyAdmin地址: ${adminAddress}`);
            console.log('\n🎉 可以使用此地址更新 upgrade-via-proxyadmin.js:');
            console.log(`   PROXY_ADMIN_ADDRESS: "${adminAddress}",`);
        } else {
            console.log(`⚠️  找到多个不同的管理员地址:`);
            proxyAdmins.forEach(admin => {
                console.log(`   - ${admin}`);
            });
            console.log('💡 需要进一步确认哪个是正确的ProxyAdmin');
        }
        
        // Additional check: try to call admin() function directly
        console.log('\n🔍 额外检查: 尝试直接调用admin()函数');
        console.log('----------------------------------');
        
        const proxyABI = [
            {
                "inputs": [],
                "name": "admin",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            }
        ];
        
        for (const [kind, proxyAddress] of Object.entries(CONFIG.PRODUCER_ADDRESSES)) {
            try {
                const proxy = new web3.eth.Contract(proxyABI, proxyAddress);
                const admin = await proxy.methods.admin().call();
                console.log(`${kind}: ${admin}`);
                proxyAdmins.add(admin.toLowerCase());
            } catch (error) {
                console.log(`${kind}: 无法直接调用 (${error.message})`);
            }
        }
        
        if (proxyAdmins.size === 1) {
            const finalAdmin = Array.from(proxyAdmins)[0];
            console.log(`\n🎯 最终确认的ProxyAdmin地址: ${finalAdmin}`);
        }
        
    } catch (error) {
        console.error('❌ 查找失败:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    findProxyAdmin();
}

module.exports = findProxyAdmin;