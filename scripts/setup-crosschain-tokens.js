const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');

// Import contract ABIs
const MulSig = require('../build/contracts/MulSig.json');
const Roles = require('../build/contracts/Roles.json');
const CrosschainTokens = require('../build/contracts/CrosschainTokens.json');

// Encapsulate multisig proposal workflow
async function proposeCrosschainToken(
  mulSig,
  roles,
  crosschainTokens,
  params,
  FOUNDATION_MANAGER,
  sender,
  web3Instance,
) {
  logger.info('Creating proposal with params:', {
    token: params[0],
    sourceERC20: params[1],
    sourceCrosschain: params[2],
    sourceChainId: params[3],
    targetERC20: params[4],
    targetCrosschain: params[5],
    targetChainId: params[6],
    fee: params[7],
    chainId: params[8],
  });

  // Validate contract addresses
  logger.info('Contract addresses:', {
    mulSig: mulSig.options.address,
    roles: roles.options.address,
    crosschainTokens: crosschainTokens.options.address,
  });

  // Add permission check
  const hasRole = await roles.methods
    .hasRole(FOUNDATION_MANAGER, sender)
    .call();
  if (!hasRole) {
    throw new Error(`Account ${sender} does not have FOUNDATION_MANAGER role`);
  }
  logger.info(`Account ${sender} has FOUNDATION_MANAGER role`);

  // Submit proposal
  try {
    const gasPrice = await web3Instance.eth.getGasPrice();

    const tx = await mulSig.methods
      .proposeToSetCrosschainToken(
        params[0], // token
        params[1], // sourceERC20address
        params[2], // sourceCrosschainAddress
        params[3], // sourcechainid
        params[4], // targetERC20address
        params[5], // targetCrosschainAddress
        params[6], // targetchainid
        params[7], // fee
        params[8], // chainId
      )
      .send({
        from: sender,
        gas: 500000,
        gasPrice: '700000000', // 0.4 gwei
      });
    logger.info('Proposal created successfully:', tx.transactionHash);
  } catch (error) {
    logger.error('Error details:', error);
    if (error.message.includes('revert')) {
      logger.error('Revert reason:', error.message);
    }
    throw error;
  }

  // Wait for the proposal to be created
  await sleep(10 * 1000);

  // Fetch and sign the proposal
  const pendingProposals = await mulSig.methods
    .getPendingProposals()
    .call({ from: sender });
  if (pendingProposals.length > 0) {
    const proposalId = pendingProposals[pendingProposals.length - 1];
    logger.info('Got proposal ID:', proposalId.toString());

    // Get all foundation managers
    const managers = await roles.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();

    // Sign with every foundation manager
    for (const manager of managers) {
      const hasSigned = await mulSig.methods
        .hasAlreadySigned(proposalId, manager)
        .call();
      if (!hasSigned) {
        try {
          const gasPrice = await web3Instance.eth.getGasPrice();

          await mulSig.methods.signTransaction(proposalId).send({
            from: manager,
            gas: 500000,
            gasPrice,
          });
          logger.info(`Manager ${manager} signed successfully`);
        } catch (error) {
          logger.error(
            `Failed to get signature from manager ${manager}:`,
            error.message,
          );
        }
      }
    }

    // Wait before execution
    await sleep(8 * 1000);

    // Execute the proposal
    try {
      logger.info('Executing proposal:', proposalId.toString());
      const gasPrice = await web3Instance.eth.getGasPrice();

      const result = await mulSig.methods.executeProposal(proposalId).send({
        from: sender,
        gas: 500000,
        gasPrice: '700000000', // 0.4 gwei
      });
      logger.info('Proposal executed successfully:', result.transactionHash);

      // Verify the configuration
      logger.info('Verifying configuration...');
      const tokenInfo = await crosschainTokens.methods
        .getCrosschainTokenByChainId(params[0], params[8])
        .call();
      if (!tokenInfo[0]) {
        throw new Error('Token info is empty after execution');
      }
      logger.info(`${params[0]} token info after execution:`, {
        token: tokenInfo[0],
        sourceERC20: tokenInfo[1],
        sourceCrosschain: tokenInfo[2],
        sourceChainId: tokenInfo[3].toString(),
        targetERC20: tokenInfo[4],
        targetCrosschain: tokenInfo[5],
        targetChainId: tokenInfo[6].toString(),
        fee: tokenInfo[7].toString(),
      });
    } catch (error) {
      logger.error('Failed to execute proposal:', error);
      throw error;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// Configure cross-chain token mappings
async function setupCrosschainTokens(addresses) {
  try {
    // Connect to the target network
    const web3 = new Web3(addresses.rpcUrl);

    // Add the private key
    const privateKey = '';
    await web3.eth.accounts.wallet.add(privateKey);

    // Create contract instances
    const mulSigInstance = new web3.eth.Contract(MulSig.abi, addresses.mulSig);
    const rolesInstance = new web3.eth.Contract(Roles.abi, addresses.roles);
    const crosschainTokensInstance = new web3.eth.Contract(
      CrosschainTokens.abi,
      addresses.crosschainTokens,
    );

    // Get the FOUNDATION_MANAGER role
    const FOUNDATION_MANAGER = web3.utils.keccak256('FOUNDATION_MANAGER');
    const fManagers = await rolesInstance.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();
    logger.info('All members under FOUNDATION_MANAGER:', fManagers);

    // Set the cross-chain token mapping
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'UNIT' : 'WUNIT',
        addresses.sourceChain.unit,
        addresses.sourceChain.bridge,
        addresses.sourceChainId,
        addresses.targetChain.unit,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        5,
        addresses.sourceChainId,
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );

    // 2. Chain2 wUNIT -> Chain1 UNIT (reverse mapping)
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'WUNIT' : 'UNIT',
        addresses.targetChain.unit, // Chain2 wUNIT address
        addresses.targetChain.bridge, // Chain2 bridge address
        addresses.targetChainId, // Chain2 chainId
        addresses.sourceChain.unit, // Chain1 UNIT address
        addresses.sourceChain.bridge, // Chain1 bridge address
        addresses.sourceChainId, // Chain1 chainId
        5, // fee
        addresses.targetChainId, // current chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0], // use the first account to send transactions
      web3,
    );

    // 3. Chain1 TCash -> Chain2 wTCash
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'TCASH' : 'WTCASH',
        addresses.sourceChain.tcash, // Chain1 TCash address
        addresses.sourceChain.bridge, // Chain1 bridge address
        addresses.sourceChainId, // Chain1 chainId
        addresses.targetChain.tcash, // Chain2 wTCash address
        addresses.targetChain.bridge, // Chain2 bridge address
        addresses.targetChainId, // Chain2 chainId
        5, // fee
        addresses.sourceChainId, // current chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );

    // 4. Chain2 wTCash -> Chain1 TCash (reverse mapping)
    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'WTCASH' : 'TCASH',
        addresses.targetChain.tcash, // Chain2 wTCash address
        addresses.targetChain.bridge, // Chain2 bridge address
        addresses.targetChainId, // Chain2 chainId
        addresses.sourceChain.tcash, // Chain1 TCash address
        addresses.sourceChain.bridge, // Chain1 bridge address
        addresses.sourceChainId, // Chain1 chainId
        5, // fee
        addresses.targetChainId, // current chainId
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );
  } catch (error) {
    logger.error('Setup failed:', error);
    throw error;
  }
}

module.exports = {
  setupCrosschainTokens,
};
