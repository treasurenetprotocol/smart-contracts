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
 * Deploy asset producer related contracts
 * - Asset producers (OilProducer, GasProducer, EthProducer, BtcProducer)
 * - Asset data contracts (OilData, GasData, EthData, BtcData)
 * - Governance contract
 * - TAT token contract
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('Deploying asset producer related contracts...');

        // Get deployed contract instances
        const dao = await DAO.deployed();
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const parameterInfo = await ParameterInfo.deployed();
        const oracle = await Oracle.deployed();

        // Deploy asset producers and data contracts
        console.log('Deploying asset producer contracts...');
        const oilProducer = await deployProxy(OilProducer, { initializer: false }, { deployer });
        const oilData = await deployProxy(OilData, { initializer: false }, { deployer });
        console.log('OilProducer deployed:', oilProducer.address);
        console.log('OilData deployed:', oilData.address);
        fs.appendFileSync('contracts.txt', `const OIL_PRODUCER_ADDRESS='${oilProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const OIL_DATA_ADDRESS='${oilData.address}'\n`);

        const gasProducer = await deployProxy(GasProducer, { initializer: false }, { deployer });
        const gasData = await deployProxy(GasData, { initializer: false }, { deployer });
        console.log('GasProducer deployed:', gasProducer.address);
        console.log('GasData deployed:', gasData.address);
        fs.appendFileSync('contracts.txt', `const GAS_PRODUCER_ADDRESS='${gasProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const GAS_DATA_ADDRESS='${gasData.address}'\n`);

        const ethProducer = await deployProxy(EthProducer, { initializer: false }, { deployer });
        const ethData = await deployProxy(EthData, { initializer: false }, { deployer });
        console.log('EthProducer deployed:', ethProducer.address);
        console.log('EthData deployed:', ethData.address);
        fs.appendFileSync('contracts.txt', `const ETH_PRODUCER_ADDRESS='${ethProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const ETH_DATA_ADDRESS='${ethData.address}'\n`);

        const btcProducer = await deployProxy(BtcProducer, { initializer: false }, { deployer });
        const btcData = await deployProxy(BtcData, { initializer: false }, { deployer });
        console.log('BtcProducer deployed:', btcProducer.address);
        console.log('BtcData deployed:', btcData.address);
        fs.appendFileSync('contracts.txt', `const BTC_PRODUCER_ADDRESS='${btcProducer.address}'\n`);
        fs.appendFileSync('contracts.txt', `const BTC_DATA_ADDRESS='${btcData.address}'\n`);

        // Deploy Governance contract
        console.log('Deploying Governance contract...');
        const gov = await deployProxy(Governance, [
            dao.address,
            mulSig.address,
            roles.address,
            parameterInfo.address,
            ['OIL', 'GAS', 'ETH', 'BTC'],
            [oilProducer.address, gasProducer.address, ethProducer.address, btcProducer.address],
            [oilData.address, gasData.address, ethData.address, btcData.address],
        ], { deployer });
        console.log('Governance deployed:', gov.address);
        fs.appendFileSync('contracts.txt', `const GOVERNANCE_ADDRESS='${gov.address}'\n`);

        // Deploy TAT token contract
        console.log('Deploying TAT token contract...');
        const tat = await deployProxy(TAT, ['TAT Token', 'TAT', gov.address], { deployer });
        console.log('TAT deployed:', tat.address);
        fs.appendFileSync('contracts.txt', `const TAT_ADDRESS='${tat.address}'\n`);

    

        // Initialize asset producers and asset data contracts
        console.log('Initializing asset producer contracts...');
        await oilProducer.initialize(mulSig.address, roles.address, 'OIL', oilData.address, [], []);
        await oilData.initialize('OIL', oracle.address, roles.address, parameterInfo.address, oilProducer.address, tat.address);

        await gasProducer.initialize(mulSig.address, roles.address, 'GAS', gasData.address, [], []);
        await gasData.initialize('GAS', oracle.address, roles.address, parameterInfo.address, gasProducer.address, tat.address);

        await ethProducer.initialize(mulSig.address, roles.address, 'ETH', ethData.address, [], []);
        await ethData.initialize('ETH', oracle.address, roles.address, parameterInfo.address, ethProducer.address, tat.address);

        await btcProducer.initialize(mulSig.address, roles.address, 'BTC', btcData.address, [], []);
        await btcData.initialize('BTC', oracle.address, roles.address, parameterInfo.address, btcProducer.address, tat.address);

        console.log('Asset producer contracts deployed and initialized');
    } catch (error) {
        console.error('Deployment failed:', error);
    }
};
