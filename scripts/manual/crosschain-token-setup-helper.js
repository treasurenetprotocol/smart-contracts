#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const { loadContractABI } = require('./common/config');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  logger.info('Contract addresses:', {
    mulSig: mulSig.options.address,
    roles: roles.options.address,
    crosschainTokens: crosschainTokens.options.address,
  });

  const hasRole = await roles.methods
    .hasRole(FOUNDATION_MANAGER, sender)
    .call();
  if (!hasRole) {
    throw new Error(`Account ${sender} does not have FOUNDATION_MANAGER role`);
  }

  try {
    const gasPrice = await web3Instance.eth.getGasPrice();

    const tx = await mulSig.methods
      .proposeToSetCrosschainToken(
        params[0],
        params[1],
        params[2],
        params[3],
        params[4],
        params[5],
        params[6],
        params[7],
        params[8],
      )
      .send({
        from: sender,
        gas: 500000,
        gasPrice,
      });
    logger.info('Proposal created successfully:', tx.transactionHash);
  } catch (error) {
    logger.error('Error details:', error);
    if (error.message.includes('revert')) {
      logger.error('Revert reason:', error.message);
    }
    throw error;
  }

  await sleep(10 * 1000);

  const pendingProposals = await mulSig.methods
    .getPendingProposals()
    .call({ from: sender });
  if (pendingProposals.length > 0) {
    const proposalId = pendingProposals[pendingProposals.length - 1];
    logger.info('Got proposal ID:', proposalId.toString());

    const managers = await roles.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();

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

    await sleep(8 * 1000);

    try {
      logger.info('Executing proposal:', proposalId.toString());
      const gasPrice = await web3Instance.eth.getGasPrice();

      const result = await mulSig.methods.executeProposal(proposalId).send({
        from: sender,
        gas: 500000,
        gasPrice,
      });
      logger.info('Proposal executed successfully:', result.transactionHash);

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

async function crosschainTokenSetupHelper(addresses) {
  try {
    const web3 = new Web3(addresses.rpcUrl);
    const account = web3.eth.accounts.privateKeyToAccount(addresses.signerKey);
    web3.eth.accounts.wallet.add(account);

    const chainId = addresses.sourceChainId || await web3.eth.getChainId();

    const mulSigInstance = new web3.eth.Contract(loadContractABI('MulSig'), addresses.mulSig);
    const rolesInstance = new web3.eth.Contract(loadContractABI('Roles'), addresses.roles);
    const crosschainTokensInstance = new web3.eth.Contract(
      loadContractABI('CrosschainTokens'),
      addresses.crosschainTokens,
    );

    const FOUNDATION_MANAGER = (await rolesInstance.methods.FOUNDATION_MANAGER().call()) ||
      web3.utils.keccak256('FOUNDATION_MANAGER');
    const fManagers = await rolesInstance.methods
      .getRoleMemberArray(FOUNDATION_MANAGER)
      .call();
    if (!fManagers.length) throw new Error('No FOUNDATION_MANAGER members found');

    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'UNIT' : 'WUNIT',
        addresses.sourceChain.unit,
        addresses.sourceChain.bridge,
        addresses.sourceChainId || chainId,
        addresses.targetChain.unit,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        5,
        addresses.sourceChainId || chainId,
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );

    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'WUNIT' : 'UNIT',
        addresses.targetChain.unit,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        addresses.sourceChain.unit,
        addresses.sourceChain.bridge,
        addresses.sourceChainId || chainId,
        5,
        addresses.targetChainId,
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );

    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'TCASH' : 'WTCASH',
        addresses.sourceChain.tcash,
        addresses.sourceChain.bridge,
        addresses.sourceChainId || chainId,
        addresses.targetChain.tcash,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        5,
        addresses.sourceChainId || chainId,
      ],
      FOUNDATION_MANAGER,
      fManagers[0],
      web3,
    );

    await proposeCrosschainToken(
      mulSigInstance,
      rolesInstance,
      crosschainTokensInstance,
      [
        addresses.sourceNetworkName === 'treasurenet' ? 'WTCASH' : 'TCASH',
        addresses.targetChain.tcash,
        addresses.targetChain.bridge,
        addresses.targetChainId,
        addresses.sourceChain.tcash,
        addresses.sourceChain.bridge,
        addresses.sourceChainId || chainId,
        5,
        addresses.targetChainId,
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
  setupCrosschainTokens: crosschainTokenSetupHelper,
};
