require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { deployCoreFixture } = require('./helpers/deploy-core');

describe('Oracle', function () {
  it('restricts feeder and foundation manager roles', async function () {
    const { accounts, oracle } = await loadFixture(deployCoreFixture);
    const currencyKind = ethers.encodeBytes32String('UNIT');

    await expect(
      oracle.connect(accounts.other).setCurrencyValue(currencyKind, 100)
    ).to.be.revertedWith('Only Feeder can push data');

    await oracle.connect(accounts.feeder).setCurrencyValue(currencyKind, 123);
    expect(await oracle.getCurrencyValue(currencyKind)).to.equal(123n);

    await expect(
      oracle.connect(accounts.other).setTCashMintStatus(false)
    ).to.be.revertedWith('Only Feeder can push data');

    await oracle.connect(accounts.feeder).setTCashMintStatus(false);
    expect(await oracle.getTCashMintStatus()).to.equal(false);
  });

  it('handles oracle request lifecycle and parameter validation', async function () {
    const { accounts, oracle } = await loadFixture(deployCoreFixture);
    const callbackAddr = accounts.other.address;
    const callbackId = '0x12345678';
    const nonce = 7;

    const expectedId = await oracle
      .connect(accounts.other)
      .createOracleRequest
      .staticCall(callbackAddr, callbackId, nonce);
    await expect(
      oracle.connect(accounts.other).createOracleRequest(callbackAddr, callbackId, nonce)
    ).to.emit(oracle, 'OracleRequest').withArgs(
      accounts.other.address,
      expectedId,
      callbackAddr,
      callbackId
    );

    await expect(
      oracle.connect(accounts.other).createOracleRequest(callbackAddr, callbackId, nonce)
    ).to.be.revertedWith('must be a unique request id');

    await expect(
      oracle.connect(accounts.other).cancelOracleRequest(expectedId, callbackAddr, '0x00000000')
    ).to.be.revertedWith('Params do not match request ID');

    await expect(
      oracle.connect(accounts.other).cancelOracleRequest(expectedId, callbackAddr, callbackId)
    ).to.emit(oracle, 'CancelOracleRequest').withArgs(accounts.other.address, expectedId);
  });

  it('manages supported symbols and prices', async function () {
    const { accounts, oracle } = await loadFixture(deployCoreFixture);

    await expect(
      oracle.connect(accounts.other).updatePrice('UNIT', 1)
    ).to.be.revertedWith('Not authorized');

    await expect(
      oracle.connect(accounts.foundationManager).updatePrice('FOO', 1)
    ).to.be.revertedWith('Unsupported symbol');

    await expect(
      oracle.connect(accounts.foundationManager).updatePrice('UNIT', 0)
    ).to.be.revertedWith('Invalid price');

    await oracle.connect(accounts.foundationManager).updatePrice('UNIT', 1234);
    expect(await oracle.getPrice('UNIT')).to.equal(1234n);
    const [price, timestamp] = await oracle.getPriceData('UNIT');
    expect(price).to.equal(1234n);
    expect(timestamp).to.be.gt(0n);

    await oracle.connect(accounts.foundationManager).addSupportedSymbol('GOLD');
    expect(await oracle.isSupportedSymbol('GOLD')).to.equal(true);
    await expect(
      oracle.connect(accounts.foundationManager).addSupportedSymbol('GOLD')
    ).to.be.revertedWith('Symbol already supported');

    await oracle.connect(accounts.foundationManager).updatePrice('GOLD', 55);
    expect(await oracle.getPrice('GOLD')).to.equal(55n);

    await oracle.connect(accounts.foundationManager).removeSupportedSymbol('GOLD');
    expect(await oracle.isSupportedSymbol('GOLD')).to.equal(false);
    await expect(
      oracle.connect(accounts.foundationManager).updatePrice('GOLD', 10)
    ).to.be.revertedWith('Unsupported symbol');
  });

  it('locks and unlocks TCASH minting based on price movement', async function () {
    const { accounts, oracle } = await loadFixture(deployCoreFixture);

    expect(await oracle.getTCashMintStatus()).to.equal(true);
    expect(await oracle.getTCashMintLockPrice()).to.equal(0n);

    await oracle.connect(accounts.feeder).checkAndUpdateTCashMintStatus(
      600, // current price
      1000, // previous price
      3000, // lock threshold (30%)
      11000 // reset threshold (110%)
    );
    expect(await oracle.getTCashMintStatus()).to.equal(false);
    expect(await oracle.getTCashMintLockPrice()).to.equal(600n);

    await oracle.connect(accounts.feeder).checkAndUpdateTCashMintStatus(
      700,
      600,
      3000,
      11000
    );
    expect(await oracle.getTCashMintStatus()).to.equal(true);
    expect(await oracle.getTCashMintLockPrice()).to.equal(0n);
  });
});
