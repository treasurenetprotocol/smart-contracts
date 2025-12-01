module.exports = {
  skipFiles: [
    'Airdrop',
    'Bid',
    'Crosschain',
    'Expense',
    'TokenLocker',
    'USTN',
    'TCash',
    'WUNIT',
    'WTCASH',
    'Governance/DAO',
    'Governance/CrosschainTokens.sol',
    'Governance/Governance.sol',
    'Governance/MulSig.sol',
    'Oracle/SimpleClient.sol',
    'Oracle/OracleClient.sol',
    'Treasure/ProductionData.sol',
    'Treasure/Producer.sol',
    'Treasure/Share.sol',
    'Treasure/Expense',
    'Treasure/Expense/Expense.sol',
    'Treasure/Expense/NoExpense.sol'
  ],
  solcOptimizerDetails: {
    yul: false
  },
  solidity: {
    version: '0.8.26',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  }
};
