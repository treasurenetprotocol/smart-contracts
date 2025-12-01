const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// Producer contract name mapping
const PRODUCER_CONTRACTS = {
  'OilProducer': 'OilProducer',
  'GasProducer': 'GasProducer', 
  'EthProducer': 'EthProducer',
  'BtcProducer': 'BtcProducer'
};

module.exports = async function (deployer, network, accounts) {
  console.log('Starting Producer upgrades...');
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${accounts[0]}`);

  // Get governance contract
  const Governance = artifacts.require('Governance');
  const governanceAddress = process.env.GOVERNANCE_ADDRESS || '0xc69bd55C22664cF319698984211FeD155403C066';
  const governance = await Governance.at(governanceAddress);
  
  console.log(`Governance address: ${governanceAddress}`);

  // Fetch Producer addresses for each treasure
  const treasureKinds = ['OIL', 'GAS', 'ETH', 'BTC'];
  const producerAddresses = {};
  
  console.log('Reading Producer addresses from Governance...');
  for (const kind of treasureKinds) {
    try {
      const treasureInfo = await governance.getTreasureByKind(kind);
      producerAddresses[kind] = treasureInfo[0];
      console.log(`${kind} Producer: ${treasureInfo[0]}`);
    } catch (error) {
      console.log(`⚠️  Could not fetch ${kind} Producer address: ${error.message}`);
    }
  }

  // Upgrade each Producer
  const results = [];
  
  for (const [contractName, artifactName] of Object.entries(PRODUCER_CONTRACTS)) {
    try {
      console.log(`\n🔧 Upgrading ${contractName}...`);
      
      // Determine treasure kind
      const treasureKind = contractName.replace('Producer', '').toUpperCase();
      const proxyAddress = producerAddresses[treasureKind];
      
      if (!proxyAddress || proxyAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`❌ Skipping ${contractName}: proxy address not found`);
        results.push({
          contract: contractName,
          status: 'skipped',
          reason: 'No proxy address found'
        });
        continue;
      }

      console.log(`   Proxy address: ${proxyAddress}`);
      
      // Load contract artifact
      const ContractArtifact = artifacts.require(artifactName);
      
      console.log(`   Preparing to upgrade ${contractName}...`);
      
      // Execute upgrade
      const upgradedContract = await upgradeProxy(proxyAddress, ContractArtifact, { 
          deployer,
          force: true  // force upgrade, skip admin check
      });
      
      console.log(`   ✅ ${contractName} upgraded`);
      console.log(`   New implementation: ${upgradedContract.address}`);
      
      results.push({
        contract: contractName,
        status: 'success',
        proxyAddress: proxyAddress,
        newImplementation: upgradedContract.address
      });
      
      // Wait for confirmations
      console.log(`   Waiting for confirmations...`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10s
      
    } catch (error) {
      console.log(`   ❌ ${contractName} upgrade failed: ${error.message}`);
      results.push({
        contract: contractName,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 Upgrade summary:');
  console.log('================');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log(`✅ Upgraded: ${successful.length} contracts`);
  console.log(`❌ Failed: ${failed.length} contracts`);
  console.log(`⏭️  Skipped: ${skipped.length} contracts`);
  
  if (successful.length > 0) {
    console.log('\nUpgraded contracts:');
    successful.forEach(result => {
      console.log(`- ${result.contract}: ${result.proxyAddress}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\nFailed upgrades:');
    failed.forEach(result => {
      console.log(`- ${result.contract}: ${result.error}`);
    });
  }

  if (successful.length > 0) {
    console.log('\n🎉 Producer upgrades complete!');
    console.log('You can now run the following to fix _mulSig address:');
    console.log('npm run fix:mulsig:treasurenet');
    
    // Output upgrade info
    console.log('\n📝 Upgrade info:');
    successful.forEach(result => {
      console.log(`${result.contract.toUpperCase()}_PROXY_ADDRESS=${result.proxyAddress}`);
    });
  } else {
    console.log('\n⚠️  No contracts upgraded; please check errors');
  }
};
