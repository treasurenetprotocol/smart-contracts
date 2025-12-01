require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { deployCoreFixture } = require('./helpers/deploy-core');

describe('ParameterInfo', function () {
  it('sets up default ratios and getters', async function () {
    const { parameterInfo } = await loadFixture(deployCoreFixture);

    expect(await parameterInfo.getPlatformConfig('marginRatio')).to.equal(100n);
    expect(await parameterInfo.getPlatformConfig('reserveRatio')).to.equal(1000n);
    expect(await parameterInfo.getPlatformConfig('loanInterestRate')).to.equal(5n);
    expect(await parameterInfo.getPlatformConfig('loanPledgeRate')).to.equal(15000n);
    expect(await parameterInfo.getTCashDailyInterestRate()).to.equal(5n);
    expect(await parameterInfo.getTCashMarginCallThreshold()).to.equal(750000n);
    expect(await parameterInfo.getTCashLiquidationThreshold()).to.equal(500000n);

    expect(await parameterInfo.getUSTNLoanPledgeRateWarningValue()).to.equal(14850n);
    expect(await parameterInfo.getUSTNLoanLiquidationRate()).to.equal(13500n);
  });

  it('enforces mulSig-only updates and validates ranges', async function () {
    const { accounts, parameterInfo } = await loadFixture(deployCoreFixture);

    await expect(
      parameterInfo.connect(accounts.other).setPlatformConfig('marginRatio', 200)
    ).to.be.reverted;

    await expect(
      parameterInfo.connect(accounts.mulSig).setPlatformConfig('loanInterestRate', 200)
    ).to.be.revertedWith('overflow');

    await parameterInfo.connect(accounts.mulSig).setPlatformConfig('loanInterestRate', 50);
    expect(await parameterInfo.getPlatformConfig('loanInterestRate')).to.equal(50n);

    await expect(
      parameterInfo.connect(accounts.mulSig).setPlatformConfig('loanPledgeRate', 10000)
    ).to.be.revertedWith('overflow');

    await expect(
      parameterInfo.connect(accounts.mulSig).setPlatformConfig('TCASHLT', 6000000)
    ).to.be.revertedWith('Invalid liquidation threshold');

    await parameterInfo.connect(accounts.mulSig).setPlatformConfig('TCASHLT', 600000);
    expect(await parameterInfo.getPlatformConfig('TCASHLT')).to.equal(600000n);
  });

  it('manages discount config with validation', async function () {
    const { accounts, parameterInfo } = await loadFixture(deployCoreFixture);

    await expect(
      parameterInfo
        .connect(accounts.mulSig)
        .setPriceDiscountConfig(3000, 400, 8000, 9000, 7000, 6000)
    ).to.be.revertedWith('overflow');

    await parameterInfo
      .connect(accounts.mulSig)
      .setPriceDiscountConfig(3000, 400, 9000, 8500, 8000, 7500);

    expect(await parameterInfo.getPriceDiscountConfig(3200, 100)).to.equal(9000n);
    expect(await parameterInfo.getPriceDiscountConfig(3200, 600)).to.equal(8500n);
    expect(await parameterInfo.getPriceDiscountConfig(3000, 100)).to.equal(8000n);
    expect(await parameterInfo.getPriceDiscountConfig(3000, 800)).to.equal(7500n);

    await expect(
      parameterInfo.getPriceDiscountConfig(0, 0)
    ).to.be.revertedWith('this mine data is error or not exist this mine.');
  });
});
