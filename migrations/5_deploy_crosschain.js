const CrosschainTokens = artifacts.require('CrosschainTokens');
const CrosschainBridge = artifacts.require('CrosschainBridge');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Governance = artifacts.require('Governance');
const Oracle = artifacts.require('Oracle');
const ParameterInfo = artifacts.require('ParameterInfo');
const TCashLoan = artifacts.require('TCashLoan');
const TCash = artifacts.require('TCash');
const TAT = artifacts.require('TAT');
//dao
const DAO = artifacts.require('DAO');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * Deploy cross-chain related contracts
 * - CrosschainTokens: cross-chain token management
 * - CrosschainBridge: cross-chain bridge contract
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('Deploying cross-chain contracts...');

        // Get deployed contract instances
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const gov = await Governance.deployed();
        const oracle = await Oracle.deployed();
        const parameterInfo = await ParameterInfo.deployed();
        const dao = await DAO.deployed();
        const tcash = await TCash.deployed();
        const tcashLoan = await TCashLoan.deployed();
        const tat = await TAT.deployed();
        // Deploy CrosschainTokens token management contract
        const crosschainTokens = await deployProxy(CrosschainTokens,
            ['0x0000000000000000000000000000000000000000'], // start with zero address
            {
                deployer,
                initializer: 'initialize'
            }
        );
        console.log('CrosschainTokens deployed:', crosschainTokens.address);
        fs.appendFileSync('contracts.txt', `const CROSSCHAIN_TOKENS_ADDRESS='${crosschainTokens.address}'\n`);

        // Deploy CrosschainBridge contract
        const crosschainBridge = await deployProxy(CrosschainBridge,
            [crosschainTokens.address, roles.address],
            {
                deployer,
                initializer: 'initialize'
            }
        );
        console.log('CrosschainBridge deployed:', crosschainBridge.address);
        fs.appendFileSync('contracts.txt', `const CROSSCHAIN_BRIDGE_ADDRESS='${crosschainBridge.address}'\n`);

        // Update MulSig address in CrosschainTokens
        const crosschainTokensInstance = await CrosschainTokens.at(crosschainTokens.address);
        await crosschainTokensInstance.setMulSig(mulSig.address);


        // Reinitialize MulSig now that we have a Governance instance
        console.log('Updating MulSig initialization parameters...');
        // await mulSig.initialize(
        //     accounts[0], // use deployer account instead of dao.address
        //     gov.address, // now using the correct governance address
        //     roles.address,
        //     oracle.address, // use oracle address instead of parameterInfo.address
        //     crosschainTokens.address,
        //     3600 // confirmation duration (seconds)
        // );

        await mulSig.initialize(dao.address,
            gov.address,
            roles.address,
            parameterInfo.address,
            crosschainTokens.address,
            5);
        console.log('MulSig contract updated');

        // // Update CrosschainTokens address in MulSig
        // const mulSigInstance = await MulSig.at(mulSig.address);
        // if ((await mulSigInstance.crosschainTokens()) === '0x0000000000000000000000000000000000000000') {
        //     await mulSigInstance.setCrosschainTokens(crosschainTokens.address);
        // }


        // Initialize Roles contract (provide necessary initial role address arrays)
        await roles.initialize(mulSig.address, 
            [accounts[0], '0x594E5b01D5D89b5C4183Fe11Fe157c42102aEc10','0x6A79824E6be14b7e5Cb389527A02140935a76cD5'], 
            [accounts[0], '0x594E5b01D5D89b5C4183Fe11Fe157c42102aEc10','0x6A79824E6be14b7e5Cb389527A02140935a76cD5'], 
            [oracle.address, accounts[0], "0x6A79824E6be14b7e5Cb389527A02140935a76cD5"], 
            [crosschainBridge.address, "0x594E5b01D5D89b5C4183Fe11Fe157c42102aEc10", "0x6A79824E6be14b7e5Cb389527A02140935a76cD5"],
            [tcash.address, tcashLoan.address]
        )
        console.log('Roles initialized successfully');

        await tcashLoan.initialize(tcash.address, roles.address, parameterInfo.address, oracle.address, tat.address);


        // Grant FOUNDATION_MANAGER role to deployer account to set prices
        // Assuming accounts[0] already has the ADMIN role and can grant others
        const FOUNDATION_MANAGER_ROLE = web3.utils.keccak256("FOUNDATION_MANAGER");
        if (!(await roles.hasRole(FOUNDATION_MANAGER_ROLE, accounts[0]))) {
            await roles.grantRole(FOUNDATION_MANAGER_ROLE, accounts[0]);
            console.log(`Granted FOUNDATION_MANAGER role to account ${accounts[0]}`);
        }

        // Set initial prices for UNIT and TCASH
        // These should be adjusted for the real environment
        await oracle.updatePrice("UNIT", web3.utils.toWei("1", "ether")); // assume 1 UNIT = 1 ETH
        await oracle.updatePrice("TCASH", web3.utils.toWei("2", "ether")); // assume 1 TCASH = 0.1 ETH
        console.log('Oracle price data initialized');

        console.log('Cross-chain contracts deployment complete');
    } catch (error) {
        console.error('Deployment failed:', error);
    }
};
