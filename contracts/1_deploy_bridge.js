const CrosschainTokens = artifacts.require('CrosschainTokens');
const CrosschainBridge = artifacts.require('CrosschainBridge');
const TCash = artifacts.require('TCash');
const WTCASH = artifacts.require('WTCASH');
const WUNIT = artifacts.require('WUNIT');
const Roles = artifacts.require('Roles');
const MulSig = artifacts.require('MulSig');
const ParameterInfo = artifacts.require('ParameterInfo');
const Governance = artifacts.require('Governance');
const DAO = artifacts.require('DAO');
const OilProducer = artifacts.require("OilProducer");
const OilData = artifacts.require("OilData");
const GasProducer = artifacts.require("GasProducer");
const GasData = artifacts.require("GasData");
const Oralce = artifacts.require("Oracle");

const { deployProxy,upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {

    //     // 部署 TCash
    // const wtcash = await deployProxy(WTCASH, [], { deployer });
    // // const tcash = await TCash.deployed();
    // // const upgraded = await upgradeProxy(tcash.address, TCash, { deployer });
    // console.log('WTCASH:', wtcash.address);
    // fs.appendFileSync('contracts.txt', 'const WTCASH=\'' + wtcash.address + '\'\n');

    // // 部署 WUNIT
    // const wunit = await deployProxy(WUNIT, [], { deployer });
    // console.log('WUNIT:', wunit.address);
    // fs.appendFileSync('contracts.txt', 'const WUNIT=\'' + wunit.address + '\'\n');

    const dao = await DAO.deployed()
    const oilProducer = await OilProducer.deployed()
    const oilData = await OilData.deployed()
    const gasProducer = await GasProducer.deployed()
    const gasData = await GasData.deployed()
    // 部署 TCash
    // const tcash = await deployProxy(TCash, [], { deployer });
    const tcash = await TCash.deployed();
    // const upgraded = await upgradeProxy(tcash.address, TCash, { deployer });
    console.log('TCash:', tcash.address);
    fs.appendFileSync('contracts.txt', 'const TCash=\'' + tcash.address + '\'\n');


    // 部署 Roles
    //const roles = await deployProxy(Roles, { initializer: false }, { deployer });
    const roles = await Roles.deployed();
    console.log('Roles:', roles.address);
    fs.appendFileSync('contracts.txt', 'const Roles=\'' + roles.address + '\'\n');

    //const mulSig = await deployProxy(MulSig, { initializer: false }, { deployer });
    const mulSig = await MulSig.deployed();
    console.log("MulSig:", mulSig.address);
    fs.appendFileSync('contracts.txt', 'const MulSig=\'' + mulSig.address + '\'\n');

    // 1. 先部署 ParameterInfo，暂时传入零地址
  //  const parameterInfo = await deployProxy(ParameterInfo, [mulSig.address], { deployer });
    const parameterInfo = await ParameterInfo.deployed();
    console.log("ParameterInfo:", parameterInfo.address);
    fs.appendFileSync('contracts.txt', 'const ParameterInfo=\'' + parameterInfo.address + '\'\n');

    // const gov = await deployProxy(Governance, [
    //     dao.address,
    //     mulSig.address,
    //     roles.address,
    //     parameterInfo.address,
    //     ["OIL", "GAS"],
    //     [oilProducer.address, gasProducer.address],
    //     [oilData.address, gasData.address],
    // ], { deployer });
    const gov = await Governance.deployed();
    console.log("Governance:", gov.address);
    fs.appendFileSync('contracts.txt', 'const Governance=\'' + gov.address + '\'\n');

    // 1. 先部署 CrosschainTokens，但暂时不初始化
    // const crosschainTokens = await deployProxy(CrosschainTokens,
    //     ["0x0000000000000000000000000000000000000000"], // 先用零地址
    //     {
    //         deployer,
    //         initializer: 'initialize'
    //     }
    // );
    const crosschainTokens = await CrosschainTokens.deployed();
    console.log('CrosschainTokens:', crosschainTokens.address);
    fs.appendFileSync('contracts.txt', 'const CrosschainTokens=\'' + crosschainTokens.address + '\'\n');

    // // // 3. 更新 CrosschainTokens 中的 MulSig 地址
    // const crosschainTokensInstance = await CrosschainTokens.at(crosschainTokens.address);
    // await crosschainTokensInstance.setMulSig(mulSig.address);

    // 部署 CrosschainBridge
    const crosschainBridge = await deployProxy(CrosschainBridge,
        [crosschainTokens.address, roles.address],
        {
            deployer,
            initializer: 'initialize'
        }
    );
    // const crosschainBridge = await CrosschainBridge.deployed();
    console.log('CrosschainBridge:', crosschainBridge.address);
    fs.appendFileSync('contracts.txt', 'const CrosschainBridge=\'' + crosschainBridge.address + '\'\n');

   // let mulSigInstance = await MulSig.deployed();
    // await mulSigInstance.initialize(dao.address, gov.address, roles.address, parameterInfo.address, 2);

    // await mulSig.initialize(dao.address,
    //     gov.address,
    //     roles.address,
    //     parameterInfo.address,
    //     crosschainTokens.address,
    //     5);

    const oracle = await Oralce.deployed();

    // 初始化 Roles
    const rolesInstance = await Roles.deployed();
    console.log("accounts[0]:", accounts[0]);
    // await rolesInstance.initialize(mulSig.address, [accounts[0]], [accounts[0]], [oracle.address, accounts[0]])
    await rolesInstance.initialize(mulSig.address, [accounts[0]], [accounts[0]], [oracle.address, accounts[0]], [crosschainBridge.address, "0xD9a1fED8642846CaB06ff168341d2556Cbad0e4a", "0x6A79824E6be14b7e5Cb389527A02140935a76cD5"])

};
