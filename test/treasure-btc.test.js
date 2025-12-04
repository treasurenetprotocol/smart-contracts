require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { deployTreasureFixture } = require('./helpers/deploy-treasures');

const WELL = {
  NICKNAME: 'Treasure-Btc',
  UNIQUE_ID: '0x4872484e4579694e575a65745956524879303873690000000000000000000003',
  MINTING_ACCOUNT: 'tb1qsgx55dp6gn53tsmyjjv4c2ye403hgxynxs0dnm',
  REQUEST_ID: ''
};

const ASSETS = { KIND: 'BTC', REQUEST_ID: '' };

const PRODUCTION_DATA = {
  AMOUNT: 1000n,
  PRICE: 10n,
  BLOCKNUMBER: 180,
  BLOCKREWARD: 100
};

function findEventArgs(receipt, iface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) return parsed.args;
    } catch (err) {}
  }
  return null;
}

describe('Treasure-Btc (Hardhat)', function () {
  it('full flow', async function () {
    const fixture = await loadFixture(deployTreasureFixture);
    const [foundationManager, , producerOwner] = fixture.accounts;
    const { btcProducer, btcData, tat } = fixture;

    const producerTuple = [
      WELL.NICKNAME,
      producerOwner.address,
      0,
      0,
      WELL.MINTING_ACCOUNT
    ];
    const addTx = await btcProducer
      .connect(foundationManager)
      .addProducer(WELL.UNIQUE_ID, producerTuple);
    const addReceipt = await addTx.wait();
    const addArgs = findEventArgs(addReceipt, btcProducer.interface, 'AddProducer');
    expect(addArgs.uniqueId).to.equal(WELL.UNIQUE_ID);

    const statusTx = await btcProducer
      .connect(foundationManager)
      .setProducerStatus(WELL.UNIQUE_ID, 1);
    const statusReceipt = await statusTx.wait();
    const statusArgs = findEventArgs(statusReceipt, btcProducer.interface, 'SetProducerStatus');
    WELL.REQUEST_ID = statusArgs.requestId;

    const producerInfo = await btcProducer.getProducer(WELL.UNIQUE_ID);
    expect(producerInfo[0]).to.equal(1n);

    const reqTx = await btcData.connect(foundationManager).registerAssetValueRequest();
    const reqReceipt = await reqTx.wait();
    const reqArgs = findEventArgs(reqReceipt, btcData.interface, 'RegisterAssetValueRequest');
    ASSETS.REQUEST_ID = reqArgs.requestid;

    const trustedPayload = [
      WELL.UNIQUE_ID,
      0,
      producerOwner.address,
      PRODUCTION_DATA.AMOUNT,
      PRODUCTION_DATA.PRICE,
      0,
      0,
      WELL.MINTING_ACCOUNT,
      PRODUCTION_DATA.BLOCKNUMBER,
      PRODUCTION_DATA.BLOCKREWARD,
      0
    ];
    const trustedTx = await btcData
      .connect(foundationManager)
      .receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, trustedPayload);
    const trustedReceipt = await trustedTx.wait();
    const trustedArgs = findEventArgs(trustedReceipt, btcData.interface, 'TrustedDigitalProductionData');
    expect(trustedArgs.amount).to.equal(PRODUCTION_DATA.AMOUNT);

    const beforeBalance = await tat.balanceOf(producerOwner.address);
    const clearingTx = await btcData
      .connect(producerOwner)
      .clearing(WELL.UNIQUE_ID, PRODUCTION_DATA.BLOCKNUMBER);
    const clearingReceipt = await clearingTx.wait();
    const clearingArgs = findEventArgs(clearingReceipt, btcData.interface, 'ClearingReward');
    expect(clearingArgs.rewardAmount).to.equal(PRODUCTION_DATA.AMOUNT);

    const afterBalance = await tat.balanceOf(producerOwner.address);
    expect(afterBalance - beforeBalance).to.equal(PRODUCTION_DATA.AMOUNT);
  });
});
