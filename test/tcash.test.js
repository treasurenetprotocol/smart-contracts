require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployTCashFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, tcashManager, auctionContract, user, other] = signers;

  // Roles
  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address,
      [], // foundation managers
      [], // auction managers
      [], // feeders
      [], // crosschain senders
      [tcashManager.address], // tcash managers (minter & burner)
    ],
    { initializer: 'initialize' },
  );

  const TCash = await ethers.getContractFactory('TCash');
  const tcash = await upgrades.deployProxy(TCash, [user.address], {
    initializer: 'initialize',
  });
  await tcash.setRoles(await roles.getAddress());
  await tcash.setAuctionContract(auctionContract.address);

  const MockOracle = await ethers.getContractFactory('MockOracle');
  const oracle = await MockOracle.deploy();

  return { tcash, roles, oracle, accounts: { mulSig, tcashManager, auctionContract, user, other } };
}

describe('TCash', () => {
  it('initializes supply and metadata', async () => {
    const { tcash, accounts } = await loadFixture(deployTCashFixture);
    expect(await tcash.name()).to.equal('TCash');
    expect(await tcash.symbol()).to.equal('TCash');
    expect(await tcash.decimals()).to.equal(18);
    expect(await tcash.balanceOf(accounts.user.address)).to.equal(ethers.parseEther('1000000'));
  });

  it('mints and burns with role checks and oracle gate', async () => {
    const { tcash, roles, oracle, accounts } = await loadFixture(deployTCashFixture);
    await tcash.setOracle(await oracle.getAddress());

    const minterRole = await roles.TCASH_MINTER();
    await expect(tcash.connect(accounts.other).mint(accounts.other.address, 1)).to.be.revertedWith(
      'Not authorized to mint',
    );

    // Roles already set in fixture; grant minter to other
    await roles.connect(accounts.mulSig).grantRole(minterRole, accounts.other.address);

    await expect(tcash.connect(accounts.other).mint(accounts.other.address, 1)).to.be.revertedWith(
      'TCash minting is currently disabled',
    );

    await oracle.setStatus(true);
    await expect(tcash.connect(accounts.other).mint(accounts.other.address, 1))
      .to.emit(tcash, 'Transfer')
      .withArgs(ethers.ZeroAddress, accounts.other.address, 1n);

    const burnerRole = await roles.TCASH_BURNER();
    await roles.connect(accounts.mulSig).grantRole(burnerRole, accounts.other.address);
    await expect(
      tcash.connect(accounts.other).burnFrom(accounts.mulSig.address, 1),
    ).to.be.revertedWith('Insufficient balance');
    await expect(tcash.connect(accounts.other).burnFrom(accounts.other.address, 1))
      .to.emit(tcash, 'Transfer')
      .withArgs(accounts.other.address, ethers.ZeroAddress, 1n);
  });

  it('locks balances for bids and prevents transferring locked amounts', async () => {
    const { tcash, accounts } = await loadFixture(deployTCashFixture);
    const bidder = accounts.user;

    await tcash.connect(bidder).transfer(accounts.other.address, ethers.parseEther('10'));
    const bidderBalance = await tcash.balanceOf(accounts.other.address);
    await tcash.setAuctionContract(accounts.auctionContract.address);

    // Lock 5
    await tcash.connect(accounts.auctionContract).bidCost(accounts.other.address, ethers.parseEther('5'));
    expect(await tcash.getLockedBalance(accounts.other.address)).to.equal(ethers.parseEther('5'));
    await expect(
      tcash.connect(accounts.other).transfer(accounts.user.address, ethers.parseEther('7')),
    ).to.be.revertedWith('Transfer amount exceeds unlocked balance');

    // Unlock 3, transfer remaining unlocked
    await tcash.connect(accounts.auctionContract).bidBack(accounts.other.address, ethers.parseEther('3'));
    expect(await tcash.getLockedBalance(accounts.other.address)).to.equal(ethers.parseEther('2'));

    await tcash.connect(accounts.other).transfer(accounts.user.address, bidderBalance - ethers.parseEther('2'));
    expect(await tcash.getLockedBalance(accounts.other.address)).to.equal(ethers.parseEther('2'));
  });
});
