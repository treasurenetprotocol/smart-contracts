require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployAuctionFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundation, auctionManager, tcashManager, bidder1, bidder2, other] = signers;

  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address,
      [foundation.address],
      [auctionManager.address],
      [], // feeders
      [], // crosschain senders
      [tcashManager.address] // tcash minter/burner
    ],
    { initializer: 'initialize' }
  );

  const MockOracle = await ethers.getContractFactory('MockOracle');
  const oracle = await MockOracle.deploy();

  const TCash = await ethers.getContractFactory('TCash');
  const tcash = await upgrades.deployProxy(TCash, [tcashManager.address], {
    initializer: 'initialize'
  });
  await tcash.setRoles(await roles.getAddress());
  await tcash.setOracle(await oracle.getAddress());
  await oracle.setStatus(true);

  const MockLoan = await ethers.getContractFactory('MockTCashLoan');
  const loan = await MockLoan.deploy();

  const TCashAuction = await ethers.getContractFactory('TCashAuction');
  const auction = await upgrades.deployProxy(
    TCashAuction,
    [await roles.getAddress(), await tcash.getAddress(), await loan.getAddress()],
    { initializer: 'initialize' }
  );
  await tcash.setAuctionContract(await auction.getAddress());

  // Allow auction to burn TCash and seed balances
  const burnerRole = await roles.TCASH_BURNER();
  await roles.connect(mulSig).grantRole(burnerRole, await auction.getAddress());

  await tcash.connect(tcashManager).mint(bidder1.address, ethers.parseEther('200'));
  await tcash.connect(tcashManager).mint(bidder2.address, ethers.parseEther('200'));
  await tcash.connect(tcashManager).mint(auctionManager.address, ethers.parseEther('100'));

  return {
    auction,
    tcash,
    roles,
    loan,
    accounts: { mulSig, foundation, auctionManager, tcashManager, bidder1, bidder2, other }
  };
}

describe('TCashAuction', function () {
  it('enforces duration updates to foundation manager and emits event', async function () {
    const { auction, accounts } = await loadFixture(deployAuctionFixture);

    await expect(auction.connect(accounts.other).updateBidDuration(100)).to.be.revertedWith(
      'only FoundationManager allowed'
    );

    const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
    await expect(auction.connect(accounts.foundation).updateBidDuration(1234))
      .to.emit(auction, 'bidDurationUpdated')
      .withArgs(600, 1234, anyValue); // default is 10 minutes = 600 seconds

    expect(await auction.queryBidDuration()).to.equal(1234);
  });

  it('runs a full auction lifecycle with bids, withdraws and settlement', async function () {
    const { auction, tcash, loan, roles, accounts } = await loadFixture(deployAuctionFixture);
    const minterRole = await roles.TCASH_MINTER();
    expect(await roles.hasRole(minterRole, accounts.tcashManager.address)).to.equal(true);

    // start auction via loan contract
    await loan.startAuction(await auction.getAddress(), 100, 50, 5);
    const auctions = await auction.queryAuctions();
    expect(auctions.length).to.equal(1);
    expect(auctions[0].nowValue).to.equal(50);

    // bidder1 bids 70, bidder2 outbids with 90
    await tcash.connect(accounts.bidder1).approve(await auction.getAddress(), ethers.parseEther('1000'));
    await tcash.connect(accounts.bidder2).approve(await auction.getAddress(), ethers.parseEther('1000'));

    await auction.connect(accounts.bidder1).bid(0, 70);
    await auction.connect(accounts.bidder2).bid(0, 90);

    await expect(auction.connect(accounts.bidder1).bidWithdrawal(0)).to.not.be.reverted;
    await expect(auction.connect(accounts.bidder2).bidWithdrawal(0)).to.be.revertedWith(
      'TCashAuction: you are owner of bid'
    );

    // fast forward and settle by highest bidder
    await time.increase(11 * 60);
    await auction.connect(accounts.bidder2).getAuction(0);

    const call = await loan.lastCall();
    expect(call.bidder).to.equal(accounts.bidder2.address);
    expect(call.tokens).to.equal(100);
    expect(call.interest).to.equal(5);
    expect(call.principal).to.equal(45); // startValue - debt = 50 - 5

    // auction manager burned startValue
    expect(await tcash.balanceOf(accounts.auctionManager.address)).to.equal(
      ethers.parseEther('100') - 50n
    );
  });

  it('restarts expired auctions without bids via upgradeState', async function () {
    const { auction, loan, accounts } = await loadFixture(deployAuctionFixture);
    await loan.startAuction(await auction.getAddress(), 10, 5, 1);
    const before = (await auction.queryAuctions())[0].timeOver;

    await time.increase(11 * 60);
    await auction.connect(accounts.foundation).upgradeState();

    const after = (await auction.queryAuctions())[0].timeOver;
    expect(after).to.be.gt(before);
  });
});
