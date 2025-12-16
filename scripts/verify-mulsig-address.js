#!/usr/bin/env node
require('dotenv').config();
const { logger } = require('@treasurenet/logging-middleware');
const Web3 = require('web3');
const {
  getRpcUrl,
  getPrivateKey,
  getNetwork,
  requireContracts,
  loadContractABI,
} = require('./common/config');

/**
 * Verify _mulSig address in Producer contracts
 * Usage: node scripts/verify-mulsig-address.js
 */

async function verifyMulSigAddresses() {
  try {
    const network = getNetwork();
    const contracts = requireContracts(
      ['MULSIG', 'GOVERNANCE', 'OIL_PRODUCER', 'GAS_PRODUCER', 'ETH_PRODUCER', 'BTC_PRODUCER'],
      network,
    );

    const web3 = new Web3(getRpcUrl());

    const account = web3.eth.accounts.privateKeyToAccount(getPrivateKey());
    web3.eth.accounts.wallet.add(account);

    logger.info('Verify _mulSig Address in Producer Contracts');
    logger.info('============================================');
    logger.info(`Expected MulSig Address: ${contracts.MULSIG}`);
    logger.info(`Network: ${network}`);
    logger.info('');

    const governanceABI = loadContractABI('Governance');
    const producerABI = loadContractABI('Producer');

    const governance = new web3.eth.Contract(governanceABI, contracts.GOVERNANCE);

    logger.info('🔍 Checking All Producer Contracts');
    logger.info('----------------------------------');

    const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];

    for (const kind of treasureKinds) {
      try {
        const treasureInfo = await governance.methods.getTreasureByKind(kind).call();
        const producerAddress = treasureInfo[0];

        if (producerAddress && producerAddress !== '0x0000000000000000000000000000000000000000') {
          logger.info(`\n📋 ${kind} Producer: ${producerAddress}`);

          const producer = new web3.eth.Contract(producerABI, producerAddress);

          try {
            logger.info('   Checking storage slots for _mulSig...');

            for (let slot = 0; slot < 10; slot++) {
              const storageValue = await web3.eth.getStorageAt(producerAddress, slot);

              if (storageValue !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                const addressValue = `0x${storageValue.slice(-40)}`;
                logger.info(`   Slot ${slot}: ${storageValue}`);
                logger.info(`     Decoded as address: ${web3.utils.toChecksumAddress(addressValue)}`);

                if (web3.utils.toChecksumAddress(addressValue) === web3.utils.toChecksumAddress(contracts.MULSIG)) {
                  logger.info(`   ✅ Found MulSig address in slot ${slot}!`);
                }
              }
            }

            try {
              await producer.methods.registerDAppConnect('TestDApp', account.address).call({
                from: contracts.MULSIG,
              });
              logger.info('   ✅ registerDAppConnect call succeeded when called from MulSig address');
            } catch (error) {
              if (error.message.includes('empty dapp name') || error.message.includes('dapp already registered')) {
                logger.info('   ✅ registerDAppConnect works when called from MulSig (reached function logic)');
              } else {
                logger.info(`   ❌ registerDAppConnect failed: ${error.message}`);

                try {
                  await producer.methods.registerDAppConnect('TestDApp', account.address).call({
                    from: account.address,
                  });
                } catch (unauthorizedError) {
                  logger.info(`   Different error from non-MulSig caller: ${unauthorizedError.message}`);
                }
              }
            }
          } catch (error) {
            logger.info(`   ❌ Error checking storage: ${error.message}`);
          }
        } else {
          logger.info(`❌ ${kind}: No producer found`);
        }
      } catch (error) {
        logger.info(`❌ ${kind}: Error getting treasure info - ${error.message}`);
      }
    }

    logger.info('\n');
    logger.info('🔍 Testing Direct MulSig Call to Producer');
    logger.info('-----------------------------------------');

    try {
      const oilTreasure = await governance.methods.getTreasureByKind('OIL').call();
      const oilProducerAddress = oilTreasure[0];

      if (oilProducerAddress && oilProducerAddress !== '0x0000000000000000000000000000000000000000') {
        const oilProducer = new web3.eth.Contract(producerABI, oilProducerAddress);

        logger.info('Attempting to encode registerDAppConnect call...');

        const callData = oilProducer.methods.registerDAppConnect('OtterStreamTest', account.address).encodeABI();
        logger.info(`Call data: ${callData}`);

        try {
          const gasEstimate = await web3.eth.estimateGas({
            from: contracts.MULSIG,
            to: oilProducerAddress,
            data: callData,
          });
          logger.info(`✅ Gas estimate successful: ${gasEstimate}`);
          logger.info('   This suggests the call would work if made from MulSig');
        } catch (gasError) {
          logger.info(`❌ Gas estimation failed: ${gasError.message}`);
          logger.info('   This confirms that _mulSig might not be set correctly');
        }
      }
    } catch (error) {
      logger.info(`❌ Error testing direct call: ${error.message}`);
    }
  } catch (error) {
    logger.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyMulSigAddresses();
}

module.exports = verifyMulSigAddresses;
