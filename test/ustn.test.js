require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployUSTNFixture() {
  const signers = await ethers.getSigners();
  const [deployer, auctionContract, finance, user, spender, auctionManager] = signers;

  const MockRoles = await ethers.getContractFactory('MockRoles');
  const roles = await MockRoles.deploy();
  const auctionRole = ethers.keccak256(ethers.toUtf8Bytes('AUCTION_MANAGER'));
  await roles.setRole(auctionRole, auctionManager.address, true);
  await roles.setRole(auctionRole, auctionContract.address, true);

  const MockOracle = await ethers.getContractFactory('MockOracle');
  const oracle = await MockOracle.deploy();
  await oracle.setCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('UNIT')), 200n);
  await oracle.setCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('USTN')), 100n);

  const USTN = await ethers.getContractFactory('USTN');
  const ustn = await upgrades.deployProxy(
    USTN,
    [await roles.getAddress(), await oracle.getAddress(), auctionContract.address, finance.address],
    { initializer: 'initialize' }
  );

  return { ustn, roles, oracle, accounts: { deployer, auctionManager, auctionContract, finance, user, spender } };
}

describe('USTN', function () {
  it('initializes and mints to caller, tracking supply and balances', async function () {
    const { ustn, accounts } = await loadFixture(deployUSTNFixture);
    await ustn.connect(accounts.user).mint(1000);
    expect(await ustn.totalSupply()).to.equal(1000);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(1000);

    await expect(ustn.connect(accounts.user).transfer(accounts.spender.address, 200))
      .to.emit(ustn, 'Transfer')
      .withArgs(accounts.user.address, accounts.spender.address, 200n);
  });

  it('computes mint rates from oracle prices', async function () {
    const { ustn } = await loadFixture(deployUSTNFixture);
    expect(await ustn.mintRate(100)).to.equal(200);
    expect(await ustn.mintBackRate(100)).to.equal(50);
  });

  it('supports allowance flow via approve and transferFrom', async function () {
    const { ustn, accounts } = await loadFixture(deployUSTNFixture);
    await ustn.connect(accounts.user).mint(500);
    await ustn.connect(accounts.user).approve(accounts.spender.address, 300);
    expect(await ustn.allowance(accounts.user.address, accounts.spender.address)).to.equal(300);
    await ustn.connect(accounts.spender).transferFrom(accounts.user.address, accounts.deployer.address, 200);
    expect(await ustn.balanceOf(accounts.deployer.address)).to.equal(200);
  });

  it('bidCost/bidBack move balances via auction manager path and validate balances', async function () {
    const { ustn, accounts } = await loadFixture(deployUSTNFixture);
    await ustn.connect(accounts.user).mint(1000);
    await expect(
      ustn.connect(accounts.auctionContract).bidCost(accounts.user.address, 1100)
    ).to.be.revertedWith('USTN: balances not enough');

    await ustn.connect(accounts.auctionContract).bidCost(accounts.user.address, 400);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(600);
    expect(await ustn.balanceOf(accounts.auctionManager.address)).to.equal(400);

    await ustn.connect(accounts.auctionContract).bidBack(accounts.user.address, 150);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(750);
    expect(await ustn.balanceOf(accounts.auctionManager.address)).to.equal(250);
  });

  it('reduceBalance validates input and reduces totals', async function () {
    const { ustn, accounts } = await loadFixture(deployUSTNFixture);
    await expect(ustn.reduceBalance(accounts.user.address, 0)).to.be.revertedWith(
      'Amount must be greater than zero'
    );
    await ustn.connect(accounts.user).mint(100);
    await expect(ustn.reduceBalance(accounts.user.address, 200)).to.be.revertedWith('Insufficient balance');
    await ustn.reduceBalance(accounts.user.address, 50);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(50);
  });
});
