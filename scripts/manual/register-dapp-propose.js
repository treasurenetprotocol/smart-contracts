#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getNetwork,
  requireContracts,
  loadContractABI,
  getPrivateKey,
  getUserAddress,
} = require('./common/config');

/**
 * Register DApp through multisig (env-driven, no CLI args)
 */

const TREASURE_KIND = process.env.TREASURE_KIND || 'OIL';
const DAPP_NAME = process.env.DAPP_NAME || 'OTTER';
const PAYEE_ADDRESS = process.env.PAYEE_ADDRESS || getUserAddress();

async function registerDApp() {
  try {
    const network = getNetwork();
    const rpcUrl = getRpcUrl();
    const { MULSIG, ROLES, GOVERNANCE } = requireContracts(['MULSIG', 'ROLES', 'GOVERNANCE'], network);
    const web3 = new Web3(rpcUrl);

    // Validate payee address
    if (!web3.utils.isAddress(PAYEE_ADDRESS)) {
      throw new Error('Invalid payee address format');
    }

    // Add account from private key
    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    logger.info('DApp Registration via Multisig (Node.js)');
    logger.info('=========================================');
    logger.info('Configuration:');
    logger.info(`  Network: ${network}`);
    logger.info(`  Treasure Kind: ${TREASURE_KIND}`);
    logger.info(`  DApp Name: ${DAPP_NAME}`);
    logger.info(`  Payee Address: ${PAYEE_ADDRESS}`);
    logger.info(`  RPC URL: ${rpcUrl}`);
    logger.info(`  Signer: ${account.address}`);
    logger.info('');

    // Load contract ABIs
    const mulSigABI = loadContractABI('MulSig');
    const rolesABI = loadContractABI('Roles');
    const governanceABI = loadContractABI('Governance');

    // Create contract instances
    const mulSig = new web3.eth.Contract(mulSigABI, MULSIG);
    const roles = new web3.eth.Contract(rolesABI, ROLES);
    const governance = new web3.eth.Contract(governanceABI, GOVERNANCE);

    logger.info('Contract addresses:');
    logger.info(`  MulSig: ${MULSIG}`);
    logger.info(`  Roles: ${ROLES}`);
    logger.info(`  Governance: ${GOVERNANCE}`);
    logger.info('');

    // Validate treasure kind
    try {
      const treasureInfo = await governance.methods.getTreasureByKind(TREASURE_KIND).call();
      if (treasureInfo[0] === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Treasure kind "${TREASURE_KIND}" not found`);
      }
      logger.info(`Treasure "${TREASURE_KIND}" producer: ${treasureInfo[0]}`);
    } catch (error) {
      logger.error(`Failed to validate treasure: ${error.message}`);
      process.exit(1);
    }

    // Get foundation managers
    const FOUNDATION_MANAGER = await roles.methods.FOUNDATION_MANAGER().call();
    const foundationManagerCount = Number(
      await roles.methods.getRoleMemberCount(FOUNDATION_MANAGER).call(),
    );

    if (foundationManagerCount === 0) {
      throw new Error('No foundation managers found');
    }

    const foundationManagers = [];
    for (let i = 0; i < foundationManagerCount; i++) {
      const manager = await roles.methods.getRoleMember(FOUNDATION_MANAGER, i).call();
      foundationManagers.push(manager);
    }

    logger.info(`Foundation managers (${foundationManagers.length}):`);
    foundationManagers.forEach((manager, i) => {
      logger.info(`  ${i + 1}. ${manager}`);
    });

    // Check if current account is a foundation manager
    if (!foundationManagers.includes(account.address)) {
      logger.error(`Error: Account ${account.address} is not a foundation manager`);
      logger.error('Please use a foundation manager private key');
      process.exit(1);
    }

    logger.info(`✓ Using foundation manager: ${account.address}`);
    logger.info('');

    // Create proposal
    logger.info(`Creating proposal to register DApp "${DAPP_NAME}" for treasure "${TREASURE_KIND}"...`);

    const gasPrice = await web3.eth.getGasPrice();
    const proposalTx = await mulSig.methods.proposeToRegisterDApp(
      TREASURE_KIND,
      DAPP_NAME,
      PAYEE_ADDRESS,
    ).send({
      from: account.address,
      gas: 500000,
      gasPrice,
    });

    // Get proposal ID from event
    const { proposalId } = proposalTx.events.RegisterDApp.returnValues;
    logger.info(`✓ Proposal created with ID: ${proposalId}`);

    // Get signature threshold
    const fmThreshold = await governance.methods.fmThreshold().call();
    logger.info(`Required signatures: ${fmThreshold}`);
    logger.info('');

    logger.info('Next steps:');
    logger.info(`  1) Foundation managers sign the proposal (ID: ${proposalId})`);
    logger.info('  2) Once enough signatures collected, execute the proposal');

    logger.info('');
    logger.info('To check proposal status:');
    logger.info('  node scripts/manual/multisig-proposal-status.js');

    logger.info('');
    logger.info('To execute the proposal (after enough signatures):');
    logger.info('  node scripts/manual/multisig-proposal-execute.js');
  } catch (error) {
    logger.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  registerDApp();
}

module.exports = registerDApp;
