const DAO = artifacts.require('DAO');
const OilProducer = artifacts.require('OilProducer');
const OilData = artifacts.require('OilData');
const GasProducer = artifacts.require('GasProducer');
const GasData = artifacts.require('GasData');
const EthProducer = artifacts.require('EthProducer');
const EthData = artifacts.require('EthData');
const BtcProducer = artifacts.require('BtcProducer');
const BtcData = artifacts.require('BtcData');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const Oracle = artifacts.require('Oracle');
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
        const oracle = await Oracle.deployed();

        // 部署资产生产者和资产数据合约
        console.log('正在部署资产生产者合约...');
        const oilProducer = await deployProxy(OilProducer, { initializer: false }, { deployer });
        const oilData = await deployProxy(OilData, { initializer: false }, { deployer });
        console.log('OilProducer部署成功:', oilProducer.address);
        console.log('OilData部署成功:', oilData.address);
        fs.appendFileSync('contracts.txt', `const OIL_PRODUCER_ADDRESS='${oilProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const OIL_DATA_ADDRESS='${oilData.address}'\n`);

        const gasProducer = await deployProxy(GasProducer, { initializer: false }, { deployer });
        const gasData = await deployProxy(GasData, { initializer: false }, { deployer });
        console.log('GasProducer部署成功:', gasProducer.address);
        console.log('GasData部署成功:', gasData.address);
        fs.appendFileSync('contracts.txt', `const GAS_PRODUCER_ADDRESS='${gasProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const GAS_DATA_ADDRESS='${gasData.address}'\n`);

        const ethProducer = await deployProxy(EthProducer, { initializer: false }, { deployer });
        const ethData = await deployProxy(EthData, { initializer: false }, { deployer });
        console.log('EthProducer部署成功:', ethProducer.address);
        console.log('EthData部署成功:', ethData.address);
        fs.appendFileSync('contracts.txt', `const ETH_PRODUCER_ADDRESS='${ethProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const ETH_DATA_ADDRESS='${ethData.address}'\n`);

        const btcProducer = await deployProxy(BtcProducer, { initializer: false }, { deployer });
        const btcData = await deployProxy(BtcData, { initializer: false }, { deployer });
        console.log('BtcProducer部署成功:', btcProducer.address);
        console.log('BtcData部署成功:', btcData.address);
        fs.appendFileSync('contracts.txt', `const BTC_PRODUCER_ADDRESS='${btcProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const BTC_DATA_ADDRESS='${btcData.address}'\n`);

        // 部署Governance治理合约
        console.log('正在部署Governance合约...');
        const gov = await deployProxy(Governance, [
            dao.address,
            mulSig.address,
            roles.address,
            parameterInfo.address,
            ['OIL', 'GAS', 'ETH', 'BTC'],
            [oilProducer.address, gasProducer.address, ethProducer.address, btcProducer.address],
            [oilData.address, gasData.address, ethData.address, btcData.address],
        ], { deployer });
        console.log('Governance部署成功:', gov.address);
        fs.appendFileSync('contracts.txt', `const GOVERNANCE_ADDRESS='${gov.address}'\n`);

        // 部署TAT代币合约
        console.log('正在部署TAT代币合约...');
        const tat = await deployProxy(TAT, ['TAT Token', 'TAT', gov.address], { deployer });
        console.log('TAT部署成功:', tat.address);
        fs.appendFileSync('contracts.txt', `const TAT_ADDRESS='${tat.address}'\n`);

    

        // 初始化资产生产者和资产数据合约
        console.log('初始化资产生产者合约...');
        await oilProducer.initialize(mulSig.address, roles.address, 'OIL', oilData.address, [], []);
        await oilData.initialize('OIL', oracle.address, roles.address, parameterInfo.address, oilProducer.address, tat.address);

        await gasProducer.initialize(mulSig.address, roles.address, 'GAS', gasData.address, [], []);
        await gasData.initialize('GAS', oracle.address, roles.address, parameterInfo.address, gasProducer.address, tat.address);

        await ethProducer.initialize(mulSig.address, roles.address, 'ETH', ethData.address, [], []);
        await ethData.initialize('ETH', oracle.address, roles.address, parameterInfo.address, ethProducer.address, tat.address);

        await btcProducer.initialize(mulSig.address, roles.address, 'BTC', btcData.address, [], []);
        await btcData.initialize('BTC', oracle.address, roles.address, parameterInfo.address, btcProducer.address, tat.address);

        console.log('资产生产者相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
