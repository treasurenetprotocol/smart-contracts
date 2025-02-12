require('dotenv').config();
const HDWalletProvider = require("@truffle/hdwallet-provider");

module.exports = {
    networks: {
        ganache: {
            host: "127.0.0.1",
            port: 8545,
            chain_id: "1337",
            network_id: "1337"
        },
        treasurenet: {
            provider: () => new HDWalletProvider({
                privateKeys: [process.env.PRIVATE_KEY],
                providerOrUrl: process.env.PROVIDER_URL,
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: process.env.NETWORK_ID
        },
        ethereum: {
            provider: () => new HDWalletProvider({
                privateKeys: [process.env.EPRIVATE_KEY],
                providerOrUrl: process.env.EPROVIDER_URL,
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: process.env.ENETWORK_ID
        }
    },

    mocha: {
        // timeout: 100000
    },

    // Configure your compilers
    compilers: {
        solc: {
            version: "0.8.10",
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
