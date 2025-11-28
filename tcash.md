Part One Introduction
1. Purpose
This detailed design document aims to provide a systematic and operable technical blueprint and implementation specifications for the development, deployment and subsequent maintenance of TCash and its related systems.Specific goals include:
System architecture description: Clarify the overall architecture, module division and interactive relationship of TCash and its system to facilitate implementation or expansion by the development team and architects in subsequent stages.
Core functions and logic: Detailed description of the implementation, data flow and logical process of the system's key functions (such as price stabilization algorithm, collateral management, liquidation mechanism, etc.) to ensure that participants agree on how the system operates.
Interface definition and integration: Describe the interface forms, communication protocols and data formats between internal modules and with external systems (payment gateways, Oracle oracles, etc.) to ensure compatibility and scalability.
Security and compliance strategy: At the technical implementation level, propose specific measures or technical solutions regarding smart contract security, system security, KYC/AML and other compliance requirements to reduce potential risks and ensure the robust operation of the system.
Performance and maintainability: Through detailed design of the load, expansion, monitoring and fault-tolerance mechanisms of the core module, we lay the foundation for future functional upgrades and performance optimization.
Through this detailed design document, project stakeholders (including developers, testers, operation and maintenance personnel, and compliance teams, etc.) can efficiently and accurately understand and implement the design ideas and technical solutions of TCash and its related systems, ensuring that the implementation process of each link of the project is clear, orderly, and traceable.

2. Scope
The scope of application of this design document focuses on the technical implementation and integration of the stablecoin system from the underlying smart contract to the interface call, covering the overall architecture and module design, function and process definition (such as issuance, redemption, price governance and collateral management, etc.), security and compliance strategies (including smart contract audit, private key management and KYC/AML), as well as interface definition and communication protocol, deployment and operation and maintenance, etc., aiming to provide scalable and maintainable technical solutions for the system.

3. Definitions, terms and abbreviations
In order to ensure that the terms used in subsequent design descriptions have consistent and clear meanings, some key concepts are specifically defined:

Multi-signature (Multisig)
A mechanism that requires the joint authorization of multiple signers to take effect when executing a transaction or contract to enhance the security of funds and contract operations.

DAO (Decentralized Autonomous Organization)
A decentralized autonomous organization based on smart contracts and token economic models, governed and managed through community voting and consensus.

Personal credit limit (PCL, Personal Credit Limit)
The upper limit of credit limit approved by a financial institution for an individual (borrower).
In the product documentation, this name is Max Borrowable.

Personal loan balance (ALB, Available Loan Balance)
After calculating the personal credit limit and the current loan limit, the remaining loan limit that can still be obtained.This name is Borrowable in the product documentation

Risk Factor (RF, Risk Factor)
A quantitative indicator used to measure the potential risk level of an entity or object.

Personal Risk Factor (PRF, Personal Risk Factor)
Quantitative indicators used to evaluate the overall risk level of personal credit, liabilities, repayment ability, etc.

Systemic Risk Factor (SRF, Systemic Risk Factor)
Quantitative indicators used to measure the potential impact on the system level such as external macroeconomics, industry risks and overall market fluctuations.

Comprehensive Risk Factor (CRF, Comprehensive Risk Factor)
The overall risk coefficient is obtained by combining the results of a multi-dimensional assessment of an individual's (or enterprise's) internal risks and external environmental risks.
This name is "Comprehensive Risk Factors" (English Risk Factors) in the product documentation.

The total amount of outstanding loans (including interest) (OLB, Outstanding Loan Balance)
The total amount of principal and interest outstanding on a loan as of the current date.

Amount that has been repaid (including interest) (RA, Repaid Amount)
The total amount of principal and interest that has been repaid on a loan as of the current date.

Total loan amount (including interest) (TLD, Total Loan Disbursed)
The total amount of loans disbursed, including principal and related interest.

Number of cleared loans by individuals (NCL, Number of Cleared Loans)
The number of loans that the borrower has settled (that is, all loans that have been repaid).

Total number of personal loans (TNL, Total Number of Loans)
The number of all loans of the borrower, including closed and unsettled loans.

Total personal loan amount (including interest) (TLA, Total Loan Amount)
The total amount of all current loans to a borrower, including principal and interest payable.(After deducting the portion that has been repaid)

Total personal repayment amount (TRA, Total Repayment Amount)
The total amount of payments made by a borrower, including principal and interest.

UNIT
It is the native cryptocurrency of the Treasurenet blockchain and is used to pay network transaction fees and provide operating power for decentralized applications.

TCash daily interest rate (TCASHDIR, TCash Daily Interest Rate)

TCash loan pledge early warning line (TCASHMCT, TCash Margin Call Threshold)

TCash Loan Pledge Liquidation Threshold (TCASHLT, TCash Liquidation Threshold)

TCash Mint Status (TCASHMS, TCash Mint Status)

TCash Repayment Cycle (TCASHRC, TCash Repayment Cycle)

Loan interest settlement times (IST, interest settlement times)

Part 2 General Description
1. Product functions
1.1.TCash

TCash is Treasurenet's stablecoin, the least volatile token. It was anchored to 1 US dollar when it was created and aims to provide users with a stable and efficient digital currency.Around TCash, Treasure has created a visualization system for users.This system aims to provide everyone with a convenient and easy-to-use digital asset management method, allowing everyone to manage their digital assets more efficiently.
1.2 Loan function
This product provides decentralized loan services for users holding UNIT tokens (or other authorized digital assets). The specific process is as follows:
Mortgage assets
Users stake UNIT or other authorized digital assets to smart contracts to determine the maximum amount of TCash loans available.
Determine the credit limit
The system will automatically calculate the amount of TCash that the user can lend based on the amount of collateral and the current market price.
grant loans
After verifying the collateral and credit, the smart contract automatically issues the corresponding amount of TCash to the user's decentralized wallet.
Dynamic risk control
The contract will monitor the mortgage rate in real time.If the value of the collateral drops significantly or the market fluctuates significantly, the contract will trigger corresponding risk management mechanisms (such as increasing mortgage requirements or issuing early warnings) to ensure overall loan safety.

1.3 Repayment function
After obtaining a TCash loan, users can return the lent TCash (or other supported tokens) at any time through the repayment function and get back the collateral. The process is as follows:
Repayment amount calculation
The amount that needs to be repaid depends on factors such as the initial loan principal, the agreed interest rate, and the length of the loan.
Initiate a repayment request
The user sends the required repayment TCash (or other tokens) to the contract address by calling the repayment smart contract interface.
Contract automatic settlement
After receiving the repayment, the smart contract will automatically write off part or all of the user's debt; if the user pays off the loan in full, the collateral corresponding to the principal will be automatically unfrozen and returned to the user.

1.4 Bidding function
To ensure the sustainable operation of the loan system, smart contracts can trigger an auction or liquidation mechanism when a borrower cannot repay the loan on time or the value of the collateral is insufficient to cover the loan.At this time, the third party can obtain the collateral through bidding, thereby maintaining the overall financial security of the system:
Default trigger
When a borrower is overdue or his mortgage rate falls below the system's preset threshold, the smart contract is triggered to enter the auction process.
public auction
The borrower's collateral will be placed in the open market or contract system for bidding, and third parties can bid for the collateral.
Ensure system security
The funds obtained from the auction are used to repay or partially repay the borrower's debt, avoid the accumulation of bad debts, and ensure the stable operation of the system.

2. Related projects
2.1 Contract
2.1.1 Github address
https://github.com/treasurenetprotocol/smart-contracts
branch: feature/2.0.1

2.2 User interaction front-end page
2.2.1 Github address
https://github.com/treasurenetprotocol/treasurenet-tnservices-servicesplatform-fe
branch: feature/1.0.2

2.3 User interaction backend service
2.3.1 Github address
https://github.com/treasurenetprotocol/treasurenet-tnservices-platform
branch: feature/2.1.2

2.4 tngateway
Provide basic services such as ABI for front-end and back-end
Provide data interface services collected by Dataprovider for the front and back ends
2.4.1 Github address
https://github.com/treasurenetprotocol/treasurenet-tnservices-tngateway
branch: feature/1.0.1

2.5 Data Provider
TN general data collection service (contract monitoring)
2.5.1 Github address
https://github.com/treasurenetprotocol/treasurenet-tnservices-dataprovider
branch: feature/1.0.0


2.6 Feeder
TN Oracle module is mainly responsible for collecting off-chain data and sending it to smart contracts
2.6.1 Github address
https://github.com/treasurenetprotocol/treasurenet-tnservices-feeder
branch: feature/2.1.1

2.7 DataProcess
TN manufacturer module scheduled task program, the core business is to extract data from the customer's MSSQL, clean, organize and pre-process the data and then store it in the mongoDB database for use by DataUploader
2.7.1 Github address
https://github.com/treasurenetprotocol/data-process
branch: feature/1.0.0

2.8 DataUploader
TN producer module scheduled task program, the core business is to send the data processed by DataProcess to the blockchain network.
2.8.1 Github address
https://github.com/treasurenetprotocol/data-upload
branch: feature/1.0.0

2.9 Test script
Test scripts for automated testing tools
2.9.1 Github address
https://github.com/treasurenetprotocol/AutoTestArk
branch: main



Part 3 Detailed Design
1. System architecture design
1.1 Architecture Overview

1.2 Architectural Key Points
1.2.1 TAT
As a standard ERC20 token, the acquisition process of TAT involves many steps such as physical assets (such as oil, natural gas) or digital assets (such as ETH, BTC) applying for access to the mine, strict review, obtaining and uploading output, government data verification, and minting.This project does require TAT-related data for reference, but this is not the focus of this document. If you want to know more, please refer to the TAT-related product requirements document.

1.2.2 TN service platform
The TN service platform is a user interaction page for users to perform a series of operations such as loans and repayments, which covers front-end and back-end services.It is important to note that the back-end service of the platform relies on the TNGateway API to collect data on its supply chain and does not collect it on its own.The criterion for distinction is: any data source from the chain is collected by the Dataprovider and sent to the back-end service through the TNGateway API. The back-end service only forwards data; while data from this platform (such as login) is processed and stored by the back-end service of this platform.

1.2.3 TNGateway & Dataprovider
TNGateway provides data sources on the chain for all front-end and back-end services of the TN project, and its self-module Dataprovider is carefully designed to be an independent repo specifically used to collect on-chain information.

1.3 Core content description
1.3.1 User interface
1. Function
Provide users with a visual operation interface for TCash-related finance, such as loans, repayments, auctions, etc.
Provide users with a query page for TCash-related financial operations and historical transaction records.
2. Interaction
Use metamask to build, sign and send transactions to the blockchain network
Use Restful API to communicate with the external interface of the background service

1.3.2 TCash Contract
1. Function
Loan:
Borrowing limit calculation: Calculate the borrowing limit based on the value of the user's mortgage assets or credit score.
Mortgage and liquidation mechanism: When the value of the collateral is insufficient to cover the borrowing, the contract will perform automatic liquidation or additional mortgage operations to ensure the safety of the system's funds.
Flexible repayment: Provide full early repayment or installment repayment to meet the diverse needs of users.
Auction:
Collateral liquidity processing: When a borrower defaults or the collateral value is insufficient, TCash can automatically trigger the auction process and auction the mortgage assets to the highest bidder.
Transparent and fair: The auction process is publicly viewable on the blockchain, ensuring that all participants see the same bidding information.
Data query and statistics:
Account balance and liability inquiry: Users can check their deposit balance, outstanding loans, collateral status and other information in TCash at any time.
System status and historical records: Key information such as auction history, overall system liquidity, and default rate can be queried to facilitate decision-making or auditing.

2. Interaction
TCash typically identifies users by their blockchain wallet address, eliminating the need for an additional centralized registration process.
Perform permission restrictions or multi-signature (Multi-Sig) verification on sensitive functions such as auction initiation, mortgage operations, and liquidation operations.
The smart contract calculates the maximum borrowing amount based on the value of the existing collateral.
After the repayment is completed, the contract automatically unlocks the collateral and returns the remaining collateral to the user.

1.4 Key processes
Process 1: Stake tokens and obtain loans
Pledge operation: Users mortgage their digital assets (such as UNIT, etc.) into smart contracts and obtain the corresponding TCash loan amount based on the preset mortgage rate.
Asset Lock: Collateral is locked in the contract until the borrower repays the loan or triggers liquidation.
Process 2: Use the loan to participate in financial activities
Usage of funds: TCash loans obtained by users can be used for a variety of investments, transactions or decentralized finance (DeFi) activities such as liquidity mining.
Pay attention to the mortgage rate: Borrowers need to continue to pay attention to the value of the collateral and market fluctuations to prevent the mortgage rate from triggering an early warning or liquidation due to a price drop.
Process 3: Daily settlement and interest generation
Interest calculation and debt update: The platform will calculate interest and update the user's total debt balance according to the agreed period (such as daily).
Dynamic risk control: If the value of the collateral drops significantly, the system will evaluate in real time whether the mortgage rate is close to the liquidation line and take corresponding measures (such as early warning prompts) based on the risk strategy.
Process 4: Partial or full repayment
Self-repayment: Users can repay part or all of their TCash loan at any time to reduce the size of their debt.
Reduce liquidation risk: After partial repayment, the mortgage rate will increase, thereby reducing the risk of liquidation.
Process 5: Early warning and liquidation triggering
Early warning reminder: When the mortgage rate approaches the early warning line, the system will prompt the user to add additional collateral or repay part of the loan to prevent the mortgage rate from falling further.
Perform liquidation: If the mortgage rate drops below the liquidation line, the system will liquidate the collateral and the proceeds will be used to repay the debt.
Process 6: Auction Phase
Enter the auction: During the liquidation process, the collateral will be put into the auction system to recover funds through open bidding.
Debt settlement: The proceeds from the auction will be used first to repay the borrower's debt, and if there are remaining funds, they will be returned to the borrower.

2. Detailed design
2.1 Transformation of ParameterInfo
2.1.1 Function description
In the ParameterInfo contract in the Governance module, the relevant configuration parameters can be initialized and set, and the parameters can be read and modified in the following ways:

Initial configuration: When deploying or upgrading the contract, assign initial values to various parameters.
Modify configuration: call the setPlatformConfig function through multi-signature (Multisig) to dynamically adjust parameters.
Query configuration: Anyone can query the current configuration value through the getPlatformConfig function to meet the needs of front-end display and other contract calls.
This mechanism can ensure the security, transparency and easy maintenance of the core parameters of the platform.
2.1.2 Parameter description
Parameter Parameter name Input format Initial value Valid range Meaning and description
TCASHDIR TCash loan daily interest rate uint256 5 >0 is derived from the actual ratio 0.05% * 10000
TCASHMCT early warning line uint256 1,200,000 120% * 10000
TCASHLT liquidation line uint256 1,100,000 110% * 10000
TCASHRC repayment cycle uint256 365 365 liquidations

2.2 ERC20 standard contract functions
2.2.1 Function description
TCash inherits from the standard ERC20 smart contract (implemented based on OpenZeppelin) and thus has basic functions consistent with mainstream ERC20 tokens (such as balance inquiry, transfer, authorization, etc.).On this basis, some expansion functions have been added to TCash according to the needs of this project to form a complete TCash contract function system.

2.2.2 Function description
2.2.2.1 ERC20 standard functions
1. Inheritance contract
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
This contract inherits from the ERC20 contract provided by OpenZeppelin, ensuring consistency with standard ERC20 tokens.

2. Functional points
Name: TCash
Abbreviation (symbol): TCASH
Precision (decimals): 18
The corresponding smallest unit of measurement is 1e18 (i.e. atto-TCash).

3 means specification
The smallest unit is called "atto-TCash", denoted as aTCash; 1 TCash = 1e18 aTCash.
For easy memory and display, common measurement units such as "K", "M", and "B" can be used (for example: 1K = 1,000 aTCash, 1M = 1,000,000 aTCash, and so on), which can be formatted and displayed in the front end or tool.

4 Initial casting
Initial minting amount: 1,000,000 TCash.
Initial receiving account: a designated account (to be determined).
This method can be completed once when the contract is deployed, and the tokens are allocated to designated accounts for subsequent operations or distribution.

2.3 Feeder and Oracle business logic adjustment
2.3.1 Function description
Since the existing FeederModule and Oracle do not have the features to detect prices and initiate TCASH casting lock functions, they need to be adjusted.
2.3.2 Process

2.3.3 Brief description of adjustments
Parameter Parameter name Initial value Valid range Meaning and description
TCASHMLP TCASH casting locked price 0 0: TCASH casting status is allowed! 0: TCASH casting status is prohibited
TCASHMLT TCASH Casting Lock Line 3,000 0-10000 30% * 10,000
TCASHMRST TCASH Casting Recovery Line 11,000 110% * 10,000
TCASHMS TCASH casting status true (for Oracle contract) true: allowed false: prohibited

Before the Feeder uploads the price normally, it must first determine whether the TCash casting lock price is 0.If the price is 0 (which means TCash is in a normal casting state at this time), then the historical price is used to determine whether the 1-hour drop exceeds 30% (this value should be configurable). If it reaches this drop, the price at this time is stored as the TCash casting lock price, and a transaction is sent to the Oracle contract to mark the current TCash casting status (TCASHMS) as prohibited (false).When the price gradually rises back to 110% of the TCash minting lock price (this value should also be configurable), the TCash minting lock price is stored as 0 and a transaction is sent to the Oracle contract to mark the current TCash minting status (TCASHMS) as allowed (true).

2.4 TAT business logic adjustment
2.4.1 Function description
Since the existing TAT casting function (TAT._mint) cannot record the number of castings and recent casting records, it needs to be adjusted.

2.4.2 Process


2.4.3 Contract function
2.4.3.1 setTATRecord
2.4.3.1.1 Function description
Main purpose: Store and update TAT (Token Airdrop/Token Allocation or other business meaning) records of a specific user.
Applicable scenarios: Called by ProductionData (or other authorized contracts/accounts) to record the number of tokens minted by the user in a certain year and month (the year and month are combined into a uint256).
2.4.3.1.2 Parameter description
Parameter Parameter name Parameter type Meaning and description
Input account address user address
amount uint256 Amount of minted tokens
month uint256 year month
2.4.3.1.3 Execution identity
ProductionData only
2.4.3.1.4 Interface description
Data structure design
It is recommended to maintain a structure similar to mapping(address => TATRecord) in the contract, where TATRecord can store the number of minted tokens in the last three years and months.
Multiple beneficiary scenario
If there are multiple beneficiaries, you need to consider how to distinguish the records of different beneficiaries in the business logic.
Only the well owner's share of the proceeds is treated here as per product demand.
update strategy
When the function is called, it needs to read the existing records, update the data corresponding to the year and month, and then write the results back to the storage structure.
Because data is retained for 3 months, the oldest record needs to be overwritten when updating.

2.4.3.2 getTATRecord
2.4.3.2.1 Function description
Main purpose: Expose the query interface to the outside for callers to view the TAT minting records of a specific user in the last 3 months.
2.4.3.2.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address user address
Output months uint256[] The corresponding year and month in the returned record
amounts uint256[] has a one-to-one correspondence with the months array, indicating the amount of minting in each month.
Description:
The array lengths of months and amounts must be consistent and match the internal storage logic of the contract.
2.4.3.2.3 Execution identity
Public, anyone can call it.

2.5 Personal and system parameters
2.5.1 Personal parameters
2.5.1.1 Parameter description
Abbreviation Full name Chinese meaning Description
PCL Personal Credit Limit refers to the upper limit of available credit limit approved by a financial institution for an individual (borrower).
Not stored directly: When needed, call getTATRecord and calculate it by taking the average value × 12 (if there are less than 2 records, it is calculated by the average value × 3).
ALB Available Loan Balance Personal loan balance refers to the remaining amount of loans that individuals can continue to obtain after calculation based on the credit limit and the current loan limit.
This name is Borrowable in the product documentation
Not stored directly: derived using PCL - TLA when needed.
NCL Number of Cleared Loans refers to the number of loans that the borrower has cleared, that is, all loans that have been repaid.
TNL Total Number of Loans refers to the total number of all loans of the borrower, including outstanding and settled loans.
TLA Total Loan Amount Total personal loan amount (including interest) refers to the total amount of all current loans of an individual, including principal and interest payable.
TRA Total Repayment Amount refers to the total repayment amount paid by the borrower, including principal and interest.
Tips:
Among the parameters listed in the table, PCL and ALB are not directly stored in the contract, but are calculated from other information.
The remaining parameters can be selectively saved on the chain according to business needs so that they can be queried and updated at any time.

2.5.1.1 Contract function
2.5.1.1.1 _setPersonalLoanData
2.5.1.1.1.1 Function description
Record and update personal parameter information.Suitable for personal parameters that need to be stored persistently on the chain (such as NCL, TNL, TLA, TRA, etc.).
2.5.1.1.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input Key str is used to distinguish specific personal parameter fields that need to be modified (such as TLA, TNL, etc.).
Value uint256 The new value of the corresponding parameter.

2.5.1.1.1.3 Execution identity
internal

2.5.1.1.2 getPersonalLoanData
2.5.1.1.2.1 Function description
Used to query personal parameter information, usually called by the front end or other contracts to obtain the user's relevant loan data.
2.5.1.1.2.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output NCL uint256 The number of individual loans that have been settled.
TNL uint256 Total number of personal loans.
TLA uint256 Total personal loan amount (including interest).
TRA uint256 Total amount repaid by the individual.

2.5.1.1.2.3 Execution identity
Public
2.5.1.1.2.4 Storage logic
The data needs to be stored with "personal address" as the dimension, that is, a structure such as mapping(address => PersonalLoanData), which is used to distinguish the data of different users.

2.5.2 System parameters
2.5.2.1 Parameter description
Abbreviation Full name Chinese meaning Description
OLB Outstanding Loan Balance The total amount of outstanding loans (including interest) refers to the total amount of loan principal and interest that have not been repaid as of the current date.
RA Repaid Amount The amount that has been repaid (including interest) refers to the total amount of loan principal and interest that has been repaid as of the current date.
TLD Total Loan Disbursed refers to the total amount of loans that have been disbursed, including loan principal and related interest.

2.5.2.2 Contract function
2.5.2.2.1 _setSysLoanData
2.5.2.2.1.1 Function description
Record and update system global parameter information, including indicators such as the total amount of outstanding loans, repaid amounts, and total loan disbursements.
2.5.2.2.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input Key str is used to distinguish specific system parameter fields that need to be modified (such as OLB, RA, TLD, etc.).
Value uint256 The new value of the corresponding parameter.

2.5.2.2.1.3 Execution identity
internal

2.5.2.2.2 getSysLoanData
2.5.2.2.2.1 Function description
Query system global parameter information, usually called by the front end or other contracts, to display or analyze the overall loan data of the system.
2.5.2.2.2.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output OLB uint256 The total amount of outstanding loans (including interest).
RA uint256 Amount repaid (including interest).
TLD uint256 Total amount lent (including interest).

2.5.2.2.2.3 Execution identity
Public

2.5.2.3 Contract events
2.5.2.3.1 PersonalLoanData
2.5.2.3.1.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event NCL uint256 The number of loans that an individual has settled.
TNL uint256 Total number of personal loans.
TLA uint256 Total personal loan amount (including interest).
TRA uint256 The total amount of personal repayments.

2.5.2.3.2 SysLoanData
2.5.2.3.2.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event OLB uint256 The total amount of outstanding loans (including interest).
RA uint256 Amount repaid (including interest).
TLD uint256 Total amount lent (including interest).



2.6 Risk coefficient
2.6.1 Coefficient description
Abbreviation Full name Chinese meaning Description
PRF Personal Risk Factor Personal risk factor is used to evaluate an individual's overall risk level in terms of credit, liabilities, repayment ability, etc.
SRF Systemic Risk Factor Systemic Risk Factor measures the potential impact of external macroeconomics, industry risks, overall market fluctuations, etc. on the system level.
CRF Comprehensive Risk Factor Comprehensive risk factor is an overall risk factor derived from the multi-dimensional assessment results of an individual's (or enterprise's) internal risks and external environmental risks.
The name in the product documentation is "Comprehensive Risk Factors", which is "Risk Factors" in English.

2.6.1 Contract interface design
2.6.1.1 getPRF
2.6.1.1.1 Function description
Calculates and returns the Personal Risk Factor (PRF).
Called by the front end or other contracts, the risk coefficient of the specified user can be obtained in real time.
2.6.1.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output PRF uint256 personal risk factor

2.6.1.1.3 Execution identity
Public
2.6.1.1.4 Logic

1. Obtain basic data
Obtain information from getPersonalLoanData such as total personal loan amount (including interest) (TLA), number of personally settled loans (NCL), total number of personal loans (TNL), etc.
Use the Personal Credit Line (PCL) obtained previously, or dynamically calculated via getTATRecord.
2. Special circumstances
TNL-NCL <= 5 PRF is directly equal to 1 and is no longer calculated.
3. Loan share = TLA / PCL
According to the range of the loan share, the corresponding "loan share coefficient" is obtained:
Scope Loan share coefficient
[0,85%] 1
(85%,95%] 0.8
>95% 0.6

4. Normal repayment ratio = NCL / TNL
According to the range of the normal repayment ratio, the corresponding "loan settlement ratio coefficient" is obtained:
Scope Closed loan ratio coefficient
0 0.2
(0,30%] 0.4
(30%,60%] 0.5
(60%,80%] 0.8
>80% 1

5. PRF calculation
PRF = Loan share factor * Closed loan ratio factor

2.6.1.2 _calculateSRF
2.6.1.2.1 Function description
Calculates and returns the System Risk Factor (SRF).
It is automatically called internally by the system only when daily clearing or specific cycle tasks are executed to reduce the performance pressure of real-time calculations.
2.6.1.2.2 Parameters
None
2.6.1.2.3 Execution identity
internal
2.6.1.2.4 Logic
1. Obtain basic data
Obtain OLB (total loan amount outstanding, including interest), RA (amount repaid, including interest), and TLD (total loan amount, including interest) through getSysLoanData.
Query TotalSupply (current issuance of TCash) from the ERC20 standard contract.
2. System loan ratio = OLB / TotalSupply
According to the proportion interval, the corresponding "system lending proportion coefficient" is obtained:

3. Total system repayment rate = RA / TLD
According to the repayment rate range, the corresponding "system total repayment rate coefficient" is obtained:

4. SRF calculation
SRF system total repayment rate
(30%,∞) (20%,30%] (10%,20%] (5%,10%] [0%,5%]
System loan ratio [0,60%) 1 0.9 0.7 0.5 0.3
[60%,70%) 0.9 0.8 0.7 0.4 0.2
[70%,80%) 0.8 0.7 0.6 0.3 0.1
[80%,90%) 0.5 0.4 0.3 0.2 0.1
[90%,∞) 0.2 0.1 0.1 0.1 0.1

2.6.1.3 getSRF
2.6.1.3.1 Function description
 Query the latest System Risk Factor (SRF).
 Generally, after the execution of _calculateSRF is completed, the result is stored in the contract state variable for this function to return externally.

2.6.1.3.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output SPRF uint256 System risk factor (SRF)

2.6.1.3.3 Execution identity
Public

2.6.1.4 getCRF
2.6.1.4.1 Function description
Calculate and return the Comprehensive Risk Factor (CRF) to evaluate the overall risk level under the combined influence of personal risk and system risk.

2.6.1.4.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output CRF uint256 comprehensive risk coefficient

2.6.1.4.3 Execution identity
Public
2.6.1.4.4 Logic
1. First obtain or calculate PRF and SRF
Call getPRF() to get the latest personal risk factor.
Call getSRF() to obtain the latest system risk coefficient.
2. CRF calculation
CRF = PRF * SRF

2.7 Loan function
2.7.1 Function description
TCash provides decentralized lending services to users holding UNIT tokens (or other authorized digital assets).Users can obtain a TCash loan amount corresponding to the mortgage value by mortgaging a certain amount of UNIT.
2.7.2 Page description

2.7.2.1 Get real-time prices
2.7.2.1.1 Process

Get the contract address and ABI from Tngateway.
Call the Oracle contract to query the latest wTCash, wUNIT, etc. prices.
The price display is updated every 30 seconds, synchronized with the feeder's price push cycle.

2.7.2.1.2 Price acquisition rules
Feeder module: Responsible for collecting and sending price data to the Oracle contract, once every 30 seconds.
Price source: wTCash, wUNIT trading pairs on the ETH network; if the exchange price acquisition is abnormal, the default value will be used (1 wUNIT = 10 USD; 1 wTCash = 1 USD).
Front-end update: The page calls the Oracle interface every 30 seconds to update the price display.

2.7.2.2 Page field description
Field Meaning Range Data Source Description
credit check check getPersonalLoanData get PCL PCL == 0? failed: passed
Borrow loan TCash amount [0.000,000,001TCash, maximum loanable amount] User input
Calculation based on user input The user can enter this value first and the system will calculate the mortgage amount.
Collateral mortgage UNIT quantity (0, user account balance] user input
Calculation based on user input The user can enter this value first and the system will calculate the loanable amount.
TCashPrice TCash unit price - obtained from Oracle contract query. This is actually the price of wTCash.
UnitPrice UNIT unit price is obtained from Oracle contract query. This is actually the price of wUnit.
ALB The maximum amount of TCash that can be loaned to the current login account getPersonalLoanData Gets PCL and TLA calculations Also called Borrowable in the product documentation.
Balance Current login account UNIT balance Obtain native token balance using web3
CRF risk factor obtained by getCRF function
DailyInteralRate Daily interest rate Query TCASHDIR from ParameterInfo

2.7.2.4 Calculation method
2.7.2.4.1 Calculated based on the number of UNIT input by the user

Among them:
The comprehensive risk factor (CRF) is obtained by the getCRF function
Need to satisfy: [0.000000001 TCash, min[Lend TCash, ALB]
2.7.2.4.2 Calculation based on the number of TCash input by the user

Among them:
The comprehensive risk factor (CRF) is obtained by the getCRF contract function

2.7.3 Contract interface design
2.7.3.1 Process

The user enters the mortgage amount or desired loan amount on the front end.
The front end calls calculateLoanAmount (if the mortgage amount is entered) or the corresponding calculation interface (if the lending amount is entered) to determine the loanable amount or the required mortgage amount.
After the user confirms, call the loan function to submit the transaction.
The contract internally updates the loan record and updates related personal and system-level parameters.
2.7.3.2 Contract function
2.7.3.2.1 checkMintLock
2.7.3.2.1.1 Function description
Determine whether the current casting lock state is
2.7.3.2.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Output TCASHMS uint256 true: allowed false: prohibited
2.7.3.2.1.2 Execution identity
public

2.7.3.2.2 calculateLoanAmount
2.7.3.2.2.1 Function description
Used to calculate the amount of TCash that a specified user can lend when mortgaging a certain UNIT.
2.7.3.2.2.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address user address
Output amount uint256 Number of loanable TCash

2.7.3.2.2.3 Execution identity
public
2.7.3.2.2.4 Logic
Obtain the Comprehensive Risk Factor (CRF) from the contract or by calling getCRF.
Obtain the personal credit line (PCL) and total personal loan (including interest) (TLA) through getPersonalLoanData, and calculate ALB = PCL - TLA.
Calculate loanable TCash based on msg.value (number of mortgaged UNITs) and real-time price (Oracle):

Need to meet: [0.000,000,001, min[TCash Amount, ALB]

2.7.3.2.3 _setRecord

2.7.3.2.3.1 Function description
Used to store or update loan records for subsequent calculation of interest and tracking of loan status.

2.7.3.2.3.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address user address
amount uint256 The amount of TCash loaned this time

2.7.3.2.3.3 Execution identity
internal
2.7.3.2.3.4 Storage logic
Parameter name Parameter type index Meaning and description
loanID uint256 Y Self-increasing number used to uniquely identify each loan record.
account address user address.
amounts uint256[] amounts[UNIT,TCASH]
time uint block.timestamp, records the initiation time.
interest uint256 interest amount
IST uint256 is initially 0, the number of interest settlements, each interest settlement +1
status uint Loan status: 0=in progress, 1=settled, 2=in warning, 3=in liquidation.
Note: Storage performance needs to be considered, especially when performing loop or batch operations, and the data structure must be properly designed to reduce Gas consumption.

2.7.3.2.4 loan

2.7.3.2.4.1 Function description
The main function called when a user initiates a loan transaction completes the actual borrowing operation.

2.7.3.2.4.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address Borrower address
amount uint256 Amount of TCash lent

2.7.3.2.4.3 Execution identity
Public

2.7.3.2.4.4 Process

Verify whether the user's mortgage amount and loan limit are reasonable.
Record/update loan information (call _setRecord, etc.).
Update the following information:
Total number of personal loans (TNL)
Total personal loan (including interest) (TLA)
Total loans outstanding (OLB, system level)
Total amount lent (TLD, system level)
The corresponding amount of TCash will be issued to the user address.

2.7.3.3 Contract events
2.7.3.3.1 LoanRecord
2.7.3.3.1.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event loanID uint256 self-increasing number, used to uniquely identify each loan
account address account
amounts uint256[] amounts[UNIT,TCASH]
prices uint256[] prices[UNIT,TCASH]
CRF uint256 risk factor
interest uint256 interest amount
IST uint256 is initially 0, the number of interest settlements
status uint Loan status: 0=in progress, 1=settled, 2=alert, 3=liquidating

2.7.4 Dataprovider collection design
2.7.4.1 Loan records
2.7.4.1.1 Data storage
The loan record collection (LoanRecords) is used to persist the LoanRecord event information triggered on the chain.
2.7.4.1.2 Data source
Listen to the contract event LoanRecord and grab relevant parameters.
2.7.4.1.3 Storage logic

2.7.4.1.4 Data correspondence
Event parameter name Storage parameter name Data processing Description
loanID loanID -
account account toLowerCase
amounts[0] UnitAmount Large number conversion Reduce 1e18
amounts[1] TCashAmount large number conversion reduced to 1e18
prices[0] UnitPrice data conversion reduce 1e4
prices[1] TCashPrice data conversion reduce 1e4
CRF CRF data conversion reduce 1e4
interest interest large number conversion reduce 1e18
IST IST -
status status -


2.8 Repayment function
2.8.1 Function description
Users need to repay a certain TCash loan. After successful repayment, the pledged UNIT will be returned according to the repayment ratio.
2.8.2 Page description

2.7.2.1 Page field description
Field Meaning Data Source Description
Outstanding loan amount /api/v1.0/loanDetail data.loan.current.TCashAmount + data.loan.current.insterest
Collateral mortgage amount /api/v1.0/loanDetail data.loan.current.UnitAmount
TCash Balanace TCash balance ERC20.balanceOf() function obtains the current user’s TCash token balance in the contract
If the user repays the loan in full, the repayment amount should include the loaned TCash principal and accumulated interest.

2.8.3 Contract interface design

2.8.3.1 Contract function

2.8.3.1.1 getRecord
2.8.3.1.1.1 Function description
Query the loan record of the specified loanID so that the front end or other contracts can obtain the detailed status of the current loan.
2.8.3.1.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input loanID uint256 The unique number of the loan record
Output loanID uint256 self-increasing number
account address borrower's address
amounts uint256[] amounts[UNIT,TCASH]
time uint block.timestamp
interest uint256 interest amount
IST uint256 Number of interest settlements,
status uint 0: Loan in progress
1: The loan has been paid off
2: Alert in progress
3: In liquidation

2.8.3.1.1.3 Execution identity
Public

2.8.3.1.1 repay
2.8.3.1.1.1 Function description
The core function called when the user repays, partially or fully repays the corresponding loan according to the repayment amount entered by the user, and releases the collateral according to the repayment ratio or settlement situation.
2.8.3.1.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address Borrower address
loanID uint256 loan record number
amount uint256 The TCash amount of the user’s current repayment

2.8.3.1.1.3 Execution identity
Public
2.8.3.2.1.4 Process

1. Verification
Confirm whether the loanID status allows repayment (if the status is settled or liquidating, repayment is not allowed).
Confirm that the user's repayment amount is reasonable and the user's balance is sufficient.
2. Update data
Loan record (record): Update amounts, interest, status and other fields.
It should be noted when updating records that if it is a partial repayment, the interest portion will be repaid first.
Number of personal closed loans (NCL): If the loan is fully closed after this repayment, add this number +1.
Total Personal Loan (including interest) (TLA): Updates the decrease in total personal loan (including interest).
Total Individual Repayment (TRA): Increase the amount of this repayment.
Total loan amount outstanding (OLB, system includes interest): reduce the corresponding value.
Amount already repaid (RA, system includes interest): Increase the amount of this repayment.
Total amount lent (TLD, system including interest): Update total
3. Release collateral
If the loan is partially repaid after this repayment, UNIT will be released proportionally.
If all are settled, all remaining mortgage UNITs are released and the status is updated to "Settled".
4. Trigger event
Through the RepayRecord event, the repayment amount, released mortgage amount, timestamp, etc. are recorded.

2.8.3.2 Contract events
2.8.3.2.1 RepayRecord
2.8.3.2.1.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event loanID uint256 self-increasing number, used to uniquely identify each loan
account address borrower's address
TCashAmount uint256 The amount of TCash repaid by the user this time
UnitAmount uint256 Amount of UNIT released due to repayment (can be 0 or all)


2.8.4 Dataprovider collection design
2.8.4.1 Repayment records
2.8.4.1.1 Data storage
Repayment records are usually stored in the RepayRecords collection for statistics and analysis.
2.8.4.1.2 Data source
From contract event RepayRecord.
2.8.4.1.3 Data correspondence
Event parameter name Storage parameter name Data processing Description
loanID loanID -- uniquely identifies each loan
account account toLowerCase
TCashAmount TCashAmount Large number conversion Reduce 1e18 repayment amount (TCash)
UnitAmount UnitAmount Large Number Conversion Reduce 1e18 Unpledge UNIT Quantity

2.9 Increase loan collateral
2.9.1 Function description
When the borrower's existing pledge ratio is insufficient due to risk control assessment or market fluctuations, more assets (such as UNIT) can be pledged additionally to increase the pledge ratio.The "Add Loan Collateral" function allows users to add additional collateral to the current loan to ensure that its pledge rate meets or exceeds the warning line and avoids further risk operations (such as liquidation).
2.9.2 Page description

2.9.2.1 Page field description
Field Meaning Data Source Description
Outstanding loan amount /api/v1.0/loanDetail data.loan.current.TCashAmount + data.loan.current.insterest
Collatoral mortgage amount /api/v1.0/loanDetail data.loan.current.UnitAmount
TCash Price TCash price is obtained from Oracle contract query. This is actually the price of wTCash.
Unit Price Unit price is obtained from Oracle contract query. This is actually the price of wUnit.
TCash Value TCash Value Calculation Outstanding * TCash Price
Unit Value Unit Value Calculation Collatoral * Unit Price
Collatoral Rate Collateral Rate /api/v1.0/loanDetail data.loan.current.UnitAmount * data.loan.current.UnitPrice / ( (data.loan.current.interest+ data.loan.current.TCashAmount) * data.loan.current.TCashPrice)
Early warning threshold Early warning line Query TCASHMCT from parameterInfo

2.9.2 Contract interface design

2.9.2.1 Contract function

2.9.2.1.1 collateralTopUp
2.9.2.1.1.1 Function description
When the user needs to add new collateral based on the existing loan (loanID), call this function to submit the transaction.The contract will record additional collateral to the corresponding loan and update the pledge rate or risk status.
2.9.2.1.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account address user address
loanID uint256 The unique number of the target loan

2.9.2.1.1.3 Execution identity
Public
2.9.2.1.1.4 Process

1. Verification
Confirm that the loanID status allows additional collateral (if not liquidated).
Verify the amount of collateral passed in or transferred by the user msg.value.
2. Update loan information
Adjust the number of UNIT mortgages in the corresponding loan records.
3. Event triggering
Trigger the CollateralTopUpRecord event for off-chain data collection.


2.9.2.2 Contract events
2.9.2.2.1 CollateralTopUpRecord
2.9.2.2.1.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event loanID uint256 self-increasing number, used to uniquely identify each loan
account address user account address
amount uint256 The number of new collaterals this time (such as UNIT)

2.9.3 Dataprovider collection design
2.9.3.1 Add loan collateral records
2.9.3.1.1 Data storage
Repayment records are usually stored in the CollateralTopUpRecords collection for statistics and analysis.
2.9.3.1.2 Data source
Listen and parse the contract event CollateralTopUpRecord.
2.9.3.1.3 Data correspondence
Event parameter name Storage parameter name Data processing Description
loanID loanID -- loan number
account account toLowerCase
amount amount Large number conversion Reduce 1e18 Actual increased amount of collateral


2.10 Record viewing function
2.10.1 Page description
2.10.1.1 Loan records

2.10.1.1.1 Page field description
Field Meaning Data Source Description
No. Loan number /api/v1.0/loanlist result.loanID
Date loan date /api/v1.0/loanlist result.date
Loan TCash Loan TCash amount /api/v1.0/loanlist result.TCashAmount
Collateral mortgage UNIT amount /api/v1.0/loanlist result.UnitAmount
Unrepaid Total amount to be repaid /api/v1.0/loanlist result.TcashAmount + result.Interest
Repayment Status /api/v1.0/loanlist result.status: 0=in progress, 1=settled, 2=in warning, 3=in liquidation.
wstatus warning status /api/v1.0/loanlist result.status == 2?true:false
cstatus liquidation status /api/v1.0/loanlist result.status == 3?true:false

2.10.1.2 Loan details page

2.10.1.2.1 Page field description
2.10.1.2.1.1 Header
Field Meaning Data Source Description
loanID loan number /api/v1.0/loanDetail data.loan.original.loanID
Borrow Time loan date /api/v1.0/loanDetail data.loan.original.date
Repayment Status Repayment Status /api/v1.0/loanDetail data.loan.current.status
2.10.1.2.1.2 Initial Data
Field Meaning Data Source Description
Collateral pledge amount /api/v1.0/loanDetail data.loan.original.UnitAmount
UNIT Price UNIT unit price /api/v1.0/loanDetail data.loan.original.UnitPrice
UNIT Value UNIT value /api/v1.0/loanDetail data.loan.original.UnitAmount * data.loan.original.UnitPrice
Borrow TCash amount /api/v1.0/loanDetail data.loan.original.TCashAmount
TCash Price TCash unit price /api/v1.0/loanDetail data.loan.original.TCashPrice
TCash Value TCash value /api/v1.0/loanDetail data.loan.original.TCashAmount * data.loan.original.TCashPrice
Risk Factors CRF /api/v1.0/loanDetail data.loan.original.CRF
Collateral Ratio /api/v1.0/loanDetail (data.loan.original.UnitAmount* data.loan.original.UnitPrice)/ (data.loan.original.TCashAmount* data.loan.original.TCashPrice)
Interest Rate Loan daily interest rate TCASHDIR ParameterInfo contract query TCASHDIR
2.10.1.2.1.3 Current Data
Field Meaning Data Source Description
Collateral pledge amount /api/v1.0/loanDetail data.loan.current.UnitAmount
UNIT Value UNIT value /api/v1.0/loanDetail data.loan.current.UnitAmount * data.loan.current.UnitPrice
Outstanding Amount to be repaid /api/v1.0/loanDetail data.loan.current.TCashAmount + data.loan.current.insterest
Outstanding Value /api/v1.0/loanDetail (data.loan.current.TCashAmount + data.loan.current.insterest) * data.loan.current.TCashPrice
Borrow loan amount /api/v1.0/loanDetail data.loan.current.TCashAmount
Interest interest /api/v1.0/loanDetail data.loan.current.insterest
Current Risk Factors CRF /api/v1.0/loanDetail data.loan.current.CRF
Current Collateral Ratio /api/v1.0/loanDetail data.loan.current.UnitAmount * data.loan.current.UnitPrice / ( (data.loan.current.interest+ data.loan.current.TCashAmount) * data.loan.current.TCashPrice)
2.10.1.2.1.4 Collateral Change Record
Field Meaning Data Source Description
time time /api/v1.0/loanDetail data.collateralChangeRecord.date
Event Event /api/v1.0/loanDetail data.collateralChangeRecord.event
0: Lending TCash, 1: Returning UNIT successfully 2. Add collateral
UNIT number of changes UNIT number of changes /api/v1.0/loanDetail data.collateralChangeRecord.change
Amount of collateral Collateral amount /api/v1.0/loanDetail data.collateralChangeRecord.amount
Collateral unit price Collateral unit price /api/v1.0/loanDetail data.collateralChangeRecord.price
Collateral value Collateral value /api/v1.0/loanDetail data.collateralChangeRecord.amount * data.collateralChangeRecord.price
Original collateral rate Collateral rate before increase /api/v1.0/loanDetail data.collateralChangeRecord.LTV[0]
Modified collateral rate Increased collateral rate /api/v1.0/loanDetail data.collateralChangeRecord.LTV[1]
2.10.1.2.1.5 Repayment Record
Field Meaning Data Source Description
Time time /api/v1.0/loanDetail data.repay.date
Event Event Fixed value "Repay"
TCash amount TCash amount /api/v1.0/loanDetail data.repay.TCashAmount
Collateral Released Return UNIT amount /api/v1.0/loanDetail data.repay.UnitAmount
2.10.1.2.1.6 Interest Record
Field Meaning Data Source Description
Time Time time /api/v1.0/interestlist data.date
Interest interest /api/v1.0/interestrlist data.interest

2.10.1.3 Repayment record page

2.10.1.3.1 Page field description
Field Meaning Data Source Description
Repayment Time Repayment time /api/v1.0/repaylist data.date
Borrow No. Loan number /api/v1.0/repaylist data.loanID
Repayment Amount Repayment TCash amount /api/v1.0/repaylist data.TCashAmount
Collateral Return Amount Return UNIT amount /api/v1.0/repaylist data.UnitAmount

2.10.1.4 Personal center page
The personal center page provides users with an overall overview of current loans, and visually displays loan status and repayment status through charts.

2.10.1.4.1 Page field description
2.10.1.4.1.1 My Loan
Field Meaning Data Source Description
Max borrowable amount Personal credit limit (PCL) Obtain PCL from TCash.getPersonalLoanData
Remaining borrowable amount Personal loanable balance (ALB) Obtain ALB from TCash.getPersonalLoanData
Outstaning TCash Total personal loan (including interest) (TLA) Obtain TLA from TCash.getPersonalLoanData
2.10.1.4.1.2 Chart 1
Field Meaning Data Source Description
Normal Normal number of loan records /api/v1.0/loadstatistic data["0"]+data["1"]
(0=in progress, 1=settled)
Warning Number of records in warning status /api/v1.0/loadstatistic data["2"]
Liquldated Number of records in liquidation status /api/v1.0/loadstatistic data["3"]
total data.totalLoan

2.10.1.4.1.2 Chart 2
Field Meaning Data Source Description
Unpaid total personal loan (including interest) (TLA) Obtain TLA from TCash.getPersonalLoanData
Repaid personal repayment total (TRA) Obtain TRA from TCash.getPersonalLoanData
Total TLA + TRA

2.10.2 API interface design
The following interfaces are located under the front-end gateway /api/v1.0/ and are used for data interaction between the front-end and the back-end.
2.10.2.1 GET /api/v1.0/loanlist
2.10.2.1.1 Interface description
Get a list of loan records and paginate them.
2.10.2.1.2 Processing logic
After performing necessary verification on the input parameters, forward them to /api/v1.0/tcash/loan of TN-gateway for data query.
2.10.2.1.3 Return value
{
code: 0,
data: {
page: 1,
pageSize: 20,
total: 1,
list: [
{
loanID: 1,
TCashAmount:100.1,
TCashPrice:10,
UnitAmount:10.9,
UnitPrice:10,
CRF:1,
intersest:0,
IST:0,
date:'2023-05-22T07:09:02.000Z',
status:0,
original:0
}
]
}
}

2.10.2.2 GET /api/v1.0/loanDetail
2.10.2.2.1 Interface description
Query the loan details of the specified loanID, including original data, current data, mortgage change records, repayment records, etc.
2.10.2.2.2 Processing logic
 Call multiple TN-gateway interfaces:
/api/v1.0/tcash/repay (repayment record)
/api/v1.0/tcash/loan/:loanID (loan record)
/api/v1.0/tcash/collateraltopup (additional mortgage record)
 Consolidate the returned data into data.collateralChangeRecord in chronological order.

2.10.2.2.3 Numerical relationship with TNgateway
Interface field tngateway URL tngateway Data field Description
data.loan /api/v1.0/tcash/loan/:loanID data
data.collateralChangeRecord A: /api/v1.0/tcash/repay
B: /api/v1.0/tcash/loan/:loanID
C: /api/v1.0/tcash/collateraltopup A.data
B.data
C.data aggregates the data obtained after data traversal
data.repay /api/v1.0/tcash/repay data
2.10.2.2.4 Return value
{
code:0,
data:{
loan:{
original: {
loanID: 1,
TCashAmount: 100.1,
TCashPrice: 10,
UnitAmount: 10.9,
UnitPrice: 10,
CRF: 1,
intersest: 0,
IST:0,
date: '2023-05-22T07:09:02.000Z',
status: 0,
},
current: {
loanID: 1,
TCashAmount: 100.1,
TCashPrice: 10,
UnitAmount: 10.9,
UnitPrice: 10,
CRF: 1,
intersest: 0,
IST:0,
date: '2023-05-22T07:09:02.000Z',
status: 0,
}
},
collateralChangeRecord:[
{
amount:150,
change:150,
price:10,
LTV:[0,1.5],
event:0, //0: Lending TCash, 1: Successfully repaying UNIT and returning UNIT 2. Add collateral
date: '2023-05-23T07:09:02.000Z',
},
{
amount:180,
change:30,
price:10,
LTV:[1.3,1.3],
event:2, //0: Lending TCash, 1: Successfully repaying UNIT and returning UNIT 2. Add collateral
date: '2023-05-23T07:09:02.000Z',
},
{
amount:170,
change:-10,
price:0,
LTV:[0,0],
event:1, //0: Lending TCash, 1: Successfully repaying UNIT and returning UNIT 2. Add collateral
date: '2023-05-23T07:09:02.000Z',
}
]
},
repay:[
{
loanID:1,
TCashAmount:3,
UnitAmount:1,
date: '2023-05-23T07:09:02.000Z',
},
{
loanID:1,
TCashAmount:2,
UnitAmount:0.6,
date: '2023-05-23T07:09:02.000Z',
},
]
}
2.10.2.3 GET /api/v1.0/interestlist
2.10.2.3.1 Interface description
Query the interest records of the specified user and (optional) loanID.
2.10.2.3.2 Processing logic
After performing necessary verification on the input parameters, forward them to /api/v1.0/tcash/interest of TN-gateway for data query.
2.10.2.3.3 Return value
{
code: 0,
data: [
{
loanID: 1,
interest: 10,
date: '2023-05-22T07:09:02.000Z',
},
{
loanID: 1,
interest: 10,
date: '2023-05-23T07:09:02.000Z',
}
]
}

2.10.2.4 GET /api/v1.0/repaylist
2.10.2.4.1 Interface description
Query the repayment records of the specified user (optional loanID).
2.10.2.4.2 Processing logic
After performing necessary verification on the input parameters, forward them to /api/v1.0/tcash/repay of TN-gateway for data query.
2.10.2.4.3 Return value
{
code:0,
data:[
{
loanID:1,
TCashAmount:3,
UnitAmount:1,
date: '2023-05-23T07:09:02.000Z',
},
{
loanID:1,
TCashAmount:2,
UnitAmount:0.6,
date: '2023-05-23T07:09:02.000Z',
},
]
}

2.10.2.5 GET /api/1.0/loanstatistic
2.10.2.5.1 Interface description
Used to return the current user's loan statistical information in order to generate statistical charts on the personal center page

2.10.2.5.2 Processing logic
 1. Obtain the list of all loan data of the user by calling /api/v1.0/tcash/loan of TN-gateway.
 2. Traverse all records, perform classification statistics based on their status field, and calculate the number of loans in each status and the total number of loans.
 3. Return statistical results to the front end for visual display.
2.10.2.5.3 Return value
{
code:0,
data:{
totalLoan:13,
"0":6,
"1":4,
"2":2,
"3":1
}
}

totalLoan represents the total number of loans for this user;
"0", "1", "2", and "3" respectively represent the number of loans in different statuses (0=in progress, 1=settled, 2=in warning, 3=in liquidation);

2.10.3 TN-gateway interface design
2.10.3.1 GET /api/v1.0/tcash/loan
2.10.3.1.1 Interface description
Get a list of qualifying loan records, which can be filtered by status, time range and other dimensions.
2.10.3.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account String (required) Current user’s account
loanID String (opt.) Filter results based on loanID
status Number (opt.) Filter results based on status
page Number (opt.) Page number defaults to 1
pageSize Number (opt.) The number of data items per page, the default is 20
dateFrom Date (opt.)Start time
dateTo Date (opt.) end time
sort String (opt.) Sorting field Default is reverse chronological order
2.10.3.1.3 Return value
{
code: 0,
data: {
page: 1,
pageSize: 20,
total: 1,
list: [
{
loanID: 1,
TCashAmount:100.1,
TCashPrice:10,
UnitAmount:10.9,
UnitPrice:10,
CRF:1,
intersest:0,
IST:0,
date:'2023-05-22T07:09:02.000Z',
status:0,
original:0
}
]
}
}

2.10.3.1.4 Query Collection
LoanRecords
2.10.3.1.5 Interface logic
It is necessary to process multiple records that may exist under the same loanID (original = true / false), and display the latest record as a list.

2.10.3.2 GET /api/v1.0/tcash/loan/:loanID
2.10.3.2.1 Interface description

2.10.3.2.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input loanID String (required) loan number

2.10.3.2.3 Return value
{
code:0,
data:{
original:{
loanID: 1,
TCashAmount:100.1,
TCashPrice:10,
UnitAmount:10.9,
UnitPrice:10,
CRF:1,
intersest:0,
IST:0,
date:'2023-05-22T07:09:02.000Z',
status:0,
},
current:{
loanID: 1,
TCashAmount:100.1,
TCashPrice:10,
UnitAmount:10.9,
UnitPrice:10,
CRF:1,
intersest:0,
IST:0,
date:'2023-05-22T07:09:02.000Z',
status:0,
}
}
}

2.10.3.2.4 Query collection
LoanRecords
2.10.3.2.4 Interface logic
This interface will return two records with original equal to true and false at the same time. The record with original equal to true is in data.original, and the record with original equal to false is in data.current.When there is no record with original set to false, data.current and data.original are consistent.

2.10.3.3 GET /api/v1.0/tcash/loan/interests
2.10.3.3.1 Interface description
Query interest details and support filtering by user or loanID.
2.10.3.3.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account String (required)User account
loanID String (opt.) loan number

2.10.3.3.3 Return value
{
code: 0,
data: [
{
loanID: 1,
interest: 10,
date: '2023-05-22T07:09:02.000Z',
},
{
loanID: 1,
interest: 10,
date: '2023-05-23T07:09:02.000Z',
}
]
}

2.10.3.3.4 Query collection
InterestRecords

2.10.3.4 GET /api/v1.0/tcash/loan/repay
2.10.3.4.1 Interface description
Query repayment details and support filtering by user or loanID.
2.10.3.4.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account String (required) User account
loanID String (opt.) loan number

2.10.3.4.3 Return value
{
code:0,
data:[
{
loanID:1,
TCashAmount:3,
UnitAmount:1,
date: '2023-05-23T07:09:02.000Z',
},
{
loanID:1,
TCashAmount:2,
UnitAmount:0.6,
date: '2023-05-23T07:09:02.000Z',
},
]
}

2.10.3.4.4 Query Collection
RepayRecords

2.10.3.5 GET /api/v1.0/tcash/loan/collateraltopup
2.10.3.5.1 Interface description
Query additional mortgage operation records and support filtering by user or loanID.
2.10.3.5.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input account String (required) User account
loanID String (opt.) loan number

2.10.3.5.3 Return value
{
code:0,
data:[
{
loanID:1,
amount:3,
price:10,
LTV:0.5,
date: '2023-05-23T07:09:02.000Z',
},
{
loanID:1,
amount:2,
price:10,
LTV:0.5,
date: '2023-05-23T07:09:02.000Z',
},
]
}

2.10.3.5.4 Query collection
CollateralTopUpRecords

2.11 Liquidation
At 0:00 UTC every day, FoundationManager regularly calls smart contracts through FoundationManagerTools to perform interest calculations, early warnings and liquidation checks on unsettled loans. This process is called "liquidation".
2.11.1 Contract interface design
2.11.1.1 Process

1. Scheduled task trigger
FoundationManagerTools Batch query for loan records that are active (status == 0) at a specified time (0 UTC daily).
2. Process one by one
For each qualifying loan, a special function in the contract is called to calculate the day's interest and determine whether to enter the warning or liquidation state.

2.11.1.2 Contract function
2.11.1.2.1 interestCalculation
2.11.1.2.1.1 Function description
Triggered regularly by FoundationManagerTools, it is used to calculate the daily interest on the loan record of the specified loanID, and determine whether to enter the warning or liquidation state based on the mortgage rate.
2.11.1.2.1.2 Parameters
Parameter Parameter name Parameter type Meaning and description
Input loanID uint256 Loan record unique number

2.11.1.2.1.3 Execution identity
FOUNDATION_MANAGER
2.11.1.2.1.4 Process

1. Obtain and verify records
Get the loan record corresponding to loanID from the contract or database (status == 0).
2. Calculate interest
interest=record.TCashAmount×TCASHDIR
Where TCASHDIR is the daily interest rate (obtained from the ParameterInfo contract).
3. Update value
Loan record (record)
Total personal loan (including interest) (TLA)
The total number of loans outstanding in the system (OLB)
System total loan amount (TLD)
4. Judgment and early warning

If satisfied, the recording status is set to 2 (alarming).
5. Judgment and liquidation

If satisfied, the record status is set to 3 (liquidating).
6. Determine the repayment cycle
IST>TCASHRC
If satisfied, the record status is set to 3 (liquidating).

2.11.1.2.1.5 Business logic
 Interest calculation is only performed on loans with status == 0 (in progress).
 If the loan status is already in warning (2) or liquidation (3), you can choose whether to update it again in this process or maintain the original status according to business needs.
 Updates and event triggering need to be done within the contract or in the off-chain database so that the Dataprovider can synchronize data.
2.11.1.3 Contract events
2.11.1.3.1 InterestRecord
2.11.1.3.1.1 Parameters
Parameter Parameter name Parameter type Meaning and description
Event loanID uint256 self-increasing number
account account user account address
interest uint256 interest amount

2.11.2 Dataprovider collection design
2.11.2.1 Repayment records
2.11.2.1.1 Data storage
Interest records are usually stored in the InterestRecords collection, and each record corresponds to an interest calculation event.
2.11.2.1.2 Data source
Listen to the contract event InterestRecord and obtain parameters such as loanID, account, interest, etc.
2.11.2.1.3 Data correspondence
Event parameter name Storage parameter name Data processing Description
loanID loanID -- loan number
account account toLowerCase
interest interest Large number conversion Reduce 1e18 to record the interest amount

3. Database design
3.1.1 Database type
The centralized cross-chain module of this project uses the non-relational database Mongo as the back-end database.Among them, the development environment uses a local Mongo database deployed through Docker, and the test network and main network use the database service hosted on Mongo Atlas.
3.2 Collection structure design
3.2.1 Loan record collection (LoanRecords)
3.2.1.1 Collection structure
Field name type index unique required default value description
loanID Number Y Y unique identifier sequence
account String Y Y account
TCashAmount Number Y TCashAmount
TCashPrice Number Y TCashPrice
UnitAmount Number Y UnitAmount
UnitPrice Number Y Unit price
CRF Number Y CRF
interest Number Y 0 Total interest
IST Number Y 0 Number of interest settlements
date Date Date.now()
status Number Y 0 0: Active loan
1: Closed loan
2: Early warning
3. Liquidation
originall Boolean Y Y true marks whether it is an initial record
3.2.1.2 Aggregated data sources
Dataprovider collects events and LoanRecord gets

3.2.2 Loan interest record collection (InterestRecords)
3.2.1.1 Collection structure
Field name type index unique required default value description
loanID Number Y Y Y unique identifier associated with the LoanRecords collection
interest String 0 Interest amount
date Date Date.now()

3.2.1.2 Aggregated data sources
Dataprovider collects events and InterestRecord gets

3.2.3 Repayment record collection (RepayRecords)
3.2.3.1 Collection structure
Field name type index unique required default value description
loanID Number Y Y Y unique identifier associated with the LoanRecords collection
TCashAmount String 0 Repayment amount
UnitAmount String 0 Unpledge amount
date Date Date.now()

3.2.3.2 Aggregated data sources
Dataprovider collection event RepayRecord obtained

3.2.4 Add loan collateral record collection (CollateralTopUpRecords)
3.2.4.1 Collection structure
Field name type index unique required default value description
loanID Number Y Y Y unique identifier associated with the LoanRecords collection
amount String Y 0 Add collateral record collection
price Number Y UNIT price
LTV Number Y Pledge rate
date Date Date.now()

3.2.4.2 Aggregated data sources
Dataprovider collection event CollateralTopUpRecord obtained

4. User interface design
Wait for UI to provide







5. Security and stability
This chapter mainly introduces the measures taken to ensure system security and stability during the development and operation of the TCash project, including automated testing, dependency vulnerability detection, and continuous integration and continuous delivery workflows.
5.1 snyk and npm audit
As the project continues to iterate and third-party libraries are introduced, the packages the system depends on may have security vulnerabilities or version compatibility risks.
Using dependency security detection tools (such as Snyk and npm audit), you can regularly scan all project dependencies, discover and fix security vulnerabilities in a timely manner, and reduce potential risks.

5.2 Github workflow
5.3.1 Workflow overview
1. Continuous integration/continuous delivery (CI/CD)
Automate code quality checks, unit testing, dependency scanning, security testing, build and deployment, and more with GitHub Actions (or other CI/CD platforms).
Ensure that every code change can detect potential problems in the shortest time and improve delivery efficiency and quality.
5.3.2 Key steps
1. Code pulling and dependency installation
After checking out the latest code, install the dependencies required for the project (npm install or yarn install).
2. Security and Quality Scanning
Execute static code analysis tools such as ESLint/Prettier to ensure code specification and quality.
Call Snyk / npm audit to check for dependency vulnerabilities.
3. Unit testing and integration testing
Run test frameworks such as Jest and Mocha to ensure the correctness of main business logic.
If there is a cross-chain simulation environment, a simple integration test can be conducted to verify the correctness of the interaction between the private chain and Sepolia.
4. Build and deploy
If all tests and scans pass, build (Webpack, etc.) and deploy to the specified environment (Dev, Test, Prod).
After deployment, further smoke testing or automated testing can be performed to confirm that the system is functioning properly in the target environment.




Part 4 Technical Requirements
1. Code requirements
During the project development and maintenance process, all source code should use English specification comments and follow the eslint-config-trustlink to unify the code format and style; when submitting the code, Husky will be used to check the submission process (including but not limited to ESLint), and Snyk will be used to selectively exclude serious security vulnerabilities in dependent libraries; in addition, to ensure the completeness and maintainability of the interface documentation, the project will use Swagger to provide API interface documentation.


Part 5 Appendix
1. Unit conversion reference function
fromAtto is used to process the conversion of aUnit to Unit and aTCash to TCash; in turn, use the toAtto function.
const fromAtto = (attoNum, decimals = 18, displayDecimals=4)=>{
const base = 10n ** BigInt(decimals);

// integer part
const intPart = attoNum / base;
//remainder part
const fracPart = attoNum % base;

// Convert the remainder into a string of length = decimals, padding 0 on the left
let fracStr = fracPart.toString().padStart(decimals, '0');

// If you only want to display integers (displayDecimals = 0)
if (displayDecimals === 0) {
// Check whether the first decimal place (i.e. fracStr[0]) is >= '5' to decide whether to carry
if (decimals > 0 && fracStr[0] >= '5') {
return (intPart + 1n).toString(); // Rounding
} else {
return intPart.toString();
}
}

// If the specified display digits < original decimals, rounding is required
if (displayDecimals < decimals) {
// roundingDigit is used to determine whether to carry
const roundingDigit = fracStr[displayDecimals];

// Take out the part you want to keep first
let keepStr = fracStr.slice(0, displayDecimals);

if (roundingDigit >= '5') {
//need carry
let keepVal = BigInt(keepStr);
keepVal += 1n; // add 1

// If it equals 10^displayDecimals after addition, it means that the integer part needs to be carried
if (keepVal === 10n ** BigInt(displayDecimals)) {
return (intPart + 1n).toString()
+ (displayDecimals > 0 ? '.' + '0'.repeat(displayDecimals) : '');
} else {
// Under normal circumstances, refill the reserved decimal places
const newFracStr = keepVal.toString().padStart(displayDecimals, '0');
return intPart.toString() + '.' + newFracStr;
}
} else {
// No carry required, return directly
return intPart.toString() + '.' + keepStr;
}
}

return intPart.toString() + '.' + fracStr;
}

function toAtto(ethStr, decimals = 18) {
// Split decimal point
let [intPart, fracPart = ''] = ethStr.split('.');
// Ensure that the decimal part does not exceed decimals. If it is insufficient, add 0 on the right side.
if (fracPart.length > decimals) {
// If it exceeds decimals, you can choose to truncate or report an error. Here we simply truncate
fracPart = fracPart.slice(0, decimals);
}
fracPart = fracPart.padEnd(decimals, '0');

//Finally combined into a string, and then converted to BigInt
const combinedStr = intPart + fracPart;
return BigInt(combinedStr);
}

// test
const attoValue = toAtto("1.23");
console.log(attoValue.toString()); // "1230000000000000000"

// Usage example
const value = fromAtto(123456789012345678901234567890n);
console.log(value); // 123456789012.3457