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

        // 部署DAO合约
        const dao = await deployProxy(DAO, ['DAO', 2, 10], { deployer });
        console.log('DAO部署成功:', dao.address);
        fs.appendFileSync('contracts.txt', `const DAO_ADDRESS='${dao.address}'\n`);

        // 部署MulSig多重签名合约(初始化推迟到后面)
        const mulSig = await deployProxy(MulSig, { initializer: false }, { deployer });
        console.log('MulSig部署成功:', mulSig.address);
        fs.appendFileSync('contracts.txt', `const MULSIG_ADDRESS='${mulSig.address}'\n`);

        // 部署Roles权限管理合约(初始化推迟到后面)
        const roles = await deployProxy(Roles, { initializer: false }, { deployer });
        console.log('Roles部署成功:', roles.address);
        fs.appendFileSync('contracts.txt', `const ROLES_ADDRESS='${roles.address}'\n`);

        // 部署ParameterInfo参数合约
        const parameterInfo = await deployProxy(ParameterInfo, [mulSig.address], { deployer });
        console.log('ParameterInfo部署成功:', parameterInfo.address);
        fs.appendFileSync('contracts.txt', `const PARAMETER_INFO_ADDRESS='${parameterInfo.address}'\n`);

        // 部署Oracle预言机合约
        const oracle = await deployProxy(Oracle, [roles.address], { deployer });
        console.log('Oracle部署成功:', oracle.address);
        fs.appendFileSync('contracts.txt', `const ORACLE_ADDRESS='${oracle.address}'\n`);

        console.log('基础组件部署完成');
    } catch (error) {
        console.error('部署失败:', error);
    }
};
