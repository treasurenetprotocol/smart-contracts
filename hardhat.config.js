/* eslint-env node */
/* eslint-disable import/no-extraneous-dependencies */
'use strict';

require('dotenv').config();

require('@nomicfoundation/hardhat-ethers');
require('@nomiclabs/hardhat-truffle5');
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-verify');
require('solidity-coverage');

const DEFAULT_PRIVATE_KEYS = [
  '0x72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2',
];

const normalizeKey = (key) => {
  if (!key) return null;
  const trimmed = key.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const loadAccounts = (envKey, fallback = []) => {
  const fromEnv = (process.env[envKey] || process.env.PRIVATE_KEYS || '')
    .split(',')
    .map(normalizeKey)
    .filter(Boolean);

  const fallbackKeys = (fallback && fallback.length ? fallback : DEFAULT_PRIVATE_KEYS)
    .map(normalizeKey)
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : fallbackKeys;
};

module.exports = {
  solidity: {
    version: '0.8.10',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    ganache: {
      url: process.env.RPC || 'http://127.0.0.1:8545',
      chainId: 1337,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
    dev: {
      url: process.env.RPC || 'https://dev.testnet.treasurenet.io',
      chainId: 6666,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
    dev2: {
      url: process.env.RPC || 'https://dev2.testnet.treasurenet.io',
      chainId: 6566,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
    testnet: {
      url: process.env.RPC || 'http://172.31.2.234:8555',
      chainId: 5005,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
    mainnet: {
      url: process.env.RPC || 'https://rpc.treasurenet.io',
      chainId: 5002,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
    ethereum: {
      url: process.env.RPC || 'http://127.0.0.1:8545',
      chainId: 1,
      accounts: loadAccounts('PRIVATE_KEY'),
    },
  },
  mocha: {
    timeout: 200000,
  },
};
