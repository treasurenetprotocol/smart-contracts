#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Check current account permissions
 */

const getNetwork = () => process.env.NETWORK || 'dev';

function loadDeployments(network) {
  const file = path.join(process.cwd(), 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployment file not found: ${file}`);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.entries || data.entries.length === 0) {
    throw new Error(`No entries in deployment file: ${file}`);
  }
  return data.entries[0].contracts;
}

// Load contract ABI
function loadContractABI(contractName) {
  try {
    const buildPath = path.join(__dirname, '..', 'build', 'contracts', `${contractName}.json`);
    const contractJson = JSON.parse(fs.readFileSync(buildPath, 'utf8'));
    return contractJson.abi;
  } catch (error) {
    logger.error(`Failed to load ABI for ${contractName}:`, error.message);
    process.exit(1);
  }
}

async function checkPermissions() {
  try {
    logger.info('Checking Account Permissions');
    logger.info('===========================');

    const network = getNetwork();
    const contracts = loadDeployments(network);
    const rpcUrl = process.env.RPC;
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl) throw new Error('RPC env not set');
    if (!privateKey) throw new Error('PRIVATE_KEY env not set');
    if (!contracts.ROLES || !contracts.ROLES.address) throw new Error('ROLES address missing in deployments');

    // Initialize Web3
    const web3 = new Web3(rpcUrl);

    // Current account
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    logger.info(`Checking account: ${account.address}`);

    // Load Roles contract
    const rolesABI = loadContractABI('Roles');
    const roles = new web3.eth.Contract(rolesABI, contracts.ROLES.address);

    // Get all role constants
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const ADMIN = await roles.methods.get_ADMIN().call();
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

    logger.info('\n📋 Role Check:');

    // Check FOUNDATION_MANAGER role
    const isFoundationManager = await roles.methods.hasRole(FOUNDATION_MANAGER, account.address).call();
    logger.info(`FOUNDATION_MANAGER: ${isFoundationManager ? '✅ YES' : '❌ NO'}`);

    // Check ADMIN role
    const isAdmin = await roles.methods.hasRole(ADMIN, account.address).call();
    logger.info(`ADMIN: ${isAdmin ? '✅ YES' : '❌ NO'}`);

    // Check DEFAULT_ADMIN_ROLE
    const isDefaultAdmin = await roles.methods.hasRole(DEFAULT_ADMIN_ROLE, account.address).call();
    logger.info(`DEFAULT_ADMIN_ROLE: ${isDefaultAdmin ? '✅ YES' : '❌ NO'}`);

    logger.info('\n🔍 Role Hierarchy Check:');

    // Check what role is the admin of FOUNDATION_MANAGER
    const fmAdmin = await roles.methods.getRoleAdmin(FOUNDATION_MANAGER).call();
    logger.info(`FOUNDATION_MANAGER admin role: ${fmAdmin}`);
    logger.info(`ADMIN role hash: ${ADMIN}`);
    logger.info(`Can manage FOUNDATION_MANAGER: ${fmAdmin === ADMIN && isAdmin ? '✅ YES' : '❌ NO'}`);

    logger.info('\n👥 Current Foundation Managers:');
    const fmCount = await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call();
    logger.info(`Total count: ${fmCount}`);

    for (let i = 0; i < fmCount; i++) {
      const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
      logger.info(`${i + 1}. ${manager}`);
    }

    logger.info('\n💡 Solutions:');

    if (isAdmin && fmAdmin === ADMIN) {
      logger.info('✅ You have ADMIN role and can directly add foundation managers!');
      logger.info('   Run: node scripts/add-foundation-manager.js');
    } else if (isDefaultAdmin) {
      logger.info('✅ You have DEFAULT_ADMIN_ROLE and can grant any role!');
      logger.info('   Run: node scripts/add-foundation-manager.js');
    } else {
      logger.info('❌ You cannot directly add foundation managers.');
      logger.info('   You need one of the following:');
      logger.info('   - ADMIN role');
      logger.info('   - DEFAULT_ADMIN_ROLE');
      logger.info('   - Contact someone with these roles');
    }
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  checkPermissions();
}

module.exports = checkPermissions;
