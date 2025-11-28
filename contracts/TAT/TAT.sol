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
        uint256[3] months;  // year-month entries in YYYYMM format
        uint256[3] amounts; // corresponding minted amounts
        uint8 currentIndex; // current index in the circular buffer (0-2)
    }
    
    // User address => mint record
    mapping(address => TATRecord) private _tatRecords;
    
    // // Only ProductionData contracts can call
    // modifier onlyProductionData() {
    //     // Get ProductionData address from governance contract
    //     bool isProductionData = false;
    //     for (uint i = 0; i < 10; i++) { // assume up to 10 treasure kinds
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
    
    // Helper to fetch treasure kind by index; adjust implementation as needed
    function getKindByIndex(uint256 index) internal view returns (string memory) {
        // Should retrieve kinds from governance in real usage
        // Simplified placeholder; should query _governance
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
        
        // // Get current year-month in YYYYMM format
        // uint256 currentMonth = getCurrentYearMonth();
        
        // // Record user mint history
        // setTATRecord(to, amount, currentMonth);
        
        // Mint tokens
        _mint(to, amount);
        
        // Emit event
        emit TATHistory(_treasureKind, _uniqueId, msg.sender, to, amount);
    }
    
    /**
     * @dev Get current year-month in YYYYMM format
     * @return Current year-month, e.g., 202407 means July 2024
     */
    function getCurrentYearMonth() internal view returns (uint256) {
        // Get current timestamp
        uint256 timestamp = block.timestamp;
        
        // Convert to date (simplified)
        // Simplified calculation; production code should use more precise date logic
        
        // Calculate year from Jan 1, 1970
        uint256 secondsInDay = 86400; // 24 hours * 60 minutes * 60 seconds
        uint256 secondsInYear = secondsInDay * 365; // simplified, ignores leap years
        
        uint256 yearsSince1970 = timestamp / secondsInYear;
        uint256 year = 1970 + yearsSince1970;
        
        // Calculate month
        uint256 secondsRemainingInYear = timestamp % secondsInYear;
        uint256 daysRemainingInYear = secondsRemainingInYear / secondsInDay;
        
        // Roughly estimate month (simplified)
        uint256 month = (daysRemainingInYear * 12) / 365 + 1;
        
        // Clamp month range
        if (month > 12) month = 12;
        
        // Combine into YYYYMM
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
     * @dev Set TAT mint record for a user
     * @param account User address
     * @param amount Minted token amount
     */
    function setTATRecord(
        address account,
        uint256 amount
    ) public {
        require(account != address(0), "User address cannot be zero");
        require(amount > 0, "Mint amount must be greater than 0");
        
        TATRecord storage record = _tatRecords[account];
        
        // If uninitialized, start at index 0
        if (record.months[0] == 0 && record.months[1] == 0 && record.months[2] == 0) {
            record.currentIndex = 0;
        } else {
            // Otherwise move to next position in the circular buffer
            record.currentIndex = (record.currentIndex + 1) % 3;
        }
        
        // Update record
        record.months[record.currentIndex] = getCurrentYearMonth();
        record.amounts[record.currentIndex] = amount;
    }
    
    /**
     * @dev Get TAT mint records for a user
     * @param account User address
     * @return months Recorded year-month values
     * @return amounts Corresponding minted amounts
     */
    function getTATRecord(address account) public view returns (uint256[] memory months, uint256[] memory amounts) {
        TATRecord storage record = _tatRecords[account];
        
        // Calculate number of valid records
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
