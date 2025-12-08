require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { deployTreasureFixture } = require('./helpers/deploy-treasures');

const WELL = {
  NICKNAME: 'Well1',
  UNIQUE_ID: '0x4872484e4579694e575a65745956524879303873690000000000000000000000',
  REQUEST_ID: '',
  API: 3000n,
  SULPHUR: 480n,
};

const ASSETS = { KIND: 'OIL', REQUEST_ID: '' };

const PRODUCTION_DATA = [
  { DATE: '240101', VOLUME: 1000n, PRICE: 100n },
  { DATE: '240102', VOLUME: 2000n, PRICE: 200n },
];

const TRUSTED_PRODUCTION_DATA = { MONTH: '2401', VOLUME: 2500n };

const EXPENSE_AMOUNT = 10n * 10n ** 18n;

function findEventArgs(receipt, iface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) return parsed.args;
    } catch (err) {
      // ignore non-matching logs
    }
  }
  return null;
}

describe('Treasure-Oil (Hardhat)', () => {
  it('full flow', async () => {
    const fixture = await loadFixture(deployTreasureFixture);
    const [foundationManager, , producerOwner] = fixture.accounts;
    const { oilProducer, oilData, tat } = fixture;

    // Add producer (only FOUNDATION_MANAGER can call)
    const producerTuple = [
      WELL.NICKNAME,
      producerOwner.address,
      WELL.API,
      WELL.SULPHUR,
      '',
    ];
    const addTx = await oilProducer
      .connect(foundationManager)
      .addProducer(WELL.UNIQUE_ID, producerTuple);
    const addReceipt = await addTx.wait();
    const addArgs = findEventArgs(addReceipt, oilProducer.interface, 'AddProducer');
    expect(addArgs.uniqueId).to.equal(WELL.UNIQUE_ID);
    expect([
      addArgs.producer.nickname,
      addArgs.producer.owner,
      addArgs.producer.API,
      addArgs.producer.sulphur,
      addArgs.producer.account,
    ]).to.deep.equal([
      WELL.NICKNAME,
      producerOwner.address,
      WELL.API,
      WELL.SULPHUR,
      '',
    ]);

    // Set producer status -> register trusted data request
    const statusTx = await oilProducer
      .connect(foundationManager)
      .setProducerStatus(WELL.UNIQUE_ID, 1);
    const statusReceipt = await statusTx.wait();
    const statusArgs = findEventArgs(statusReceipt, oilProducer.interface, 'SetProducerStatus');
    expect(statusArgs.uniqueId).to.equal(WELL.UNIQUE_ID);
    expect(statusArgs.status).to.equal(1n);
    WELL.REQUEST_ID = statusArgs.requestId;

    // Verify producer data
    const producerInfo = await oilProducer.getProducer(WELL.UNIQUE_ID);
    expect(producerInfo[0]).to.equal(1n); // status Active
    expect([
      producerInfo[1].nickname,
      producerInfo[1].owner,
      producerInfo[1].API,
      producerInfo[1].sulphur,
      producerInfo[1].account,
    ]).to.deep.equal([
      WELL.NICKNAME,
      producerOwner.address,
      WELL.API,
      WELL.SULPHUR,
      '',
    ]);

    // Deposit expense
    await oilData.connect(producerOwner).prepay({ value: EXPENSE_AMOUNT });

    // Register asset value request
    const reqTx = await oilData.connect(foundationManager).registerAssetValueRequest();
    const reqReceipt = await reqTx.wait();
    const reqArgs = findEventArgs(reqReceipt, oilData.interface, 'RegisterAssetValueRequest');
    expect(reqArgs.kind).to.equal(ASSETS.KIND);
    ASSETS.REQUEST_ID = reqArgs.requestid;

    // Asset price submissions
    for (const data of PRODUCTION_DATA) {
      const priceTx = await oilData
        .connect(foundationManager)
        .receiveAssetValue(ASSETS.REQUEST_ID, data.DATE, data.PRICE);
      const priceReceipt = await priceTx.wait();
      const priceArgs = findEventArgs(priceReceipt, oilData.interface, 'ReceiveAssetValue');
      expect(priceArgs.treasureKind).to.equal(ASSETS.KIND);
      expect(priceArgs.date).to.equal(data.DATE);
      expect(priceArgs.value).to.equal(data.PRICE);

      const storedPrice = await oilData.getAssetValue.staticCall(data.DATE);
      expect(storedPrice).to.equal(data.PRICE);

      const productionPayload = [
        WELL.UNIQUE_ID,
        0,
        producerOwner.address,
        data.VOLUME,
        0,
        data.DATE,
        data.DATE.substring(0, 4),
        '',
        0,
        0,
        0,
      ];

      const prodTx = await oilData
        .connect(producerOwner)
        .setProductionData(WELL.UNIQUE_ID, productionPayload);
      const prodReceipt = await prodTx.wait();
      const prodArgs = findEventArgs(prodReceipt, oilData.interface, 'ProducerProductionData');
      expect(prodArgs.treasureKind).to.equal(ASSETS.KIND);
      expect(prodArgs.uniqueId).to.equal(WELL.UNIQUE_ID);
      expect(prodArgs.date).to.equal(data.DATE);
      expect(prodArgs.amount).to.equal(data.VOLUME);
    }

    // Trusted production data
    const trustedPayload = [
      WELL.UNIQUE_ID,
      0,
      producerOwner.address,
      TRUSTED_PRODUCTION_DATA.VOLUME,
      0,
      0,
      TRUSTED_PRODUCTION_DATA.MONTH,
      '',
      0,
      0,
      0,
    ];
    const trustedTx = await oilData
      .connect(foundationManager)
      .receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, trustedPayload);
    const trustedReceipt = await trustedTx.wait();
    const trustedArgs = findEventArgs(trustedReceipt, oilData.interface, 'TrustedProductionData');
    expect(trustedArgs.treasureKind).to.equal(ASSETS.KIND);
    expect(trustedArgs.uniqueId).to.equal(WELL.UNIQUE_ID);
    expect(trustedArgs.month).to.equal(TRUSTED_PRODUCTION_DATA.MONTH);
    expect(trustedArgs.amount).to.equal(TRUSTED_PRODUCTION_DATA.VOLUME);

    // Clearing (mint TAT)
    const beforeBalance = await tat.balanceOf(producerOwner.address);
    const clearingTx = await oilData
      .connect(producerOwner)
      .clearing(WELL.UNIQUE_ID, TRUSTED_PRODUCTION_DATA.MONTH);
    const clearingReceipt = await clearingTx.wait();
    const clearingArgs = findEventArgs(clearingReceipt, oilData.interface, 'ClearingReward');
    expect(clearingArgs.treasureKind).to.equal(ASSETS.KIND);
    expect(clearingArgs._uniqueId).to.equal(WELL.UNIQUE_ID);
    expect(clearingArgs.rewardAmount).to.be.gt(0n);

    const afterBalance = await tat.balanceOf(producerOwner.address);
    expect(afterBalance - beforeBalance).to.equal(clearingArgs.rewardAmount);
  });
});
