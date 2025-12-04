require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployRolesFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundationManager, auctionManager, feeder, crossSender, tcashManager, other] =
    signers;

  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address,
      [foundationManager.address],
      [auctionManager.address],
      [feeder.address],
      [crossSender.address],
      [tcashManager.address],
    ],
    { initializer: 'initialize' },
  );

  return {
    roles,
    accounts: {
      mulSig,
      foundationManager,
      auctionManager,
      feeder,
      crossSender,
      tcashManager,
      other,
    },
  };
}

describe('Roles', () => {
  it('initializes roles and admins correctly', async () => {
    const { roles, accounts } = await loadFixture(deployRolesFixture);

    const adminRole = await roles.ADMIN();
    const foundationRole = await roles.FOUNDATION_MANAGER();
    const auctionRole = await roles.AUCTION_MANAGER();
    const feederRole = await roles.FEEDER();
    const crossRole = await roles.CROSSCHAIN_SENDER();
    const minterRole = await roles.TCASH_MINTER();
    const burnerRole = await roles.TCASH_BURNER();

    expect(await roles.hasRole(adminRole, accounts.mulSig.address)).to.equal(true);
    expect(await roles.hasRole(foundationRole, accounts.foundationManager.address)).to.equal(true);
    expect(await roles.hasRole(auctionRole, accounts.auctionManager.address)).to.equal(true);
    expect(await roles.hasRole(feederRole, accounts.feeder.address)).to.equal(true);
    expect(await roles.hasRole(crossRole, accounts.crossSender.address)).to.equal(true);
    expect(await roles.hasRole(minterRole, accounts.tcashManager.address)).to.equal(true);
    expect(await roles.hasRole(burnerRole, accounts.tcashManager.address)).to.equal(true);

    expect(await roles.getRoleAdmin(foundationRole)).to.equal(adminRole);
    expect(await roles.getRoleAdmin(auctionRole)).to.equal(foundationRole);
    expect(await roles.getRoleAdmin(crossRole)).to.equal(adminRole);
    expect(await roles.getRoleAdmin(minterRole)).to.equal(adminRole);
    expect(await roles.getRoleAdmin(burnerRole)).to.equal(adminRole);
  });

  it('enforces role admins when granting roles', async () => {
    const { roles, accounts } = await loadFixture(deployRolesFixture);
    const auctionRole = await roles.AUCTION_MANAGER();
    const foundationRole = await roles.FOUNDATION_MANAGER();

    const missingMsg = `AccessControl: account ${accounts.other.address.toLowerCase()} is missing role ${foundationRole}`;
    await expect(
      roles.connect(accounts.other).grantRole(auctionRole, accounts.other.address),
    ).to.be.revertedWith(missingMsg);

    await expect(
      roles.connect(accounts.foundationManager).grantRole(auctionRole, accounts.other.address),
    )
      .to.emit(roles, 'RoleGranted')
      .withArgs(auctionRole, accounts.other.address, accounts.foundationManager.address);

    expect(await roles.hasRole(auctionRole, accounts.other.address)).to.equal(true);
  });

  it('returns complete membership arrays after updates', async () => {
    const { roles, accounts } = await loadFixture(deployRolesFixture);
    const crossRole = await roles.CROSSCHAIN_SENDER();

    await roles.connect(accounts.mulSig).grantRole(crossRole, accounts.other.address);
    const members = await roles.getRoleMemberArray(crossRole);

    expect(members.map((a) => a.toLowerCase())).to.have.members(
      [accounts.crossSender.address, accounts.other.address].map((a) => a.toLowerCase()),
    );
  });
});
