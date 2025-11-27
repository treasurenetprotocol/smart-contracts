// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./TCash.sol";
import "../Governance/IRoles.sol";
import "../Governance/IParameterInfo.sol";
import "../Oracle/IOracle.sol";
import "../TAT/ITAT.sol";

contract TCashLoan is Initializable, OwnableUpgradeable {
    event LoanRecord(
        uint256 indexed loanID,
        address indexed account,
        uint256[] amounts,
        uint256[] prices,
        uint256 CRF,
        uint256 interest,
        uint256 IST,
        uint256 status
    );

    event RepayRecord(
        uint256 indexed loanID,
        address indexed account,
        uint256 TCashAmount,
        uint256 UnitAmount
    );

    event InterestRecord(
        uint256 indexed loanID,
        address indexed account,
        uint256 interest,
        uint256 status
    );

    event CollateralTopUpRecord(
        uint256 indexed loanID,
        address indexed account,
        uint256 amount
    );

    event MaxBorrowableUpdated(
        address indexed account,
        uint256 oldMax,
        uint256 newMax,
        uint256 remainingBorrowable
    );

    event PersonalLoanDataUpdated(
        address indexed account,
        uint256 NCL,
        uint256 TNL,
        uint256 TLA,
        uint256 TRA
    );

    event SysLoanDataUpdated(uint256 OLB, uint256 RA, uint256 TLD);
    event RiskFactorUpdated(uint256 SRF);
    event AuctionStartFailed(uint256 loanID, address account);
    event AuctionCompleted(
        address indexed bider,
        uint tokens,
        uint interestAmount,
        uint principalAmount
    );

    struct LoanHistory {
        uint256 loanID;
        address account;
        uint256[] amounts;
        uint256[] prices;
        uint256 time;
        uint256 interest;
        uint256 IST;
        uint256 status;
    }

    struct UserBorrowLimit {
        uint256 maxBorrowable;
        uint256 totalBorrowed;
        uint256 lastEvaluationTime;
    }

    struct PersonalLoanData {
        uint256 NCL;
        uint256 TNL;
        uint256 TLA;
        uint256 TRA;
    }

    struct SysLoanData {
        uint256 OLB;
        uint256 RA;
        uint256 TLD;
    }

    TCash public tcash;
    IRoles public roles;
    IParameterInfo public parameterInfo;
    IOracle public oracle;
    ITAT public tat;
    bytes32 private constant FOUNDATION_MANAGER_ROLE = keccak256("FOUNDATION_MANAGER");

    uint256 public nextLoanID;
    mapping(uint256 => LoanHistory) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(address => UserBorrowLimit) public userBorrowLimits;
    mapping(address => PersonalLoanData) public personalLoanData;
    SysLoanData public sysLoanData;

    uint256 public systemRiskFactor;
    uint256 public lastSRFCalculationTime;
    address private _tcashAuctionContract;

    function setAuctionContract(address _auctionContract) external onlyOwner {
        require(
            _auctionContract != address(0),
            "Zero auction contract address"
        );
        _tcashAuctionContract = _auctionContract;
    }

    modifier onlyTCashAuction() {
        require(
            msg.sender == _tcashAuctionContract,
            "only TCash Auction contract allowed"
        );
        _;
    }

    function auctionOver(
        address bider,
        uint tokens,
        uint a,
        uint b
    ) external onlyTCashAuction returns (bool) {
        payable(bider).transfer(tokens);
        sysLoanData.OLB -= (a + b);
        sysLoanData.RA += (a + b);
        emit AuctionCompleted(bider, tokens, a, b);
        _emitSysLoanDataEvent();
        return true;
    }

    function startLiquidation(uint256 loanID) external returns (bool) {
        require(
            roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender),
            "Not authorized"
        );

        LoanHistory storage loan = loans[loanID];
        require(loan.status != 1, "Loan already cleared");

        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");

        loan.prices[0] = unitPrice;
        loan.prices[1] = tcashPrice;

        emit LoanRecord(
            loanID,
            loan.account,
            loan.amounts,
            loan.prices,
            getCRF(loan.account),
            loan.interest,
            loan.IST,
            loan.status
        );

        if (_tcashAuctionContract != address(0)) {
            (bool success, ) = _tcashAuctionContract.call(
                abi.encodeWithSignature(
                    "auctionStart(uint256,uint256,uint256)",
                    loan.amounts[0],
                    loan.amounts[1],
                    loan.interest
                )
            );
            require(success, "Failed to start auction");
        }

        return true;
    }

    function initialize(
        address _tcash,
        address _roles,
        address _parameterInfo,
        address _oracle,
        address _tat
    ) public initializer {
        __Ownable_init();
        tcash = TCash(_tcash);
        roles = IRoles(_roles);
        parameterInfo = IParameterInfo(_parameterInfo);
        oracle = IOracle(_oracle);
        tat = ITAT(_tat);

        require(
            roles.hasRole(roles.TCASH_MINTER(), address(this)),
            "TCashLoan must have TCASH_MINTER role"
        );
        require(
            roles.hasRole(roles.TCASH_BURNER(), address(this)),
            "TCashLoan must have TCASH_BURNER role"
        );

        systemRiskFactor = 10000;
    }

    function evaluateMaxBorrowable(
        address account
    ) public returns (uint256, uint256) {
        UserBorrowLimit storage userLimit = userBorrowLimits[account];
        uint256 oldMax = userLimit.maxBorrowable;

        (
            uint256 newMaxBorrowable,
            uint256 remainingBorrowable
        ) = _getPersonalCreditAndAvailable(account);

        if (newMaxBorrowable != oldMax) {
            userLimit.maxBorrowable = newMaxBorrowable;
            userLimit.lastEvaluationTime = block.timestamp;

            emit MaxBorrowableUpdated(
                account,
                oldMax,
                newMaxBorrowable,
                remainingBorrowable
            );
        }

        return (userLimit.maxBorrowable, remainingBorrowable);
    }

    function checkMintLock() public view returns (bool) {
        return oracle.getTCashMintStatus();
    }

    function calculateRequiredCollateral(
        address account,
        uint256 loanAmount
    ) public returns (uint256) {
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        uint256 crf = getCRF(account);
        uint256 collateralAmount = (loanAmount * tcashPrice * 10000) /
            (unitPrice * crf);
        return collateralAmount;
    }

    function _setRecord(
        address account,
        uint256 loanAmount,
        uint256 collateralAmount
    ) internal returns (uint256) {
        // Create loan ID and record
        uint256 loanID = nextLoanID++;
        LoanHistory storage newLoan = loans[loanID];
        newLoan.loanID = loanID;
        newLoan.account = account;

        // Set amounts and prices
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = collateralAmount;
        amounts[1] = loanAmount;

        // Assign amounts to the loan record
        newLoan.amounts = amounts;

        uint256[] memory prices = new uint256[](2);
        prices[0] = oracle.getPrice("UNIT");
        prices[1] = oracle.getPrice("TCASH");
        newLoan.prices = prices;

        // Set timestamp and compute interest
        newLoan.time = block.timestamp;
        uint256 interest = (loanAmount * parameterInfo.getPlatformConfig("TCASHDIR")) / 10000;
        newLoan.interest = interest;
        newLoan.amounts[1] += interest;
        newLoan.IST = 1;
        newLoan.status = 0;

        // Update user loan list and aggregates
        userLoans[account].push(loanID);
        userBorrowLimits[account].totalBorrowed += newLoan.amounts[1];

        // Update personal and system loan data
        PersonalLoanData storage userData = personalLoanData[account];
        userData.TNL += 1;
        userData.TLA += newLoan.amounts[1];

        sysLoanData.OLB += newLoan.amounts[1];
        sysLoanData.TLD += newLoan.amounts[1];

        // Emit events
        _emitPersonalLoanDataEvent(account);
        _emitSysLoanDataEvent();
        emit InterestRecord(loanID, account, interest, 0);

        emit LoanRecord(loanID, account, newLoan.amounts, prices, getCRF(account), interest, 1, 0);

        return loanID;
    }

    function createLoan() external payable returns (uint256) {
        require(checkMintLock(), "TCash minting is currently disabled");
        require(msg.value > 0, "Invalid collateral amount");

        (
            uint256 maxBorrowable,
            uint256 remainingBorrowable
        ) = evaluateMaxBorrowable(msg.sender);
        require(remainingBorrowable > 0, "No borrowable limit available");

        uint256 loanAmount = calculateLoanAmount(msg.sender, msg.value);
        require(loanAmount > 0, "Invalid loan amount, below minimum");

        uint256 loanID = _setRecord(msg.sender, loanAmount, msg.value);
        tcash.mint(msg.sender, loanAmount);

        return loanID;
    }

    function repay(uint256 loanID, uint256 amount) external returns (bool) {
        LoanHistory storage loan = loans[loanID];
        require(loan.account == msg.sender, "Not loan owner");
        require(amount > 0, "Invalid repay amount");
        require(amount <= loan.amounts[1], "Repay amount exceeds loan");

        // Refresh prices
        loan.prices[0] = oracle.getPrice("UNIT");
        loan.prices[1] = oracle.getPrice("TCASH");

        // Calculate UNIT to return
        uint256 unitAmount = calculateUnitToRelease(loan, amount);
        tcash.burnFrom(msg.sender, amount);

        // Update loan record
        // Prioritize paying interest first
        if (amount <= loan.interest) {
            loan.interest -= amount;
            loan.amounts[1] -= amount; // Update total
        } else {
            // Repay interest first, remainder goes to principal
            uint256 remainingAmount = amount - loan.interest;
            loan.interest = 0;
            loan.amounts[1] -= amount; // Update total (interest + principal)
        }

        // Update collateral amount
        loan.amounts[0] -= unitAmount;

        // Update aggregate states
        userBorrowLimits[msg.sender].totalBorrowed -= amount;
        personalLoanData[msg.sender].TRA += amount;
        sysLoanData.OLB -= amount;
        sysLoanData.RA += amount;

        // Check if fully repaid
        if (loan.amounts[1] == 0) {
            loan.status = 1; // Cleared
            personalLoanData[msg.sender].NCL += 1;
        }

        // Transfer collateral back
        payable(msg.sender).transfer(unitAmount);

        // Emit event
        emit LoanRecord(
            loanID,
            msg.sender,
            loan.amounts,
            loan.prices,
            getCRF(msg.sender),
            loan.interest,
            loan.IST,
            loan.status
        );
        emit RepayRecord(loanID, msg.sender, amount, unitAmount);

        return true;
    }

    function getUserLoanCount(address account) public view returns (uint256) {
        return userLoans[account].length;
    }

    function getUserBorrowableInfo(
        address account
    )
        external
        view
        returns (
            uint256 maxBorrowable,
            uint256 totalBorrowed,
            uint256 remainingBorrowable,
            uint256 lastEvaluationTime
        )
    {
        UserBorrowLimit storage userLimit = userBorrowLimits[account];
        maxBorrowable = userLimit.maxBorrowable;
        totalBorrowed = userLimit.totalBorrowed;
        if (totalBorrowed >= maxBorrowable) {
            remainingBorrowable = 0;
        } else {
            remainingBorrowable = maxBorrowable - totalBorrowed;
        }
        lastEvaluationTime = userLimit.lastEvaluationTime;
    }

    function collateralTopUp(uint256 loanID) external payable returns (bool) {
        LoanHistory storage loan = loans[loanID];
        require(loan.account == msg.sender, "Not loan owner");
        require(msg.value > 0, "Invalid collateral amount");

        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");

        loan.prices[0] = unitPrice;
        loan.prices[1] = tcashPrice;

        loan.amounts[0] += msg.value;

        uint256 newCollateralRatio = calculateCollateralRatio(loan);
        uint256 warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        uint256 liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");

        if (newCollateralRatio >= warningRatio) {
            loan.status = 0;
        }
        else if (newCollateralRatio <= liquidationRatio) {
            loan.status = 3;
        }
        else {
            loan.status = 2;
        }

        emit LoanRecord(
            loanID,
            msg.sender,
            loan.amounts,
            loan.prices,
            getCRF(msg.sender),
            loan.interest,
            loan.IST,
            loan.status
        );

        emit CollateralTopUpRecord(loanID, msg.sender, msg.value);

        return true;
    }

    function getLoanCollateralRatio(
        uint256 loanID
    ) external view returns (uint256) {
        LoanHistory storage loan = loans[loanID];
        return calculateCollateralRatio(loan);
    }

    function getWarningAndLiquidationThresholds()
        external
        view
        returns (uint256 warningRatio, uint256 liquidationRatio)
    {
        warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");
    }

    function calculateRequiredTopUp(
        uint256 loanID,
        uint256 targetRatio
    ) external view returns (uint256) {
        LoanHistory storage loan = loans[loanID];

        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");

        uint256 tcashValue = loan.amounts[1] * tcashPrice;
        uint256 requiredCollateralValue = (tcashValue * targetRatio) / 10000;
        uint256 currentCollateralValue = loan.amounts[0] * unitPrice;

        if (currentCollateralValue >= requiredCollateralValue) {
            return 0;
        }

        uint256 additionalValueNeeded = requiredCollateralValue -
            currentCollateralValue;
        uint256 additionalUnitsNeeded = additionalValueNeeded / unitPrice;

        return additionalUnitsNeeded + (additionalUnitsNeeded / 100);
    }

    function checkCollateralStatus(
        uint256 loanID
    )
        external
        view
        returns (
            bool needsTopUp,
            uint256 currentRatio,
            uint256 warningRatio,
            uint256 recommendedTopUp
        )
    {
        LoanHistory storage loan = loans[loanID];

        if (loan.status == 1) {
            return (false, 0, 0, 0);
        }

        currentRatio = calculateCollateralRatio(loan);
        warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        needsTopUp = currentRatio < warningRatio;

        if (needsTopUp) {
            uint256 targetRatio = warningRatio + (warningRatio / 10);
            recommendedTopUp = this.calculateRequiredTopUp(loanID, targetRatio);
        }

        return (needsTopUp, currentRatio, warningRatio, recommendedTopUp);
    }

    function interestCalculation(uint256 loanID) external returns (bool) {
        require(
            roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender),
            "Not authorized"
        );

        LoanHistory storage loan = loans[loanID];
        require(loan.status != 1, "Loan already repaid");
        _calculateInterest(loanID);
        emit LoanRecord(
            loanID,
            loan.account,
            loan.amounts,
            loan.prices,
            getCRF(loan.account),
            loan.interest,
            loan.IST,
            loan.status
        );
        return true;
    }

    function getUserLoans(
        address account
    ) external view returns (uint256[] memory) {
        return userLoans[account];
    }

    function getRecord(
        uint256 loanID
    )
        external
        view
        returns (
            uint256,
            address,
            uint256[] memory,
            uint256[] memory,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        LoanHistory storage loan = loans[loanID];
        return (
            loan.loanID,
            loan.account,
            loan.amounts,
            loan.prices,
            loan.time,
            loan.interest,
            loan.IST,
            loan.status
        );
    }

    function getLoan(
        uint256 loanID
    ) external view returns (LoanHistory memory) {
        return loans[loanID];
    }

    function getUserLoansDetails(
        address account
    )
        external
        view
        returns (
            LoanHistory[] memory activeLoans,
            LoanHistory[] memory clearedLoans
        )
    {
        uint256[] memory userLoanIds = userLoans[account];
        uint256 activeCount = 0;
        uint256 clearedCount = 0;

        // Count active and cleared loans
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            if (loans[userLoanIds[i]].status != 1) activeCount++;
            else clearedCount++;
        }

        // Allocate result arrays
        activeLoans = new LoanHistory[](activeCount);
        clearedLoans = new LoanHistory[](clearedCount);

        // Populate result arrays
        uint256 activeIdx = 0;
        uint256 clearedIdx = 0;
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            LoanHistory storage loan = loans[userLoanIds[i]];
            if (loan.status != 1) activeLoans[activeIdx++] = loan;
            else clearedLoans[clearedIdx++] = loan;
        }
    }

    function getLoanStatus(uint256 loanID) external view returns (uint256) {
        return loans[loanID].status;
    }

    function getLoanBorrower(uint256 loanID) external view returns (address) {
        return loans[loanID].account;
    }

    function getLoanAmountAndInterest(
        uint256 loanID
    ) external view returns (uint256 amount, uint256 interest) {
        LoanHistory storage loan = loans[loanID];
        return (loan.amounts[1] - loan.interest, loan.interest);
    }

    function calculateCollateralToRelease(
        uint256 loanID,
        uint256 repayAmount
    ) external view returns (uint256) {
        LoanHistory storage loan = loans[loanID];

        if (repayAmount > loan.amounts[1]) {
            repayAmount = loan.amounts[1];
        }

        return calculateUnitToRelease(loan, repayAmount);
    }

    function _calculateInterest(uint256 loanID) internal returns (bool) {
        LoanHistory storage loan = loans[loanID];
        require(loan.status != 1 && loan.status != 3, "Invalid loan status");

        // Update prices and calculate interest
        loan.prices[0] = oracle.getPrice("UNIT");
        loan.prices[1] = oracle.getPrice("TCASH");

        uint256 interest = (loan.amounts[1] * parameterInfo.getPlatformConfig("TCASHDIR")) / 10000;

        // Update loan and user data
        loan.interest += interest;
        loan.amounts[1] += interest;
        loan.IST++;

        userBorrowLimits[loan.account].totalBorrowed += interest;
        personalLoanData[loan.account].TLA += interest;

        sysLoanData.OLB += interest;
        sysLoanData.TLD += interest;

        // Check collateral ratio and repayment cycles
        uint256 collateralRatio = calculateCollateralRatio(loan);
        uint256 warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        uint256 liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");

        // Update status and determine if liquidation is needed
        bool needsLiquidation = false;

        if (collateralRatio <= liquidationRatio) {
            loan.status = 3;
            needsLiquidation = true;
        } else if (collateralRatio <= warningRatio) {
            loan.status = 2;
        }

        if (loan.IST >= parameterInfo.getPlatformConfig("TCASHRC")) {
            loan.status = 3;
            needsLiquidation = true;
        }

        if (loan.status == 3) {
            personalLoanData[loan.account].TLA -= loan.amounts[1];
            userBorrowLimits[loan.account].totalBorrowed -= loan.amounts[1];
        }

        emit InterestRecord(loanID, loan.account, interest, loan.status);

        // Start auction if liquidation is needed
        if (needsLiquidation && loan.status == 3 && _tcashAuctionContract != address(0)) {
            (bool success, ) = _tcashAuctionContract.call(
                abi.encodeWithSignature(
                    "auctionStart(uint256,uint256,uint256)",
                    loan.amounts[0],
                    loan.amounts[1],
                    loan.interest
                )
            );
            if (!success) emit AuctionStartFailed(loanID, loan.account);
        }

        return true;
    }

    function getUserActiveLoansCount(
        address account
    ) external view returns (uint256) {
        uint256[] memory userLoanIds = userLoans[account];
        uint256 activeCount = 0;

        for (uint256 i = 0; i < userLoanIds.length; i++) {
            if (loans[userLoanIds[i]].status != 1) {
                activeCount++;
            }
        }

        return activeCount;
    }

    function getUserOutstandingLoanAmount(
        address account
    ) external view returns (uint256 principal, uint256 interest) {
        uint256[] memory userLoanIds = userLoans[account];
        uint256 totalPrincipal = 0;
        uint256 totalInterest = 0;

        for (uint256 i = 0; i < userLoanIds.length; i++) {
            LoanHistory storage loan = loans[userLoanIds[i]];
            if (loan.status != 1) {
                totalPrincipal += (loan.amounts[1] - loan.interest);
                totalInterest += loan.interest;
            }
        }

        return (totalPrincipal, totalInterest);
    }

    function collateralPredict(
        uint256 loanAmount
    )
        external
        view
        returns (
            uint256 requiredCollateral,
            uint256 dailyInterestRate,
            uint256 dailyInterest
        )
    {
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        uint256 crf = 10000;

        requiredCollateral = calculateRequiredCollateral(
            loanAmount,
            unitPrice,
            tcashPrice,
            crf
        );

        dailyInterestRate = parameterInfo.getPlatformConfig("TCASHDIR");
        dailyInterest = (loanAmount * dailyInterestRate) / 10000;

        return (requiredCollateral, dailyInterestRate, dailyInterest);
    }

    function setLoanStatus(
        uint256 loanID,
        uint256 status
    ) external returns (bool) {
        require(
            roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender),
            "Not authorized"
        );
        require(status <= 3, "Invalid status value");

        LoanHistory storage loan = loans[loanID];
        loan.status = status;

        return true;
    }

    function getPersonalLoanData(
        address account
    )
        external
        view
        returns (uint256 NCL, uint256 TNL, uint256 TLA, uint256 TRA)
    {
        PersonalLoanData storage userData = personalLoanData[account];
        NCL = userData.NCL;
        TNL = userData.TNL;
        TLA = userData.TLA;
        TRA = userData.TRA;
    }

    function _getPersonalCreditAndAvailable(
        address account
    ) internal view returns (uint256 PCL, uint256 ALB) {
        (uint256[] memory months, uint256[] memory amounts) = tat.getTATRecord(
            account
        );
        require(months.length == amounts.length, "Invalid TAT record");

        if (months.length >= 2) {
            uint256 totalAmount = 0;
            for (uint256 i = 0; i < amounts.length; i++) {
                totalAmount += amounts[i];
            }
            // uint256 averageAmount = totalAmount / amounts.length;
            uint256 averageAmount = totalAmount / 3;

            uint256 loanCount = getUserLoanCount(account);
            if (loanCount <= 2) {
                PCL = averageAmount * 3;
            } else {
                PCL = averageAmount * 12;
            }
        } else {
            PCL = 0;
        }

        UserBorrowLimit storage userLimit = userBorrowLimits[account];
        if (PCL > userLimit.totalBorrowed) {
            ALB = PCL - userLimit.totalBorrowed;
        } else {
            ALB = 0;
        }

        return (PCL, ALB);
    }

    function getPersonalCreditAndAvailable(
        address account
    ) external view returns (uint256 PCL, uint256 ALB) {
        return _getPersonalCreditAndAvailable(account);
    }

    function _setSysLoanData(string memory key, uint256 value) internal {
        if (keccak256(bytes(key)) == keccak256(bytes("OLB"))) {
            sysLoanData.OLB = value;
        } else if (keccak256(bytes(key)) == keccak256(bytes("RA"))) {
            sysLoanData.RA = value;
        } else if (keccak256(bytes(key)) == keccak256(bytes("TLD"))) {
            sysLoanData.TLD = value;
        }

        _emitSysLoanDataEvent();
    }

    function getSysLoanData()
        external
        view
        returns (uint256 OLB, uint256 RA, uint256 TLD)
    {
        OLB = sysLoanData.OLB;
        RA = sysLoanData.RA;
        TLD = sysLoanData.TLD;
    }

    function _emitPersonalLoanDataEvent(address account) internal {
        PersonalLoanData storage userData = personalLoanData[account];
        emit PersonalLoanDataUpdated(
            account,
            userData.NCL,
            userData.TNL,
            userData.TLA,
            userData.TRA
        );
    }

    function _emitSysLoanDataEvent() internal {
        emit SysLoanDataUpdated(
            sysLoanData.OLB,
            sysLoanData.RA,
            sysLoanData.TLD
        );
    }

    function getPRF(address account) public view returns (uint256) {
        PersonalLoanData storage userData = personalLoanData[account];
        if (userData.TNL == 0 || userData.TNL - userData.NCL <= 5) return 10000;

        (uint256 PCL, ) = _getPersonalCreditAndAvailable(account);
        if (PCL == 0) return 10000;

        uint256 loanOccupancyRate = (userData.TLA * 10000) / PCL;
        uint256 loanOccupancyCoefficient = loanOccupancyRate <= 8500 ? 10000 :
                                         (loanOccupancyRate <= 9500 ? 8000 : 6000);

        uint256 repaymentRatioCoefficient;
        if (userData.TNL == 0) {
            repaymentRatioCoefficient = 2000;
        } else {
            uint256 repaymentRatio = (userData.NCL * 10000) / userData.TNL;
            repaymentRatioCoefficient = userData.NCL == 0 ? 2000 :
                                        repaymentRatio <= 3000 ? 4000 :
                                        repaymentRatio <= 6000 ? 5000 :
                                        repaymentRatio <= 8000 ? 8000 : 10000;
        }

        return (loanOccupancyCoefficient * repaymentRatioCoefficient) / 10000;
    }

    function _calculateSRF() internal returns (uint256) {
        uint256 OLB = sysLoanData.OLB;
        uint256 RA = sysLoanData.RA;
        uint256 TLD = sysLoanData.TLD;
        uint256 totalSupply = tcash.totalSupply();

        if (totalSupply == 0 || TLD == 0) return 10000;

        uint256 systemLoanRatio = (OLB * 10000) / totalSupply;
        uint256 systemRepaymentRate = (RA * 10000) / TLD;

        // Simplified SRF lookup logic
        uint256 loanRatioIdx = systemLoanRatio < 6000 ? 0 :
                           systemLoanRatio < 7000 ? 1 :
                           systemLoanRatio < 8000 ? 2 :
                           systemLoanRatio < 9000 ? 3 : 4;

        uint256 repayRateIdx = systemRepaymentRate > 3000 ? 0 :
                          systemRepaymentRate > 2000 ? 1 :
                          systemRepaymentRate > 1000 ? 2 :
                          systemRepaymentRate > 500 ? 3 : 4;

        // Use hard-coded values instead of a 2D table
        uint256[25] memory srf1D = [
            uint256(10000), uint256(9000), uint256(7000), uint256(5000), uint256(3000), // [0,60%）
            uint256(9000), uint256(8000), uint256(7000), uint256(4000), uint256(2000),  // [60%,70%)
            uint256(8000), uint256(7000), uint256(6000), uint256(3000), uint256(1000),  // [70%,80%)
            uint256(5000), uint256(4000), uint256(3000), uint256(2000), uint256(1000),  // [80%,90%)
            uint256(2000), uint256(1000), uint256(1000), uint256(1000), uint256(1000)   // [90%,∞)
        ];

        uint256 idx = loanRatioIdx * 5 + repayRateIdx;
        uint256 SRF = idx < 25 ? srf1D[idx] : 1000; // Safety check

        systemRiskFactor = SRF;
        lastSRFCalculationTime = block.timestamp;
        emit RiskFactorUpdated(SRF);
        return SRF;
    }

    function getSRF() public returns (uint256) {
        if (block.timestamp >= lastSRFCalculationTime + 1 days) {
            return _calculateSRF();
        }
        return systemRiskFactor;
    }

    function getCRF(address account) public view returns (uint256) {
        uint256 PRF = getPRF(account);
        uint256 SRF = systemRiskFactor;
        uint256 CRF = (PRF * SRF) / 10000;
        return CRF;
    }

    function calculateLoanAmount(
        address account,
        uint256 unitAmount
    ) public returns (uint256) {
        require(unitAmount > 0, "UNIT amount must be greater than 0");

        // Get prices and risk factor
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        require(unitPrice > 0 && tcashPrice > 0, "Invalid prices");

        uint256 crf = getCRF(account);
        require(crf > 0, "Invalid risk factor");

        // Calculate borrowable amount
        uint256 tcashAmount = (unitAmount * unitPrice * crf) / (10000 * tcashPrice);

        // Check credit limit
        (uint256 PCL, uint256 ALB) = _getPersonalCreditAndAvailable(account);
        require(PCL > 0, "Invalid personal credit limit");

        // Use the smaller of calculated amount and available limit
        if (tcashAmount > ALB) tcashAmount = ALB;

        // Enforce minimum precision
        uint256 minAmount = 1e9;
        if (tcashAmount < minAmount) tcashAmount = minAmount;

        // Ensure minting is not locked
        require(oracle.getTCashMintStatus(), "TCash minting disabled");

        return tcashAmount;
    }

    function calculateUnitRequirement(
        uint256 tcashAmount
    ) external view returns (uint256) {
        require(tcashAmount > 0, "TCash amount must be greater than 0");

        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");

        require(unitPrice > 0, "Invalid UNIT price");
        require(tcashPrice > 0, "Invalid TCash price");

        uint256 crf = getCRF(msg.sender);

        require(crf > 0, "Invalid risk factor");

        (uint256 PCL, uint256 ALB) = _getPersonalCreditAndAvailable(msg.sender);

        require(PCL > 0, "Invalid personal credit limit");

        uint256 minAmount = 1e9;
        if (tcashAmount < minAmount) {
            tcashAmount = minAmount;
        }

        if (tcashAmount > ALB) {
            tcashAmount = ALB;
        }

        uint256 unitAmount = (tcashAmount * tcashPrice * 10000) /
            (unitPrice * crf);

        uint256 maxUnit = 1e30;
        require(
            unitAmount <= maxUnit,
            "Calculated UNIT amount exceeds reasonable limit"
        );

        require(
            oracle.getTCashMintStatus(),
            "TCash minting is currently disabled"
        );

        return unitAmount;
    }

    function setRecord(
        address account,
        uint256 loanAmount,
        uint256 collateralAmount
    ) external returns (uint256) {
        require(
            roles.hasRole(FOUNDATION_MANAGER_ROLE, msg.sender),
            "Not authorized"
        );
        require(account != address(0), "Invalid account address");
        require(loanAmount > 0, "Invalid loan amount");
        require(collateralAmount > 0, "Invalid collateral amount");

        uint256 loanID = _setRecord(account, loanAmount, collateralAmount);

        return loanID;
    }

    function getUserLoanStatistics(
        address account
    )
        external
        view
        returns (
            uint256 totalActiveLoanAmount,
            uint256 totalActiveInterest,
            uint256 totalClearedLoanAmount,
            uint256 totalClearedInterest,
            uint256 activeLoanCount,
            uint256 clearedLoanCount
        )
    {
        uint256[] memory userLoanIds = userLoans[account];

        totalActiveLoanAmount = 0;
        totalActiveInterest = 0;
        totalClearedLoanAmount = 0;
        totalClearedInterest = 0;
        activeLoanCount = 0;
        clearedLoanCount = 0;

        for (uint256 i = 0; i < userLoanIds.length; i++) {
            LoanHistory storage loan = loans[userLoanIds[i]];

            if (loan.status == 1) {
                totalClearedLoanAmount += loan.amounts[1] - loan.interest;
                totalClearedInterest += loan.interest;
                clearedLoanCount++;
            } else {
                totalActiveLoanAmount += loan.amounts[1] - loan.interest;
                totalActiveInterest += loan.interest;
                activeLoanCount++;
            }
        }

        return (
            totalActiveLoanAmount,
            totalActiveInterest,
            totalClearedLoanAmount,
            totalClearedInterest,
            activeLoanCount,
            clearedLoanCount
        );
    }

    function calculateUnitToRelease(
        LoanHistory storage loan,
        uint256 repayAmount
    ) internal view returns (uint256) {
        return (repayAmount * loan.amounts[0]) / loan.amounts[1];
    }

    function calculateCollateralRatio(
        LoanHistory storage loan
    ) internal view returns (uint256) {
        return
            (loan.amounts[0] * loan.prices[0] * 1000000) /
            (loan.amounts[1] * loan.prices[1]);
    }

    function calculateLoanAmount(
        uint256 collateralAmount,
        uint256 unitPrice,
        uint256 tcashPrice,
        uint256 crf
    ) internal pure returns (uint256) {
        uint256 collateralValue = collateralAmount * unitPrice;
        uint256 maxLoanAmount = (collateralValue * crf) / (10000 * tcashPrice);
        return maxLoanAmount;
    }

    function calculateRequiredCollateral(
        uint256 loanAmount,
        uint256 unitPrice,
        uint256 tcashPrice,
        uint256 crf
    ) internal pure returns (uint256) {
        return (loanAmount * tcashPrice * 10000) / (unitPrice * crf);
    }
}
