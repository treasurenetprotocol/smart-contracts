const { ethers, upgrades } = require('hardhat');

/**
 * Deploy a minimal set of upgradeable contracts needed by treasure tests.
 * This mirrors the original Truffle migrations but keeps the dependencies light
 * (DAO/MulSig addresses are mocked with the deployer address because the tests
 * don't exercise MulSig flows).
 */
async function deployTreasureFixture() {
  const signers = await ethers.getSigners();
  const [deployer, fm1, fm2, userA, userB, userC] = signers;

  const mulSigAddress = deployer.address;
  const daoAddress = deployer.address;

  // Roles
  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSigAddress,
      [deployer.address, fm1.address, fm2.address], // FOUNDATION_MANAGER
      [deployer.address], // AUCTION_MANAGER
      [deployer.address], // FEEDER
      [deployer.address], // CROSSCHAIN_SENDER
      [deployer.address] // TCASH managers
    ],
    { initializer: 'initialize' }
  );
  // quick sanity logs for debug in tests
  // console.log('roles', roles.address);

  // ParameterInfo
  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const parameterInfo = await upgrades.deployProxy(
    ParameterInfo,
    [mulSigAddress],
    { initializer: 'initialize' }
  );

  // Oracle
  const Oracle = await ethers.getContractFactory('Oracle');
  const oracle = await upgrades.deployProxy(
    Oracle,
    [await roles.getAddress()],
    { initializer: 'initialize' }
  );

  // Producers
  const OilProducerF = await ethers.getContractFactory('OilProducer');
  const GasProducerF = await ethers.getContractFactory('GasProducer');
  const EthProducerF = await ethers.getContractFactory('EthProducer');
  const BtcProducerF = await ethers.getContractFactory('BtcProducer');

  const oilProducer = await upgrades.deployProxy(OilProducerF, { initializer: false });
  const gasProducer = await upgrades.deployProxy(GasProducerF, { initializer: false });
  const ethProducer = await upgrades.deployProxy(EthProducerF, { initializer: false });
  const btcProducer = await upgrades.deployProxy(BtcProducerF, { initializer: false });

  // Production data
  const OilDataF = await ethers.getContractFactory('OilData');
  const GasDataF = await ethers.getContractFactory('GasData');
  const EthDataF = await ethers.getContractFactory('EthData');
  const BtcDataF = await ethers.getContractFactory('BtcData');

  const oilData = await upgrades.deployProxy(OilDataF, { initializer: false });
  const gasData = await upgrades.deployProxy(GasDataF, { initializer: false });
  const ethData = await upgrades.deployProxy(EthDataF, { initializer: false });
  const btcData = await upgrades.deployProxy(BtcDataF, { initializer: false });

  // Governance
  const Governance = await ethers.getContractFactory('Governance');
  const governance = await upgrades.deployProxy(
    Governance,
    [
      daoAddress,
      mulSigAddress,
      await roles.getAddress(),
      await parameterInfo.getAddress(),
      ['OIL', 'GAS', 'ETH', 'BTC'],
      [
        await oilProducer.getAddress(),
        await gasProducer.getAddress(),
        await ethProducer.getAddress(),
        await btcProducer.getAddress()
      ],
      [
        await oilData.getAddress(),
        await gasData.getAddress(),
        await ethData.getAddress(),
        await btcData.getAddress()
      ]
    ],
    { initializer: 'initialize' }
  );

  // TAT token
  const TAT = await ethers.getContractFactory('TAT');
  const tat = await upgrades.deployProxy(
    TAT,
    ['TAT Token', 'TAT', await governance.getAddress()],
    { initializer: 'initialize' }
  );

  // console.debug('deploy addresses', {
  //   roles: roles.address,
  //   parameterInfo: parameterInfo.address,
  //   oracle: oracle.address,
  //   governance: governance.address,
  //   tat: tat.address
  // });

  // Initialize producers
  const rolesAddr = await roles.getAddress();
  await oilProducer.initialize(mulSigAddress, rolesAddr, 'OIL', await oilData.getAddress(), [], []);
  await gasProducer.initialize(mulSigAddress, rolesAddr, 'GAS', await gasData.getAddress(), [], []);
  await ethProducer.initialize(mulSigAddress, rolesAddr, 'ETH', await ethData.getAddress(), [], []);
  await btcProducer.initialize(mulSigAddress, rolesAddr, 'BTC', await btcData.getAddress(), [], []);

  // Initialize production data
  const oracleAddr = await oracle.getAddress();
  const parameterInfoAddr = await parameterInfo.getAddress();
  const tatAddr = await tat.getAddress();

  await oilData.initialize('OIL', oracleAddr, rolesAddr, parameterInfoAddr, await oilProducer.getAddress(), tatAddr);
  await gasData.initialize('GAS', oracleAddr, rolesAddr, parameterInfoAddr, await gasProducer.getAddress(), tatAddr);
  await ethData.initialize('ETH', oracleAddr, rolesAddr, parameterInfoAddr, await ethProducer.getAddress(), tatAddr);
  await btcData.initialize('BTC', oracleAddr, rolesAddr, parameterInfoAddr, await btcProducer.getAddress(), tatAddr);

  return {
    accounts: [deployer, fm1, fm2, userA, userB, userC],
    roles,
    oracle,
    parameterInfo,
    tat,
    oilProducer,
    gasProducer,
    ethProducer,
    btcProducer,
    oilData,
    gasData,
    ethData,
    btcData
  };
}

module.exports = { deployTreasureFixture };
