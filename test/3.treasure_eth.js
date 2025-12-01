const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers } = require('hardhat');
const { deployTreasureFixture } = require('./helpers/deploy-treasures');

const WELL = {
  NICKNAME: 'Treasure-Eth',
  UNIQUE_ID: '0x4872484e4579694e575a65745956524879303873690000000000000000000002',
  MINTING_ACCOUNT: '0xF13cd65b2A8E8Cd433249Ca08083ad683b0d29e3',
  REQUEST_ID: ''
};

const ASSETS = { KIND: 'ETH', REQUEST_ID: '' };

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

describe('Treasure-Eth (Hardhat)', function () {
  it('full flow', async function () {
    const fixture = await loadFixture(deployTreasureFixture);
    const [foundationManager, , producerOwner] = fixture.accounts;
    const { ethProducer, ethData, tat } = fixture;

    const producerTuple = [
      WELL.NICKNAME,
      producerOwner.address,
      0,
      0,
      WELL.MINTING_ACCOUNT
    ];
    const addTx = await ethProducer
      .connect(foundationManager)
      .addProducer(WELL.UNIQUE_ID, producerTuple);
    const addReceipt = await addTx.wait();
    const addArgs = findEventArgs(addReceipt, ethProducer.interface, 'AddProducer');
    expect(addArgs.uniqueId).to.equal(WELL.UNIQUE_ID);

    const statusTx = await ethProducer
      .connect(foundationManager)
      .setProducerStatus(WELL.UNIQUE_ID, 1);
    const statusReceipt = await statusTx.wait();
    const statusArgs = findEventArgs(statusReceipt, ethProducer.interface, 'SetProducerStatus');
    WELL.REQUEST_ID = statusArgs.requestId;

    const producerInfo = await ethProducer.getProducer(WELL.UNIQUE_ID);
    expect(producerInfo[0]).to.equal(1);

    const reqTx = await ethData.connect(foundationManager).registerAssetValueRequest();
    const reqReceipt = await reqTx.wait();
    const reqArgs = findEventArgs(reqReceipt, ethData.interface, 'RegisterAssetValueRequest');
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
    const trustedTx = await ethData
      .connect(foundationManager)
      .receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, trustedPayload);
    const trustedReceipt = await trustedTx.wait();
    const trustedArgs = findEventArgs(trustedReceipt, ethData.interface, 'TrustedProductionData');
    expect(trustedArgs.amount).to.equal(PRODUCTION_DATA.AMOUNT);

    const beforeBalance = await tat.balanceOf(producerOwner.address);
    const clearingTx = await ethData
      .connect(producerOwner)
      .clearing(WELL.UNIQUE_ID, PRODUCTION_DATA.BLOCKNUMBER);
    const clearingReceipt = await clearingTx.wait();
    const clearingArgs = findEventArgs(clearingReceipt, ethData.interface, 'ClearingReward');
    expect(clearingArgs.rewardAmount).to.equal(PRODUCTION_DATA.AMOUNT);

    const afterBalance = await tat.balanceOf(producerOwner.address);
    expect(afterBalance - beforeBalance).to.equal(PRODUCTION_DATA.AMOUNT);
  });
});
