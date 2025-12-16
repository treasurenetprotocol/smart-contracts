#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const getEnv = (key, fallback = '') => {
  const val = process.env[key];
  return val && val.trim() ? val.trim() : fallback;
};

const requireEnv = (key) => {
  const val = getEnv(key);
  if (!val) throw new Error(`Missing required env: ${key}`);
  return val;
};

const getNetwork = () => getEnv('NETWORK', 'dev');
const getRpcUrl = () => requireEnv('RPC');

const normalizePrivateKey = (key) => (key && key.startsWith('0x') ? key : key ? `0x${key}` : key);

const getPrivateKey = () => {
  const pk = normalizePrivateKey(getEnv('PRIVATE_KEY') || getEnv('PRIVATE_KEYS'));
  if (!pk) throw new Error('Missing required env: PRIVATE_KEY or PRIVATE_KEYS');
  return pk;
};

const getUserAddress = () => {
  const fromEnv = getEnv('USER_ADDRESS') || getEnv('DEPLOYER_ADDR');
  if (fromEnv) return ethers.getAddress(fromEnv);
  return new ethers.Wallet(getPrivateKey()).address;
};

const loadDeployments = (network = getNetwork()) => {
  const file = path.join(process.cwd(), 'deployments', `${network}.json`);
  if (!fs.existsSync(file)) throw new Error(`Deployment file not found: ${file}`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data.entries || data.entries.length === 0) throw new Error(`No entries in deployment file: ${file}`);
  return data.entries[0].contracts;
};

const requireContracts = (names, network = getNetwork()) => {
  const contracts = loadDeployments(network);
  const resolved = {};
  names.forEach((name) => {
    if (!contracts[name] || !contracts[name].address) {
      throw new Error(`Contract ${name} not found in deployments for ${network}`);
    }
    resolved[name] = ethers.getAddress(contracts[name].address);
  });
  return resolved;
};

const loadContractABI = (contractName) => {
  const buildPath = path.join(process.cwd(), 'build', 'contracts', `${contractName}.json`);
  if (!fs.existsSync(buildPath)) throw new Error(`ABI not found for ${contractName}: ${buildPath}`);
  return JSON.parse(fs.readFileSync(buildPath, 'utf8')).abi;
};

const getProvider = () => new ethers.JsonRpcProvider(getRpcUrl());
const getWallet = () => new ethers.Wallet(getPrivateKey(), getProvider());
const getWeb3 = () => {
  const Web3 = require('web3');
  return new Web3(getRpcUrl());
};

const getWeb3Account = () => {
  const Web3 = require('web3');
  return new Web3().eth.accounts.privateKeyToAccount(getPrivateKey());
};

module.exports = {
  getEnv,
  requireEnv,
  getNetwork,
  getRpcUrl,
  getPrivateKey,
  getUserAddress,
  loadDeployments,
  requireContracts,
  getProvider,
  getWallet,
  getWeb3,
  getWeb3Account,
  loadContractABI,
  ethers,
};
