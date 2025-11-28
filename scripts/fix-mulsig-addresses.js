#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Fix _mulSig addresses in all Producer contracts
 * Usage: node scripts/fix-mulsig-addresses.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration for Mainnet
    RPC_URL: "https://rpc.treasurenet.io",
    
    // Contract addresses from tnmainnet.md
    MULSIG_ADDRESS: "0x2c188Cf07c4370F6461066827bd1c6A856ab9B70",
    GOVERNANCE_ADDRESS: "0xc69bd55C22664cF319698984211FeD155403C066",
    
    // Foundation manager address (需要填入mainnet的私钥)
    FOUNDATION_MANAGER_ADDRESS: "0x7ec62bc5062fa1d94f27775d211a3585ca4048ae", // 使用有Foundation Manager权限的账户
    FOUNDATION_MANAGER_PRIVATE_KEY: "0x46067b79171192352063d2a74c876301de534cde65f707bccd0b4f5f416fcda6" // 对应私钥
};

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

async function fixMulSigAddresses() {
    try {
        console.log('🌐 修复Producer合约的_mulSig地址 - MAINNET 环境');
        console.log('===============================================');
        console.log(`网络: Treasurenet Mainnet`);
        console.log(`RPC URL: ${CONFIG.RPC_URL}`);
        console.log(`目标MulSig地址: ${CONFIG.MULSIG_ADDRESS}`);
        console.log(`Foundation Manager: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
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
        
        if (parseFloat(balanceInUnit) < 0.05) {
            console.warn(`⚠️  警告: 账户余额较低 (${balanceInUnit} UNIT), 可能不足以支付gas费用`);
        }

        // Load contract ABIs
        const governanceABI = loadContractABI('Governance');
        const producerABI = loadContractABI('Producer');

        // Create governance contract instance
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        console.log('');
        console.log('🔍 Step 2: 验证Foundation Manager权限');
        console.log('--------------------------------------');

        // Check Foundation Manager role (using mainnet Roles address)
        const rolesABI = loadContractABI('Roles');
        const roles = new web3.eth.Contract(rolesABI, "0x6916BC198C8A1aD890Ad941947231D424Bfae682");
        
        const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
        const hasPermission = await roles.methods.hasRole(FOUNDATION_MANAGER, CONFIG.FOUNDATION_MANAGER_ADDRESS).call();
        
        if (!hasPermission) {
            throw new Error(`Address ${CONFIG.FOUNDATION_MANAGER_ADDRESS} does not have FOUNDATION_MANAGER role`);
        }
        console.log('✅ Foundation Manager permission verified');

        console.log('');
        console.log('🔧 Step 3: 修复所有Producer合约 (MAINNET)');
        console.log('------------------------------------------');

        // Get all treasure kinds and their producer addresses
        const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
        const results = [];

        for (const kind of treasureKinds) {
            console.log(`\n📋 处理 ${kind} Producer...`);

            try {
                // Get producer address from governance
                const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
                const producerAddress = treasureInfo[0];

                if (producerAddress === '0x0000000000000000000000000000000000000000') {
                    console.log(`   ⚠️  ${kind} Producer不存在，跳过`);
                    results.push({ kind, status: 'skipped', reason: 'Producer not found' });
                    continue;
                }

                console.log(`   Producer地址: ${producerAddress}`);

                // Create producer contract instance
                const producer = new web3.eth.Contract(producerABI, producerAddress);

                // Check current _mulSig value
                let currentMulSig;
                try {
                    currentMulSig = await producer.methods.getMulSigContract().call();
                    console.log(`   当前_mulSig: ${currentMulSig}`);
                } catch (error) {
                    console.log(`   ❌ 无法获取当前_mulSig: ${error.message}`);
                    console.log(`   💡 这可能表示合约还未升级，需要先升级合约`);
                    results.push({ kind, status: 'failed', error: 'Contract not upgraded' });
                    continue;
                }

                // Check if already correct
                if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
                    console.log(`   ✅ _mulSig地址已正确，无需修改`);
                    results.push({ kind, status: 'skipped', reason: 'Already correct' });
                    continue;
                }

                // Estimate gas for setMulSigContract
                const gasEstimate = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS)
                    .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });

                const gasPrice = await web3.eth.getGasPrice();
                const gasWithBuffer = Math.floor(Number(gasEstimate) * 1.3);
                
                console.log(`   Gas估算: ${gasEstimate} (带缓冲: ${gasWithBuffer})`);
                console.log(`   Gas价格: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
                
                const estimatedCost = web3.utils.fromWei((BigInt(gasWithBuffer) * BigInt(gasPrice)).toString(), 'ether');
                console.log(`   预估费用: ${estimatedCost} UNIT`);

                // Execute setMulSigContract
                const receipt = await producer.methods.setMulSigContract(CONFIG.MULSIG_ADDRESS).send({
                    from: CONFIG.FOUNDATION_MANAGER_ADDRESS,
                    gas: gasWithBuffer,
                    gasPrice: Number(gasPrice)
                });

                console.log(`   ✅ 设置成功！`);
                console.log(`   交易哈希: ${receipt.transactionHash}`);
                console.log(`   Gas使用: ${receipt.gasUsed}`);
                console.log(`   实际费用: ${web3.utils.fromWei((BigInt(receipt.gasUsed) * BigInt(gasPrice)).toString(), 'ether')} UNIT`);

                results.push({
                    kind,
                    status: 'success',
                    transactionHash: receipt.transactionHash,
                    gasUsed: receipt.gasUsed
                });

                // Wait for confirmation
                console.log(`   ⏳ 等待确认 (15秒)...`);
                await new Promise(resolve => setTimeout(resolve, 15000));

            } catch (error) {
                console.log(`   ❌ 设置失败: ${error.message}`);
                results.push({
                    kind,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        console.log('');
        console.log('🧪 Step 4: 验证设置结果');
        console.log('-----------------------');

        for (const kind of treasureKinds) {
            console.log(`\n🔍 验证 ${kind} Producer...`);

            try {
                const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
                const producerAddress = treasureInfo[0];

                if (producerAddress === '0x0000000000000000000000000000000000000000') {
                    console.log(`   ⏭️  ${kind} Producer不存在，跳过验证`);
                    continue;
                }

                const producer = new web3.eth.Contract(producerABI, producerAddress);
                const currentMulSig = await producer.methods.getMulSigContract().call();

                console.log(`   当前_mulSig: ${currentMulSig}`);

                if (currentMulSig.toLowerCase() === CONFIG.MULSIG_ADDRESS.toLowerCase()) {
                    console.log(`   ✅ _mulSig地址正确`);
                } else {
                    console.log(`   ❌ _mulSig地址不正确`);
                    console.log(`      期望: ${CONFIG.MULSIG_ADDRESS}`);
                    console.log(`      实际: ${currentMulSig}`);
                }

            } catch (error) {
                console.log(`   ❌ 验证失败: ${error.message}`);
            }
        }

        console.log('');
        console.log('📊 修复结果总结 - MAINNET');
        console.log('========================');

        const successful = results.filter(r => r.status === 'success');
        const failed = results.filter(r => r.status === 'failed');
        const skipped = results.filter(r => r.status === 'skipped');

        console.log(`✅ 修复成功: ${successful.length} 个Producer`);
        console.log(`❌ 修复失败: ${failed.length} 个Producer`);
        console.log(`⏭️  跳过修复: ${skipped.length} 个Producer`);

        if (successful.length > 0) {
            console.log('\n✅ 修复成功的Producer:');
            successful.forEach(result => {
                console.log(`- ${result.kind}: ${result.transactionHash}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ 修复失败的Producer:');
            failed.forEach(result => {
                console.log(`- ${result.kind}: ${result.error}`);
            });
        }

        if (successful.length > 0) {
            console.log('\n🎉 _mulSig地址修复完成！');
            console.log('现在所有的multisig操作应该可以正常工作了。');
            console.log('\n💡 可以尝试执行之前失败的提案了');
        }

        console.log('\n🌍 Mainnet修复完成！');
        console.log('请保存所有交易哈希以备审计使用。');

    } catch (error) {
        console.error('❌ 修复失败:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    fixMulSigAddresses();
}

module.exports = fixMulSigAddresses; 