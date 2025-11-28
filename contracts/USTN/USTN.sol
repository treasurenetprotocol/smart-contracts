// SPDX-License-Identifier: GPL-3.0
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../Governance/IRoles.sol";
import "../Oracle/IOracle.sol";

pragma solidity ^0.8.10;

contract USTN is IERC20Upgradeable, Initializable, OwnableUpgradeable {
    event convert(
        uint _time,
        address _user,
        uint _unitValueTotal,
        uint _USTNAmount,
        string _type
    );

    string public constant name = "ustn token";
    uint8 public constant decimals = 18;
    string public constant symbol = "USTN";

    bytes32 public constant unit = keccak256("UNIT");
    bytes32 public constant ustn = keccak256("USTN");
    bytes32 public constant AUCTION_MANAGER = keccak256("AUCTION_MANAGER");

    IRoles private _roles;
    IOracle private _oracle;

    address private _ustnAuction;
    address private _ustnFinance;

    uint256 public _totalSupply;
    mapping(address => uint256) _balance;
    mapping(address => mapping(address => uint256)) _approve;
    address private governance;

    function initialize(
        address _rolesContract,
        address _oracleContract,
        address _ustnAuctionContract,
        address _ustnFinanceContract
    ) public initializer {
        require(_rolesContract != address(0), "zero roles contract");
        require(_oracleContract != address(0), "zero oracle contract");
        require(_ustnAuctionContract != address(0), "zero auction contract");
        require(_ustnFinanceContract != address(0), "zero finance contract");

        __Ownable_init();

        _roles = IRoles(_rolesContract);
        _oracle = IOracle(_oracleContract);

        _ustnAuction = _ustnAuctionContract;
        _ustnFinance = _ustnFinanceContract;
    }

    modifier onlyUSTNAuction() {
        require(
            msg.sender == _ustnAuction,
            "only USTN Auction contract allowed"
        );
        _;
    }

    modifier onlyUSTNFinance() {
        require(
            msg.sender == _ustnFinance,
            "only USTN Finance contract allowed"
        );
        _;
    }

    receive() external payable {}

    //Get the total circulation of USTN
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    //Query the USTN balance of the specified tokenOwner account
    function balanceOf(
        address tokenOwner
    ) external view override returns (uint256 balance) {
        return _balance[tokenOwner];
    }

    //Give to address, the USTN of the number of tokens
    function transfer(
        address to,
        uint256 tokens
    ) external override returns (bool result) {
        require(_balance[msg.sender] >= tokens, "USTN: balances not enough");
        _balance[msg.sender] -= tokens;
        _balance[to] += tokens;
        emit Transfer(msg.sender, to, tokens);

        return true;
    }

    // The remaining number of tokens authorized to spender by the tokenowner
    function allowance(
        address tokenOwner,
        address spender
    ) external view override returns (uint256 remaining) {
        return _approve[tokenOwner][spender];
    }

    // tokenOwner delegate spender use tokens
    function approve(
        address spender,
        uint256 tokens
    ) external override returns (bool success) {
        _approve[msg.sender][spender] = tokens;
        emit Approval(msg.sender, spender, tokens);
        return true;
    }

    // transfer tokens from >> to
    function transferFrom(
        address from,
        address to,
        uint256 tokens
    ) external override returns (bool success) {
        _approve[from][msg.sender] -= tokens;
        _balance[from] -= tokens;
        _balance[to] += tokens;
        emit Transfer(from, to, tokens);
        return true;
    }

    //Only allow USTNAuction contract to use
    //require to get the account address of AuctionManager
    //bider to AuctionManager, amount of USTN
    function bidCost(
        address bider,
        uint amount
    ) public onlyUSTNAuction returns (bool) {
        require(_balance[bider] > amount, "USTN: balances not enough");
        require(queryAuctionManager() != address(0), "USTN: zero address");
        _balance[bider] -= amount;
        _balance[queryAuctionManager()] += amount;

        return true;
    }

    //Only allow USTNAuction contract to use
    //require to get the account address of AuctionManager
    //AuctionManager returns to bider, the amount of USTN
    function bidBack(
        address bider,
        uint amount
    ) public onlyUSTNAuction returns (bool) {
        require(bider != address(0), "USTN: zero address");
        require(queryAuctionManager() != address(0), "USTN: zero address");
        _balance[bider] += amount;
        _balance[queryAuctionManager()] -= amount;
        return true;
    }

    //Query the address of AuctionManager
    function queryAuctionManager() public view returns (address) {
        address manager = _roles.getRoleMember(AUCTION_MANAGER, 0);
        require(manager != address(0), "no auction manager set yet");
        return manager;
    }

    //Only allow USTNFinance to use
    //Reduce the total amount issued by the amount
    //Repay the loan to reduce the bank's additional issuance
    function reduceTotalSupply(
        uint amount
    ) public onlyUSTNFinance returns (bool) {
        _totalSupply -= amount;

        return true;
    }

    //Only allow USTNFinance to use
    //Increase the total amount issued by the amount
    //The loan interest causes the total issuance to increase
    function addTotalSupply(uint amount) public onlyUSTNFinance returns (bool) {
        _totalSupply += amount;

        return true;
    }

    // Only allow USTNFinance to use
    //Increase the add address, the amount of USTN
    function addBalance(
        address add,
        uint amount
    ) public returns (bool) {
        _balance[add] += amount;

        return true;
    }

    // Only allow USTNFinance to use
    //Reduce add address, amount of USTN
    function reduceBalance(address add, uint amount) public returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        require(_balance[add] >= amount, "Insufficient balance");
        _balance[add] -= amount;

        return true;
    }

    //Based on the currency price of OSM, get the ratio of USTN to UNIT
    function mintRate(uint256 amount) public view returns (uint256) {
        return (getOSMValue(unit) * amount) / getOSMValue(ustn);
    }

    //Based on the currency price of OSM, get the proportion of UNIT repurchasing USTN
    function mintBackRate(uint256 amount) public view returns (uint256) {
        return (getOSMValue(ustn) * amount) / getOSMValue(unit);
    }

    // Remove payable and add amount parameter so users specify how much to mint
    function mint(uint256 amount) public returns (bool result) {
        // Use the provided amount directly
        _totalSupply += amount;
        _balance[msg.sender] += amount;

        emit convert(block.timestamp, msg.sender, 0, amount, "mint");
        emit Transfer(address(0), msg.sender, amount);
        return true;
    }

    //Based on the proportion of OSM, repurchase the UNIT of the token value
    function mintBack(uint256 tokens) public payable returns (bool) {
        require(_totalSupply > 5 * 10 ** 25);
        require(
            ((_totalSupply - 5 * 10 ** 25) * getOSMValue(unit)) /
                getOSMValue(ustn) >=
                tokens,
            "overflow the mintbak threshold"
        );
        uint exchange_tokens = mintBackRate(tokens);
        _balance[msg.sender] -= tokens;
        _totalSupply -= tokens;
        payable(msg.sender).transfer(exchange_tokens);

        emit convert(
            block.timestamp,
            msg.sender,
            tokens,
            exchange_tokens,
            "mintBack"
        );
        return true;
    }

    //only allowed for USTNAuction
    //Triggered when receiving the auction item, burns the number of tokens of AuctionManager
    function burn(
        address account,
        uint256 tokens
    ) public onlyUSTNAuction returns (bool) {
        require(tokens <= _balance[account], "USTN: balance not enough");
        _totalSupply -= tokens;
        _balance[account] -= tokens;

        emit Transfer(account, address(0), tokens);
        return true;
    }

    //query OSM value internal function
    function getOSMValue(bytes32 currencyName) internal view returns (uint) {
        uint256 value = _oracle.getCurrencyValue(currencyName);
        require(value > 0, "USTN: value must bigger than zero");
        return value;
    }
}
