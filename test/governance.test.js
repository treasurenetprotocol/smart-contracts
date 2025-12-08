require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployGovernanceFixture() {
  const signers = await ethers.getSigners();
  const [dao, mulSig, fm1, fm2, fm3, producerA, dataA, producerB, dataB, stranger] = signers;

  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address,
      [fm1.address, fm2.address, fm3.address],
      [], // auction managers
      [], // feeders
      [], // crosschain senders
      [], // tcash managers
    ],
    { initializer: 'initialize' },
  );

  const Governance = await ethers.getContractFactory('Governance');
  const gov = await upgrades.deployProxy(
    Governance,
    [
      dao.address,
      mulSig.address,
      await roles.getAddress(),
      stranger.address, // parameterInfo not used in current tests
      ['OIL'],
      [producerA.address],
      [dataA.address],
    ],
    { initializer: 'initialize' },
  );

  return { gov, roles, accounts: { dao, mulSig, fm1, fm2, fm3, producerA, dataA, producerB, dataB, stranger } };
}

describe('Governance', () => {
  it('computes fmThreshold based on foundation managers', async () => {
    const { gov } = await loadFixture(deployGovernanceFixture);
    // 3 managers => 3/2 + 1 = 2
    expect(await gov.fmThreshold()).to.equal(2);
  });

  it('initializes treasures and allows retrieval by kind', async () => {
    const { gov, accounts } = await loadFixture(deployGovernanceFixture);
    const [producer, data] = await gov.getTreasureByKind('OIL');
    expect(producer).to.equal(accounts.producerA.address);
    expect(data).to.equal(accounts.dataA.address);
  });

  it('only mulSig can add new treasures and emits event', async () => {
    const { gov, accounts } = await loadFixture(deployGovernanceFixture);
    await expect(
      gov.connect(accounts.mulSig).addTreasure('GAS', accounts.producerB.address, accounts.dataB.address),
    )
      .to.emit(gov, 'AddTreasure')
      .withArgs('GAS', accounts.producerB.address, accounts.dataB.address);

    const [producer, data] = await gov.getTreasureByKind('GAS');
    expect(producer).to.equal(accounts.producerB.address);
    expect(data).to.equal(accounts.dataB.address);

    await expect(
      gov.connect(accounts.dao).addTreasure('ETH', accounts.producerB.address, accounts.dataB.address),
    ).to.be.reverted;
  });

  it('rejects duplicate treasure types and zero addresses', async () => {
    const { gov, accounts } = await loadFixture(deployGovernanceFixture);

    await expect(
      gov.connect(accounts.mulSig).addTreasure('OIL', accounts.producerB.address, accounts.dataB.address),
    ).to.be.revertedWith('treasure type already exists');

    await expect(
      gov.connect(accounts.mulSig).addTreasure('BTC', ethers.ZeroAddress, accounts.dataB.address),
    ).to.be.revertedWith('empty producer contract');

    await expect(
      gov.connect(accounts.mulSig).addTreasure('BTC', accounts.producerB.address, ethers.ZeroAddress),
    ).to.be.revertedWith('empty production data contract');
  });
});
