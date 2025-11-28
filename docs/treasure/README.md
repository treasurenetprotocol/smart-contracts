# Treasure Contracts

Provides storage and processing procedures for manufacturer and production data for the casting process of four assets(Oil, Gas, BtcMinting, EthMining)

## Initializing the Contract

First, deploy the contract and then initialize it with the required parameters. For example:

```js
require('dotenv').config();

const DAO = artifacts.require("DAO");
const OilProducer = artifacts.require("OilProducer");
const OilData = artifacts.require("OilData");
const GasProducer = artifacts.require("GasProducer");
const GasData = artifacts.require("GasData");
const EthProducer = artifacts.require("EthProducer");
const EthData = artifacts.require("EthData");
const BtcProducer = artifacts.require("BtcProducer");
const BtcData = artifacts.require("BtcData");
const MulSig = artifacts.require("MulSig");
const Roles = artifacts.require("Roles");
const ParameterInfo = artifacts.require("ParameterInfo");
const Governance = artifacts.require("Governance");
const Oracle = artifacts.require("Oracle");
const TAT = artifacts.require("TAT");

const {deployProxy} = require('@openzeppelin/truffle-upgrades');

module.exports = async function (deployer, network, accounts) {
    try {
        if (process.env.ACTION === "upgrade") {
            /* TODO: update */
        }
        else {
            const dao = await deployProxy(DAO, ["DAO", 2, 10], {deployer});
            const oilProducer = await deployProxy(OilProducer, {initializer: false}, {deployer});
            const oilData = await deployProxy(OilData, {initializer: false}, {deployer});
            const gasProducer = await deployProxy(GasProducer, {initializer: false}, {deployer});
            const gasData = await deployProxy(GasData, {initializer: false}, {deployer});
            const ethProducer = await deployProxy(EthProducer, {initializer: false}, {deployer});
            const ethData = await deployProxy(EthData, {initializer: false}, {deployer});
            const btcProducer = await deployProxy(BtcProducer, {initializer: false}, {deployer});
            const btcData = await deployProxy(BtcData, {initializer: false}, {deployer});

            const mulSig = await deployProxy(MulSig, {initializer: false}, {deployer});
            const roles = await deployProxy(Roles, {initializer: false}, {deployer});
            const parameterInfo = await deployProxy(ParameterInfo, [mulSig.address], {deployer});
            const gov = await deployProxy(Governance, [
                dao.address,
                mulSig.address,
                roles.address,
                parameterInfo.address,
                ["OIL", "GAS", "ETH", "BTC"],
                [oilProducer.address, gasProducer.address, ethProducer.address, btcProducer.address],
                [oilData.address, gasData.address, ethData.address, btcData.address],
            ], {deployer});
            const oracle = await deployProxy(Oracle, [roles.address], {deployer});
            const mulSigInstance = await MulSig.deployed();
            await mulSigInstance.initialize(dao.address, gov.address, roles.address, parameterInfo.address, 2);
            const rolesInstance = await Roles.deployed();
            await rolesInstance.initialize(mulSig.address, [deployer.options.from], [deployer.options.from], [oracle.address, deployer.options.from])

            const tat = await deployProxy(TAT, ["TAT Token", "TAT", gov.address], {deployer});

            await oilProducer.initialize(mulSig.address, roles.address, "OIL", oilData.address, [], []);
            await oilData.initialize("OIL", oracle.address, roles.address, parameterInfo.address, oilProducer.address, tat.address);

            await gasProducer.initialize(mulSig.address, roles.address, "GAS", gasData.address, [], []);
            await gasData.initialize("GAS", oracle.address, roles.address, parameterInfo.address, gasProducer.address, tat.address);

            await ethProducer.initialize(mulSig.address, roles.address, "ETH", ethData.address, [], []);
            await ethData.initialize("ETH", oracle.address, roles.address, parameterInfo.address, ethProducer.address, tat.address);

            await btcProducer.initialize(mulSig.address, roles.address, "BTC", btcData.address, [], []);
            await btcData.initialize("BTC", oracle.address, roles.address, parameterInfo.address, btcProducer.address, tat.address);

        }

    } catch (e) {
        console.error(e)
    }
};
```

## Oil

The Oil module is used to manage the recording, validation, and reward allocation of oil production data. This contract inherits from the ProductionData contract and adds unique logic and functionality for oil production. Users can upload production data by calling the contract method and obtain trusted production data for verification through the oracle machine. In addition, the contract will also provide rewards or fines based on the accuracy of production data.

#### OilProducer

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/oil/producer)

#### OilData

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/oil/data)

### Tests

To run the tests for this project, taking OIL as an example, it is as follows

```js
const OilProducer = artifacts.require("OilProducer");
const OilData = artifacts.require("OilData");
const TAT = artifacts.require("TAT");

const WELL = {
    NICKNAME: "Well1",
    UNIQUE_ID: "0x4872484e4579694e575a65745956524879303873690000000000000000000000",
    REQUEST_ID: "",
    ACCOUNT: "",
    API: 3000n,
    SULPHUR: 480n
}
const ASSETS = {
    KIND: "OIL",
    REQUEST_ID: "",
}

const PRODUCTION_DATA = [
    {DATE: "240101", VOLUME: 1000n, PRICE: 100n},
    {DATE: "240102", VOLUME: 2000n, PRICE: 200n},
]

const TRUSTED_PRODUCTION_DATA = {
    MONTH: "2401", VOLUME: 2500n
}

const EXPENSE_AMOUNT = BigInt(10 * 1e18);

contract("Treasure-Oil", async (accounts) => {

    it("Add oil producers and modify status.", async () => {
        const oilProducer = await OilProducer.deployed();


        WELL.ACCOUNT = accounts[2];

        const _producer = [WELL.NICKNAME, WELL.ACCOUNT, WELL.API.toString(), WELL.SULPHUR.toString(), '']
        const _uniqueId = WELL.UNIQUE_ID;

        /* Send the transaction and call the Add Producer function of the contract */
        const stepAddProducer = await oilProducer.addProducer(_uniqueId, _producer, {from: WELL.ACCOUNT});

        for (let i = 0; i < stepAddProducer.logs.length; i++) {
            if (stepAddProducer.logs[i].event === "AddProducer") {
                const eventArgs = stepAddProducer.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.deepEqual([eventArgs.producer.nickname, eventArgs.producer.owner, eventArgs.producer.API, eventArgs.producer.sulphur, eventArgs.producer.account], _producer);
            }
        }

        const _newStatus = 1;
        /* Send the transaction and call the Set Producer Status function of the contract */
        const stepSetProducerStatus = await oilProducer.setProducerStatus(_uniqueId, _newStatus, {from: accounts[0]});

        for (let i = 0; i < stepSetProducerStatus.logs.length; i++) {
            if (stepSetProducerStatus.logs[i].event === "SetProducerStatus") {
                const eventArgs = stepSetProducerStatus.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.equal(eventArgs.status, _newStatus.toString());
                WELL.REQUEST_ID = eventArgs.requestId;
            }
        }

        /* Call the getProducer function of the contract */
        const resultProducer = await oilProducer.getProducer.call(_uniqueId);

        assert.equal(resultProducer[0].toNumber(), 1);
        assert.deepEqual([resultProducer[1].nickname, resultProducer[1].owner, resultProducer[1].API, resultProducer[1].sulphur, resultProducer[1].account], _producer);
    })

    it("deposit expense", async () => {
        const oilData = await OilData.deployed();

        await oilData.prepay({from: WELL.ACCOUNT, value: EXPENSE_AMOUNT.toString()});
    })

    it("register asset value request", async () => {
        const oilData = await OilData.deployed();

        const stepRegisterAssetValueRequest = await oilData.registerAssetValueRequest({from: accounts[0]});

        /* Event test */
        for (let i = 0; i < stepRegisterAssetValueRequest.logs.length; i++) {
            if (stepRegisterAssetValueRequest.logs[i].event === "RegisterAssetValueRequest") {
                const eventArgs = stepRegisterAssetValueRequest.logs[i].args;
                assert.equal(eventArgs.kind, ASSETS.KIND);
                ASSETS.REQUEST_ID = eventArgs.requestid;
            }
        }
    })

    for (let i = 0; i < PRODUCTION_DATA.length; i++) {
        it("send Asset Price(" + PRODUCTION_DATA[i].DATE + ")", async () => {
            const oilData = await OilData.deployed();

            /* Data */
            const _date = PRODUCTION_DATA[i].DATE;
            const _assetPrice = PRODUCTION_DATA[i].PRICE;

            const stepReceiveAssetValue = await oilData.receiveAssetValue(ASSETS.REQUEST_ID, _date, _assetPrice.toString(), {from: accounts[0]});

            /* Event test */
            for (let j = 0; j < stepReceiveAssetValue.logs.length; j++) {
                if (stepReceiveAssetValue.logs[j].event === "ReceiveAssetValue") {
                    const eventArgs = stepReceiveAssetValue.logs[j].args;
                    assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                    assert.equal(eventArgs.date, _date.toString());
                    assert.equal(eventArgs.value, _assetPrice.toString());
                }
            }

            /* query price */
            const resultPrice = await oilData.getAssetValue.call(_date);
            assert.equal(resultPrice.toNumber(), _assetPrice);
        })
        it("send production data(" + PRODUCTION_DATA[i].DATE + ")", async () => {
            const oilData = await OilData.deployed();

            /* Data */
            const _volume = PRODUCTION_DATA[i].VOLUME;
            const _date = PRODUCTION_DATA[i].DATE;
            const _month = PRODUCTION_DATA[i].DATE.substring(0, 4);
            const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, _volume.toString(), 0, _date, _month, '', 0, 0, 0];


            const stepSetProductionData = await oilData.setProductionData(WELL.UNIQUE_ID, _productionData, {from: WELL.ACCOUNT})

            /* Event test */
            for(let i = 0; i < stepSetProductionData.logs.length; i++){
                if(stepSetProductionData.logs[i].event === "ProducerProductionData"){
                    const eventArgs = stepSetProductionData.logs[i].args;
                    assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                    assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                    assert.equal(eventArgs.month, _month.toString());
                    assert.equal(eventArgs.date, _date.toString());
                    assert.equal(eventArgs.amount, _volume.toString());
                }
            }
        })
    }

    it("set trusted production data", async () => {
        const oilData = await OilData.deployed();

        const _volume = TRUSTED_PRODUCTION_DATA.VOLUME;
        const _month = TRUSTED_PRODUCTION_DATA.MONTH;
        const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, _volume.toString(), 0, 0, _month, '', 0, 0, 0];

        const stepReceiveTrustedProductionData = await oilData.receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, _productionData, {from: accounts[0]});

        /* Event test */
        for(let i = 0; i < stepReceiveTrustedProductionData.logs.length; i++){
            if(stepReceiveTrustedProductionData.logs[i].event === "TrustedProductionData"){
                const eventArgs = stepReceiveTrustedProductionData.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.month, _month.toString());
                assert.equal(eventArgs.amount, _volume.toString());
            }
        }
    })

    it("clearing", async () => {
        const oilData = await OilData.deployed();
        const tat = await TAT.deployed();

        /* Data */
        const _month = TRUSTED_PRODUCTION_DATA.MONTH;

        /* Query TAT Balance */
        let tatBalance_before = await tat.balanceOf(WELL.ACCOUNT);
        tatBalance_before = tatBalance_before.toNumber();

        /* Calculate Discount */
        let discount = 9000n
        if (WELL.API > 3110n && WELL.SULPHUR >= 500n) discount = 8500n;
        if (WELL.API <= 3110n && WELL.SULPHUR < 500n) discount = 8000n;
        if (WELL.API <= 3110n && WELL.SULPHUR >= 500n) discount = 7500n;

        /* Calculate total minting amount and total production */
        let _pAmount = 0n;
        let _pVolume = 0n;
        for (let i = 0; i < PRODUCTION_DATA.length; i++) {
            const singleAmount = PRODUCTION_DATA[i].VOLUME * PRODUCTION_DATA[i].PRICE * discount * BigInt(1e18) / BigInt(1e12);
            _pAmount = _pAmount + singleAmount;
            _pVolume = _pVolume + PRODUCTION_DATA[i].VOLUME;
        }

        let _trustedVolume = TRUSTED_PRODUCTION_DATA.VOLUME

        const _deviation = (_pVolume - _trustedVolume) * 100n * 100n / _trustedVolume;

        /* Corrected total production and minting amount */
        let _amount = _pAmount;
        let _volume = _pVolume;
        if (_pVolume > _trustedVolume) {
            _amount = _amount * _trustedVolume / _volume;
            _volume = _trustedVolume;
        }

        /* Calculate expense */
        let _expense = 0n;
        if (_deviation > 1000n && _deviation < 3000n) {
            _expense = _amount * _deviation * 100n / 100000000n
        }
        if (_deviation >= 3000n) {
            _expense = _amount * 10000n * 100n / 100000000n
        }


        /* compare production data */
        const resultProductionData = await oilData.getProductionData.call(WELL.UNIQUE_ID, _month);
        assert.equal(resultProductionData.uniqueId, WELL.UNIQUE_ID);
        assert.equal(resultProductionData.month, _month.toString());
        assert.equal(resultProductionData.price, _pAmount.toString());
        assert.equal(resultProductionData.amount, _pVolume.toString());

        /* Clearing */
        const stepClearing = await oilData.clearing(WELL.UNIQUE_ID, _month, {from: WELL.ACCOUNT});

        /* Event test */
        for (let i = 0; i < stepClearing.logs.length; i++) {
            if (stepClearing.logs[i].event === 'VerifiedProduction') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.month, _month.toString());
                assert.equal(eventArgs.amount, _volume.toString());
            }
            if (stepClearing.logs[i].event === 'ClearingReward') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs._month, _month.toString());
                assert.equal(eventArgs.rewardAmount, _amount.toString());
            }
        }

        /* Get Expense balance */
        const resultExpense = await oilData.marginOf.call(WELL.ACCOUNT);
        assert.equal(resultExpense[0].toString(), (EXPENSE_AMOUNT - _expense).toString());

        /* Query TAT Balance */
        let tatBalance_after = await tat.balanceOf(WELL.ACCOUNT);
        tatBalance_after = tatBalance_after.toNumber();

        assert.equal(tatBalance_after - tatBalance_before, _amount);

        /* Withdraw remaining expense funds */
        await oilData.withdraw((EXPENSE_AMOUNT - _expense).toString(), {from: WELL.ACCOUNT});

        /* Output Results */
        console.log(`WELL ${WELL.UNIQUE_ID}: \n- DEVIATION: ${_deviation.toString()} \n- VOLUME: ${_volume.toString()} \n- AMOUNT: ${_amount.toString()} \n- EXPENSE: ${_expense.toString()} \n`)
    })
})
```

use the following command:

```bash
npm run test
```

Make sure all tests pass before submitting a pull request.

## Gas

The Gas module is used to manage the recording, validation, and reward allocation of natural gas production data. This contract is based on Ethereum blockchain development and aims to provide a decentralized platform to ensure the accuracy and transparency of production data. By interacting with multiple other contracts, Gas contracts can receive trusted data from oracle machines and verify the data uploaded by producers, ensuring the authenticity and reliability of the data.

#### GasProducer

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/gas/producer)

#### GasData

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/gas/data)

### Tests

To run the tests for this project, taking OIL as an example, it is as follows

```js
const GasProducer = artifacts.require("GasProducer");
const GasData = artifacts.require("GasData");
const TAT = artifacts.require("TAT");

const WELL = {
    NICKNAME: "Well2",
    UNIQUE_ID: "0x4872484e4579694e575a65745956524879303873690000000000000000000001",
    REQUEST_ID: "",
    ACCOUNT: "",
    API: 0n,   //no used
    SULPHUR: 0n  //no used
}
const ASSETS = {
    KIND: "GAS",
    REQUEST_ID: "",
}

const PRODUCTION_DATA = [
    {DATE: "240101", VOLUME: 1000n, PRICE: 100n},
    {DATE: "240102", VOLUME: 2000n, PRICE: 200n},
]

const TRUSTED_PRODUCTION_DATA = {
    MONTH: "2401", VOLUME: 2500n
}

const EXPENSE_AMOUNT = BigInt(10 * 1e18);

contract("Treasure-Gas", async (accounts) => {

    it("Add gas producers and modify status.", async () => {
        const gasProducer = await GasProducer.deployed();


        WELL.ACCOUNT = accounts[2];

        const _producer = [WELL.NICKNAME, WELL.ACCOUNT, WELL.API.toString(), WELL.SULPHUR.toString(), '']
        const _uniqueId = WELL.UNIQUE_ID;

        /* Send the transaction and call the Add Producer function of the contract */
        const stepAddProducer = await gasProducer.addProducer(_uniqueId, _producer, {from: WELL.ACCOUNT});

        for (let i = 0; i < stepAddProducer.logs.length; i++) {
            if (stepAddProducer.logs[i].event === "AddProducer") {
                const eventArgs = stepAddProducer.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.deepEqual([eventArgs.producer.nickname, eventArgs.producer.owner, eventArgs.producer.API, eventArgs.producer.sulphur, eventArgs.producer.account], _producer);
            }
        }

        const _newStatus = 1;
        /* Send the transaction and call the Set Producer Status function of the contract */
        const stepSetProducerStatus = await gasProducer.setProducerStatus(_uniqueId, _newStatus, {from: accounts[0]});

        for (let i = 0; i < stepSetProducerStatus.logs.length; i++) {
            if (stepSetProducerStatus.logs[i].event === "SetProducerStatus") {
                const eventArgs = stepSetProducerStatus.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.equal(eventArgs.status, _newStatus.toString());
                WELL.REQUEST_ID = eventArgs.requestId;
            }
        }

        /* Call the getProducer function of the contract */
        const resultProducer = await gasProducer.getProducer.call(_uniqueId);

        assert.equal(resultProducer[0].toNumber(), 1);
        assert.deepEqual([resultProducer[1].nickname, resultProducer[1].owner, resultProducer[1].API, resultProducer[1].sulphur, resultProducer[1].account], _producer);
    })

    it("deposit expense", async () => {
        const gasData = await GasData.deployed();

        await gasData.prepay({from: WELL.ACCOUNT, value: EXPENSE_AMOUNT.toString()});
    })

    it("register asset value request", async () => {
        const gasData = await GasData.deployed();

        const stepRegisterAssetValueRequest = await gasData.registerAssetValueRequest({from: accounts[0]});

        /* Event test */
        for (let i = 0; i < stepRegisterAssetValueRequest.logs.length; i++) {
            if (stepRegisterAssetValueRequest.logs[i].event === "RegisterAssetValueRequest") {
                const eventArgs = stepRegisterAssetValueRequest.logs[i].args;
                assert.equal(eventArgs.kind, ASSETS.KIND);
                ASSETS.REQUEST_ID = eventArgs.requestid;
            }
        }
    })

    for (let i = 0; i < PRODUCTION_DATA.length; i++) {
        it("send Asset Price(" + PRODUCTION_DATA[i].DATE + ")", async () => {
            const gasData = await GasData.deployed();

            /* Data */
            const _date = PRODUCTION_DATA[i].DATE;
            const _assetPrice = PRODUCTION_DATA[i].PRICE;

            const stepReceiveAssetValue = await gasData.receiveAssetValue(ASSETS.REQUEST_ID, _date, _assetPrice.toString(), {from: accounts[0]});

            /* Event test */
            for (let j = 0; j < stepReceiveAssetValue.logs.length; j++) {
                if (stepReceiveAssetValue.logs[j].event === "ReceiveAssetValue") {
                    const eventArgs = stepReceiveAssetValue.logs[j].args;
                    assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                    assert.equal(eventArgs.date, _date.toString());
                    assert.equal(eventArgs.value, _assetPrice.toString());
                }
            }

            /* query price */
            const resultPrice = await gasData.getAssetValue.call(_date);
            assert.equal(resultPrice.toNumber(), _assetPrice);
        })
        it("send production data(" + PRODUCTION_DATA[i].DATE + ")", async () => {
            const gasData = await GasData.deployed();

            /* Data */
            const _volume = PRODUCTION_DATA[i].VOLUME;
            const _date = PRODUCTION_DATA[i].DATE;
            const _month = PRODUCTION_DATA[i].DATE.substring(0, 4);
            const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, _volume.toString(), 0, _date, _month, '', 0, 0, 0];


            const stepSetProductionData = await gasData.setProductionData(WELL.UNIQUE_ID, _productionData, {from: WELL.ACCOUNT})

            /* Event test */
            for(let i = 0; i < stepSetProductionData.logs.length; i++){
                if(stepSetProductionData.logs[i].event === "ProducerProductionData"){
                    const eventArgs = stepSetProductionData.logs[i].args;
                    assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                    assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                    assert.equal(eventArgs.month, _month.toString());
                    assert.equal(eventArgs.date, _date.toString());
                    assert.equal(eventArgs.amount, _volume.toString());
                }
            }
        })
    }

    it("set trusted production data", async () => {
        const gasData = await GasData.deployed();

        const _volume = TRUSTED_PRODUCTION_DATA.VOLUME;
        const _month = TRUSTED_PRODUCTION_DATA.MONTH;
        const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, _volume.toString(), 0, 0, _month, '', 0, 0, 0];

        const stepReceiveTrustedProductionData = await gasData.receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, _productionData, {from: accounts[0]});

        /* Event test */
        for(let i = 0; i < stepReceiveTrustedProductionData.logs.length; i++){
            if(stepReceiveTrustedProductionData.logs[i].event === "TrustedProductionData"){
                const eventArgs = stepReceiveTrustedProductionData.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.month, _month.toString());
                assert.equal(eventArgs.amount, _volume.toString());
            }
        }
    })

    it("clearing", async () => {
        const gasData = await GasData.deployed();
        const tat = await TAT.deployed();

        /* Data */
        const _month = TRUSTED_PRODUCTION_DATA.MONTH;

        /* Query TAT Balance */
        let tatBalance_before = await tat.balanceOf(WELL.ACCOUNT);
        tatBalance_before = tatBalance_before.toNumber();

        /* Calculate Discount */
        /*let discount = 9000n
        if (WELL.API > 3110n && WELL.SULPHUR >= 500n) discount = 8500n;
        if (WELL.API <= 3110n && WELL.SULPHUR < 500n) discount = 8000n;
        if (WELL.API <= 3110n && WELL.SULPHUR >= 500n) discount = 7500n;*/
        const discount = 10000n;  //No discounts on natural gas

        /* Calculate total minting amount and total production */
        let _pAmount = 0n;
        let _pVolume = 0n;
        for (let i = 0; i < PRODUCTION_DATA.length; i++) {
            const singleAmount = PRODUCTION_DATA[i].VOLUME * PRODUCTION_DATA[i].PRICE * discount * BigInt(1e18) / BigInt(1e12);
            _pAmount = _pAmount + singleAmount;
            _pVolume = _pVolume + PRODUCTION_DATA[i].VOLUME;
        }

        let _trustedVolume = TRUSTED_PRODUCTION_DATA.VOLUME

        const _deviation = (_pVolume - _trustedVolume) * 100n * 100n / _trustedVolume;

        /* Corrected total production and minting amount */
        let _amount = _pAmount;
        let _volume = _pVolume;
        if (_pVolume > _trustedVolume) {
            _amount = _amount * _trustedVolume / _volume;
            _volume = _trustedVolume;
        }

        /* Calculate expense */
        let _expense = 0n;
        if (_deviation > 1000n && _deviation < 3000n) {
            _expense = _amount * _deviation * 100n / 100000000n
        }
        if (_deviation >= 3000n) {
            _expense = _amount * 10000n * 100n / 100000000n
        }


        /* compare production data */
        const resultProductionData = await gasData.getProductionData.call(WELL.UNIQUE_ID, _month);
        assert.equal(resultProductionData.uniqueId, WELL.UNIQUE_ID);
        assert.equal(resultProductionData.month, _month.toString());
        assert.equal(resultProductionData.price, _pAmount.toString());
        assert.equal(resultProductionData.amount, _pVolume.toString());

        /* Clearing */
        const stepClearing = await gasData.clearing(WELL.UNIQUE_ID, _month, {from: WELL.ACCOUNT});

        /* Event test */
        for (let i = 0; i < stepClearing.logs.length; i++) {
            if (stepClearing.logs[i].event === 'VerifiedProduction') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.month, _month.toString());
                assert.equal(eventArgs.amount, _volume.toString());
            }
            if (stepClearing.logs[i].event === 'ClearingReward') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs._month, _month.toString());
                assert.equal(eventArgs.rewardAmount, _amount.toString());
            }
        }

        /* Get Expense balance */
        const resultExpense = await gasData.marginOf.call(WELL.ACCOUNT);
        assert.equal(resultExpense[0].toString(), (EXPENSE_AMOUNT - _expense).toString());

        /* Query TAT Balance */
        let tatBalance_after = await tat.balanceOf(WELL.ACCOUNT);
        tatBalance_after = tatBalance_after.toNumber();

        assert.equal(tatBalance_after - tatBalance_before, _amount);

        /* Withdraw remaining expense funds */
        await gasData.withdraw((EXPENSE_AMOUNT - _expense).toString(), {from: WELL.ACCOUNT});

        /* Output Results */
        console.log(`WELL ${WELL.UNIQUE_ID}: \n- DEVIATION: ${_deviation.toString()} \n- VOLUME: ${_volume.toString()} \n- AMOUNT: ${_amount.toString()} \n- EXPENSE: ${_expense.toString()} \n`)
    })
})
```

use the following command:

```bash
npm run test
```

Make sure all tests pass before submitting a pull request.

## Eth

The Eth module is used to manage the recording, validation, and reward allocation of Ethereum digital assets. This contract is based on Ethereum blockchain development and aims to provide a decentralized platform to ensure the accuracy and transparency of production data. By interacting with multiple other contracts, the Eth contract is able to receive trusted data from the oracle and verify the data uploaded by producers, ensuring the authenticity and reliability of the data.

#### EthProducer

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/eth/producer)

#### EthData

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/eth/data)

### Tests

To run the tests for this project, taking OIL as an example, it is as follows

```js
const EthProducer = artifacts.require("EthProducer");
const EthData = artifacts.require("EthData");
const TAT = artifacts.require("TAT");

const WELL = {
    NICKNAME: 'Treasure-Eth',
    UNIQUE_ID: "0x4872484e4579694e575a65745956524879303873690000000000000000000002",
    MINTING_ACCOUNT:"0xF13cd65b2A8E8Cd433249Ca08083ad683b0d29e3",
    REQUEST_ID: "",
    ACCOUNT: "",
}

const ASSETS = {
    KIND: "ETH",
    REQUEST_ID: "",
}

const PRODUCTION_DATA = {
    AMOUNT:1000n,
    PRICE:10n,
    BLOCKNUMBER:180,
    BLOCKREWARD:100
}
contract("Treasure-Eth", async (accounts) => {

    it("Add eth producers and modify status.", async () => {
        const ethProducer = await EthProducer.deployed();

        WELL.ACCOUNT = accounts[3];

        const _producer = [WELL.NICKNAME, WELL.ACCOUNT, "0", "0", WELL.MINTING_ACCOUNT]
        const _uniqueId = WELL.UNIQUE_ID;
        const stepAddProducer = await ethProducer.addProducer(_uniqueId, _producer, {from: WELL.ACCOUNT});

        for (let i = 0; i < stepAddProducer.logs.length; i++) {
            if (stepAddProducer.logs[i].event === "AddProducer") {
                const eventArgs = stepAddProducer.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.deepEqual([eventArgs.producer.nickname, eventArgs.producer.owner, eventArgs.producer.API, eventArgs.producer.sulphur, eventArgs.producer.account], _producer);
            }
        }

        const _newStatus = 1;
        /* Send the transaction and call the Set Producer Status function of the contract */
        const stepSetProducerStatus = await ethProducer.setProducerStatus(_uniqueId, _newStatus, {from: accounts[0]});

        for (let i = 0; i < stepSetProducerStatus.logs.length; i++) {
            if (stepSetProducerStatus.logs[i].event === "SetProducerStatus") {
                const eventArgs = stepSetProducerStatus.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.equal(eventArgs.status, _newStatus.toString());
                WELL.REQUEST_ID = eventArgs.requestId;
            }
        }

        /* Call the getProducer function of the contract */
        const resultProducer = await ethProducer.getProducer.call(_uniqueId);

        assert.equal(resultProducer[0].toNumber(), _newStatus);
        assert.deepEqual([resultProducer[1].nickname, resultProducer[1].owner, resultProducer[1].API, resultProducer[1].sulphur, resultProducer[1].account], _producer);

    })

    it("register asset value request", async () => {
        const ethData = await EthData.deployed();

        const stepRegisterAssetValueRequest = await ethData.registerAssetValueRequest({from: accounts[0]});

        /* Event test */
        for (let i = 0; i < stepRegisterAssetValueRequest.logs.length; i++) {
            if (stepRegisterAssetValueRequest.logs[i].event === "RegisterAssetValueRequest") {
                const eventArgs = stepRegisterAssetValueRequest.logs[i].args;
                assert.equal(eventArgs.kind, ASSETS.KIND);
                ASSETS.REQUEST_ID = eventArgs.requestid;
            }
        }
    })

    it("set trusted production data", async () => {
        const ethData = await EthData.deployed();

        const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, PRODUCTION_DATA.AMOUNT.toString() , PRODUCTION_DATA.PRICE.toString(), 0, 0, WELL.MINTING_ACCOUNT, PRODUCTION_DATA.BLOCKNUMBER.toString(), PRODUCTION_DATA.BLOCKREWARD.toString(), 0];

        const stepReceiveTrustedProductionData = await ethData.receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, _productionData, {from: accounts[0]});

        /* Event test */
        for(let i = 0; i < stepReceiveTrustedProductionData.logs.length; i++){
            if(stepReceiveTrustedProductionData.logs[i].event === "TrustedProductionData"){
                const eventArgs = stepReceiveTrustedProductionData.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.amount, PRODUCTION_DATA.AMOUNT.toString());
            }
        }
    })

    it("clearing", async () => {
        const ethData = await EthData.deployed();
        const tat = await TAT.deployed();

        const _blocknumber = PRODUCTION_DATA.BLOCKNUMBER.toString();

        /* Query TAT Balance */
        let tatBalance_before = await tat.balanceOf(WELL.ACCOUNT);

        /* Clearing */
        const stepClearing = await ethData.clearing(WELL.UNIQUE_ID, _blocknumber, {from: WELL.ACCOUNT});

        /* Event test */
        for (let i = 0; i < stepClearing.logs.length; i++) {
            if (stepClearing.logs[i].event === 'ClearingReward') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.rewardAmount,PRODUCTION_DATA.AMOUNT.toString());
            }
        }


        /* Query TAT Balance */
        let tatBalance_after = await tat.balanceOf(WELL.ACCOUNT);

        assert.equal(tatBalance_after - tatBalance_before, PRODUCTION_DATA.AMOUNT);

    })
})
```

use the following command:

```bash
npm run test
```

Make sure all tests pass before submitting a pull request.

## Btc

The Btc module is used to manage the recording, verification, and reward allocation of Bitcoin digital assets. This contract is based on Ethereum blockchain development and aims to provide a decentralized platform to ensure the accuracy and transparency of production data. By interacting with multiple other contracts, Btc contracts can receive trusted data from oracle machines and verify the data uploaded by producers, ensuring the authenticity and reliability of the data.

#### BtcProducer

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/btc/producer)

#### BtcData

[documentation](https://github.com/treasurenetprotocol/treasurenet-contracts/tree/main/docs/treasure/btc/data)

### Tests

To run the tests for this project, taking OIL as an example, it is as follows

```js
const BtcProducer = artifacts.require("BtcProducer");
const BtcData = artifacts.require("BtcData");
const TAT = artifacts.require("TAT");

const WELL = {
    NICKNAME: 'Treasure-Btc',
    UNIQUE_ID: "0x4872484e4579694e575a65745956524879303873690000000000000000000003",
    MINTING_ACCOUNT:"tb1qsgx55dp6gn53tsmyjjv4c2ye403hgxynxs0dnm",
    REQUEST_ID: "",
    ACCOUNT: "",
}

const ASSETS = {
    KIND: "BTC",
    REQUEST_ID: "",
}

const PRODUCTION_DATA = {
    AMOUNT:1000n,
    PRICE:10n,
    BLOCKNUMBER:180,
    BLOCKREWARD:100
}
contract("Treasure-Btc", async (accounts) => {

    it("Add btc producers and modify status.", async () => {
        const btcProducer = await BtcProducer.deployed();

        WELL.ACCOUNT = accounts[3];

        const _producer = [WELL.NICKNAME, WELL.ACCOUNT, "0", "0", WELL.MINTING_ACCOUNT]
        const _uniqueId = WELL.UNIQUE_ID;
        const stepAddProducer = await btcProducer.addProducer(_uniqueId, _producer, {from: WELL.ACCOUNT});

        for (let i = 0; i < stepAddProducer.logs.length; i++) {
            if (stepAddProducer.logs[i].event === "AddProducer") {
                const eventArgs = stepAddProducer.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.deepEqual([eventArgs.producer.nickname, eventArgs.producer.owner, eventArgs.producer.API, eventArgs.producer.sulphur, eventArgs.producer.account], _producer);
            }
        }

        const _newStatus = 1;
        /* Send the transaction and call the Set Producer Status function of the contract */
        const stepSetProducerStatus = await btcProducer.setProducerStatus(_uniqueId, _newStatus, {from: accounts[0]});

        for (let i = 0; i < stepSetProducerStatus.logs.length; i++) {
            if (stepSetProducerStatus.logs[i].event === "SetProducerStatus") {
                const eventArgs = stepSetProducerStatus.logs[i].args;
                assert.equal(eventArgs.uniqueId, _uniqueId);
                assert.equal(eventArgs.status, _newStatus.toString());
                WELL.REQUEST_ID = eventArgs.requestId;
            }
        }

        /* Call the getProducer function of the contract */
        const resultProducer = await btcProducer.getProducer.call(_uniqueId);

        assert.equal(resultProducer[0].toNumber(), _newStatus);
        assert.deepEqual([resultProducer[1].nickname, resultProducer[1].owner, resultProducer[1].API, resultProducer[1].sulphur, resultProducer[1].account], _producer);

    })

    it("register asset value request", async () => {
        const btcData = await BtcData.deployed();

        const stepRegisterAssetValueRequest = await btcData.registerAssetValueRequest({from: accounts[0]});

        /* Event test */
        for (let i = 0; i < stepRegisterAssetValueRequest.logs.length; i++) {
            if (stepRegisterAssetValueRequest.logs[i].event === "RegisterAssetValueRequest") {
                const eventArgs = stepRegisterAssetValueRequest.logs[i].args;
                assert.equal(eventArgs.kind, ASSETS.KIND);
                ASSETS.REQUEST_ID = eventArgs.requestid;
            }
        }
    })

    it("set trusted production data", async () => {
        const btcData = await BtcData.deployed();

        const _productionData = [WELL.UNIQUE_ID, 0, WELL.ACCOUNT, PRODUCTION_DATA.AMOUNT.toString() , PRODUCTION_DATA.PRICE.toString(), 0, 0, WELL.MINTING_ACCOUNT, PRODUCTION_DATA.BLOCKNUMBER.toString(), PRODUCTION_DATA.BLOCKREWARD.toString(), 0];

        const stepReceiveTrustedProductionData = await btcData.receiveTrustedProductionData(WELL.REQUEST_ID, WELL.UNIQUE_ID, _productionData, {from: accounts[0]});

        /* Event test */
        for(let i = 0; i < stepReceiveTrustedProductionData.logs.length; i++){
            if(stepReceiveTrustedProductionData.logs[i].event === "TrustedProductionData"){
                const eventArgs = stepReceiveTrustedProductionData.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs.uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.amount, PRODUCTION_DATA.AMOUNT.toString());
            }
        }
    })

    it("clearing", async () => {
        const btcData = await BtcData.deployed();
        const tat = await TAT.deployed();

        const _blocknumber = PRODUCTION_DATA.BLOCKNUMBER.toString();

        /* Query TAT Balance */
        let tatBalance_before = await tat.balanceOf(WELL.ACCOUNT);

        /* Clearing */
        const stepClearing = await btcData.clearing(WELL.UNIQUE_ID, _blocknumber, {from: WELL.ACCOUNT});

        /* Event test */
        for (let i = 0; i < stepClearing.logs.length; i++) {
            if (stepClearing.logs[i].event === 'ClearingReward') {
                const eventArgs = stepClearing.logs[i].args;
                assert.equal(eventArgs.treasureKind, ASSETS.KIND);
                assert.equal(eventArgs._uniqueId, WELL.UNIQUE_ID);
                assert.equal(eventArgs.rewardAmount,PRODUCTION_DATA.AMOUNT.toString());
            }
        }


        /* Query TAT Balance */
        let tatBalance_after = await tat.balanceOf(WELL.ACCOUNT);

        assert.equal(tatBalance_after - tatBalance_before, PRODUCTION_DATA.AMOUNT);

    })
})
```

use the following command:

```bash
npm run test
```

Make sure all tests pass before submitting a pull request.
