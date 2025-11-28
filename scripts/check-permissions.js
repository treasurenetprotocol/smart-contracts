#!/usr/bin/env node

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Check current account permissions
 */

// ===== Configuration Section =====
const CONFIG = {
    RPC_URL: "http://127.0.0.1:8555",
    ROLES_ADDRESS: "0xa1Bf87580F2bfb1e3FC1ecC6bB773DBA48DF136C",
    PRIVATE_KEY: "0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
};

// Load contract ABI
function loadContractABI(contractName) {
    try {
        const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
        const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
        return contractJson.abi;
    } catch (error) {
        console.error(`Failed to load ABI for ${contractName}:`, error.message);
        process.exit(1);
    }
}

async function checkPermissions() {
    try {
        console.log('Checking Account Permissions');
        console.log('===========================');

        // Initialize Web3
        const web3 = new Web3(CONFIG.RPC_URL);
        
        // Current account
        const account = web3.eth.accounts.privateKeyToAccount(CONFIG.PRIVATE_KEY);
        console.log(`Checking account: ${account.address}`);

        // Load Roles contract
        const rolesABI = loadContractABI('Roles');
        const roles = new web3.eth.Contract(rolesABI, CONFIG.ROLES_ADDRESS);

        // Get all role constants
        const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
        const ADMIN = await roles.methods.get_ADMIN().call();
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

        console.log('\n📋 Role Check:');
        
        // Check FOUNDATION_MANAGER role
        const isFoundationManager = await roles.methods.hasRole(FOUNDATION_MANAGER, account.address).call();
        console.log(`FOUNDATION_MANAGER: ${isFoundationManager ? '✅ YES' : '❌ NO'}`);
        
        // Check ADMIN role
        const isAdmin = await roles.methods.hasRole(ADMIN, account.address).call();
        console.log(`ADMIN: ${isAdmin ? '✅ YES' : '❌ NO'}`);
        
        // Check DEFAULT_ADMIN_ROLE
        const isDefaultAdmin = await roles.methods.hasRole(DEFAULT_ADMIN_ROLE, account.address).call();
        console.log(`DEFAULT_ADMIN_ROLE: ${isDefaultAdmin ? '✅ YES' : '❌ NO'}`);

        console.log('\n🔍 Role Hierarchy Check:');
        
        // Check what role is the admin of FOUNDATION_MANAGER
        const fmAdmin = await roles.methods.getRoleAdmin(FOUNDATION_MANAGER).call();
        console.log(`FOUNDATION_MANAGER admin role: ${fmAdmin}`);
        console.log(`ADMIN role hash: ${ADMIN}`);
        console.log(`Can manage FOUNDATION_MANAGER: ${fmAdmin === ADMIN && isAdmin ? '✅ YES' : '❌ NO'}`);

        console.log('\n👥 Current Foundation Managers:');
        const fmCount = await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call();
        console.log(`Total count: ${fmCount}`);
        
        for (let i = 0; i < fmCount; i++) {
            const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
            console.log(`${i + 1}. ${manager}`);
        }

        console.log('\n💡 Solutions:');
        
        if (isAdmin && fmAdmin === ADMIN) {
            console.log('✅ You have ADMIN role and can directly add foundation managers!');
            console.log('   Run: node scripts/add-foundation-manager.js');
        } else if (isDefaultAdmin) {
            console.log('✅ You have DEFAULT_ADMIN_ROLE and can grant any role!');
            console.log('   Run: node scripts/add-foundation-manager.js');
        } else {
            console.log('❌ You cannot directly add foundation managers.');
            console.log('   You need one of the following:');
            console.log('   - ADMIN role');
            console.log('   - DEFAULT_ADMIN_ROLE');
            console.log('   - Contact someone with these roles');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    checkPermissions();
}

module.exports = checkPermissions; 