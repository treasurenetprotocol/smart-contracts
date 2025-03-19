const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const TAT = artifacts.require('TAT');
const Airdrop = artifacts.require('Airdrop');
const MerkleAirdrop = artifacts.require('MerkleAirdrop');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 部署空投相关合约
 * - Airdrop: 基础空投合约
 * - MerkleAirdrop: 基于默克尔树的空投合约
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('部署空投相关合约...');

        // 获取已部署的合约实例
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const tat = await TAT.deployed();

        // 部署基础空投合约
        const airdrop = await deployProxy(Airdrop, [
            tat.address,
            mulSig.address,
            roles.address
        ], { deployer });
        console.log('Airdrop部署成功:', airdrop.address);
        fs.appendFileSync('contracts.txt', `const AIRDROP_ADDRESS='${airdrop.address}'\n`);

        // 部署基于默克尔树的空投合约
        const merkleAirdrop = await deployProxy(MerkleAirdrop, [
            tat.address,
            mulSig.address,
            roles.address,
            '0x0000000000000000000000000000000000000000' // 初始默克尔树根，后面可以更新
        ], { deployer });
        console.log('MerkleAirdrop部署成功:', merkleAirdrop.address);
        fs.appendFileSync('contracts.txt', `const MERKLE_AIRDROP_ADDRESS='${merkleAirdrop.address}'\n`);

        // 授权空投合约为TAT的铸币者
        const tatInstance = await TAT.at(tat.address);
        await tatInstance.setMinter(airdrop.address, true);
        await tatInstance.setMinter(merkleAirdrop.address, true);

        console.log('空投相关合约部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
