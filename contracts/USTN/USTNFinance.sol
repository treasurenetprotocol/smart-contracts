// SPDX-License-Identifier: GPL-3.0
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./USTNInterface.sol";
import "../Oracle/IOracle.sol";
import "../Governance/IRoles.sol";
import "../Governance/IParameterInfo.sol";

pragma solidity ^0.8.10;

interface USTNAInterface {
    struct auctions {
        uint sales;
        uint startValue;
        uint nowValue;
        uint timeOver;
        uint state;
    }

    function auctionStart(
        uint mortgage,
        uint debt,
        uint _debt
    ) external returns (auctions memory);
}

contract USTNFinance is Initializable, OwnableUpgradeable {
    //_repaymentStatus:1:to be repaid 2:paid off
    //_status: 1: Normal 2: Warning 3: Clearing
    //_operationStatus: 1: Loan 2: Increase position 3: Repay loan 4: Interest calculation 5: Liquidation
    event loanRecord(
        address _user,
        uint n,
        uint _unitAmount,
        uint _totalDebt,
        uint _pledgeRate,
        uint _status,
        uint _operationStatus,
        uint _ustn,
        uint _unit,
        uint _unitValue,
        uint _pledgeRateBefore
    );
    //_type: deposit:1 withdrawal:2 interest:3
    event dwDetail(uint _time, uint _type, address _user, uint amount);

    struct loanList {
        uint timestamp;
        uint initialDebt;
        uint mortgage;
        uint debt;
        uint interest;
        uint liquidationState;
    }

    // currency
    bytes32 public constant unit = keccak256("UNIT");
    bytes32 public constant ustn = keccak256("USTN");

    bytes32 public constant AUCTION_MANAGER = keccak256("AUCTION_MANAGER");
    bytes32 public constant FOUNDATION_MANAGER =
        keccak256("FOUNDATION_MANAGER");

    uint256 public bankLoanLimit;
    uint256 private userCurrentTime;
    address[] private depositUsers;
    mapping(address => bool) depositers;
    mapping(address => uint256) userDepositBalances;
    mapping(address => uint256) userPastTime;
    mapping(address => uint256) userDepositPoint;

    uint256 userLoansCurrentTime;
    uint256 loansTotalInterest; //every loans provide total interest per day
    uint256 interestMint;
    address[] private loanUsers; //loan user list
    mapping(address => bool) loaners;
    mapping(address => loanList[]) loanAccount;
    uint private liquidationTime;
    uint constant multiple = 10 ** 18;
    address private ustnAuction;

    IOracle private getValue;
    USTNInterface private USTNget;
    USTNAInterface private USTNAget;

    IRoles private _roles;
    IParameterInfo private getRatio;

    modifier onlyUser(bytes32 _name) {
        require(_roles.hasRole(_name, msg.sender), "no permission");
        _;
    }

    function initialize(
        address _rolesContract,
        address _parameterInfoContract,
        address _oracleContract,
        address _ustn,
        address _ustna
    ) public initializer {
        _roles = IRoles(_rolesContract);
        getRatio = IParameterInfo(_parameterInfoContract);
        getValue = IOracle(_oracleContract);
        USTNget = USTNInterface(_ustn);
        USTNAget = USTNAInterface(_ustna);
        ustnAuction = _ustna;

        liquidationTime = 10 minutes;
    }

    function getOSMValue(bytes32 currencyName) internal view returns (uint) {
        return getValue.getCurrencyValue(currencyName);
    }

    function isDepositer(address pAddr) internal view returns (bool) {
        return depositers[pAddr];
    }

    //Storage function, msg.sender can store the number of tokens in USTN to the USTNFinance contract
    function deposit(uint256 tokens) public returns (bool result) {
        require(
            tokens >= 1000000000 && tokens <= USTNget.balanceOf(msg.sender),
            "balance not enough"
        );
        if (!isDepositer(msg.sender)) {
            depositers[msg.sender] = true;
            depositUsers.push(msg.sender);
            userPastTime[msg.sender] = block.timestamp;
        }
        USTNget.reduceBalance(msg.sender, tokens);
        userDepositBalances[msg.sender] += tokens;
        bankLoanLimit += _reserve(tokens);

        emit dwDetail(block.timestamp, 1, msg.sender, tokens);
        return true;
    }

    function _reserve(uint tokens) internal view returns (uint) {
        return
            (tokens * (10000 - getRatio.getPlatformConfig("reserveRatio"))) /
            10000;
    }

    //Users can withdraw USTN for the number of tokens from USTNFinance
    function withdrawal(uint256 tokens) public returns (bool) {
        require(
            userDepositBalances[msg.sender] >= tokens,
            "deposit balance not enough"
        );
        userDepositBalances[msg.sender] -= tokens;
        bankLoanLimit -= _reserve(tokens);
        USTNget.addBalance(msg.sender, tokens);

        emit dwDetail(block.timestamp, 2, msg.sender, tokens);
        return true;
    }

    //Only used by FoundationManager
    //Distribute the interest generated by the daily loan
    function distributeDepositInterest()
        public
        onlyUser(FOUNDATION_MANAGER)
        returns (bool result)
    {
        //require(loansTotalInterest > 0 , "no interest");
        uint point_total = 0;
        //calculate everyone deposit point
        for (uint c = 0; c < depositUsers.length; c++) {
            userCurrentTime = block.timestamp;
            uint o = (userCurrentTime - userPastTime[depositUsers[c]]) /
                liquidationTime;
            userDepositPoint[depositUsers[c]] +=
                userDepositBalances[depositUsers[c]] *
                o;
            userPastTime[depositUsers[c]] += o * liquidationTime;
        }

        for (uint i = 0; i < depositUsers.length; i++) {
            point_total += userDepositPoint[depositUsers[i]];
        }
        for (uint m = 0; m < depositUsers.length; m++) {
            userDepositBalances[depositUsers[m]] += ((loansTotalInterest *
                userDepositPoint[depositUsers[m]]) / point_total);
            emit dwDetail(
                block.timestamp,
                3,
                depositUsers[m],
                (loansTotalInterest * userDepositPoint[depositUsers[m]]) /
                    point_total
            );
        }
        loansTotalInterest = 0;
        return true;
    }

    //Query the user's storage balance
    function queryDepositBalance() public view returns (uint256 balance) {
        return userDepositBalances[msg.sender];
    }

    function isLoanuser(address pAddr) internal view returns (bool) {
        return loaners[pAddr];
    }

    //According to the interest rate of the OSM contract, obtain the exchange rate of the loan
    function loansRate(uint256 tokens) public view returns (uint256) {
        uint exchange_amount = (((getOSMValue(unit) * tokens) /
            getOSMValue(ustn)) * getRatio.getPlatformConfig("loanPledgeRate")) /
            10000;
        return exchange_amount;
    }

    //Loan, used to lend USTN using msg.value amount of UNIT
    function loans() public payable returns (bool) {
        require(
            msg.value >= 1000000000 && loansRate(msg.value) <= bankLoanLimit
        );
        if (!isLoanuser(msg.sender)) {
            loaners[msg.sender] = true;
            loanUsers.push(msg.sender);
        }
        uint loanAmount = loansRate(msg.value);
        uint _interest = (loanAmount *
            getRatio.getPlatformConfig("loanInterestRate")) / 10000;
        loanList memory acc;
        acc.timestamp = block.timestamp;
        acc.initialDebt = loanAmount;
        acc.mortgage = msg.value;
        acc.interest = _interest;
        acc.debt = loanAmount + _interest;
        acc.liquidationState = 0;
        loanAccount[msg.sender].push(acc);
        bankLoanLimit -= loanAmount;
        USTNget.addBalance(msg.sender, loanAmount);
        loansTotalInterest += _interest;
        USTNget.addTotalSupply(loanAmount + _interest);
        interestMint += _interest;

        emit loanRecord(
            msg.sender,
            loanAccount[msg.sender].length - 1,
            msg.value,
            loanAmount + _interest,
            getRatio.getPlatformConfig("loanPledgeRate"),
            1,
            1,
            loanAmount,
            msg.value,
            getOSMValue(unit),
            0
        );
        //emit loanRecord(msg.sender, loanAccount[msg.sender].length-1, msg.value, loanAmount + _interest, getRatio.getUSTNLoanPledgeRate(), 1, 4, _interest, 0, 0, 0);
        return true;
    }

    //Add position operation, when the loan is lower than the warning line, the probability of being liquidated can be alleviated by adding positions
    function addLoans(uint number) public payable returns (bool result) {
        require(
            loanAccount[msg.sender][number].liquidationState != 2,
            "liquidated"
        );
        uint a = pledge(
            loanAccount[msg.sender][number].mortgage,
            loanAccount[msg.sender][number].debt
        );
        loanAccount[msg.sender][number].mortgage += msg.value;
        uint _rate = pledge(
            loanAccount[msg.sender][number].mortgage,
            loanAccount[msg.sender][number].debt
        );
        if (_rate >= getRatio.getUSTNLoanPledgeRateWarningValue()) {
            loanAccount[msg.sender][number].liquidationState = 0;
        } else {
            loanAccount[msg.sender][number].liquidationState = 1;
        }

        emit loanRecord(
            msg.sender,
            number,
            loanAccount[msg.sender][number].mortgage,
            loanAccount[msg.sender][number].debt,
            _rate,
            1,
            2,
            0,
            msg.value,
            getOSMValue(unit),
            a
        );
        return true;
    }

    //Repay the loan, repay the USTN of the number of tokens, and get back the UNIT of the same value
    function loansBack(
        uint number,
        uint tokens
    ) public payable returns (bool result) {
        require(USTNget.balanceOf(msg.sender) >= tokens);
        require(
            loanAccount[msg.sender][number].liquidationState != 2,
            "liquidated"
        );
        uint backPercent = 0;
        if (tokens >= loanAccount[msg.sender][number].debt) {
            USTNget.reduceBalance(
                msg.sender,
                loanAccount[msg.sender][number].debt
            );
            bankLoanLimit += (loanAccount[msg.sender][number].debt -
                loanAccount[msg.sender][number].interest);
            loanAccount[msg.sender][number].debt = 0;
            loanAccount[msg.sender][number].interest = 0;
            loanAccount[msg.sender][number].liquidationState = 2;
            backPercent = multiple;
        } else {
            USTNget.reduceBalance(msg.sender, tokens);
            if (loanAccount[msg.sender][number].interest > 0) {
                if (loanAccount[msg.sender][number].interest <= tokens) {
                    backPercent =
                        (tokens * multiple) /
                        loanAccount[msg.sender][number].debt;
                    bankLoanLimit += (tokens -
                        loanAccount[msg.sender][number].interest);
                    loanAccount[msg.sender][number].interest = 0;
                    interestMint -= loanAccount[msg.sender][number].interest;
                    loanAccount[msg.sender][number].debt -= tokens;
                } else {
                    loanAccount[msg.sender][number].interest -= tokens;
                    interestMint -= tokens;
                    backPercent =
                        (tokens * multiple) /
                        loanAccount[msg.sender][number].debt;
                    loanAccount[msg.sender][number].debt -= tokens;
                }
            } else {
                bankLoanLimit += tokens;
                backPercent =
                    (tokens * multiple) /
                    loanAccount[msg.sender][number].debt;
                loanAccount[msg.sender][number].debt -= tokens;
            }
        }

        uint _backUnit = (loanAccount[msg.sender][number].mortgage *
            backPercent) / multiple;
        payable(msg.sender).transfer(_backUnit);
        loanAccount[msg.sender][number].mortgage -= _backUnit;
        emit loanRecord(
            msg.sender,
            number,
            loanAccount[msg.sender][number].mortgage,
            loanAccount[msg.sender][number].debt,
            0,
            1,
            3,
            tokens,
            _backUnit,
            getOSMValue(unit),
            0
        );
        return true;
    }

    //The amount of USTN that the bank can leoan
    function loanPossible() public view returns (uint) {
        return bankLoanLimit;
    }

    function pledge(uint a, uint b) internal view returns (uint) {
        return (a * getOSMValue(unit) * 10000) / b / getOSMValue(ustn);
    }

    //based osm, liquidation by FoundationManager,state: 0:normal, 1:warning, 2:liquidated or complete the payment
    function liquidation()
        public
        onlyUser("FoundationManager")
        returns (bool result)
    {
        //calculate loan interest by Auditor
        userLoansCurrentTime = block.timestamp;
        for (uint a = 0; a < loanUsers.length; a++) {
            for (uint b = 0; b < loanAccount[loanUsers[a]].length; b++) {
                uint k = (userLoansCurrentTime -
                    loanAccount[loanUsers[a]][b].timestamp) / liquidationTime;
                loanAccount[loanUsers[a]][b].timestamp += k * liquidationTime;
                uint interestBear = 0;
                if (loanAccount[loanUsers[a]][b].liquidationState != 2) {
                    while (k > 0) {
                        uint _interest = (loanAccount[loanUsers[a]][b].debt *
                            getRatio.getPlatformConfig("loanInterestRate")) /
                            10000;
                        loansTotalInterest += _interest;
                        interestMint += _interest;
                        USTNget.addTotalSupply(_interest);
                        loanAccount[loanUsers[a]][b].interest += _interest;
                        loanAccount[loanUsers[a]][b].debt += _interest;
                        interestBear += _interest;
                        k--;
                    }
                    emit loanRecord(
                        loanUsers[a],
                        b,
                        loanAccount[loanUsers[a]][b].mortgage,
                        loanAccount[loanUsers[a]][b].debt,
                        pledge(
                            loanAccount[loanUsers[a]][b].mortgage,
                            loanAccount[loanUsers[a]][b].debt
                        ),
                        1,
                        4,
                        interestBear,
                        0,
                        0,
                        0
                    );
                }
            }
        }

        //check every account liquidation state
        for (uint m = 0; m < loanUsers.length; m++) {
            for (uint n = 0; n < loanAccount[loanUsers[m]].length; n++) {
                if ((loanAccount[loanUsers[m]][n]).liquidationState != 2) {
                    uint _x = pledge(
                        loanAccount[loanUsers[m]][n].mortgage,
                        loanAccount[loanUsers[m]][n].debt
                    );
                    if (_x <= getRatio.getUSTNLoanPledgeRateWarningValue()) {
                        if (_x >= getRatio.getUSTNLoanLiquidationRate()) {
                            loanAccount[loanUsers[m]][n].liquidationState = 1;
                        }
                        if (_x < getRatio.getUSTNLoanLiquidationRate()) {
                            loanAccount[loanUsers[m]][n].liquidationState = 2;
                            USTNAget.auctionStart(
                                loanAccount[loanUsers[m]][n].mortgage,
                                loanAccount[loanUsers[m]][n].debt,
                                (loanAccount[loanUsers[m]][n].interest)
                            );
                        }
                        emit loanRecord(
                            loanUsers[m],
                            n,
                            loanAccount[loanUsers[m]][n].mortgage,
                            loanAccount[loanUsers[m]][n].debt,
                            _x,
                            loanAccount[loanUsers[m]][n].liquidationState + 1,
                            5,
                            0,
                            0,
                            0,
                            0
                        );
                    } else {
                        loanAccount[loanUsers[m]][n].liquidationState = 0;
                    }
                }
            }
        }

        return true;
    }

    // USTNAuction use only
    // Triggered when the auction ends and the user gets the auction item
    function auctionOver(
        address bider,
        uint tokens,
        uint a,
        uint b
    ) public returns (bool) {
        require(msg.sender == ustnAuction);
        payable(bider).transfer(tokens);
        interestMint -= a;
        bankLoanLimit += b;
        return true;
    }

    //Users query all their loan information
    function queryLoan() public view returns (loanList[] memory) {
        return loanAccount[msg.sender];
    }

    function initialize() public initializer {
        __Ownable_init();
    }

    function GetInitializeData() public pure returns (bytes memory) {
        return abi.encodeWithSignature("initialize()");
    }

    // Expose helper functions to call USTN contract methods
    function callAddTotalSupply(uint256 amount) external {
        USTNget.addTotalSupply(amount);
    }

    function callReduceTotalSupply(uint256 amount) external {
        USTNget.reduceTotalSupply(amount);
    }

    function callAddBalance(address user, uint256 amount) external {
        USTNget.addBalance(user, amount);
    }

    function callReduceBalance(address user, uint256 amount) external {
        USTNget.reduceBalance(user, amount);
    }
}
