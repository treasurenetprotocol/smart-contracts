const USTN = artifacts.require('USTN');
const USTNAuction = artifacts.require('USTNAuction');
const USTNFinance = artifacts.require('USTNFinance');
const Roles = artifacts.require('Roles');
const MulSig = artifacts.require('MulSig');
const Oracle = artifacts.require('Oracle');
const ParameterInfo = artifacts.require('ParameterInfo');
const TCash = artifacts.require('TCash');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 部署USTN相关合约
 * - USTN: USTN稳定币合约
 * - USTNAuction: USTN拍卖合约
 * - USTNFinance: USTN金融合约
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('部署USTN相关合约...');

        // 获取已部署的合约实例
        const roles = await Roles.deployed();
        const mulSig = await MulSig.deployed();
        const oracle = await Oracle.deployed();
        const parameterInfo = await ParameterInfo.deployed();
        const tcash = await TCash.deployed();

        // 部署USTN合约
        const ustn = await deployProxy(USTN, [
            mulSig.address,
            roles.address,
            parameterInfo.address
        ], { deployer });
        console.log('USTN部署成功:', ustn.address);
        fs.appendFileSync('contracts.txt', `const USTN_ADDRESS='${ustn.address}'\n`);

        // 部署USTNAuction拍卖合约
        const ustnAuction = await deployProxy(USTNAuction, [
            ustn.address,
            tcash.address,
            mulSig.address,
            roles.address,
            parameterInfo.address
        ], { deployer });
        console.log('USTNAuction部署成功:', ustnAuction.address);
        fs.appendFileSync('contracts.txt', `const USTN_AUCTION_ADDRESS='${ustnAuction.address}'\n`);

        // 部署USTNFinance金融合约
        const ustnFinance = await deployProxy(USTNFinance, [
            ustn.address,
            tcash.address,
            oracle.address,
            mulSig.address,
            roles.address,
            parameterInfo.address
        ], { deployer });
        console.log('USTNFinance部署成功:', ustnFinance.address);
        fs.appendFileSync('contracts.txt', `const USTN_FINANCE_ADDRESS='${ustnFinance.address}'\n`);

        // 设置合约关系
        await ustn.setFinance(ustnFinance.address);
        await ustn.setAuction(ustnAuction.address);
        await ustnAuction.setFinance(ustnFinance.address);
        await ustnFinance.setAuction(ustnAuction.address);

        console.log('USTN相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
