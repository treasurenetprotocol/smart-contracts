const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { deployTreasureFixture } = require('./helpers/deploy-treasures');

const WELL = {
  NICKNAME: 'Well2',
  UNIQUE_ID: '0x4872484e4579694e575a65745956524879303873690000000000000000000001',
  REQUEST_ID: ''
};

const ASSETS = { KIND: 'GAS', REQUEST_ID: '' };

const PRODUCTION_DATA = [
  { DATE: '240101', VOLUME: 1000n, PRICE: 100n },
  { DATE: '240102', VOLUME: 2000n, PRICE: 200n }
];

const TRUSTED_PRODUCTION_DATA = { MONTH: '2401', VOLUME: 2500n };
const EXPENSE_AMOUNT = 10n * 10n ** 18n;

function findEventArgs(receipt, iface, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed && parsed.name === eventName) return parsed.args;
    } catch (err) {}
  }
  return null;
}

describe('Treasure-Gas (Hardhat)', function () {
  it('full flow', async function () {
    const fixture = await loadFixture(deployTreasureFixture);
    const [foundationManager, , producerOwner] = fixture.accounts;
    const { gasProducer, gasData, tat } = fixture;

    const producerTuple = [WELL.NICKNAME, producerOwner.address, 0, 0, ''];
    const addTx = await gasProducer
      .connect(foundationManager)
      .addProducer(WELL.UNIQUE_ID, producerTuple);
    const addReceipt = await addTx.wait();
    const addArgs = findEventArgs(addReceipt, gasProducer.interface, 'AddProducer');
    expect(addArgs.uniqueId).to.equal(WELL.UNIQUE_ID);

    const statusTx = await gasProducer
      .connect(foundationManager)
      .setProducerStatus(WELL.UNIQUE_ID, 1);
    const statusReceipt = await statusTx.wait();
    const statusArgs = findEventArgs(statusReceipt, gasProducer.interface, 'SetProducerStatus');
    WELL.REQUEST_ID = statusArgs.requestId;

    const producerInfo = await gasProducer.getProducer(WELL.UNIQUE_ID);
    expect(producerInfo[0]).to.equal(1);

    await gasData.connect(producerOwner).prepay({ value: EXPENSE_AMOUNT });

    const reqTx = await gasData.connect(foundationManager).registerAssetValueRequest();
    const reqReceipt = await reqTx.wait();
    const reqArgs = findEventArgs(reqReceipt, gasData.interface, 'RegisterAssetValueRequest');
    ASSETS.REQUEST_ID = reqArgs.requestid;

    for (const data of PRODUCTION_DATA) {
      const priceTx = await gasData
        .connect(foundationManager)
        .receiveAssetValue(ASSETS.REQUEST_ID, data.DATE, data.PRICE);
      const priceReceipt = await priceTx.wait();
      const priceArgs = findEventArgs(priceReceipt, gasData.interface, 'ReceiveAssetValue');
      expect(priceArgs.value).to.equal(data.PRICE);

      const storedPrice = await gasData.getAssetValue(data.DATE);
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
        0
      ];

      const prodTx = await gasData
        .connect(producerOwner)
        .setProductionData(WELL.UNIQUE_ID, productionPayload);
      const prodReceipt = await prodTx.wait();
      const prodArgs = findEventArgs(prodReceipt, gasData.interface, 'ProducerProductionData');
      expect(prodArgs.amount).to.equal(data.VOLUME);
    }

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
      0
    ];
    const trustedTx = await gasData
      .connect(foundationManager)
      .receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, trustedPayload);
    const trustedReceipt = await trustedTx.wait();
    const trustedArgs = findEventArgs(trustedReceipt, gasData.interface, 'TrustedProductionData');
    expect(trustedArgs.amount).to.equal(TRUSTED_PRODUCTION_DATA.VOLUME);

    const beforeBalance = await tat.balanceOf(producerOwner.address);

    let totalAmount = 0n;
    let totalVolume = 0n;
    const discount = 10000n;
    for (const data of PRODUCTION_DATA) {
      const single = (data.VOLUME * data.PRICE * discount * 10n ** 18n) / 10n ** 12n;
      totalAmount += single;
      totalVolume += data.VOLUME;
    }
    const deviation = (totalVolume - TRUSTED_PRODUCTION_DATA.VOLUME) * 100n * 100n / TRUSTED_PRODUCTION_DATA.VOLUME;
    const finalAmount = deviation >= 500n ? (totalAmount * (10000n - deviation)) / 10000n : totalAmount;

    await gasData.connect(foundationManager).clearing(TRUSTED_PRODUCTION_DATA.MONTH);
    const afterBalance = await tat.balanceOf(producerOwner.address);
    expect(afterBalance - beforeBalance).to.equal(finalAmount);
  });
});
