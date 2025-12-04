require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture, time } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, network } = require('hardhat');
const { deployTreasureFixture } = require('./helpers/deploy-treasures');

describe('TAT', () => {
  const secondsInYear = 365 * 24 * 60 * 60;
  const calcYearMonth = (timestamp) => {
    const secondsInDay = 86400;
    const secondsInYearLocal = secondsInDay * 365;
    const yearsSince1970 = Math.floor(timestamp / secondsInYearLocal);
    const year = 1970 + yearsSince1970;
    const secondsRemainingInYear = timestamp % secondsInYearLocal;
    const daysRemainingInYear = Math.floor(secondsRemainingInYear / secondsInDay);
    let month = Math.floor((daysRemainingInYear * 12) / 365) + 1;
    if (month > 12) month = 12;
    return year * 100 + month;
  };

  it('records faucet mints and maintains a 3-entry history', async () => {
    const fixture = await loadFixture(deployTreasureFixture);
    const { tat } = fixture;
    const [, , , user] = fixture.accounts;

    await expect(
      tat.setTATRecord(ethers.ZeroAddress, 1),
    ).to.be.revertedWith('User address cannot be zero');
    await expect(
      tat.setTATRecord(user.address, 0),
    ).to.be.revertedWith('Mint amount must be greater than 0');

    const start = await time.latest();
    await time.setNextBlockTimestamp(start + 1);
    await tat.faucet(user.address, 100);

    await time.setNextBlockTimestamp(start + secondsInYear + 1);
    await tat.faucet(user.address, 200);

    await time.setNextBlockTimestamp(start + secondsInYear * 2 + 1);
    await tat.faucet(user.address, 300);

    await time.setNextBlockTimestamp(start + secondsInYear * 3 + 1);
    await tat.faucet(user.address, 400);

    const expectedMonths = [
      calcYearMonth(start + secondsInYear + 1),
      calcYearMonth(start + secondsInYear * 2 + 1),
      calcYearMonth(start + secondsInYear * 3 + 1),
    ];

    const [months, amounts] = await tat.getTATRecord(user.address);
    expect(months.length).to.equal(3);
    expect(amounts.map((a) => Number(a))).to.have.members([200, 300, 400]);
    expect(months.map((m) => Number(m))).to.have.members(expectedMonths);
  });

  it('stakes and withdraws with balance checks', async () => {
    const fixture = await loadFixture(deployTreasureFixture);
    const { tat } = fixture;
    const [, , , user] = fixture.accounts;

    const mintAmount = ethers.parseEther('100');
    const stakeAmount = ethers.parseEther('40');
    await tat.faucet(user.address, mintAmount);
    const beforeBalance = await tat.balanceOf(user.address);

    await tat.stake(user.address, stakeAmount);
    expect(await tat.stakeOf(user.address)).to.equal(stakeAmount);
    expect(await tat.balanceOf(user.address)).to.equal(beforeBalance - stakeAmount);

    const withdrawAmount = ethers.parseEther('10');
    await tat.withdraw(user.address, withdrawAmount);
    expect(await tat.stakeOf(user.address)).to.equal(stakeAmount - withdrawAmount);
    expect(await tat.balanceOf(user.address)).to.equal(
      beforeBalance - stakeAmount + withdrawAmount,
    );

    await expect(
      tat.withdraw(user.address, stakeAmount),
    ).to.be.revertedWith('Withdrawal amount exceeds staked amount');
  });

  it('only allows production data contracts to mint', async () => {
    const fixture = await loadFixture(deployTreasureFixture);
    const { tat, oilData } = fixture;
    const recipient = fixture.accounts[4];
    const uniqueId = ethers.encodeBytes32String('OIL-1');
    const amount = ethers.parseEther('1');

    await expect(
      tat.mint('OIL', uniqueId, recipient.address, amount),
    ).to.be.revertedWith('Unauthorized caller');

    const oilDataAddr = await oilData.getAddress();
    await network.provider.request({
      method: 'hardhat_setBalance',
      params: [oilDataAddr, '0x56BC75E2D63100000'], // 100 ETH
    });
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [oilDataAddr],
    });
    const oilDataSigner = await ethers.getSigner(oilDataAddr);

    await tat.connect(oilDataSigner).mint('OIL', uniqueId, recipient.address, amount);
    expect(await tat.balanceOf(recipient.address)).to.equal(amount);

    await network.provider.request({
      method: 'hardhat_stopImpersonatingAccount',
      params: [oilDataAddr],
    });
  });

  it('pauses and unpauses transfers by the owner', async () => {
    const fixture = await loadFixture(deployTreasureFixture);
    const { tat } = fixture;
    const [owner, , , user, other] = fixture.accounts;

    const amount = ethers.parseEther('5');
    await tat.faucet(user.address, amount);

    await tat.connect(owner).pause();
    await expect(
      tat.connect(user).transfer(other.address, amount / 2n),
    ).to.be.revertedWith('ERC20Pausable: token transfer while paused');

    await tat.connect(owner).unpause();
    await tat.connect(user).transfer(other.address, amount / 2n);
    expect(await tat.balanceOf(other.address)).to.equal(amount / 2n);
  });
});
