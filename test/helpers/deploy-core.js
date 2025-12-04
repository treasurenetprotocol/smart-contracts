const { ethers, upgrades } = require('hardhat');

/**
 * Deploy a lightweight set of core contracts (Roles, ParameterInfo, Oracle)
 * for unit tests that don't need the full Treasure fixture.
 */
async function deployCoreFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundationManager, feeder, other] = signers;

  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address, // mulSig admin
      [foundationManager.address], // FOUNDATION_MANAGER
      [], // AUCTION_MANAGER
      [feeder.address], // FEEDER
      [], // CROSSCHAIN_SENDER
      [] // TCASH managers
    ],
    { initializer: 'initialize' }
  );

  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const parameterInfo = await upgrades.deployProxy(
    ParameterInfo,
    [mulSig.address],
    { initializer: 'initialize' }
  );

  const Oracle = await ethers.getContractFactory('Oracle');
  const oracle = await upgrades.deployProxy(
    Oracle,
    [await roles.getAddress()],
    { initializer: 'initialize' }
  );

  return {
    accounts: { mulSig, foundationManager, feeder, other },
    roles,
    parameterInfo,
    oracle
  };
}

module.exports = { deployCoreFixture };
