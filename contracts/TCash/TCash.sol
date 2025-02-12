// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract TCash is Initializable, OwnableUpgradeable, IERC20Upgradeable {
    // Basic token information
    string public constant name = "tcash token";
    uint8 public constant decimals = 18;
    string public constant symbol = "TCASH";

    // State variables
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Events
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
    }

    // Query total supply
    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    // Query balance
    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    // Transfer tokens
    function transfer(address to, uint256 amount) external override returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[msg.sender] >= amount, "Insufficient balance");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    // Query allowance
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    // Approve spending
    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    // Transfer tokens with allowance
    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(to != address(0), "Transfer to zero address");
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");

        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // Mint tokens
    function mint(uint256 amount) external returns (bool) {
        _totalSupply += amount;
        _balances[msg.sender] += amount;
        
        emit Mint(msg.sender, amount);
        emit Transfer(address(0), msg.sender, amount);
        return true;
    }

    // Burn tokens
    function burn(uint256 amount) external returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        
        _totalSupply -= amount;
        _balances[msg.sender] -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        return true;
    }

    // Add balance
    function addBalance(address account, uint256 amount) external returns (bool) {
        _balances[account] += amount;
        _totalSupply += amount;
        
        emit Transfer(address(0), account, amount);
        return true;
    }

    // Reduce balance
    function reduceBalance(address account, uint256 amount) external returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        require(_balances[account] >= amount, "Insufficient balance");
        
        _balances[account] -= amount;
        _totalSupply -= amount;
        
        emit Transfer(account, address(0), amount);
        return true;
    }
} 