require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const privateKeys = [
    '72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2'
];
module.exports = {
    networks: {
        ganache: {
            host: '127.0.0.1',
            port: 8545,
            chain_id: '1337',
            network_id: '1337'
        },
        treasurenet: {
            provider: () => new HDWalletProvider({
                privateKeys: privateKeys,
                /*providerOrUrl: "http://124.70.23.119:8555",*/
                providerOrUrl: 'http://127.0.0.1:8555',
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: 6666
        },
        tn_mainnet: {
            provider: () => new HDWalletProvider({
                privateKeys: process.env.PRIVATEKEY_MAINNET,
                /*providerOrUrl: "http://124.70.23.119:8555",*/
                providerOrUrl: 'https://rpc.treasurenet.io',
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: 5005
        },
        ethereum: {
            provider: () => new HDWalletProvider({
                privateKeys: [process.env.EPRIVATE_KEY],
                providerOrUrl: 'http://127.0.0.1:8545',
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: 6566
        }
    },

    mocha: {
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: '0.8.10',
            // docker: true,
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                }
                //  evmVersion: "byzantium"
            }
        }
    }
};
