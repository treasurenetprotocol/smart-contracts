// SPDX-License-Identifier: MIT
require('dotenv').config();

const DAO = artifacts.require('DAO');
const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const Oracle = artifacts.require('Oracle');

const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const fs = require('fs');

/**
 * 初始部署脚本，部署基础组件
 * - DAO: 治理组织
 * - MulSig: 多重签名合约
 * - Roles: 角色权限管理
 * - ParameterInfo: 系统参数配置
 * - Oracle: 预言机
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('部署基础组件...');

        // 记录部署地址到文件
        fs.writeFileSync('contracts.txt', `# 合约部署地址 - ${network} - ${new Date().toISOString()}\n`);

        // 1. 先部署所有合约，但不立即初始化
        console.log('第一步：部署合约实例...');

        // 部署DAO合约(不初始化)
        // const dao = await deployProxy(DAO, { initializer: false }, { deployer });
        const dao = await DAO.deployed();
        console.log('DAO部署成功:', dao.address);
        fs.appendFileSync('contracts.txt', `const DAO_ADDRESS='${dao.address}'\n`);

        // 部署MulSig多重签名合约(不初始化)
        // const mulSig = await deployProxy(MulSig, { initializer: false }, { deployer });
        const mulSig = await MulSig.deployed();
        console.log('MulSig部署成功:', mulSig.address);
        fs.appendFileSync('contracts.txt', `const MULSIG_ADDRESS='${mulSig.address}'\n`);

        // 部署Roles权限管理合约(不初始化)
        // const roles = await deployProxy(Roles, { initializer: false }, { deployer });
        const roles = await Roles.deployed();
        console.log('Roles部署成功:', roles.address);
        fs.appendFileSync('contracts.txt', `const ROLES_ADDRESS='${roles.address}'\n`);

        // 部署ParameterInfo参数合约(不初始化)
        // const parameterInfo = await deployProxy(ParameterInfo, { initializer: false }, { deployer });
        const parameterInfo = await ParameterInfo.deployed();
        console.log('ParameterInfo部署成功:', parameterInfo.address);


        fs.appendFileSync('contracts.txt', `const PARAMETER_INFO_ADDRESS='${parameterInfo.address}'\n`);

        // 部署Oracle预言机合约(不初始化)
        const oracle = await deployProxy(Oracle, { initializer: false }, { deployer });
        console.log('Oracle部署成功:', oracle.address);
        fs.appendFileSync('contracts.txt', `const ORACLE_ADDRESS='${oracle.address}'\n`);

        // 2. 按照正确的顺序初始化合约
        console.log('第二步：初始化合约...');

        // 初始化DAO
        await dao.initialize('DAO', 2, 10);
        console.log('DAO初始化成功');

        // 初始化参数管理
        await parameterInfo.initialize(mulSig.address);
        console.log('ParameterInfo初始化成功');


        // 初始化Oracle
        await oracle.initialize(roles.address);
        console.log('Oracle初始化成功');

        // // 最后初始化MulSig (因为它依赖前面几个合约)
        // await mulSig.initialize(
        //     dao.address,
        //     accounts[0], // 临时值，将在后续迁移中更新
        //     roles.address,
        //     parameterInfo.address,
        //     accounts[0], // CrosschainTokens地址，将在后续迁移中更新
        //     3600 // 确认时长(秒)
        // );
        // console.log('MulSig初始化成功');

        console.log('基础组件部署完成');
    } catch (error) {
        console.error('部署失败:', error);
        // 打印更详细的错误信息
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
        if (error.cause) {
            console.error('错误原因:', error.cause);
        }
    }
};
