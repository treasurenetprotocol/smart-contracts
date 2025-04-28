const CrosschainTokens = artifacts.require('CrosschainTokens');
const CrosschainBridge = artifacts.require('CrosschainBridge');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Governance = artifacts.require('Governance');
const Oracle = artifacts.require('Oracle');
const ParameterInfo = artifacts.require('ParameterInfo');
const TCashLoan = artifacts.require('TCashLoan');
const TCash = artifacts.require('TCash');
const TAT = artifacts.require('TAT');
const TCashAuction = artifacts.require('TCashAuction');
//dao
const DAO = artifacts.require('DAO');
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
        const parameterInfo = await ParameterInfo.deployed();
        const dao = await DAO.deployed();
        const tcash = await TCash.deployed();
        const tcashLoan = await TCashLoan.deployed();
        const tcashAuction = await TCashAuction.deployed();
        const tat = await TAT.deployed();
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


        // 重新初始化MulSig合约，现在我们有了Governance实例
        console.log('更新MulSig合约初始化参数...');
        // await mulSig.initialize(
        //     accounts[0], // 使用部署账户代替dao.address
        //     gov.address, // 现在使用正确的governance地址
        //     roles.address,
        //     oracle.address, // 使用oracle地址代替parameterInfo.address
        //     crosschainTokens.address,
        //     3600 // 确认时长(秒)
        // );

        await mulSig.initialize(dao.address,
            gov.address,
            roles.address,
            parameterInfo.address,
            crosschainTokens.address,
            5);
        console.log('MulSig合约更新成功');

        // // 更新MulSig中的CrosschainTokens地址
        // const mulSigInstance = await MulSig.at(mulSig.address);
        // if ((await mulSigInstance.crosschainTokens()) === '0x0000000000000000000000000000000000000000') {
        //     await mulSigInstance.setCrosschainTokens(crosschainTokens.address);
        // }


        // 初始化Roles合约 (注意：这里需要提供必要的初始角色地址数组)
        await roles.initialize(mulSig.address,
            ['0x6A79824E6be14b7e5Cb389527A02140935a76cD5', '0x09eda46ffcec4656235391dd298875b82aa458a9'],
            ['0x6A79824E6be14b7e5Cb389527A02140935a76cD5', '0x09eda46ffcec4656235391dd298875b82aa458a9'],
            [oracle.address, "0x6A79824E6be14b7e5Cb389527A02140935a76cD5", "0x09eda46ffcec4656235391dd298875b82aa458a9"],
            [crosschainBridge.address, "0x6A79824E6be14b7e5Cb389527A02140935a76cD5", "0x09eda46ffcec4656235391dd298875b82aa458a9"],
            [tcash.address, tcashLoan.address, tcashAuction.address, "0x09eda46ffcec4656235391dd298875b82aa458a9"]
        )
        // console.log('Roles初始化成功');

        await tcashLoan.initialize(tcash.address, roles.address, parameterInfo.address, oracle.address, tat.address);
        await tcashLoan.setAuctionContract(tcashAuction.address)

        // 给部署账户授予FOUNDATION_MANAGER角色以设置价格
        // 假设accounts[0]已经有ADMIN角色，可以授予其他角色
        const FOUNDATION_MANAGER_ROLE = web3.utils.keccak256("FOUNDATION_MANAGER");
        if (!(await roles.hasRole(FOUNDATION_MANAGER_ROLE, accounts[0]))) {
            await roles.grantRole(FOUNDATION_MANAGER_ROLE, accounts[0]);
            console.log(`授予账户 ${accounts[0]} FOUNDATION_MANAGER角色`);
        }

        // 设置UNIT和TCASH的初始价格
        // 这些价格需要根据实际情况调整
        await oracle.updatePrice("UNIT", web3.utils.toWei("0.5", "ether")); // 假设1 UNIT = 1 ETH
        await oracle.updatePrice("TCASH", web3.utils.toWei("0.5", "ether")); // 假设1 TCASH = 0.1 ETH
        // console.log('Oracle价格数据初始化完成');

        // console.log('跨链相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
