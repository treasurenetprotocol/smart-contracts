// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./TCash.sol";
import "../Governance/IRoles.sol";
import "../Governance/IParameterInfo.sol";
import "../Oracle/IOracle.sol";

// TAT相关接口
interface ITATManager {
    function getMintCount(address account) external view returns (uint256);
    function getUnusedTATAverage(address account) external view returns (uint256);
}

contract TCashLoan is Initializable, OwnableUpgradeable {
    // 事件定义
    event LoanRecord(
        uint256 indexed loanID,
        address indexed account,
        uint256[] amounts, // [UNIT, TCASH]
        uint256[] prices,  // [UNIT, TCASH]
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
        uint256 interest
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
    
    // 个人参数和系统参数事件
    event PersonalLoanDataUpdated(
        address indexed account,
        uint256 NCL,
        uint256 TNL,
        uint256 TLA,
        uint256 TRA
    );
    
    event SysLoanDataUpdated(
        uint256 OLB,
        uint256 RA,
        uint256 TLD
    );
    
    // 风险系数事件
    event RiskFactorUpdated(
        uint256 SRF
    );

    // 贷款记录结构
    struct Loan {
        uint256 loanID;
        address account;
        uint256[] amounts;  // [UNIT, TCASH]
        uint256[] prices;   // [UNIT, TCASH]
        uint256 time;
        uint256 interest;
        uint256 IST;
        uint256 status;     // 0=进行中，1=已结清，2=预警中，3=清算中
    }

    // 用户贷款额度结构
    struct UserBorrowLimit {
        uint256 maxBorrowable;      // 最大可贷额度
        uint256 totalBorrowed;      // 已贷出总额
        uint256 lastEvaluationTime; // 上次评估时间
    }
    
    // 个人贷款数据结构
    struct PersonalLoanData {
        uint256 NCL;  // 个人结清的贷款笔数
        uint256 TNL;  // 个人贷款总笔数
        uint256 TLA;  // 个人贷款总额(含利息)
        uint256 TRA;  // 个人还款总额
    }
    
    // 系统贷款数据结构
    struct SysLoanData {
        uint256 OLB;  // 尚未偿还的贷款总量(含利息)
        uint256 RA;   // 已经偿还的金额(含利息)
        uint256 TLD;  // 总计贷出的金额(含利息)
    }

    // 状态变量
    TCash public tcash;
    IRoles public roles;
    IParameterInfo public parameterInfo;
    IOracle public oracle;
    ITATManager public tatManager;

    uint256 public nextLoanID;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(address => UserBorrowLimit) public userBorrowLimits;
    mapping(address => PersonalLoanData) public personalLoanData;
    SysLoanData public sysLoanData;
    
    // 风险系数相关状态变量
    uint256 public systemRiskFactor; // 系统风险系数(SRF)
    uint256 public lastSRFCalculationTime; // 最后一次SRF计算的时间

    // 初始化函数
    function initialize(
        address _tcash,
        address _roles,
        address _parameterInfo,
        address _oracle,
        address _tatManager
    ) public initializer {
        __Ownable_init();
        tcash = TCash(_tcash);
        roles = IRoles(_roles);
        parameterInfo = IParameterInfo(_parameterInfo);
        oracle = IOracle(_oracle);
        tatManager = ITATManager(_tatManager);
        
        // 初始化系统风险系数为1.0
        systemRiskFactor = 10000;
    }

    // 评估用户最大可贷额度
    function evaluateMaxBorrowable(address account) public returns (uint256, uint256) {
        UserBorrowLimit storage userLimit = userBorrowLimits[account];
        uint256 oldMax = userLimit.maxBorrowable;
        
        // 验证用户铸造TAT的次数
        uint256 tatMintCount = tatManager.getMintCount(account);
        require(tatMintCount >= 2, "Must have minted TAT at least twice");
        
        // 获取用户贷款次数
        uint256 loanCount = getUserLoanCount(account);
        
        // 获取未被占用的TAT的3个月均值
        uint256 unusedTATAverage = tatManager.getUnusedTATAverage(account);
        
        // 计算最大可贷额度
        uint256 newMaxBorrowable;
        if (loanCount <= 2) {
            newMaxBorrowable = unusedTATAverage * 3;
        } else {
            newMaxBorrowable = unusedTATAverage * 12;
        }
        
        // 计算剩余可贷额度
        uint256 remainingBorrowable;
        
        // 更新最大可贷额度逻辑
        if (newMaxBorrowable < oldMax) {
            // 如果新评估的最大额度小于旧额度
            if (userLimit.totalBorrowed > newMaxBorrowable) {
                remainingBorrowable = 0;
            } else {
                remainingBorrowable = newMaxBorrowable - userLimit.totalBorrowed;
            }
            userLimit.maxBorrowable = newMaxBorrowable;
        } else if (newMaxBorrowable > oldMax) {
            // 如果新评估的最大额度大于旧额度
            userLimit.maxBorrowable = newMaxBorrowable;
            if (userLimit.totalBorrowed > newMaxBorrowable) {
                remainingBorrowable = 0;
            } else {
                remainingBorrowable = newMaxBorrowable - userLimit.totalBorrowed;
            }
        } else {
            // 如果额度相等，不更新
            if (userLimit.totalBorrowed > userLimit.maxBorrowable) {
                remainingBorrowable = 0;
            } else {
                remainingBorrowable = userLimit.maxBorrowable - userLimit.totalBorrowed;
            }
        }
        
        userLimit.lastEvaluationTime = block.timestamp;
        
        emit MaxBorrowableUpdated(account, oldMax, userLimit.maxBorrowable, remainingBorrowable);
        
        return (userLimit.maxBorrowable, remainingBorrowable);
    }

    // 检查铸造锁定状态
    function checkMintLock() public view returns (bool) {
        return oracle.getTCashMintStatus();
    }

    // 计算可贷金额
    function calculateLoanAmount(address account, uint256 collateralAmount) public returns (uint256) {
        // 获取价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 获取综合风险系数
        uint256 crf = getCRF(account);
        
        // 计算基于抵押品的可贷金额
        uint256 collateralValue = collateralAmount * unitPrice;
        uint256 loanAmount = collateralValue * crf / (10000 * tcashPrice);
        
        // 获取个人授信额度和已贷金额，计算可贷余额(ALB)
        uint256 PCL;
        uint256 ALB;
        (PCL, ALB) = getPersonalCreditAndAvailable(account);
        
        // 取可贷金额和可贷余额的较小值
        if (loanAmount > ALB) {
            loanAmount = ALB;
        }
        
        return loanAmount;
    }
    
    // 计算所需抵押品数量
    function calculateRequiredCollateral(address account, uint256 loanAmount) public returns (uint256) {
        // 获取价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 获取综合风险系数
        uint256 crf = getCRF(account);
        
        // 计算所需抵押品数量
        uint256 collateralAmount = loanAmount * tcashPrice * 10000 / (unitPrice * crf);
        
        return collateralAmount;
    }

    // 贷款功能
    function loan() external payable returns (uint256) {
        // 检查铸造锁定状态
        require(checkMintLock(), "TCash minting is currently disabled");
        require(msg.value > 0, "Invalid collateral amount");
        
        // 评估用户最大可贷额度
        (uint256 maxBorrowable, uint256 remainingBorrowable) = evaluateMaxBorrowable(msg.sender);
        require(remainingBorrowable > 0, "No borrowable limit available");
        
        // 计算可贷金额
        uint256 loanAmount = calculateLoanAmount(msg.sender, msg.value);
        require(loanAmount > 0, "Invalid loan amount, below minimum");
        
        // 获取价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 创建贷款记录
        uint256 loanID = nextLoanID++;
        Loan storage newLoan = loans[loanID];
        newLoan.loanID = loanID;
        newLoan.account = msg.sender;
        
        // 初始化数组
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = msg.value;  // UNIT 数量
        amounts[1] = loanAmount;  // TCASH 数量
        newLoan.amounts = amounts;
        
        uint256[] memory prices = new uint256[](2);
        prices[0] = unitPrice;
        prices[1] = tcashPrice;
        newLoan.prices = prices;
        
        newLoan.time = block.timestamp;
        newLoan.interest = 0;
        newLoan.IST = 0;
        newLoan.status = 0; // 进行中

        // 添加到用户贷款列表
        userLoans[msg.sender].push(loanID);
        
        // 更新用户已贷出总额
        UserBorrowLimit storage userLimit = userBorrowLimits[msg.sender];
        userLimit.totalBorrowed += loanAmount;

        // 铸造TCash给借款人
        tcash.mint(msg.sender, loanAmount);
        
        // 更新个人贷款数据
        PersonalLoanData storage userData = personalLoanData[msg.sender];
        userData.TNL += 1;
        userData.TLA += loanAmount;
        
        // 更新系统贷款数据
        sysLoanData.OLB += loanAmount;
        sysLoanData.TLD += loanAmount;
        
        // 触发事件更新
        _emitPersonalLoanDataEvent(msg.sender);
        _emitSysLoanDataEvent();

        // 发出贷款记录事件
        uint256 crf = getCRF(msg.sender);
        emit LoanRecord(
            loanID,
            msg.sender,
            newLoan.amounts,
            newLoan.prices,
            crf,
            0,
            0,
            0
        );

        return loanID;
    }

    // 还款功能
    function repay(uint256 loanID, uint256 amount) external returns (bool) {
        Loan storage loan = loans[loanID];
        require(loan.account == msg.sender, "Not loan owner");
        require(loan.status == 0 || loan.status == 2, "Invalid loan status");
        require(amount > 0, "Invalid repay amount");
        
        // 确保还款金额不超过当前贷款总额(本金+利息)
        require(amount <= loan.amounts[1], "Repay amount exceeds outstanding loan");

        // 计算需要释放的UNIT数量
        uint256 unitAmount = calculateUnitToRelease(loan, amount);
        
        // 销毁TCash
        tcash.burnFrom(msg.sender, amount);
        
        // 更新贷款记录
        // 优先偿还利息部分
        if (amount <= loan.interest) {
            loan.interest -= amount;
        } else {
            // 先偿还利息，剩余部分偿还本金
            uint256 remainingAmount = amount - loan.interest;
            loan.interest = 0;
            loan.amounts[1] -= remainingAmount;
        }
        
        // 更新用户已贷出总额
        UserBorrowLimit storage userLimit = userBorrowLimits[msg.sender];
        userLimit.totalBorrowed -= amount;
        
        // 更新个人贷款数据
        PersonalLoanData storage userData = personalLoanData[msg.sender];
        userData.TRA += amount;
        
        // 更新系统贷款数据
        sysLoanData.OLB -= amount;
        sysLoanData.RA += amount;
        
        if (loan.amounts[1] == 0) {
            loan.status = 1; // 已结清
            // 增加已结清贷款笔数
            userData.NCL += 1;
        }

        // 返还UNIT
        payable(msg.sender).transfer(unitAmount);
        
        // 触发事件更新
        _emitPersonalLoanDataEvent(msg.sender);
        _emitSysLoanDataEvent();

        emit RepayRecord(loanID, msg.sender, amount, unitAmount);

        return true;
    }

    // 获取用户贷款次数
    function getUserLoanCount(address account) public view returns (uint256) {
        return userLoans[account].length;
    }

    // 获取用户可贷额度信息
    function getUserBorrowableInfo(address account) external view returns (
        uint256 maxBorrowable,
        uint256 totalBorrowed,
        uint256 remainingBorrowable,
        uint256 lastEvaluationTime
    ) {
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

    // 增加抵押品
    function collateralTopUp(uint256 loanID) external payable returns (bool) {
        Loan storage loan = loans[loanID];
        require(loan.account == msg.sender, "Not loan owner");
        require(loan.status == 0 || loan.status == 2, "Invalid loan status");
        require(msg.value > 0, "Invalid collateral amount");

        // 获取当前质押率
        uint256 oldCollateralRatio = calculateCollateralRatio(loan);
        
        // 更新抵押品数量
        loan.amounts[0] += msg.value;
        
        // 重新计算状态
        uint256 newCollateralRatio = calculateCollateralRatio(loan);
        uint256 warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        uint256 liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");
        
        // 如果新的质押率高于预警线，更新状态为"进行中"
        if (newCollateralRatio >= warningRatio) {
            loan.status = 0; // 进行中
        } 
        // 如果仍然低于清算线，保持"清算中"状态
        else if (newCollateralRatio <= liquidationRatio) {
            loan.status = 3; // 清算中
        }
        // 否则如果在预警线和清算线之间，设置为"预警中"
        else {
            loan.status = 2; // 预警中
        }

        // 触发事件
        emit CollateralTopUpRecord(loanID, msg.sender, msg.value);
        
        return true;
    }
    
    // 计算贷款当前质押率
    function getLoanCollateralRatio(uint256 loanID) external view returns (uint256) {
        Loan storage loan = loans[loanID];
        return calculateCollateralRatio(loan);
    }
    
    // 获取预警和清算阈值
    function getWarningAndLiquidationThresholds() external view returns (uint256 warningRatio, uint256 liquidationRatio) {
        warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");
    }
    
    // 计算需要追加的抵押品以达到目标质押率
    function calculateRequiredTopUp(uint256 loanID, uint256 targetRatio) external view returns (uint256) {
        Loan storage loan = loans[loanID];
        
        // 获取当前价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 计算TCash价值
        uint256 tcashValue = loan.amounts[1] * tcashPrice;
        
        // 计算所需的抵押品总价值
        uint256 requiredCollateralValue = tcashValue * targetRatio / 10000;
        
        // 计算当前抵押品价值
        uint256 currentCollateralValue = loan.amounts[0] * unitPrice;
        
        // 如果已经达到目标质押率，返回0
        if (currentCollateralValue >= requiredCollateralValue) {
            return 0;
        }
        
        // 计算需要追加的抵押品价值
        uint256 additionalValueNeeded = requiredCollateralValue - currentCollateralValue;
        
        // 转换为UNIT数量
        uint256 additionalUnitsNeeded = additionalValueNeeded / unitPrice;
        
        // 添加1%的缓冲
        return additionalUnitsNeeded + (additionalUnitsNeeded / 100);
    }
    
    // 检查贷款是否需要增加抵押品
    function checkCollateralStatus(uint256 loanID) external view returns (
        bool needsTopUp, 
        uint256 currentRatio, 
        uint256 warningRatio,
        uint256 recommendedTopUp
    ) {
        Loan storage loan = loans[loanID];
        
        // 检查贷款状态
        if (loan.status == 1) { // 已结清
            return (false, 0, 0, 0);
        }
        
        // 获取当前质押率
        currentRatio = calculateCollateralRatio(loan);
        
        // 获取预警线
        warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        
        // 判断是否需要增加抵押品
        needsTopUp = currentRatio < warningRatio;
        
        // 如果需要增加抵押品，计算推荐增加量（目标到预警线上方10%）
        if (needsTopUp) {
            uint256 targetRatio = warningRatio + (warningRatio / 10); // 预警线 + 10%
            recommendedTopUp = this.calculateRequiredTopUp(loanID, targetRatio);
        }
        
        return (needsTopUp, currentRatio, warningRatio, recommendedTopUp);
    }

    // 利息计算
    function interestCalculation(uint256 loanID) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        
        Loan storage loan = loans[loanID];
        require(loan.status == 0 || loan.status == 2, "Invalid loan status");

        // 计算利息
        uint256 dailyRate = parameterInfo.getPlatformConfig("TCASHDIR");
        uint256 interest = loan.amounts[1] * dailyRate / 10000;
        
        // 更新贷款记录
        loan.interest += interest;
        loan.amounts[1] += interest;
        loan.IST++;
        
        // 更新用户已贷出总额（加上利息）
        UserBorrowLimit storage userLimit = userBorrowLimits[loan.account];
        userLimit.totalBorrowed += interest;
        
        // 更新个人贷款数据
        PersonalLoanData storage userData = personalLoanData[loan.account];
        userData.TLA += interest;
        
        // 更新系统贷款数据
        sysLoanData.OLB += interest;
        sysLoanData.TLD += interest;
        
        // 触发事件更新
        _emitPersonalLoanDataEvent(loan.account);
        _emitSysLoanDataEvent();

        // 检查是否需要预警或清算
        uint256 collateralRatio = calculateCollateralRatio(loan);
        uint256 warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        uint256 liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");
        uint256 repaymentCycle = parameterInfo.getPlatformConfig("TCASHRC");
        
        // 检查抵押率是否低于清算线
        if (collateralRatio <= liquidationRatio) {
            loan.status = 3; // 清算中
        } 
        // 检查抵押率是否低于预警线
        else if (collateralRatio <= warningRatio) {
            loan.status = 2; // 预警中
        }
        
        // 检查是否超过最大还款周期
        if (loan.IST >= repaymentCycle) {
            loan.status = 3; // 超过还款周期，进入清算状态
        }

        emit InterestRecord(loanID, loan.account, interest);

        return true;
    }

    // 查询用户贷款列表
    function getUserLoans(address account) external view returns (uint256[] memory) {
        return userLoans[account];
    }
    
    // 查询贷款详情
    function getRecord(uint256 loanID) external view returns (
        uint256,
        address,
        uint256[] memory,
        uint256[] memory,
        uint256,
        uint256,
        uint256,
        uint256
    ) {
        Loan storage loan = loans[loanID];
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
    
    // 查询贷款详情（返回结构体）
    function getLoan(uint256 loanID) external view returns (Loan memory) {
        return loans[loanID];
    }

    // 查询用户贷款详情
    function getUserLoansDetails(address account) external view returns (
        Loan[] memory activeLoans, 
        Loan[] memory clearedLoans
    ) {
        uint256[] memory userLoanIds = userLoans[account];
        
        // 先统计贷款数量
        uint256 activeCount = 0;
        uint256 clearedCount = 0;
        
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            if (loans[userLoanIds[i]].status != 1) {
                activeCount++;
            } else {
                clearedCount++;
            }
        }
        
        // 创建结果数组
        activeLoans = new Loan[](activeCount);
        clearedLoans = new Loan[](clearedCount);
        
        // 填充数组
        uint256 activeIndex = 0;
        uint256 clearedIndex = 0;
        
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            Loan storage loan = loans[userLoanIds[i]];
            
            if (loan.status != 1) {
                activeLoans[activeIndex] = loan;
                activeIndex++;
            } else {
                clearedLoans[clearedIndex] = loan;
                clearedIndex++;
            }
        }
        
        return (activeLoans, clearedLoans);
    }

    // 获取贷款状态
    function getLoanStatus(uint256 loanID) external view returns (uint256) {
        return loans[loanID].status;
    }
    
    // 获取借款人地址
    function getLoanBorrower(uint256 loanID) external view returns (address) {
        return loans[loanID].account;
    }
    
    // 获取贷款剩余金额和利息
    function getLoanAmountAndInterest(uint256 loanID) external view returns (uint256 amount, uint256 interest) {
        Loan storage loan = loans[loanID];
        return (loan.amounts[1] - loan.interest, loan.interest);
    }
    
    // 计算偿还贷款后应返还的抵押品数量
    function calculateCollateralToRelease(uint256 loanID, uint256 repayAmount) external view returns (uint256) {
        Loan storage loan = loans[loanID];
        
        // 检查贷款状态
        require(loan.status == 0 || loan.status == 2, "Invalid loan status");
        
        // 确保还款金额不超过贷款总额
        if (repayAmount > loan.amounts[1]) {
            repayAmount = loan.amounts[1];
        }
        
        // 计算应返还的抵押品数量
        return calculateUnitToRelease(loan, repayAmount);
    }
    
    // 批量处理贷款利息
    function batchInterestCalculation(uint256[] calldata loanIDs) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        
        for (uint256 i = 0; i < loanIDs.length; i++) {
            // 只处理状态为"进行中"或"预警中"的贷款
            Loan storage loan = loans[loanIDs[i]];
            if (loan.status == 0 || loan.status == 2) {
                // 内部调用利息计算函数，但不重复权限检查
                _calculateInterest(loanIDs[i]);
            }
        }
        
        return true;
    }
    
    // 内部利息计算函数
    function _calculateInterest(uint256 loanID) internal returns (bool) {
        Loan storage loan = loans[loanID];
        
        // 计算利息
        uint256 dailyRate = parameterInfo.getPlatformConfig("TCASHDIR");
        uint256 interest = loan.amounts[1] * dailyRate / 10000;
        
        // 更新贷款记录
        loan.interest += interest;
        loan.amounts[1] += interest;
        loan.IST++;
        
        // 更新用户已贷出总额（加上利息）
        UserBorrowLimit storage userLimit = userBorrowLimits[loan.account];
        userLimit.totalBorrowed += interest;
        
        // 更新个人贷款数据
        PersonalLoanData storage userData = personalLoanData[loan.account];
        userData.TLA += interest;
        
        // 更新系统贷款数据
        sysLoanData.OLB += interest;
        sysLoanData.TLD += interest;
        
        // 触发事件更新
        _emitPersonalLoanDataEvent(loan.account);
        _emitSysLoanDataEvent();
        
        // 检查是否需要预警或清算
        uint256 collateralRatio = calculateCollateralRatio(loan);
        uint256 warningRatio = parameterInfo.getPlatformConfig("TCASHMCT");
        uint256 liquidationRatio = parameterInfo.getPlatformConfig("TCASHLT");
        uint256 repaymentCycle = parameterInfo.getPlatformConfig("TCASHRC");
        
        // 检查抵押率是否低于清算线
        if (collateralRatio <= liquidationRatio) {
            loan.status = 3; // 清算中
        } 
        // 检查抵押率是否低于预警线
        else if (collateralRatio <= warningRatio) {
            loan.status = 2; // 预警中
        }
        
        // 检查是否超过最大还款周期
        if (loan.IST >= repaymentCycle) {
            loan.status = 3; // 超过还款周期，进入清算状态
        }
        
        emit InterestRecord(loanID, loan.account, interest);
        
        return true;
    }
    
    // 获取用户活跃贷款总数
    function getUserActiveLoansCount(address account) external view returns (uint256) {
        uint256[] memory userLoanIds = userLoans[account];
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            if (loans[userLoanIds[i]].status != 1) { // 非已结清状态
                activeCount++;
            }
        }
        
        return activeCount;
    }

    // 获取用户剩余贷款总额
    function getUserOutstandingLoanAmount(address account) external view returns (uint256 principal, uint256 interest) {
        uint256[] memory userLoanIds = userLoans[account];
        uint256 totalPrincipal = 0;
        uint256 totalInterest = 0;
        
        for (uint256 i = 0; i < userLoanIds.length; i++) {
            Loan storage loan = loans[userLoanIds[i]];
            if (loan.status != 1) { // 非已结清状态
                totalPrincipal += (loan.amounts[1] - loan.interest);
                totalInterest += loan.interest;
            }
        }
        
        return (totalPrincipal, totalInterest);
    }
    
    // 贷款预测
    function loanPredict(uint256 collateralAmount) external view returns (
        uint256 estimatedLoanAmount,
        uint256 dailyInterestRate,
        uint256 dailyInterest
    ) {
        // 获取价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 使用默认的风险系数(为了避免状态修改)
        uint256 crf = 10000; // 1.0
        
        // 计算预计可贷金额
        estimatedLoanAmount = calculateLoanAmount(msg.sender, collateralAmount);
        
        // 获取日利率
        dailyInterestRate = parameterInfo.getPlatformConfig("TCASHDIR");
        
        // 计算日利息
        dailyInterest = estimatedLoanAmount * dailyInterestRate / 10000;
        
        return (estimatedLoanAmount, dailyInterestRate, dailyInterest);
    }
    
    // 根据预期贷款金额计算所需抵押品
    function collateralPredict(uint256 loanAmount) external view returns (
        uint256 requiredCollateral,
        uint256 dailyInterestRate,
        uint256 dailyInterest
    ) {
        // 获取价格
        uint256 unitPrice = oracle.getPrice("UNIT");
        uint256 tcashPrice = oracle.getPrice("TCASH");
        
        // 使用默认的风险系数(为了避免状态修改)
        uint256 crf = 10000; // 1.0
        
        // 计算所需抵押品
        requiredCollateral = calculateRequiredCollateral(msg.sender, loanAmount);
        
        // 获取日利率
        dailyInterestRate = parameterInfo.getPlatformConfig("TCASHDIR");
        
        // 计算日利息
        dailyInterest = loanAmount * dailyInterestRate / 10000;
        
        return (requiredCollateral, dailyInterestRate, dailyInterest);
    }
    
    // 管理员功能：设置贷款状态
    function setLoanStatus(uint256 loanID, uint256 status) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        require(status <= 3, "Invalid status value");
        
        Loan storage loan = loans[loanID];
        loan.status = status;
        
        return true;
    }

    // 个人参数相关函数
    
    // 设置个人贷款数据（内部函数）
    function _setPersonalLoanData(address account, string memory key, uint256 value) internal {
        PersonalLoanData storage userData = personalLoanData[account];
        
        if (keccak256(bytes(key)) == keccak256(bytes("NCL"))) {
            userData.NCL = value;
        } else if (keccak256(bytes(key)) == keccak256(bytes("TNL"))) {
            userData.TNL = value;
        } else if (keccak256(bytes(key)) == keccak256(bytes("TLA"))) {
            userData.TLA = value;
        } else if (keccak256(bytes(key)) == keccak256(bytes("TRA"))) {
            userData.TRA = value;
        }
        
        _emitPersonalLoanDataEvent(account);
    }
    
    // 获取个人贷款数据
    function getPersonalLoanData(address account) external view returns (
        uint256 NCL,
        uint256 TNL,
        uint256 TLA,
        uint256 TRA
    ) {
        PersonalLoanData storage userData = personalLoanData[account];
        NCL = userData.NCL;
        TNL = userData.TNL;
        TLA = userData.TLA;
        TRA = userData.TRA;
    }
    
    // 获取个人授信额度(PCL)和可贷余额(ALB)
    function getPersonalCreditAndAvailable(address account) external view returns (
        uint256 PCL,
        uint256 ALB
    ) {
        // 计算PCL - 个人授信额度
        uint256 tatMintCount = tatManager.getMintCount(account);
        uint256 unusedTATAverage = tatManager.getUnusedTATAverage(account);
        
        // 根据规则计算PCL
        if (tatMintCount >= 2) {
            uint256 loanCount = getUserLoanCount(account);
            if (loanCount <= 2) {
                PCL = unusedTATAverage * 3;
            } else {
                PCL = unusedTATAverage * 12;
            }
        } else {
            PCL = 0;
        }
        
        // 计算ALB - 个人可贷余额
        UserBorrowLimit storage userLimit = userBorrowLimits[account];
        if (PCL > userLimit.totalBorrowed) {
            ALB = PCL - userLimit.totalBorrowed;
        } else {
            ALB = 0;
        }
    }
    
    // 系统参数相关函数
    
    // 设置系统贷款数据（内部函数）
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
    
    // 获取系统贷款数据
    function getSysLoanData() external view returns (
        uint256 OLB,
        uint256 RA,
        uint256 TLD
    ) {
        OLB = sysLoanData.OLB;
        RA = sysLoanData.RA;
        TLD = sysLoanData.TLD;
    }
    
    // 辅助函数 - 触发个人贷款数据事件
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
    
    // 辅助函数 - 触发系统贷款数据事件
    function _emitSysLoanDataEvent() internal {
        emit SysLoanDataUpdated(
            sysLoanData.OLB,
            sysLoanData.RA,
            sysLoanData.TLD
        );
    }

    // 风险系数相关函数
    
    // 获取个人风险系数(PRF)
    function getPRF(address account) public view returns (uint256) {
        PersonalLoanData storage userData = personalLoanData[account];
        
        // 特殊情况：如果贷款次数 <= 5，直接返回1.0
        if (userData.TNL == 0 || userData.TNL - userData.NCL <= 5) {
            return 10000; // 1.0
        }
        
        // 计算贷款占有率系数
        uint256 loanOccupancyCoefficient;
        
        // 获取个人授信额度(PCL)
        uint256 PCL;
        uint256 tatMintCount = tatManager.getMintCount(account);
        uint256 unusedTATAverage = tatManager.getUnusedTATAverage(account);
        
        if (tatMintCount >= 2) {
            uint256 loanCount = getUserLoanCount(account);
            if (loanCount <= 2) {
                PCL = unusedTATAverage * 3;
            } else {
                PCL = unusedTATAverage * 12;
            }
        } else {
            PCL = 0;
        }
        
        // 避免除以零
        if (PCL == 0) {
            return 10000; // 默认返回1.0
        }
        
        // 计算贷款占有率 = TLA / PCL
        uint256 loanOccupancyRate = userData.TLA * 10000 / PCL;
        
        // 根据贷款占有率设置系数
        if (loanOccupancyRate <= 8500) { // 85%
            loanOccupancyCoefficient = 10000; // 1.0
        } else if (loanOccupancyRate <= 9500) { // 95%
            loanOccupancyCoefficient = 8000; // 0.8
        } else {
            loanOccupancyCoefficient = 6000; // 0.6
        }
        
        // 计算正常还款比例系数
        uint256 repaymentRatioCoefficient;
        
        // 避免除以零
        if (userData.TNL == 0) {
            repaymentRatioCoefficient = 2000; // 0.2
        } else {
            // 正常还款比例 = NCL / TNL
            uint256 repaymentRatio = userData.NCL * 10000 / userData.TNL;
            
            // 根据正常还款比例设置系数
            if (userData.NCL == 0) {
                repaymentRatioCoefficient = 2000; // 0.2
            } else if (repaymentRatio <= 3000) { // 30%
                repaymentRatioCoefficient = 4000; // 0.4
            } else if (repaymentRatio <= 6000) { // 60%
                repaymentRatioCoefficient = 5000; // 0.5
            } else if (repaymentRatio <= 8000) { // 80%
                repaymentRatioCoefficient = 8000; // 0.8
            } else {
                repaymentRatioCoefficient = 10000; // 1.0
            }
        }
        
        // 计算PRF = 贷款占有率系数 * 结清贷款比例系数
        uint256 PRF = loanOccupancyCoefficient * repaymentRatioCoefficient / 10000;
        
        return PRF;
    }
    
    // 计算系统风险系数(SRF)，内部函数
    function _calculateSRF() internal returns (uint256) {
        // 获取系统贷款数据
        uint256 OLB = sysLoanData.OLB;
        uint256 RA = sysLoanData.RA;
        uint256 TLD = sysLoanData.TLD;
        
        // 获取TCash的当前发行量
        uint256 totalSupply = tcash.totalSupply();
        
        // 避免除以零
        if (totalSupply == 0 || TLD == 0) {
            return 10000; // 默认返回1.0
        }
        
        // 计算系统贷出比例 = OLB / TotalSupply
        uint256 systemLoanRatio = OLB * 10000 / totalSupply;
        
        // 计算系统总还款率 = RA / TLD
        uint256 systemRepaymentRate = RA * 10000 / TLD;
        
        // 确定系统贷出比例区间
        uint256 loanRatioIndex;
        if (systemLoanRatio < 6000) { // 60%
            loanRatioIndex = 0;
        } else if (systemLoanRatio < 7000) { // 70%
            loanRatioIndex = 1;
        } else if (systemLoanRatio < 8000) { // 80%
            loanRatioIndex = 2;
        } else if (systemLoanRatio < 9000) { // 90%
            loanRatioIndex = 3;
        } else {
            loanRatioIndex = 4;
        }
        
        // 确定系统总还款率区间
        uint256 repaymentRateIndex;
        if (systemRepaymentRate > 3000) { // 30%
            repaymentRateIndex = 0;
        } else if (systemRepaymentRate > 2000) { // 20%
            repaymentRateIndex = 1;
        } else if (systemRepaymentRate > 1000) { // 10%
            repaymentRateIndex = 2;
        } else if (systemRepaymentRate > 500) { // 5%
            repaymentRateIndex = 3;
        } else {
            repaymentRateIndex = 4;
        }
        
        // SRF查表
        uint256[5][5] memory SRFTable = [
            [10000, 9000, 7000, 5000, 3000], // [0,60%）
            [9000, 8000, 7000, 4000, 2000],  // [60%,70%)
            [8000, 7000, 6000, 3000, 1000],  // [70%,80%)
            [5000, 4000, 3000, 2000, 1000],  // [80%,90%)
            [2000, 1000, 1000, 1000, 1000]   // [90%,∞)
        ];
        
        uint256 SRF = SRFTable[loanRatioIndex][repaymentRateIndex];
        
        // 更新状态变量
        systemRiskFactor = SRF;
        lastSRFCalculationTime = block.timestamp;
        
        // 触发事件
        emit RiskFactorUpdated(SRF);
        
        return SRF;
    }
    
    // 获取系统风险系数(SRF)
    function getSRF() public returns (uint256) {
        // 检查是否需要重新计算SRF (每天重新计算一次)
        if (block.timestamp >= lastSRFCalculationTime + 1 days) {
            return _calculateSRF();
        }
        
        return systemRiskFactor;
    }
    
    // 获取综合风险系数(CRF)
    function getCRF(address account) public returns (uint256) {
        uint256 PRF = getPRF(account);
        uint256 SRF = getSRF();
        
        // 计算CRF = PRF * SRF
        uint256 CRF = PRF * SRF / 10000;
        
        return CRF;
    }

    // 内部函数
    function calculateLoanAmount(
        uint256 collateralAmount,
        uint256 unitPrice,
        uint256 tcashPrice,
        uint256 crf
    ) internal view returns (uint256) {
        uint256 collateralValue = collateralAmount * unitPrice;
        uint256 maxLoanAmount = collateralValue * crf / (10000 * tcashPrice);
        return maxLoanAmount;
    }

    function calculateUnitToRelease(Loan storage loan, uint256 repayAmount) internal view returns (uint256) {
        return repayAmount * loan.amounts[0] / loan.amounts[1];
    }

    function calculateCollateralRatio(Loan storage loan) internal view returns (uint256) {
        return loan.amounts[0] * loan.prices[0] * 10000 / (loan.amounts[1] * loan.prices[1]);
    }
}