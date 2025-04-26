require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const privateKeys = [
    '72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2'
];

const {KMSProviderAWS} = require("@web3-kms-signer/kms-provider-aws");
const Provider = require("@truffle/provider");

const AWS = require("aws-sdk");
// 配置 AWS 凭证
AWS.config.update({
    accessKeyId: process.env.KMS_ACCESS_KEY_ID,
    secretAccessKey: process.env.KMS_SECRET_ACCESS_KEY,
    region: process.env.KMS_REGION
});

const kms = new AWS.KMS();

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
                privateKeys: [process.env.PRIVATEKEY_MAINNET],
                /*providerOrUrl: "http://124.70.23.119:8555",*/
                providerOrUrl: 'https://rpc.treasurenet.io',
                pollingInterval: 30000,
                networkCheckTimeout: 1000000000,
                timeoutBlocks: 200000
            }),
            network_id: 5005
        },
        tn_dev_kms:{
            provider: () => {
                const kmsProvider = new KMSProviderAWS({
                    kmsClient: kms,
                    keyId: process.env.KMS_KEY_ID, // KMS 密钥 ARN 或 Key ID
                    rpcUrl: "https://dev.testnet.treasurenet.io", // 替换为你的 RPC URL
                    chainId: 6666 // 根据你的网络修改 (1: Mainnet, 4: Rinkeby 等)
                })
                kmsProvider.send = async (method, params) => {
                    const response = await fetch("https://dev.testnet.treasurenet.io", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            id: 1,
                            method,
                            params
                        })
                    });
                    return response.json();
                };
                // 实现 sendAsync 方法
                kmsProvider.sendAsync = (payload, callback) => {
                    kmsProvider.send(payload.method, payload.params || [])
                      .then(result => callback(null, { ...payload, result }))
                      .catch(err => callback(err));
                };
                // ------------------------------
                return Provider.wrap(kmsProvider);
            },
            network_id: 6666, // 通配符匹配任何 network_id
            gas: 5500000,
            confirmations: 2,
            timeoutBlocks: 200
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
