// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";
import "../Oracle/IOracle.sol";

contract TCash is Initializable, ERC20Upgradeable, OwnableUpgradeable {
    // Role management
    IRoles public roles;
    // Oracle contract
    IOracle public oracle;
    
    // TCash decimals
    uint8 private constant _decimals = 18;

    // Locked TCash balances during auctions
    mapping(address => uint256) private _lockedBalances;
    // Auction contract allowed to call bidCost and bidBack
    address public tcashAuction;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialReceiver) public initializer {
        __ERC20_init("TCash", "TCash");
        __Ownable_init();
        
        // Mint initial 1,000,000 TCash to the designated account
        _mint(initialReceiver, 1_000_000 * 10**_decimals);
    }
    
    // Return token decimals
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    // Set roles contract
    function setRoles(address _roles) external onlyOwner {
        roles = IRoles(_roles);
    }
    
    // Set oracle contract
    function setOracle(address _oracle) external onlyOwner {
        oracle = IOracle(_oracle);
    }
    
    // Set auction contract address
    function setAuctionContract(address _tcashAuction) external onlyOwner {
        tcashAuction = _tcashAuction;
    }

    // Lock user TCash for auction bids
    function bidCost(address user, uint256 amount) external returns (bool) {
        require(msg.sender == tcashAuction, "Only auction contract can call");
        require(balanceOf(user) >= amount, "Insufficient balance");
        
        // Lock user TCash
        _lockedBalances[user] += amount;
        
        return true;
    }
    
    // Return locked TCash when auction fails
    function bidBack(address user, uint256 amount) external returns (bool) {
        require(msg.sender == tcashAuction, "Only auction contract can call");
        require(_lockedBalances[user] >= amount, "Insufficient locked balance");
        
        // Unlock user TCash
        _lockedBalances[user] -= amount;
        
        return true;
    }
    
    // Query locked TCash balance
    function getLockedBalance(address user) external view returns (uint256) {
        return _lockedBalances[user];
    }
    
    // Override transferable balance calculation to exclude locked amounts
    function transferableBalanceOf(address account) public view returns (uint256) {
        return balanceOf(account) - _lockedBalances[account];
    }

    // Mint tokens - only TCASH_MINTER role can mint
    function mint(address to, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_MINTER(), msg.sender), "Not authorized to mint");
        
        // Check oracle is set and mint status is enabled
        if (address(oracle) != address(0)) {
            require(oracle.getTCashMintStatus(), "TCash minting is currently disabled");
        }
        
        _mint(to, amount);
        return true;
    }

    // Burn tokens - user burns own tokens
    function burn(uint256 amount) external returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    // BurnFrom tokens - authorized contracts burn a given address's tokens
    function burnFrom(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_BURNER(), msg.sender), "Not authorized to burn");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }

    // Add balance - only TCASH_MINTER role can add balance
    function addBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_MINTER(), msg.sender), "Not authorized to add balance");
        
        // Check oracle is set and mint status is enabled
        if (address(oracle) != address(0)) {
            require(oracle.getTCashMintStatus(), "TCash minting is currently disabled");
        }
        
        _mint(account, amount);
        return true;
    }

    // Reduce balance
    function reduceBalance(address account, uint256 amount) external returns (bool) {
        require(address(roles) != address(0), "Roles not set");
        require(roles.hasRole(roles.TCASH_BURNER(), msg.sender), "Not authorized to reduce balance");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(account) >= amount, "Insufficient balance");
        _burn(account, amount);
        return true;
    }
    
    // Override transfer to prevent moving locked amounts
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(amount <= transferableBalanceOf(msg.sender), "Transfer amount exceeds unlocked balance");
        return super.transfer(to, amount);
    }
    
    // Override transferFrom to prevent moving locked amounts
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(amount <= transferableBalanceOf(from), "Transfer amount exceeds unlocked balance");
        return super.transferFrom(from, to, amount);
    }
}
