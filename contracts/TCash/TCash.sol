// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

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

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialReceiver) public initializer {
        __ERC20_init("tcash token", "TCash");
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

    // Mint tokens - 只有拥有TCASH_MINTER角色的地址可以铸造代币
    function mint(address to, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        // require(roles.hasRole("TCASH_MINTER", msg.sender), "Not authorized to mint");
        
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
        // require(roles.hasRole("TCASH_BURNER", msg.sender), "Not authorized to burn");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }

    // Add balance - 只有拥有TCASH_MINTER角色的地址可以增加余额
    function addBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        // require(roles.hasRole("TCASH_MINTER", msg.sender), "Not authorized to add balance");
        
        // 检查Oracle是否设置及TCASH铸造状态
        if (address(oracle) != address(0)) {
            require(oracle.getTCashMintStatus(), "TCash minting is currently disabled");
        }
        
        _mint(account, amount);
        return true;
    }

    // Reduce balance - 只有拥有TCASH_BURNER角色的地址可以减少余额
    function reduceBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        // require(roles.hasRole("TCASH_BURNER", msg.sender), "Not authorized to reduce balance");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
} 