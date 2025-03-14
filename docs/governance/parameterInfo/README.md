# ParameterInfo

## Functions

### initialize(address \_mulSigContract)

Initializes the ParameterInfo contract.

- `_mulSigContract`: Multi-signature contract address

### setPlatformConfig(string memory key, uint256 amount) -> bool

Sets the platform parameters.

- `key`: Parameter name(marginRatio,reserveRatio,loanInterestRate,loanPledgeRate,liquidationRatio)
- `amount`: Parameter value
- `bool`: Success status

### getPlatformConfig(string memory key) -> uint256

Gets the platform parameter value.

- `key`: Parameter name

- `uint256`: Parameter value

### getUSTNLoanPledgeRateWarningValue() -> uint

Gets the warning value for USTN loan pledge rate.

- `uint`: Warning value

### getUSTNLoanLiquidationRate() -> uint

Get USTN loan liquidation rate.

- `uint`: Liquidation rate.

### getUSTNLoanPledgeRate() -> uint256

Gets the USTN loan pledge rate.

- `uint256`: Loan pledge rate

### getUSTNLoanInterestRate() -> uint256

Gets the USTN loan interest rate.

- `uint256`: Loan interest rate

### setPriceDiscountConfig(uint256 API,uint256 sulphur,uint256 discount1,uint256 discount2,uint256 discount3,uint256 discount4) -> bool

Sets the asset discount configuration.

- `API`: API value
- `sulphur`: Sulphur value
- `discount1`: Discount parameter 1
- `discount2`: Discount parameter 2
- `discount3`: Discount parameter 3
- `discount4`: Discount parameter 4

- `bool`: Success status

### getPriceDiscountConfig(uint256 \_API, uint256 \_sulphur) -> uint256

Gets the discount information based on API and sulphur values.

- `_API`: API value
- `_sulphur`: Sulphur value

- `uint256`: Discount parameter
