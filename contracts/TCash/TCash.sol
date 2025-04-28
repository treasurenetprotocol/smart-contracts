// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";
import "../Oracle/IOracle.sol";

contract TCash is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    // 角色管理
    IRoles public roles;
    // Oracle合约
    IOracle public oracle;
    
    // TCash精度
    uint8 private constant _decimals = 18;

    // 记录拍卖中锁定的TCash余额
    mapping(address => uint256) private _lockedBalances;
    // 允许调用bidCost和bidBack方法的拍卖合约地址
    address public tcashAuction;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialReceiver) public initializer {
        __ERC20_init("TCash", "TCash");
        __Ownable_init();
        
        // 初始铸造1,000,000个TCash到指定账户
        _mint(initialReceiver, 1_000_000 * 10**_decimals);
    }
    
    // 返回代币精度
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    // 设置角色管理合约
    function setRoles(address _roles) external onlyOwner {
        roles = IRoles(_roles);
    }
    
    // 设置Oracle合约
    function setOracle(address _oracle) external onlyOwner {
        oracle = IOracle(_oracle);
    }
    
    // 设置拍卖合约地址
    function setAuctionContract(address _tcashAuction) external onlyOwner {
        tcashAuction = _tcashAuction;
    }

    // 锁定用户TCash进行拍卖出价
    function bidCost(address user, uint256 amount) external returns (bool) {
        require(msg.sender == tcashAuction, "Only auction contract can call");
        require(balanceOf(user) >= amount, "Insufficient balance");
        
        // 锁定用户TCash
        _lockedBalances[user] += amount;
        
        return true;
    }
    
    // 拍卖失败后返还用户锁定的TCash
    function bidBack(address user, uint256 amount) external returns (bool) {
        require(msg.sender == tcashAuction, "Only auction contract can call");
        require(_lockedBalances[user] >= amount, "Insufficient locked balance");
        
        // 解锁用户TCash
        _lockedBalances[user] -= amount;
        
        return true;
    }
    
    // 查询用户锁定的TCash余额
    function getLockedBalance(address user) external view returns (uint256) {
        return _lockedBalances[user];
    }
    
    // 覆盖transferable余额计算，排除锁定的金额
    function transferableBalanceOf(address account) public view returns (uint256) {
        return balanceOf(account) - _lockedBalances[account];
    }

    // Mint tokens - 只有拥有TCASH_MINTER角色的地址可以铸造代币
    function mint(address to, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_MINTER(), msg.sender), "Not authorized to mint");
        
        // 检查Oracle是否设置及TCASH铸造状态
        if (address(oracle) != address(0)) {
            require(oracle.getTCashMintStatus(), "TCash minting is currently disabled");
        }
        
        _mint(to, amount);
        return true;
    }

    // Burn tokens - 用户销毁自己的代币
    function burn(uint256 amount) external returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    // BurnFrom tokens - 允许授权合约销毁指定地址的代币
    function burnFrom(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_BURNER(), msg.sender), "Not authorized to burn");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }

    // Add balance - 只有拥有TCASH_MINTER角色的地址可以增加余额
    function addBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_MINTER(), msg.sender), "Not authorized to add balance");
        
        // 检查Oracle是否设置及TCASH铸造状态
        if (address(oracle) != address(0)) {
            require(oracle.getTCashMintStatus(), "TCash minting is currently disabled");
        }
        
        _mint(account, amount);
        return true;
    }

    // Reduce balance - 减少余额
    function reduceBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        //暂时注释
        // require(roles.hasRole(roles.TCASH_BURNER(), msg.sender), "Not authorized to reduce balance");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
    
    // 覆盖转账方法，确保不转移锁定的金额
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(amount <= transferableBalanceOf(msg.sender), "Transfer amount exceeds unlocked balance");
        return super.transfer(to, amount);
    }
    
    // 覆盖transferFrom方法，确保不转移锁定的金额
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(amount <= transferableBalanceOf(from), "Transfer amount exceeds unlocked balance");
        return super.transferFrom(from, to, amount);
    }
} 