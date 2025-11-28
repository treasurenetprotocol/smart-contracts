// SPDX-License-Identifier: MIT
require('dotenv').config();

const DAO = artifacts.require('DAO');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const Oracle = artifacts.require('Oracle');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Initial deployment script for base components
 * - DAO: governance organization
 * - MulSig: multisignature contract
 * - Roles: role and permission management
 * - ParameterInfo: system parameter configuration
 * - Oracle: price oracle
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('Deploying base components...');

        // Record deployment addresses to file
        fs.writeFileSync('contracts.txt', `# Contract deployment addresses - ${network} - ${new Date().toISOString()}\n`);

        // 1. Deploy contracts first without initializing
        console.log('Step 1: Deploy contract instances...');

        // Deploy DAO contract (without init)
        const dao = await deployProxy(DAO, { initializer: false }, { deployer });
        console.log('DAO deployed:', dao.address);
        fs.appendFileSync('contracts.txt', `const DAO_ADDRESS='${dao.address}'\n`);

        // Deploy MulSig multisig contract (without init)
        const mulSig = await deployProxy(MulSig, { initializer: false }, { deployer });
        console.log('MulSig deployed:', mulSig.address);
        fs.appendFileSync('contracts.txt', `const MULSIG_ADDRESS='${mulSig.address}'\n`);

        // Deploy Roles contract (without init)
        const roles = await deployProxy(Roles, { initializer: false }, { deployer });
        console.log('Roles deployed:', roles.address);
        fs.appendFileSync('contracts.txt', `const ROLES_ADDRESS='${roles.address}'\n`);

        // Deploy ParameterInfo contract (without init)
        const parameterInfo = await deployProxy(ParameterInfo, { initializer: false }, { deployer });
        console.log('ParameterInfo deployed:', parameterInfo.address);
        fs.appendFileSync('contracts.txt', `const PARAMETER_INFO_ADDRESS='${parameterInfo.address}'\n`);

        // Deploy Oracle contract (without init)
        const oracle = await deployProxy(Oracle, { initializer: false }, { deployer });
        console.log('Oracle deployed:', oracle.address);
        fs.appendFileSync('contracts.txt', `const ORACLE_ADDRESS='${oracle.address}'\n`);

        // 2. Initialize contracts in the correct order
        console.log('Step 2: Initialize contracts...');

        // Initialize DAO
        await dao.initialize('DAO', 2, 10);
        console.log('DAO initialized');

        // Initialize parameter management
        await parameterInfo.initialize(mulSig.address);
        console.log('ParameterInfo initialized');


        // Initialize Oracle
        await oracle.initialize(roles.address);
        console.log('Oracle initialized');

        // // Initialize MulSig last (because it depends on previous contracts)
        // await mulSig.initialize(
        //     dao.address,
        //     accounts[0], // placeholder value; updated in later migrations
        //     roles.address,
        //     parameterInfo.address,
        //     accounts[0], // CrosschainTokens address; updated later
        //     3600 // confirmation duration (seconds)
        // );
        // console.log('MulSig initialized');

        console.log('Base components deployed');
    } catch (error) {
        console.error('Deployment failed:', error);
        // Print detailed error info
        if (error.stack) {
            console.error('Error stack:', error.stack);
        }
        if (error.cause) {
            console.error('Error cause:', error.cause);
        }
    }
};
