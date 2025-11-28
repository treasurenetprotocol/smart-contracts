#!/usr/bin/env node

const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Check Proxy Admin information for Producer contracts
 * Usage: node scripts/check-proxy-admin.js
 */

// ===== Configuration Section =====
const CONFIG = {
    // Network configuration
    RPC_URL: "http://127.0.0.1:8555",
    
    // Contract addresses
    GOVERNANCE_ADDRESS: "0xA0e2caF71782DC0e3D03EF1D3cd7CEA036ce9Fb7",
    
    // Foundation manager address
    FOUNDATION_MANAGER_ADDRESS: "0x6A79824E6be14b7e5Cb389527A02140935a76cD5",
    FOUNDATION_MANAGER_PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
};

// Standard ProxyAdmin ABI - just the admin function
const PROXY_ADMIN_ABI = [
    {
        "inputs": [{"name": "proxy", "type": "address"}],
        "name": "getProxyAdmin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

// Transparent Proxy ABI
const TRANSPARENT_PROXY_ABI = [
    {
        "inputs": [],
        "name": "admin",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "implementation",
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

async function checkProxyAdmin() {
    try {
        console.log('检查Producer合约的Proxy Admin信息');
        console.log('==================================');
        console.log(`当前账户: ${CONFIG.FOUNDATION_MANAGER_ADDRESS}`);
        console.log('');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);

        // Add the foundation manager account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.FOUNDATION_MANAGER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);

        // Load governance contract
        const governanceABI = loadContractABI('Governance');
        const governance = new web3.eth.Contract(governanceABI, CONFIG.GOVERNANCE_ADDRESS);

        console.log('🔍 获取Producer合约地址...');
        console.log('--------------------------');

        // Get Producer addresses from governance
        const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
        const producerInfo = {};
        
        for (const kind of treasureKinds) {
            try {
                const treasureInfo = await governance.getTreasureByKind(kind);
                producerInfo[kind] = {
                    producer: treasureInfo[0],
                    productionData: treasureInfo[1]
                };
                console.log(`${kind} Producer: ${treasureInfo[0]}`);
            } catch (error) {
                console.log(`❌ ${kind}: ${error.message}`);
            }
        }

        console.log('');
        console.log('🔍 检查Proxy Admin信息...');
        console.log('-------------------------');

        for (const [kind, info] of Object.entries(producerInfo)) {
            if (!info.producer || info.producer === '0x0000000000000000000000000000000000000000') {
                console.log(`⏭️  ${kind}: 跳过 - 未找到合约地址`);
                continue;
            }

            console.log(`\n📋 ${kind} Producer: ${info.producer}`);

            try {
                // Try to get admin info using different methods
                
                // Method 1: Try calling admin() directly on the proxy
                console.log('   方法1: 直接调用 admin() 函数...');
                try {
                    const proxy = new web3.eth.Contract(TRANSPARENT_PROXY_ABI, info.producer);
                    const admin = await proxy.methods.admin().call();
                    console.log(`   ✅ 代理管理员: ${admin}`);
                    
                    // Also get implementation
                    try {
                        const implementation = await proxy.methods.implementation().call();
                        console.log(`   📄 实现合约: ${implementation}`);
                    } catch (implError) {
                        console.log(`   ⚠️  无法获取实现地址: ${implError.message}`);
                    }
                } catch (directError) {
                    console.log(`   ❌ 直接调用失败: ${directError.message}`);
                    
                    // Method 2: Try with ProxyAdmin contract
                    console.log('   方法2: 查找ProxyAdmin合约...');
                    
                    // Try to find ProxyAdmin by checking storage slots
                    // Admin address is typically stored at slot 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
                    const adminSlot = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
                    try {
                        const adminData = await web3.eth.getStorageAt(info.producer, adminSlot);
                        const adminAddress = '0x' + adminData.slice(-40);
                        
                        if (adminAddress !== '0x0000000000000000000000000000000000000000') {
                            console.log(`   ✅ 从存储获取管理员: ${web3.utils.toChecksumAddress(adminAddress)}`);
                        } else {
                            console.log(`   ❌ 存储槽为空`);
                        }
                    } catch (storageError) {
                        console.log(`   ❌ 存储读取失败: ${storageError.message}`);
                    }
                }

                // Method 3: Check if current account can upgrade
                console.log('   方法3: 检查当前账户升级权限...');
                try {
                    // Try to estimate gas for upgradeProxy call
                    // This is a hacky way to check permissions without actually upgrading
                    const producerABI = loadContractABI('OilProducer'); // Use any producer ABI
                    const tempContract = new web3.eth.Contract(producerABI, info.producer);
                    
                    // Try to call a management function to test permissions
                    const gasEstimate = await tempContract.methods.setMulSigContract(CONFIG.FOUNDATION_MANAGER_ADDRESS)
                        .estimateGas({ from: CONFIG.FOUNDATION_MANAGER_ADDRESS });
                    
                    console.log(`   ✅ 当前账户有管理权限 (gas估算: ${gasEstimate})`);
                } catch (permError) {
                    console.log(`   ❌ 权限检查失败: ${permError.message}`);
                }

            } catch (error) {
                console.log(`   ❌ 检查失败: ${error.message}`);
            }
        }

        console.log('');
        console.log('🔍 检查OpenZeppelin网络清单...');
        console.log('-------------------------------');

        // Check if .openzeppelin directory exists
        const openzeppelinDir = path.join(process.cwd(), '.openzeppelin');
        if (fs.existsSync(openzeppelinDir)) {
            console.log(`✅ .openzeppelin 目录存在: ${openzeppelinDir}`);
            
            // Look for network manifest files
            const files = fs.readdirSync(openzeppelinDir);
            console.log(`📁 文件列表: ${files.join(', ')}`);
            
            // Check for network-specific files
            const networkFiles = files.filter(f => f.includes('6666') || f.includes('treasurenet'));
            if (networkFiles.length > 0) {
                console.log(`🌐 网络文件: ${networkFiles.join(', ')}`);
                
                // Try to read and parse manifest
                for (const file of networkFiles) {
                    try {
                        const filePath = path.join(openzeppelinDir, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        const manifest = JSON.parse(content);
                        
                        console.log(`\n📄 ${file} 内容:`);
                        console.log(`   Admin: ${manifest.admin?.address || 'N/A'}`);
                        console.log(`   代理数量: ${Object.keys(manifest.proxies || {}).length}`);
                        
                        if (manifest.proxies) {
                            for (const [proxyAddr, proxyInfo] of Object.entries(manifest.proxies)) {
                                console.log(`   代理 ${proxyAddr}: ${proxyInfo.kind || 'unknown'}`);
                            }
                        }
                    } catch (parseError) {
                        console.log(`   ❌ 解析 ${file} 失败: ${parseError.message}`);
                    }
                }
            } else {
                console.log('⚠️  未找到网络相关的清单文件');
            }
        } else {
            console.log('❌ .openzeppelin 目录不存在');
        }

        console.log('');
        console.log('💡 解决建议');
        console.log('===========');
        console.log('1. 如果代理管理员与当前账户不匹配，需要:');
        console.log('   - 使用正确的管理员账户');
        console.log('   - 或者请求管理员转移权限');
        console.log('');
        console.log('2. 如果是网络清单问题，可以:');
        console.log('   - 删除 .openzeppelin 目录重新初始化');
        console.log('   - 或者手动编辑清单文件');
        console.log('');
        console.log('3. 替代方案:');
        console.log('   - 直接使用ProxyAdmin合约升级');
        console.log('   - 或者使用多签提案进行升级');

    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    checkProxyAdmin();
}

module.exports = checkProxyAdmin;

