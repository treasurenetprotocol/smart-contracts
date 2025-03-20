<p align="center">
  <a href="https://treasurenet.io">
    <img alt="treasurenetLogo" src="https://raw.githubusercontent.com/treasurenetprotocol/docs/feature/1.0.3/static/img/logo_tn_github.png" width="600" />
  </a>
</p>


# Treasurenet

Treasurenet proposes a solution for the critical lack of sustaining and tangible value in the crypto world. Our goal is the combine real world economic drivers and distributed ledger scalability. As a layer 1 protocol, TN will become a model for sustaining value in the fiat world and the digital world.

# Treasurenet Contracts

<a href="https://github.com/treasurenetprotocol/treasurenet-js-libs/blob/master/LICENSE"><img alt="License: Apache-2.0" src="https://img.shields.io/badge/license-Apache_2.0-blue" /></a>  <img alt="solc: v0.8.29" src="https://img.shields.io/badge/solc-0.8.29-yellow" />  ![Treasurenet CI](https://img.shields.io/badge/TreasureNet_CI-passing-brightgreen)  [![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](code_of_conduct.md)

This contains almost all contracts officially developed and maintained by Treasurenet Foundation.

- [Installation](#installation)
- [Usage](#Usage)
- [Introduction and APIs](#introduction-and-apis)
- [Contributing](#contributing)
- [Code of Conduct](#code-of-conduct)
- [License](#license)
- [FAQ](#faq)
- [Acknowledgements](#acknowledgements)
- [Contact Information](#contact-information)

## Installation

To install and set up the project contract for development, follow these steps:

```bash
# Clone the repository
git clone https://github.com/treasurenetprotocol/treasurenet-contracts.git

# Navigate to the project directory
cd treasurenetprotocol

# Install the dependencies
npm install

# Set up Foundry (if not already installed)
# Run the setup script
./setup-foundry.sh
```

## Usage

To run the tests for this project, use the following Foundry commands:

### Run tests

```shell
# Run all tests
forge test

# Run tests with detailed logs
forge test -vvv

# Run a specific test file
forge test --match-path test/foundry/TreasureOil.t.sol
```

Make sure all tests pass before submitting a pull request.

## Introduction and APIs

### Airdrop module

This AirDrop smart contract is engineered to systematically distribute tokens to foundations and VIP users according to a predefined schedule. It incorporates a sophisticated multi-signature proposal mechanism, enabling secure and collective decision-making for modifications to VIP users and their respective token distribution ratios. The contract is equipped with comprehensive query functions, allowing users to retrieve detailed information about their airdrop entitlements and transaction history. Additionally, it ensures secure withdrawal operations, providing a robust framework for token claims. 

#### Features

- [x] **Role Identification**:

​		\- Function to get the role (FOUNDATION, VIP, Unknown) of an address.

- [x] **Foundation Distribution**: 

  \- Tokens are distributed to the foundation in stages.

  \- Two-stage distribution for the foundation with timelocks.

- [x] **VIP User Distribution:** 

​		\- Initial total amount granted to VIPs.

​		\- Monthly airdrop amount calculated and distributed over 12 periods.

- [x] **Multi-Signature Proposal Mechanism**

  \- Allows creation of proposals to change VIP users and their respective token distribution ratios.

  \- Requires signatures from Foundation Managers or Board Directors.

  \- Threshold of 3 signatures needed to execute a proposal.

  \- Proposals executed after a time lock period.

  \- Records historical claim ratios and changes.

- [x] **Foundation Withdrawals**:

  \- Foundation can claim tokens in two stages.

  \- Event logging for foundation claims.

- [x] **VIP Withdrawals**:

​		\- VIPs can claim tokens based on monthly distribution.

​		\- Event logging for VIP claims.

​		\- Mechanism for Foundation to claim remaining VIP tokens after 12 months if unclaimed.

[Airdrop documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\airdrop\README.md)

### Bid module

This module implements the process of selecting an Active Validator through the participation consensus mechanism of the validator. This requires that the validator has pledged at least 158 UNITs, which will form a candidate pool Candidate pool before implementing the validator bid TAT. The specific process is as follows:

1. User wallet login system；
2. Enter the quantity of TAT to be pledged and submit it；
3. Sign the transaction, the transaction is successful, and the list on the left side of the page updates the pledge record. The transaction failed and will not be updated.

#### Features

- [x] **TAT Management**

  \- **Bid TAT:** Allows users to bid a specified amount of TAT tokens. The bid must meet the minimum threshold. Main process for bidding TAT tokens, including checks for threshold and resetting bids for new rounds.

  \- **Bidder List:** Returns the list of all bidders, their bid amounts, and the block numbers of their bids.

- [x] **Bidding Status and Information** 

  \- **Query Start Block Number:** Returns the starting block number of the current bidding round.

  \- **if Account is a TAT Bidder:** Checks if a specific account has participated in the TAT bidding process.

  \- **Bid Amount of Caller:** Retrieves the amount of TAT tokens bid by the caller.

[Bid documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\stakeboosting\README.md)

### Crosschain module

The Gravity contract is an innovative solution that locks assets on the Ethereum blockchain, facilitating the creation of synthetic versions of these assets on the Tendermint blockchain. This cross-chain functionality enables users to leverage the unique benefits of both ecosystems. The contract is specifically designed to integrate seamlessly with software operating on the Tendermint blockchain, ensuring a smooth and efficient transfer of value. Its core purpose revolves around bridging assets between these two distinct platforms, will primarily focus on the Ethereum-related components of the Gravity contract, shedding light on its deployment, operation, and the mechanisms it employs to secure and manage locked assets on Ethereum.

#### Features

- [x] **Cross-Chain Asset Transfer **

  \- **Submit Batch: ** Submits a batch of transactions from Cosmos to Ethereum. The batch requires approval from the current validator set. Users can submit a batch of transactions, which are signed and executed. The contract checks the destination addresses, amounts, and fees for each transaction and transfers the corresponding tokens accordingly.

  \- **Send To Cosmos**: Allows users to send ERC20 tokens from Ethereum to Cosmos. The contract records details of the transaction and notifies the Cosmos side through an event. This enables bidirectional flow of cross-chain assets.

- [x] **Logic Call**

  \- **Submit Logic Call: **Allows the execution of arbitrary logic calls in a logic contract. This method transfers some tokens to the logic contract, pays fees to the caller, and then executes the specified function in the logic contract. Each logic call has a unique invalidation ID and nonce to prevent replay attacks. This feature enables complex cross-chain operations for various use cases.

[Crosschain documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\crosschain\README.md)

### governance module

The Governance module implements the initial appointment and transfer functions for Governance administrators and FoundationManagers, and supports Governance administrators to configure platform parameters. The Governance contract is the governance contract of the Treasury project, responsible for managing the relevant information and contract addresses of different types of assets (such as oil, gas, etc.). The specific process is as follows:

1. Appointment of initial system role: During system initialization, appoint the first Governance administrator FoundationManager。
2. System Role Identity Transfer: The Governance Administrator/FoundationManager performs identity transfer by replacing the saved Governance Administrator/FoundationManager user address in the system with the successor user address. This feature is only allowed for Governance administrators, auditors, and feeders to use.
3. Platform parameter configuration: Governance administrators set platform parameters for each module. This feature is only allowed for Governance administrators to use.

#### Features

- [x] **Treasure Management**

  \- **Add Treasure:** Adds a new treasure asset. Can only be called by the multisig contract.`AddTreasure` event with the treasure type, producer contract address, and production data contract address.

  \- **Get Treasure by Kind:** Retrieves the producer and production data contract addresses for a given treasure type.

[Governance documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\governance\README.md)

### TAT module

The TAT contract is the implementation of the TreasureNet ERC20 token, which comes with advanced features including mintable, pausable, and burnable capabilities. Additionally, it supports staking functionality, providing a comprehensive framework for managing token issuance and user engagement. The contract utilizes multiple OpenZeppelin libraries, ensuring it is upgradeable and integrates seamlessly with governance mechanisms. This design allows for flexible and secure token management, aligning with best practices in smart contract development.

#### Features

- [x] **TAT Minting and Burning**

  \- **Mint TAT: **Allows minting of TAT tokens, typically performed by authorized production contracts. Tokens are minted to the specified recipient address.

  \- **Burn TAT:** Allows burning of TAT tokens, typically performed by authorized production contracts. Tokens are burned from the caller's balance.

- [x] **Stake and Withdraw**

  \- **Stake: **Allows users to stake TAT tokens. Tokens are moved from the user's balance to the staking contract.

  \- **Withdraw: **Allows users to withdraw staked TAT tokens. Tokens are moved from the staking contract back to the user's balance.

[TAT documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\tat\README.md)

### Oracle module

The Oracle module verifies the price data pushed by the feeder, stores and updates it. The steps are as follows:

1. Obtain mineral price data pushed by the feeder;
2. Obtain the feed whitelist address saved in the Governance module and verify whether the current feed address matches the whitelist feed address;
   - Consistent, save price data on the chain;
   - Inconsistent, failed to save data.
3. Rules for verifying the legality of price data:
   - The category of mineral prices pushed by the feeder must be consistent with the category configured in the Governance module, otherwise the push will fail.
4. Price storage rules:
   - Add the price data of physical minerals on the chain in chronological order.
   - Update the price data of UNIT and USTN on the chain for single coverage.

#### Features

- [x] **Oracle Request Management**

  \- **Create Oracle Request:** Initiates an oracle request with a unique ID, which includes the callback address and function ID. Emits an `OracleRequest` event.

  \- **Cancel Oracle Request:** Cancels a previously initiated oracle request. Emits a `CancelOracleRequest` event.

- [x] **Role-Based Data Upload**

  \- **Set Currency Value:** Allows Feeders to set the value of a specified currency type. This method can only be called by accounts with the FEEDER role.

  \- **Get Currency Value:** Retrieves the value of a specified currency type.

[Oracel documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\oracel\README.md)

### Treasure module

Treasure is mainly divided into two parts: natural assets and digital assets, including four types: BTC, ETH, GAS, and OIL.To add a well in addition to filling in required information, you can also add the beneficiaries of the mine and add relevant rules for the beneficiaries; After the mine audit is approved, the production can be obtained and the casting of TAT can begin; Failed review, unable to obtain production output, unable to cast TAT; The mine has a one-year validity period (365 days) and requires annual review upon expiration.

Multiple beneficiaries are allowed to receive the final cast TAT for the same well. This function mainly implements the function of adding/deleting beneficiaries for the well, while allocating the proportion of benefits.The business rules are as follows:

​	\- Each time the manufacturer mintTAT, the corresponding TAT quantity is distributed to the beneficiary's account according to the profit ratio of the well;

------

Eg: <br />Well 1 has three beneficiaries, with a producer benefit ratio of 60%, user 1 benefit ratio of 20%, and user 2 benefit ratio of 20%;<br/>In February, if the manufacturer mintTAT is 100 pieces, then the manufacturer's receipt of 100 * 60%=60 TAT, user 1's receipt of 100 * 20%=20 TAT, and user 2's receipt of 100 * 20%=20 TAT

------

​	\- The total profit ratio is 100%, and the profit ratio has no decimals. It is calculated and distributed as an integer;

​	\- The beneficiaries include the manufacturer, with a maximum of 10 people and a minimum of 1 person (only the manufacturer);

​	\- The beneficiary allocates their own benefit ratio, distribution scope [1, current benefit ratio];

​	\- Manufacturers allocate their own benefit ratio, distribution range [1, current benefit ratio -1];

​	\- The beneficiary is allowed to modify their own benefit ratio, with a modification range of [0, current benefit ratio];

​	\- Beneficiaries with a benefit ratio of 0 are allowed to be deleted, only producers can delete them;

[Treasure documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\treasure\README.md)

### USTN module

The USTN contract is a smart contract that complies with the ERC20 standard and is responsible for issuing and managing USTN tokens. This contract integrates multiple functions, including casting, destruction, transfer, and auction related operations. By integrating with governance contracts and oracle contracts, the USTN contract achieves decentralized management and real-time exchange rate calculation.

#### Features

- [x] **Bid Cost and Bid Back**

  \- **Bid Cost:** The function handles the transfer of bid funds from the bidder to the auction manager. It ensures that only the designated USTNAuction contract can call this function. The function performs the following operations:

  - Verifies that the bidder has sufficient balance to cover the bid amount.

  - Ensures that the auction manager's address is valid and not a zero address.

  - Deducts the bid amount from the bidder's balance and adds it to the auction manager's balance.

  \- **Bid Back:** The function handles the refund of bid funds from the auction manager back to the bidder. It ensures that only the designated USTNAuction contract can call this function. The function performs the following operations:

  - Ensures that the bidder's address is not a zero address.

  - Ensures that the auction manager's address is valid and not a zero address.

  - Adds the refund amount to the bidder's balance and deducts it from the auction manager's balance.

- [x] **Mint Rate and Mint Back Rate** 

  \- **Mint Rate:** Calculates the exchange rate from UNIT to USTN based on the oracle value.

  \- **Mint Back Rate:** Calculates the repurchase rate from USTN to UNIT based on the oracle value.

[USTN documentation](D:\work\Treasurenet-contracts\fork\treasurenet-contracts\docs\ustn\README.md)

## Contributing

We welcome contributions to the project! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Commit your changes (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature-branch`).
5. Create a new Pull Request.

Please ensure your code adheres to our coding standards and includes relevant tests.

## Code of Conduct

We expect all contributors to adhere to our [Code of Conduct](code_of_conduct.md). Please read it to understand the expected behavior.

## License

This project is licensed under the Apache License 2.0 \- see the [LICENSE](LICENSE) file for details.

(https://github.com/treasurenetprotocol/treasurenet-js-libs/blob/master/LICENSE)

## FAQ

### What is a producer?

Producers are economic contributors in the real world, providing production records of physical or digital assets to Treasury for auditing and on chain recording.

### What is the purpose of this contract?

The contract manages an airdrop of tokens to Foundation and VIP users, with features for managing multi-stage token releases and multi-signature proposals.

### How are the tokens distributed?

Tokens are distributed over time in multiple stages. The Foundation can claim tokens in two stages, while VIPs receive monthly airdrops.

### How do multi-signature proposals work?

Foundation managers and board directors can propose changes to VIP ratios. Proposals require multiple signatures and a timelock before execution.

## Acknowledgements

We would like to thank the developers and contributors of OpenZeppelin for their excellent upgradable contract library and the Foundry team for their powerful Solidity testing framework.

## Contact Information

For questions or collaboration, please contact:

- **Name:** Treasurenet team
- **Email:** contact@treasurenet.org
- **Twitter:** https://twitter.com/treasurenet_io
- **Telegram:** https://t.me/+hN6G5mGAlD8xMmI5
- **GitHub:** https://github.com/treasurenetprotocol/treasurenet-contracts

-----
_Treasurenet Foundation 2024_
