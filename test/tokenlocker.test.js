require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployLockerFixture() {
  const signers = await ethers.getSigners();
  const [manager, manager2, user1, user2, other] = signers;

  const TokenLocker = await ethers.getContractFactory('TokenLocker');
  const locker = await upgrades.deployProxy(TokenLocker, [], { initializer: 'initialize' });

  // seed locker with 10 ETH so claims can be paid
  await locker.connect(manager).addLockedToken({ value: ethers.parseEther('10') });

  return { locker, accounts: { manager, manager2, user1, user2, other } };
}

function bytes(str) {
  return ethers.toUtf8Bytes(str);
}

describe('TokenLocker', () => {
  it('manages managers list and prevents duplicates', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);

    await expect(locker.connect(accounts.manager).setManagerAccount(accounts.manager2.address))
      .to.emit(locker, 'ManagerAdded')
      .withArgs(accounts.manager2.address);

    expect(await locker.checkManagerAccount(accounts.manager2.address)).to.equal(true);
    const managers = await locker.getManagerAccounts();
    expect(managers).to.include.members([accounts.manager.address, accounts.manager2.address]);

    await expect(
      locker.connect(accounts.manager).setManagerAccount(accounts.manager2.address),
    ).to.be.revertedWith('Address is already manager');

    await expect(locker.connect(accounts.manager).delManagerAccount(accounts.manager2.address))
      .to.emit(locker, 'ManagerRemoved')
      .withArgs(accounts.manager2.address);
    expect(await locker.checkManagerAccount(accounts.manager2.address)).to.equal(false);
  });

  it('validates plan creation and tracks available balances', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);
    const planId = bytes('PLAN1');

    await expect(
      locker.connect(accounts.manager).setPlan(planId, 'Name', 0, 1),
    ).to.be.revertedWith('Amount must be positive');
    await expect(
      locker.connect(accounts.manager).setPlan(planId, 'Name', 1, 2),
    ).to.be.revertedWith('Invalid claim method');

    // insufficient available
    await expect(
      locker.connect(accounts.manager).setPlan(bytes('PLAN2'), 'Name', ethers.parseEther('11'), 1),
    ).to.be.revertedWith('Not enough available amount');

    await locker
      .connect(accounts.manager)
      .setPlan(planId, 'Seed Plan', ethers.parseEther('3'), 1);

    const plan = await locker.getPlan(planId);
    expect(plan.planName).to.equal('Seed Plan');
    expect(plan.planAmount).to.equal(ethers.parseEther('3'));
    expect(plan.isActive).to.equal(true);
    expect(await locker.getTotalAvailableAmount()).to.equal(ethers.parseEther('7'));

    await expect(
      locker.connect(accounts.manager).setPlan(planId, 'Duplicate', ethers.parseEther('1'), 1),
    ).to.be.revertedWith('Plan already exists');
  });

  it('creates locked records and respects plan limits and claim method', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);
    const planId = bytes('PLAN1');
    const lockedId = bytes('LOCK1');

    await locker
      .connect(accounts.manager)
      .setPlan(planId, 'Plan', ethers.parseEther('2'), 1);

    await expect(
      locker
        .connect(accounts.manager)
        .setLockedRecord(lockedId, planId, accounts.user1.address, 0, 1, 0),
    ).to.be.revertedWith('Amount must be positive');

    await expect(
      locker
        .connect(accounts.manager)
        .setLockedRecord(lockedId, planId, accounts.user1.address, ethers.parseEther('1'), 0, 0),
    ).to.be.revertedWith('Claim method mismatch');

    await locker
      .connect(accounts.manager)
      .setLockedRecord(lockedId, planId, accounts.user1.address, ethers.parseEther('1'), 1, 0);

    const plan = await locker.getPlan(planId);
    expect(plan.allocatedAmount).to.equal(ethers.parseEther('1'));
    const userRecords = await locker.getUserLockedRecords(accounts.user1.address);
    expect(userRecords.length).to.equal(1);
    expect(userRecords[0].amount).to.equal(ethers.parseEther('1'));

    await expect(
      locker
        .connect(accounts.manager)
        .setLockedRecord(bytes('LOCK2'), planId, accounts.user1.address, ethers.parseEther('2'), 1, 0),
    ).to.be.revertedWith('Exceeds plan amount');
  });

  it('lets beneficiaries and managers claim unlocked tokens respecting claimMethod', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);
    const planIdUser = bytes('PLAN_USER');
    const planIdMgr = bytes('PLAN_MGR');

    // user-claimable plan (claimMethod 1)
    await locker
      .connect(accounts.manager)
      .setPlan(planIdUser, 'UserPlan', ethers.parseEther('3'), 1);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(bytes('L1'), planIdUser, accounts.user1.address, ethers.parseEther('2'), 1, 0);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(bytes('L2'), planIdUser, accounts.user1.address, ethers.parseEther('1'), 1, 0);

    await expect(locker.connect(accounts.other).claimToken(accounts.user1.address)).to.be.revertedWith(
      'Unauthorized',
    );

    await expect(() =>
      locker.connect(accounts.user1).claimToken(accounts.user1.address)).to.changeEtherBalances(
      [locker, accounts.user1],
      [ethers.parseEther('-3'), ethers.parseEther('3')],
    );

    // manager-claimable plan (claimMethod 0)
    await locker
      .connect(accounts.manager)
      .setPlan(planIdMgr, 'MgrPlan', ethers.parseEther('2'), 0);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(bytes('L3'), planIdMgr, accounts.user2.address, ethers.parseEther('2'), 0, 0);

    await expect(() =>
      locker.connect(accounts.manager).claimToken(accounts.user2.address)).to.changeEtherBalances(
      [locker, accounts.user2],
      [ethers.parseEther('-2'), ethers.parseEther('2')],
    );
  });

  it('deletes locked records and returns funds to availability', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);
    const planId = bytes('PLAN1');
    const lockedId = bytes('LOCK1');

    await locker
      .connect(accounts.manager)
      .setPlan(planId, 'Plan', ethers.parseEther('2'), 1);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(lockedId, planId, accounts.user1.address, ethers.parseEther('1'), 1, 0);

    const availableBefore = await locker.getTotalAvailableAmount();
    await locker
      .connect(accounts.manager)
      .deleteLockedRecord(lockedId, planId, accounts.user1.address);

    const plan = await locker.getPlan(planId);
    expect(plan.allocatedAmount).to.equal(0);
    expect(await locker.getTotalAvailableAmount()).to.equal(
      availableBefore + ethers.parseEther('1'),
    );
    const records = await locker.getUserLockedRecords(accounts.user1.address);
    expect(records.length).to.equal(0);
  });

  it('deactivates plan and reclaims remaining and active record amounts', async () => {
    const { locker, accounts } = await loadFixture(deployLockerFixture);
    const planId = bytes('PLAN1');

    await locker
      .connect(accounts.manager)
      .setPlan(planId, 'Plan', ethers.parseEther('4'), 1);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(bytes('LOCK1'), planId, accounts.user1.address, ethers.parseEther('1'), 1, 0);
    await locker
      .connect(accounts.manager)
      .setLockedRecord(bytes('LOCK2'), planId, accounts.user2.address, ethers.parseEther('1'), 1, 0);

    const availableBefore = await locker.getTotalAvailableAmount();
    await locker.connect(accounts.manager).delPlan(planId);

    const plan = await locker.getPlan(planId);
    expect(plan.isActive).to.equal(false);
    // remaining 2 ether + two active records (1 each) are released back
    expect(await locker.getTotalAvailableAmount()).to.equal(
      availableBefore + ethers.parseEther('4'),
    );
  });
});
