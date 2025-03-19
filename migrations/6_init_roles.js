const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Oracle = artifacts.require('Oracle');
const CrosschainBridge = artifacts.require('CrosschainBridge');
const TCash = artifacts.require('TCash');
const USTN = artifacts.require('USTN');
const WTCASH = artifacts.require('WTCASH');
const WUNIT = artifacts.require('WUNIT');
const TCashLoan = artifacts.require('TCashLoan');
const USTNFinance = artifacts.require('USTNFinance');

const fs = require('fs');

/**
 * 最终初始化脚本
 * - 设置权限和角色
 * - 为重要合约设置铸币权等
 * - 完成各合约间的互相授权
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('执行最终初始化...');

        // 获取已部署的合约实例
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const oracle = await Oracle.deployed();
        const crosschainBridge = await CrosschainBridge.deployed();
        const tcash = await TCash.deployed();
        const ustn = await USTN.deployed();
        const wtcash = await WTCASH.deployed();
        const wunit = await WUNIT.deployed();
        const tcashLoan = await TCashLoan.deployed();
        const ustnFinance = await USTNFinance.deployed();

        // 分步进行授权，确保每个步骤都成功执行
        console.log('设置权限和角色...');

        // 1. 确保MulSig拥有Admin权限
        if (!(await roles.isAdmin(mulSig.address))) {
            await roles.addAdmin(mulSig.address);
            console.log(`为MulSig(${mulSig.address})添加Admin权限`);
        }

        // 2. 设置跨链桥为铸币者
        if (!(await roles.isMinter(crosschainBridge.address))) {
            await roles.addMinter(crosschainBridge.address);
            console.log(`为CrosschainBridge(${crosschainBridge.address})添加Minter权限`);
        }

        // 3. 设置TCashLoan为TCash的铸币者
        if (!(await tcash.isMinter(tcashLoan.address))) {
            await tcash.setMinter(tcashLoan.address, true);
            console.log(`为TCashLoan(${tcashLoan.address})设置TCash铸币权限`);
        }

        // 4. 设置USTNFinance为USTN的铸币者
        if (!(await ustn.isMinter(ustnFinance.address))) {
            await ustn.setMinter(ustnFinance.address, true);
            console.log(`为USTNFinance(${ustnFinance.address})设置USTN铸币权限`);
        }

        // 5. 设置TCash为WTCASH的铸币者和焚烧者
        if (!(await wtcash.isMinter(tcash.address))) {
            await wtcash.setMinter(tcash.address, true);
            console.log(`为TCash(${tcash.address})设置WTCASH铸币权限`);
        }

        // 6. 为开发账户设置预言机角色以便于测试
        const devAccount = accounts[0];
        if (!(await roles.isOracleNode(devAccount))) {
            await roles.addOracleNode(devAccount);
            console.log(`为开发账户(${devAccount})添加OracleNode权限`);
        }

        // 7. 为开发账户设置管理员角色以便于测试
        if (!(await roles.isAdmin(devAccount))) {
            await roles.addAdmin(devAccount);
            console.log(`为开发账户(${devAccount})添加Admin权限`);
        }

        // 8. 将所有重要合约地址写入一个汇总文件
        console.log('生成部署信息汇总...');

        fs.appendFileSync('contracts.txt', `\n# 部署信息汇总 - ${network} - ${new Date().toISOString()}\n`);
        fs.appendFileSync('contracts.txt', `DEPLOYER=${accounts[0]}\n`);
        fs.appendFileSync('contracts.txt', `NETWORK=${network}\n`);
        fs.appendFileSync('contracts.txt', `DEPLOYMENT_TIMESTAMP=${Math.floor(Date.now() / 1000)}\n`);

        console.log('最终初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
    }
};
