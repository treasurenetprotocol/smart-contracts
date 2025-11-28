const TCash = artifacts.require('TCash');
const WTCASH = artifacts.require('WTCASH');
const WUNIT = artifacts.require('WUNIT');
const TCashLoan = artifacts.require('TCashLoan');
const TCashAuction = artifacts.require('TCashAuction');
const TATManager = artifacts.require('TATManager');
const Roles = artifacts.require('Roles');
const MulSig = artifacts.require('MulSig');
const Oracle = artifacts.require('Oracle');
const TAT = artifacts.require('TAT');
const ParameterInfo = artifacts.require('ParameterInfo');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require("fs");

/**
 * Deploy TCash related contracts
 * - TCash: primary stablecoin contract
 * - WTCASH: wrapped TCash
 * - WUNIT: wrapped UNIT
 * - TCashLoan: TCash lending contract
 * - TCashAuction: TCash auction contract
 * - TATManager: TAT management contract
 */
module.exports = async function (deployer, network, accounts) {
  try {
    console.log("Deploying TCash related contracts...");
    
    // Get deployed contract instances
    const roles = await Roles.deployed();
    const mulSig = await MulSig.deployed();
    const oracle = await Oracle.deployed();
    const tat = await TAT.deployed();
    const parameterInfo = await ParameterInfo.deployed();
    
    // Deploy TCash - requires initial recipient address
    const tcash = await deployProxy(TCash, [accounts[0]], { deployer });
    console.log('TCash deployed:', tcash.address);
    fs.appendFileSync('contracts.txt', `const TCASH_ADDRESS='${tcash.address}'\n`);
    
    // Deploy wrapped tokens (check WTCASH and WUNIT initializer requirements)
    const wtcash = await deployProxy(WTCASH, [], { deployer });
    console.log('WTCASH deployed:', wtcash.address);
    fs.appendFileSync('contracts.txt', `const WTCASH_ADDRESS='${wtcash.address}'\n`);
    
    const wunit = await deployProxy(WUNIT, [], { deployer });
    console.log('WUNIT deployed:', wunit.address);
    fs.appendFileSync('contracts.txt', `const WUNIT_ADDRESS='${wunit.address}'\n`);
    
    // Deploy TAT management contract - only needs roles address
    const tatManager = await deployProxy(TATManager, [roles.address], { deployer });
    console.log('TATManager deployed:', tatManager.address);
    fs.appendFileSync('contracts.txt', `const TAT_MANAGER_ADDRESS='${tatManager.address}'\n`);
    
    // Deploy TCash loan contract - using oracle instead of tcashOracle
    // const tcashLoan = await deployProxy(TCashLoan, [
    //   tcash.address,
    //   roles.address,
    //   parameterInfo.address,
    //   oracle.address,
    //   tat.address
    // ], { deployer });
    const tcashLoan = await deployProxy(TCashLoan, { initializer: false }, { deployer });
    console.log('TCashLoan deployed:', tcashLoan.address);
    fs.appendFileSync('contracts.txt', `const TCASH_LOAN_ADDRESS='${tcashLoan.address}'\n`);

    
    
    // Deploy TCash auction contract - only needs two parameters
    const tcashAuction = await deployProxy(TCashAuction, [
      roles.address,
      tcash.address,
      tcashLoan.address,
    ], { deployer });
    console.log('TCashAuction deployed:', tcashAuction.address);
    fs.appendFileSync('contracts.txt', `const TCASH_AUCTION_ADDRESS='${tcashAuction.address}'\n`);
    
    // // Set contract relationships
    // await tcashLoan.setAuction(tcashAuction.address);
    // await tcashAuction.setLoan(tcashLoan.address);
    
    // Configure TCash dependencies
    await tcash.setRoles(roles.address);
    await tcash.setOracle(oracle.address);
    
    // // Authorize TAT manager
    // const tatInstance = await TAT.at(tat.address);
    // await tatInstance.setMinter(tatManager.address, true);
    
    // Set initial prices for Oracle
    console.log('Initializing Oracle price data...');
    
   
    
    console.log("TCash contracts deployment complete");
  } catch (error) {
    console.error("Deployment failed:", error);
  }
};
