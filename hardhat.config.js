require('dotenv').config();

require('@nomicfoundation/hardhat-ethers');
require('@nomiclabs/hardhat-truffle5');
require('@openzeppelin/hardhat-upgrades');
require('@nomicfoundation/hardhat-verify');
require('solidity-coverage');

const PRIVATE_KEY = [
    process.env.PRIVATE_KEY
];

const loadAccounts = (envKey, fallback = []) => {
    const fromEnv = (process.env[envKey] || process.env.PRIVATE_KEYS || '')
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean);

    return fromEnv.length > 0 ? fromEnv : fallback;
};

module.exports = {
    solidity: {
        version: '0.8.10',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            chainId: 1337
        },
        ganache: {
            url: process.env.GANACHE_RPC || 'http://127.0.0.1:8545',
            chainId: 1337,
            accounts: loadAccounts('GANACHE_PRIVATE_KEYS', PRIVATE_KEY)
        },
        dev: {
            url: process.env.DEV_RPC || 'http://127.0.0.1:8555',
            chainId: 6666,
            accounts: loadAccounts('TREASURENET_PRIVATE_KEYS', PRIVATE_KEY)
        },
        tn: {
            url: process.env.TN_RPC || 'http://127.0.0.1:8555',
            chainId: 6666,
            accounts: loadAccounts('TN_PRIVATE_KEYS', PRIVATE_KEY)
        },
        tn2: {
            url: process.env.TN2_RPC || 'http://127.0.0.1:8545',
            chainId: 6566,
            accounts: loadAccounts('TN2_PRIVATE_KEYS', PRIVATE_KEY)
        },
        tn_testnet: {
            url: process.env.TN_TESTNET_RPC || 'http://172.31.2.234:8555',
            chainId: 5005,
            accounts: loadAccounts('TN_TESTNET_PRIVATE_KEYS', PRIVATE_KEY)
        },
        tn_mainnet: {
            url: process.env.TN_MAINNET_RPC || 'http://node1.treasurenet.io:8555',
            chainId: 5002,
            accounts: loadAccounts('TN_MAINNET_PRIVATE_KEYS', PRIVATE_KEY)
        },
        ethereum: {
            url: process.env.ETHEREUM_RPC || 'http://127.0.0.1:8545',
            chainId: 6566,
            accounts: loadAccounts('EPRIVATE_KEY', PRIVATE_KEY)
        }
    },
    mocha: {
        timeout: 200000
    }
};
