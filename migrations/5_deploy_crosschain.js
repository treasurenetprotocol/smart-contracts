const CrosschainTokens = artifacts.require('CrosschainTokens');
const CrosschainBridge = artifacts.require('CrosschainBridge');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Governance = artifacts.require('Governance');
const Oracle = artifacts.require('Oracle');

const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 部署跨链相关合约
 * - CrosschainTokens: 跨链代币管理
 * - CrosschainBridge: 跨链桥接合约
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('部署跨链相关合约...');

        // 获取已部署的合约实例
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const gov = await Governance.deployed();
        const oracle = await Oracle.deployed();

        // 部署CrosschainTokens代币管理合约
        const crosschainTokens = await deployProxy(CrosschainTokens,
            ['0x0000000000000000000000000000000000000000'], // 先用零地址
            {
                deployer,
                initializer: 'initialize'
            }
        );
        console.log('CrosschainTokens部署成功:', crosschainTokens.address);
        fs.appendFileSync('contracts.txt', `const CROSSCHAIN_TOKENS_ADDRESS='${crosschainTokens.address}'\n`);

        // 部署CrosschainBridge跨链桥合约
        const crosschainBridge = await deployProxy(CrosschainBridge,
            [crosschainTokens.address, roles.address],
            {
                deployer,
                initializer: 'initialize'
            }
        );
        console.log('CrosschainBridge部署成功:', crosschainBridge.address);
        fs.appendFileSync('contracts.txt', `const CROSSCHAIN_BRIDGE_ADDRESS='${crosschainBridge.address}'\n`);

        // 更新CrosschainTokens中的MulSig地址
        const crosschainTokensInstance = await CrosschainTokens.at(crosschainTokens.address);
        await crosschainTokensInstance.setMulSig(mulSig.address);

        // 更新MulSig中的CrosschainTokens地址
        const mulSigInstance = await MulSig.at(mulSig.address);
        if ((await mulSigInstance.crosschainTokens()) === '0x0000000000000000000000000000000000000000') {
            await mulSigInstance.setCrosschainTokens(crosschainTokens.address);
        }

        // 更新Roles中添加CrosschainBridge为跨链角色
        const rolesInstance = await Roles.at(roles.address);
        await rolesInstance.addCrosschain(crosschainBridge.address);

        // 根据需要添加预言机
        const oracleAddress = oracle.address;
        await rolesInstance.addOracleNode(oracleAddress);

        console.log('跨链相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
