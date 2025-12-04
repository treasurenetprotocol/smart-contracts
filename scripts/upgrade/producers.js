const { logger } = require('@treasurenet/logging-middleware');
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// Producer contract name mapping
const PRODUCER_CONTRACTS = {
  OilProducer: 'OilProducer',
  GasProducer: 'GasProducer',
  EthProducer: 'EthProducer',
  BtcProducer: 'BtcProducer',
};

module.exports = async function (deployer, network, accounts) {
  logger.info('Starting Producer upgrades...');
  logger.info(`Network: ${network}`);
  logger.info(`Deployer: ${accounts[0]}`);

  // Get governance contract
  const Governance = artifacts.require('Governance');
  const governanceAddress = process.env.GOVERNANCE_ADDRESS || '0xc69bd55C22664cF319698984211FeD155403C066';
  const governance = await Governance.at(governanceAddress);

  logger.info(`Governance address: ${governanceAddress}`);

  // Fetch Producer addresses for each treasure
  const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
  const producerAddresses = {};

  logger.info('Reading Producer addresses from Governance...');
  for (const kind of treasureKinds) {
    try {
      const treasureInfo = await governance.getTreasureByKind(kind);
      producerAddresses[kind] = treasureInfo[0];
      logger.info(`${kind} Producer: ${treasureInfo[0]}`);
    } catch (error) {
      logger.info(`⚠️  Could not fetch ${kind} Producer address: ${error.message}`);
    }
  }

  // Upgrade each Producer
  const results = [];

  for (const [contractName, artifactName] of Object.entries(PRODUCER_CONTRACTS)) {
    try {
      logger.info(`\n🔧 Upgrading ${contractName}...`);

      // Determine treasure kind
      const treasureKind = contractName.replace('Producer', '').toUpperCase();
      const proxyAddress = producerAddresses[treasureKind];

      if (!proxyAddress || proxyAddress === '0x0000000000000000000000000000000000000000') {
        logger.info(`❌ Skipping ${contractName}: proxy address not found`);
        results.push({
          contract: contractName,
          status: 'skipped',
          reason: 'No proxy address found',
        });
        continue;
      }

      logger.info(`   Proxy address: ${proxyAddress}`);

      // Load contract artifact
      const ContractArtifact = artifacts.require(artifactName);

      logger.info(`   Preparing to upgrade ${contractName}...`);

      // Execute upgrade
      const upgradedContract = await upgradeProxy(proxyAddress, ContractArtifact, {
        deployer,
        force: true, // force upgrade, skip admin check
      });

      logger.info(`   ✅ ${contractName} upgraded`);
      logger.info(`   New implementation: ${upgradedContract.address}`);

      results.push({
        contract: contractName,
        status: 'success',
        proxyAddress,
        newImplementation: upgradedContract.address,
      });

      // Wait for confirmations
      logger.info('   Waiting for confirmations...');
      await new Promise((resolve) => setTimeout(resolve, 10000)); // wait 10s
    } catch (error) {
      logger.info(`   ❌ ${contractName} upgrade failed: ${error.message}`);
      results.push({
        contract: contractName,
        status: 'failed',
        error: error.message,
      });
    }
  }

  // Summary
  logger.info('\n📊 Upgrade summary:');
  logger.info('================');

  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'failed');
  const skipped = results.filter((r) => r.status === 'skipped');

  logger.info(`✅ Upgraded: ${successful.length} contracts`);
  logger.info(`❌ Failed: ${failed.length} contracts`);
  logger.info(`⏭️  Skipped: ${skipped.length} contracts`);

  if (successful.length > 0) {
    logger.info('\nUpgraded contracts:');
    successful.forEach((result) => {
      logger.info(`- ${result.contract}: ${result.proxyAddress}`);
    });
  }

  if (failed.length > 0) {
    logger.info('\nFailed upgrades:');
    failed.forEach((result) => {
      logger.info(`- ${result.contract}: ${result.error}`);
    });
  }

  if (successful.length > 0) {
    logger.info('\n🎉 Producer upgrades complete!');
    logger.info('You can now run the following to fix _mulSig address:');
    logger.info('npm run fix:mulsig:treasurenet');

    // Output upgrade info
    logger.info('\n📝 Upgrade info:');
    successful.forEach((result) => {
      logger.info(`${result.contract.toUpperCase()}_PROXY_ADDRESS=${result.proxyAddress}`);
    });
  } else {
    logger.info('\n⚠️  No contracts upgraded; please check errors');
  }
};
