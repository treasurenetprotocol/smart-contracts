// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "./Stakeable.sol";
import "../Governance/IGovernance.sol";

/**
 * @dev TAT is the TreasureNet ERC20 Token, implementing:
 *    - ERC20, where minting is performed by the production data contract
 *    - Pausable
 *    - Burnable
 *    - Stake
 */
contract TAT is Initializable, OwnableUpgradeable, ERC20PausableUpgradeable, ERC20BurnableUpgradeable, Stakeable {
    IGovernance private _governance;

    /// @dev Initializes the contract
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _governanceContract The governance contract of TreasureNet
    function initialize(string memory _name, string memory _symbol, address _governanceContract) public initializer {
        __Ownable_init();
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        _governance = IGovernance(_governanceContract);
    }

    modifier onlyProductionDataContract(string memory _treasureKind) {
        // Check if the caller is the producer specified by the group
        (, address productionContract) = _governance.getTreasureByKind(_treasureKind);
        require(_msgSender() == productionContract, "Unauthorized caller");
        _;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    )
        internal
        virtual
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "ERC20Pausable: token transfer while paused");
    }

    event TATHistory(string kind, bytes32 uniqueId, address from, address to, uint256 amount);
    /// @dev Mint TAT tokens
    /// @param _treasureKind The type of treasure
    /// @param to The recipient address of TAT tokens
    /// @param amount The amount of TAT tokens to mint

    function mint(
        string memory _treasureKind,
        bytes32 _uniqueId,
        address to,
        uint256 amount
    )
        public
        onlyProductionDataContract(_treasureKind)
    {
        require(to != address(0), "Zero address");
        _mint(to, amount);
        emit TATHistory(_treasureKind, _uniqueId, msg.sender, to, amount);
    }

    /* Temp faucet */
    function faucet(address user, uint256 amount) public {
        require(user != address(0), "Zero address");
        _mint(user, amount);
    }

    /// @dev Burn TAT tokens
    /// @param _treasureKind The type of treasure
    /// @param tokens The amount of tokens to burn
    function burn(string memory _treasureKind, uint256 tokens) public onlyProductionDataContract(_treasureKind) {
        _burn(_msgSender(), tokens);
    }

    /// @dev Pause TAT token transfers
    function pause() public onlyOwner {
        _pause();
    }

    /// @dev Unpause TAT token transfers
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @dev Stake TAT tokens
    ///  - Event
    ///        event Stake(address from,uint256 amount);
    /// @param _amount The amount of TAT tokens to stake
    function stake(address account, uint256 _amount) public override {
        require(balanceOf(account) >= _amount, "Stake amount exceeds balance");
        _stake(account, _amount);
        _burn(account, _amount);
    }

    /// @dev Withdraw staked TAT tokens
    /// - Event
    ///    event Withdraw(address from,uint256 amount);
    /// @param _amount The amount of staked TAT tokens to withdraw
    function withdraw(address account, uint256 _amount) public override {
        require(stakeOf(account) >= _amount, "Withdrawal amount exceeds staked amount");
        _withdraw(account, _amount);
        _mint(account, _amount);
    }
}
