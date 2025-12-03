require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployAuctionFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundation, auctionManager, financeEOA, bidder1, bidder2] = signers;

  const MockRoles = await ethers.getContractFactory('MockRoles');
  const roles = await MockRoles.deploy();
  const foundationRole = ethers.keccak256(ethers.toUtf8Bytes('FOUNDATION_MANAGER'));
  const auctionRole = ethers.keccak256(ethers.toUtf8Bytes('AUCTION_MANAGER'));
  await roles.setRole(foundationRole, foundation.address, true);
  await roles.setRole(auctionRole, auctionManager.address, true);

  const MockUSTN = await ethers.getContractFactory('MockUSTN');
  const ustn = await MockUSTN.deploy();
  await ustn.setAuctionManager(auctionManager.address);
  await ustn.setBalance(bidder1.address, 1_000);
  await ustn.setBalance(bidder2.address, 1_000);

  const MockUSTNFinance = await ethers.getContractFactory('MockUSTNFinance');
  const financeContract = await MockUSTNFinance.deploy();

  const USTNAuction = await ethers.getContractFactory('USTNAuction');
  const auction = await upgrades.deployProxy(
    USTNAuction,
    [await roles.getAddress(), await ustn.getAddress(), await financeContract.getAddress()],
    { initializer: 'initialize' }
  );

  return {
    auction,
    roles,
    ustn,
    financeContract,
    accounts: { mulSig, foundation, auctionManager, finance: financeEOA, financeContract, bidder1, bidder2 }
  };
}

describe('USTNAuction', function () {
  it('starts auctions by finance and tracks metadata', async function () {
    const { auction, financeContract } = await loadFixture(deployAuctionFixture);
    const receipt = await (await financeContract.startAuction(await auction.getAddress(), 100, 50, 5)).wait();
    const parsed = receipt.logs
      .map((log) => {
        try {
          return auction.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find(Boolean);

    expect(parsed.args._auction).to.equal(100);
    expect(parsed.args._startValue).to.equal(50);
    expect(parsed.args._status).to.equal(1);
    expect((await auction.queryAuctions())[0].state).to.equal(1);
  });

  it('handles bidding, withdrawal, and settlement', async function () {
    const { auction, ustn, financeContract, roles, accounts } = await loadFixture(deployAuctionFixture);
    await financeContract.startAuction(await auction.getAddress(), 100, 50, 5);

    await auction.connect(accounts.bidder1).bid(0, 60);
    await auction.connect(accounts.bidder2).bid(0, 90);

    await auction.connect(accounts.bidder1).bidWithdrawal(0);
    expect(await ustn.balanceOf(accounts.bidder1.address)).to.equal(1_000n);

    await expect(auction.connect(accounts.bidder2).bidWithdrawal(0)).to.be.revertedWith(
      'USTNAuction: you are owner of bid'
    );

    await time.increase(11 * 60);
    await auction.connect(accounts.bidder2).getAuction(0);
    const call = await financeContract.lastCall();
    expect(call.bidder).to.equal(accounts.bidder2.address);
    expect(call.tokens).to.equal(100);

    const auctionRole = ethers.keccak256(ethers.toUtf8Bytes('AUCTION_MANAGER'));
    expect(await roles.getRoleMember(auctionRole, 0)).to.equal(accounts.auctionManager.address);
  });

  it('allows foundation manager to revive expired auctions with no bids', async function () {
    const { auction, financeContract, accounts } = await loadFixture(deployAuctionFixture);
    await financeContract.startAuction(await auction.getAddress(), 10, 5, 1);
    const before = (await auction.queryAuctions())[0].timeOver;

    await time.increase(11 * 60);
    await auction.connect(accounts.foundation).upgradeState();
    const after = (await auction.queryAuctions())[0].timeOver;
    expect(after).to.be.gt(before);
  });
});
