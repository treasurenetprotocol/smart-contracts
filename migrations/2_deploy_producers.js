const DAO = artifacts.require('DAO');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const TAT = artifacts.require('TAT');
const Governance = artifacts.require('Governance');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 部署资产生产者相关合约
 * - 各类资产生产者(OilProducer, GasProducer, EthProducer, BtcProducer)
 * - 资产数据合约(OilData, GasData, EthData, BtcData)
 * - Governance治理合约
 * - TAT代币合约
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('部署资产生产者相关合约...');

        // 获取已部署的合约实例
        const dao = await DAO.deployed();
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const parameterInfo = await ParameterInfo.deployed();


        // 部署Governance治理合约
        console.log('正在部署Governance合约...');
        const gov = await deployProxy(Governance, [
            dao.address,
            mulSig.address,
            roles.address,
            parameterInfo.address,
            [],
            [],
            [],
        ], { deployer });
        console.log('Governance部署成功:', gov.address);
        fs.appendFileSync('contracts.txt', `const GOVERNANCE_ADDRESS='${gov.address}'\n`);

        // 部署TAT代币合约
        console.log('正在部署TAT代币合约...');
        const tat = await deployProxy(TAT, ['Rep', 'REP', gov.address], { deployer });
        console.log('TAT(REP)部署成功:', tat.address);
        fs.appendFileSync('contracts.txt', `const TAT_ADDRESS='${tat.address}'\n`);


        console.log('资产生产者相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
