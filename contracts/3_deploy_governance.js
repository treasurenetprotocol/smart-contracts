const DAO = artifacts.require("DAO");
const Governance = artifacts.require("Governance");
const MulSig = artifacts.require("MulSig");
const Roles = artifacts.require("Roles");
const ParameterInfo = artifacts.require("ParameterInfo");

const Oralce = artifacts.require("Oracle");
const SimpleClient = artifacts.require("SimpleClient");



const OilProducer = artifacts.require("OilProducer");
const OilData = artifacts.require("OilData");
const GasProducer = artifacts.require("GasProducer");
const GasData = artifacts.require("GasData");

const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const fs = require('fs');

module.exports = async function (deployer, network, accounts) {
  await sleep(1000)
  const dao = await DAO.deployed()

  const oilProducer = await OilProducer.deployed()
  const oilData = await OilData.deployed()
  const gasProducer = await GasProducer.deployed()
  const gasData = await GasData.deployed()

  const mulSig = await deployProxy(MulSig, { initializer: false }, { deployer });
  console.log("MulSig:", mulSig.address);
  fs.appendFileSync('contracts.txt', 'const MulSig=\'' + mulSig.address + '\'\n');

  await sleep(1000)
  const role = await deployProxy(Roles, { initializer: false }, { deployer });
  console.log("Roles:", role.address);
  fs.appendFileSync('contracts.txt', 'const Roles=\'' + role.address + '\'\n');

  // deploy with initialize
  await sleep(1000)
  const parameterInfo = await deployProxy(ParameterInfo, [mulSig.address], { deployer });
  console.log("ParameterInfo:", parameterInfo.address);
  fs.appendFileSync('contracts.txt', 'const ParameterInfo=\'' + parameterInfo.address + '\'\n');

  // deploy with initialize
  await sleep(1000)
  const gov = await deployProxy(Governance, [
    dao.address,
    mulSig.address,
    role.address,
    parameterInfo.address,
    ["OIL", "GAS"],
    [oilProducer.address, gasProducer.address],
    [oilData.address, gasData.address],
  ], { deployer });
  console.log("Governance:", gov.address);
  fs.appendFileSync('contracts.txt', 'const Governance=\'' + gov.address + '\'\n');

  await sleep(1000)
  const oracle = await deployProxy(Oralce, [role.address], { deployer });
  console.log("Oracle:", oracle.address);
  fs.appendFileSync('contracts.txt', 'const Oracle=\'' + oracle.address + '\'\n');

  console.log("do further initializations")
  await sleep(1000)

  // mulSigInstance = await MulSig.deployed();
  // await mulSigInstance.initialize(dao.address,gov.address,role.address,parameterInfo.address,2);


  // roleInstance = await Roles.deployed();

  // // managers and feeders
  // await roleInstance.initialize(mulSig.address, [accounts[0]], [accounts[0]], [oracle.address, accounts[0], [crosschainBridge.address, "0xD9a1fED8642846CaB06ff168341d2556Cbad0e4a"]])

};

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
