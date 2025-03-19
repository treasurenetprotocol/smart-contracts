/**
 * Use this file to configure your truffle project. It's seeded with some
 * common settings for different networks and features like migrations,
 * compilation and testing. Uncomment the ones you need or modify
 * them to suit your project as necessary.
 *
 * More information about configuration can be found at:
 *
 * https://trufflesuite.com/docs/truffle/reference/configuration
 *
 * To deploy via Infura you'll need a wallet provider (like @truffle/hdwallet-provider)
 * to sign your transactions before they're sent to a remote public node. Infura accounts
 * are available for free at: infura.io/register.
 *
 * You'll also need a mnemonic - the twelve word phrase the wallet uses to generate
 * public/private key pairs. If you're publishing your code to GitHub make sure you load this
 * phrase from a file you've .gitignored so it doesn't accidentally become public.
 *
 */
const privateKeys = [
  "72949B647AD8DB021F3E346F27CD768F2D900CE7211809AF06A7E94A4CB3EED2"
];

const HDWalletProvider = require("@truffle/hdwallet-provider");
// const Web3 = require('web3');
// const tnProvider = new Web3(Web3.providers.HttpProvider(`http://124.70.23.119:8545`));


module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions. If you don't specify one truffle
   * will spin up a development blockchain for you on port 9545 when you
   * run `develop` or `test`. You can ask a truffle command to use a specific
   * network from the command line, e.g
   *
   * $ truffle test --network <network-name>
   */
  migrations_directory: "./migrations/bridge",
  networks: {
    // Useful for testing. The `development` name is special - truffle uses it by default
    // if it's defined here and no other network is specified at the command line.
    // You should run a client (like ganache, geth, or parity) in a separate terminal
    // tab if you use this network and you must also set the `host`, `port` and `network_id`
    // options below to some value.
    //
    ganache: {
      host: "127.0.0.1",     // Localhost (default: none)
      port: 8545,            // Standard Ethereum port (default: none)
      chain_id: "1337",
      network_id: "1337"       // Any network (default: none)
    },
    tn: {
      provider: () => new HDWalletProvider({
        privateKeys: privateKeys,
        /*providerOrUrl: "http://124.70.23.119:8555",*/
        providerOrUrl: "http://127.0.0.1:8555",
        pollingInterval: 30000,
        networkCheckTimeout: 1000000000,
        timeoutBlocks: 200000
      }),
      network_id: "6666"
    },
    tn2: {
      provider: () => new HDWalletProvider({
        privateKeys: privateKeys,
        providerOrUrl: "http://127.0.0.1:8545",
        pollingInterval: 30000,
        networkCheckTimeout: 1000000000,
        timeoutBlocks: 200000
      }),
      network_id: "6566",
    },
    tn_testnet: {
      provider: () => new HDWalletProvider({
        privateKeys: privateKeys,
        providerOrUrl: "http://172.31.2.234:8555",
        pollingInterval: 30000,
        networkCheckTimeout: 1000000000,
        timeoutBlocks: 200000
      }),
      network_id: "5005"
    },
    tn_mainnet: {
      provider: () => new HDWalletProvider({
        privateKeys: ["9e05041433ff156dcba3cae40abb525577990ba8f6b6daa48c3544d882799cfa"],
        providerOrUrl: "http://node1.treasurenet.io:8555",
        pollingInterval: 30000,
        networkCheckTimeout: 1000000000,
        timeoutBlocks: 200000
      }),
      network_id: "5002"
    }
    //
    // goerli: {
    //   provider: () => new HDWalletProvider(mnemonic, `https://sepolia.infura.io/v3/11253e6902f04cc4b687639526152f6c`),
    //   network_id: 5,       // Goerli's id
    //   chain_id: 5
    // }
  },
  // solc: {
  //   optimizer: {
  //     enabled: true,
  //     runs: 200
  //   }
  // },

  // Set default mocha options here, use special reporters etc.
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
