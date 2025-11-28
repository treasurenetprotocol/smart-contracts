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
 * Deploy USTN related contracts
 * - USTN: USTN stablecoin contract
 * - USTNAuction: USTN auction contract
 * - USTNFinance: USTN finance contract
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('Deploying USTN related contracts...');

        // Get deployed contract instances
        const roles = await Roles.deployed();
        const mulSig = await MulSig.deployed();
        const oracle = await Oracle.deployed();
        const parameterInfo = await ParameterInfo.deployed();
        const tcash = await TCash.deployed();

        // Deploy USTN contract
        const ustn = await deployProxy(USTN, { initializer: false }, { deployer });

        console.log('USTN deployed:', ustn.address);
        fs.appendFileSync('contracts.txt', `const USTN_ADDRESS='${ustn.address}'\n`);

        // Deploy USTNAuction contract
        const ustnAuction = await deployProxy(USTNAuction, { initializer: false }, { deployer });
        console.log('USTNAuction deployed:', ustnAuction.address);
        fs.appendFileSync('contracts.txt', `const USTN_AUCTION_ADDRESS='${ustnAuction.address}'\n`);

        // Deploy USTNFinance contract
        const ustnFinance = await deployProxy(USTNFinance, { initializer: false }, { deployer });
        console.log('USTNFinance deployed:', ustnFinance.address);
        fs.appendFileSync('contracts.txt', `const USTN_FINANCE_ADDRESS='${ustnFinance.address}'\n`);


        await ustnAuction.initialize(
            roles.address,
            ustn.address,
            ustnFinance.address
        );

        await ustnFinance.initialize(
            roles.address,
            parameterInfo.address,
            oracle.address,
            ustn.address,
            ustnAuction.address
        );

        await ustn.initialize(
            roles.address,
            oracle.address,
            ustnAuction.address,
            ustnFinance.address
        );
        
        
        // // Set contract relationships
        // await ustn.setFinance(ustnFinance.address);
        // await ustn.setAuction(ustnAuction.address);
        // await ustnAuction.setFinance(ustnFinance.address);
        // await ustnFinance.setAuction(ustnAuction.address);

        console.log('USTN contracts deployment complete');
    } catch (error) {
        console.error('Deployment failed:', error);
    }
};
