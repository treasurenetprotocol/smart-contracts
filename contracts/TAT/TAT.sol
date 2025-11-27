// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

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
contract TAT is
Initializable,
OwnableUpgradeable,
ERC20PausableUpgradeable,
ERC20BurnableUpgradeable,
Stakeable
{
    IGovernance private _governance;
    
    // TAT mint record structure
    struct TATRecord {
        uint256[3] months;  // Year and month in YYYYMM format
        uint256[3] amounts; // Minted amount for each recorded month
        uint8 currentIndex; // Current index position, cycles through 0-2
    }
    
    // User address => mint record
    mapping(address => TATRecord) private _tatRecords;
    
    // // Only the ProductionData contract can call
    // modifier onlyProductionData() {
    //     // Fetch the ProductionData address from the governance contract
    //     bool isProductionData = false;
    //     for (uint i = 0; i < 10; i++) { // Assume up to 10 treasure types
    //         string memory treasureKind = getKindByIndex(i);
    //         if (bytes(treasureKind).length == 0) break;
            
    //         (, address productionContract) = _governance.getTreasureByKind(treasureKind);
    //         if (_msgSender() == productionContract) {
    //             isProductionData = true;
    //             break;
    //         }
    //     }
    //     require(isProductionData, "Only ProductionData contract can call");
    //     _;
    // }
    
    // Helper to get the treasure type by index; actual implementation should match governance
    function getKindByIndex(uint256 index) internal view returns (string memory) {
        // Should fetch from governance in a real implementation
        return "";
    }

    /// @dev Initializes the contract
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _governanceContract The governance contract of TreasureNet
    function initialize(
        string memory _name,
        string memory _symbol,
        address _governanceContract
    ) public initializer {
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
    ) internal virtual override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "ERC20Pausable: token transfer while paused");
    }

    event TATHistory(string kind, bytes32 uniqueId, address from, address to, uint amount);
    /// @dev Mint TAT tokens
    /// @param _treasureKind The type of treasure
    /// @param to The recipient address of TAT tokens
    /// @param amount The amount of TAT tokens to mint
    function mint(
        string memory _treasureKind,
        bytes32 _uniqueId,
        address to,
        uint256 amount
    ) public onlyProductionDataContract(_treasureKind) {
        require(to != address(0), "Zero address");
        
        // // Get current year and month in YYYYMM format
        // uint256 currentMonth = getCurrentYearMonth();
        
        // // Record user mint history
        // setTATRecord(to, amount, currentMonth);
        
        // Mint tokens
        _mint(to, amount);
        
        // Emit event
        emit TATHistory(_treasureKind, _uniqueId, msg.sender, to, amount);
    }
    
    /**
     * @dev Get current year and month in YYYYMM format
     * @return The current year and month (e.g., 202407 means July 2024)
     */
    function getCurrentYearMonth() internal view returns (uint256) {
        // Get the current timestamp
        uint256 timestamp = block.timestamp;
        
        // Convert to a date (simplified calculation)
        // This is approximate; a production implementation should use a precise date calc
        
        // Calculate year since January 1, 1970
        uint256 secondsInDay = 86400; // 24h * 60m * 60s
        uint256 secondsInYear = secondsInDay * 365; // Simplified, ignores leap years
        
        uint256 yearsSince1970 = timestamp / secondsInYear;
        uint256 year = 1970 + yearsSince1970;
        
        // Calculate month
        uint256 secondsRemainingInYear = timestamp % secondsInYear;
        uint256 daysRemainingInYear = secondsRemainingInYear / secondsInDay;
        
        // Rough month estimate (simplified)
        uint256 month = (daysRemainingInYear * 12) / 365 + 1;
        
        // Constrain to valid month range
        if (month > 12) month = 12;
        
        // Combine into YYYYMM format
        return year * 100 + month;
    }

    /* Temp faucet */
    function faucet(address user, uint256 amount) public {
        require(user != address(0), "Zero address");
    
        // Record user mint history
        setTATRecord(user, amount);
        
        // Mint tokens
        _mint(user, amount);
    }

    /// @dev Burn TAT tokens
    /// @param _treasureKind The type of treasure
    /// @param tokens The amount of tokens to burn
    function burn(string memory _treasureKind, uint256 tokens)
    public
    onlyProductionDataContract(_treasureKind)
    {
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

    /**
     * @dev Set the TAT minting record for a user
     * @param account User address
     * @param amount Amount of tokens minted
     */
    function setTATRecord(
        address account,
        uint256 amount
    ) public {
        require(account != address(0), "User address cannot be zero");
        require(amount > 0, "Mint amount must be greater than 0");
        
        TATRecord storage record = _tatRecords[account];
        
        // If uninitialized, set currentIndex to 0
        if (record.months[0] == 0 && record.months[1] == 0 && record.months[2] == 0) {
            record.currentIndex = 0;
        } else {
            // Otherwise advance to the next position (cycle 0-2)
            record.currentIndex = (record.currentIndex + 1) % 3;
        }
        
        // Update record
        record.months[record.currentIndex] = getCurrentYearMonth();
        record.amounts[record.currentIndex] = amount;
    }
    
    /**
     * @dev Get a user's TAT minting records
     * @param account User address
     * @return months Array of recorded year-month values
     * @return amounts Array of corresponding minted amounts
     */
    function getTATRecord(address account) public view returns (uint256[] memory months, uint256[] memory amounts) {
        TATRecord storage record = _tatRecords[account];
        
        // Count valid entries
        uint8 validCount = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (record.months[i] != 0) {
                validCount++;
            }
        }
        
        // Create return arrays
        months = new uint256[](validCount);
        amounts = new uint256[](validCount);
        
        // Populate arrays
        uint8 index = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (record.months[i] != 0) {
                months[index] = record.months[i];
                amounts[index] = record.amounts[i];
                index++;
            }
        }
        
        return (months, amounts);
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
