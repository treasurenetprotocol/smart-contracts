/**
 * Create with treasurenet-contracts
 * Author: ChrisChiu
 * Date: 2024/4/23
 * Desc
 */

const AirDrop = artifacts.require("AirDrop");

const { deployProxy } = require("@openzeppelin/truffle-upgrades");

module.exports = async function (deployer, network, accounts) {
    await deployProxy(AirDrop, { initializer: false }, { deployer });
};
