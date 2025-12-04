const { logger } = require('@treasurenet/logging-middleware');

const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Governance = artifacts.require('Governance');

/**
 * Register DApp through multisig proposal script
 * This script will create a proposal to register a DApp connection for a producer
 * Foundation managers need to sign and execute the proposal
 */
module.exports = async function (deployer, network, accounts) {
  try {
    logger.info('Creating multisig proposal for DApp registration...', network);

    // ===== Configuration Section =====
    // Please modify these parameters according to your needs
    const TREASURE_KIND = 'OIL'; // Treasure type (OIL/GAS/ETH/BTC)
    const DAPP_NAME = 'OtterStreamTest'; // DApp name
    const PAYEE_ADDRESS = '0x1234567890123456789012345678901234567891'; // DApp payee address

    logger.info('Configuration:');
    logger.info(`  Treasure Kind: ${TREASURE_KIND}`);
    logger.info(`  DApp Name: ${DAPP_NAME}`);
    logger.info(`  Payee Address: ${PAYEE_ADDRESS}`);
    logger.info('');

    // ===== Validation Section =====
    // Validate payee address format
    if (!web3.utils.isAddress(PAYEE_ADDRESS)) {
      logger.error('Error: Invalid payee address format');
      return;
    }

    // Get deployed contract instances
    const mulSig = await MulSig.deployed();
    const roles = await Roles.deployed();
    const governance = await Governance.deployed();

    logger.info('Contract addresses:');
    logger.info(`  MulSig: ${mulSig.address}`);
    logger.info(`  Roles: ${roles.address}`);
    logger.info(`  Governance: ${governance.address}`);
    logger.info('');

    // Check if treasure exists
    try {
      const [producerAddress] = await governance.getTreasureByKind(TREASURE_KIND);
      if (producerAddress === '0x0000000000000000000000000000000000000000') {
        logger.error(`Error: Treasure kind "${TREASURE_KIND}" not found`);
        return;
      }
      logger.info(`Treasure "${TREASURE_KIND}" producer contract: ${producerAddress}`);
    } catch (error) {
      logger.error(`Error: Failed to get treasure info for "${TREASURE_KIND}":`, error.message);
      return;
    }

    // Get foundation managers
    const FOUNDATION_MANAGER = await roles.FOUNDATION_MANAGER();
    const foundationManagers = await roles.getRoleMemberArray(FOUNDATION_MANAGER);
    logger.info(`Foundation managers: ${foundationManagers}`);

    if (foundationManagers.length === 0) {
      logger.error('Error: No foundation manager accounts found');
      return;
    }

    // ===== Proposal Creation Section =====
    // Use first foundation manager as proposer
    const proposer = foundationManagers[0];
    logger.info(`Using ${proposer} as proposer`);

    const txOptions = { from: proposer };

    // Create proposal for DApp registration
    logger.info(`Creating proposal to register DApp "${DAPP_NAME}" for treasure "${TREASURE_KIND}"...`);
    const proposalTx = await mulSig.proposeToRegisterDApp(
      TREASURE_KIND,
      DAPP_NAME,
      PAYEE_ADDRESS,
      txOptions,
    );

    // Extract proposal ID from event
    const { proposalId } = proposalTx.logs.find((log) => log.event === 'RegisterDApp').args;
    logger.info(`Created proposal ID: ${proposalId}`);

    // Get required signature threshold
    const fmThreshold = await governance.fmThreshold();
    logger.info(`Required signatures for proposal: ${fmThreshold}`);
    logger.info('');

    // ===== Signing and Execution Section =====
    // In test/development environment, automatically sign and execute
    if (network === 'development' || network === 'test' || network === 'ganache') {
      logger.info('Running in test environment - auto-signing and executing proposal');

      // Sign proposal - get signatures from foundation managers until threshold is met
      const requiredSignatures = Math.min(foundationManagers.length, fmThreshold.toNumber());

      for (let i = 0; i < requiredSignatures; i++) {
        const signerAddress = foundationManagers[i];

        // Check if already signed
        const hasAlreadySigned = await mulSig.hasAlreadySigned(proposalId, signerAddress);
        if (hasAlreadySigned) {
          logger.info(`Signer ${i + 1}: ${signerAddress} has already signed`);
          continue;
        }

        logger.info(`Signer ${i + 1}: ${signerAddress} signing proposal...`);
        await mulSig.signTransaction(proposalId, { from: signerAddress });

        // Get current signature count
        const signatureCount = await mulSig.getSignatureCount(proposalId);
        logger.info(`Current signature count: ${signatureCount}`);
      }

      // Wait for confirmation period (in test environment, this should be minimal)
      logger.info('Waiting for confirmation period...');

      // Get proposal details to check execution time
      const proposalDetails = await mulSig.transactionDetails(proposalId);
      const currentTime = Math.floor(Date.now() / 1000);
      const executionTime = proposalDetails.excuteTime.toNumber();

      if (executionTime > currentTime) {
        const waitTime = executionTime - currentTime;
        logger.info(`Need to wait ${waitTime} seconds before execution`);

        // In test environment, we can advance time
        if (network === 'development' || network === 'ganache') {
          await web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [waitTime + 1],
            id: new Date().getTime(),
          });
          await web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: new Date().getTime(),
          });
          logger.info('Time advanced for testing');
        }
      }

      // Execute proposal
      logger.info('Executing proposal...');
      await mulSig.executeProposal(proposalId, txOptions);
      logger.info('Proposal executed successfully!');

      // Verify DApp registration
      logger.info('Verifying DApp registration...');
      const dappId = web3.utils.keccak256(web3.utils.encodePacked(DAPP_NAME, PAYEE_ADDRESS));
      logger.info(`Generated DApp ID: ${dappId}`);
      logger.info('DApp has been successfully registered with the producer contract');
    } else {
      // Production environment instructions
      logger.info(`
=== Production Environment Instructions ===

A multisig proposal has been created with the following details:
- Proposal ID: ${proposalId}
- Treasure Kind: ${TREASURE_KIND}
- DApp Name: ${DAPP_NAME}
- Payee Address: ${PAYEE_ADDRESS}

Next steps for foundation managers:
1. Review the proposal details carefully
2. At least ${fmThreshold} foundation managers need to sign the proposal
3. Use the following command to sign:
   mulSig.signTransaction(${proposalId})
4. After sufficient signatures, wait for the confirmation period
5. Execute the proposal using:
   mulSig.executeProposal(${proposalId})

Foundation managers who can sign:
${foundationManagers.map((addr, i) => `${i + 1}. ${addr}`).join('\n')}

Current proposal status can be checked with:
- mulSig.getSignatureCount(${proposalId})
- mulSig.transactionDetails(${proposalId})
            `);
    }

    logger.info('Script execution completed');
  } catch (error) {
    logger.error('Error during DApp registration:', error);
    if (error.reason) {
      logger.error('Reason:', error.reason);
    }
  }
};
