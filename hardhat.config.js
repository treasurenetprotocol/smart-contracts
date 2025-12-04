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
            url: process.env.RPC || 'http://127.0.0.1:8545',
            chainId: 1337,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        },
        dev: {
            url: process.env.RPC || 'https://dev.testnet.treasurenet.io',
            chainId: 6666,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        },
        dev2: {
            url: process.env.RPC || 'https://dev2.testnet.treasurenet.io',
            chainId: 6566,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        },
        testnet: {
            url: process.env.RPC || 'http://172.31.2.234:8555',
            chainId: 5005,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        },
        mainnet: {
            url: process.env.RPC || 'https://rpc.treasurenet.io',
            chainId: 5002,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        },
        ethereum: {
            url: process.env.RPC,
            chainId: 1,
            accounts: loadAccounts('PRIVATE_KEY', PRIVATE_KEY)
        }
    },
    mocha: {
        timeout: 200000
    }
};
