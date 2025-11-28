
const TCash = artifacts.require('TCash');
const WTCASH = artifacts.require('WTCASH');
const WUNIT = artifacts.require('WUNIT');


const { deployProxy,upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");

module.exports = async function (deployer, network, accounts) {

        // 部署 TCash
    const wtcash = await deployProxy(WTCASH, [], { deployer });
    // const tcash = await TCash.deployed();
    // const upgraded = await upgradeProxy(tcash.address, TCash, { deployer });
    console.log('WTCASH:', wtcash.address);
    fs.appendFileSync('contracts.txt', 'const WTCASH=\'' + wtcash.address + '\'\n');

    // 部署 TCash
    const tcash = await deployProxy(TCash, [], { deployer });
    console.log('TCash:', tcash.address);
    fs.appendFileSync('contracts.txt', 'const TCash=\'' + tcash.address + '\'\n');

    // 部署 WUNIT
    // const wunit = await deployProxy(WUNIT, [], { deployer });
    // console.log('WUNIT:', wunit.address);
    // fs.appendFileSync('contracts.txt', 'const WUNIT=\'' + wunit.address + '\'\n');
}