// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract TokenLocker is Initializable, ReentrancyGuardUpgradeable {
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.Bytes32Set;

    // Admin management
    EnumerableSetUpgradeable.AddressSet private managers;

    // Asset management
    uint256 private totalLockedAmount;
    uint256 private totalAvailableAmount;

    // Locked record structure
    struct LockedRecord {
        bytes lockedID;
        bytes planID;
        uint256 amount;
        uint256 claimMethod;
        uint256 time;
        bool isActive;
    }

    // Plan structure
    struct Plan {
        string planName;
        uint256 planAmount;
        uint256 allocatedAmount;
        uint256 claimMethod;
        bool isActive;
    }

    // Data storage
    mapping(address => LockedRecord[]) private lockedRecords;
    mapping(bytes => Plan) private plans;

    // Plan index (upgraded to Upgradeable version)
    EnumerableSetUpgradeable.Bytes32Set private activePlans;

    // Plan-account mapping (upgraded to Upgradeable version)
    mapping(bytes => EnumerableSetUpgradeable.AddressSet) private planAccounts;
    mapping(bytes => mapping(address => uint256[])) private planRecordIndices;

    // Events
    event ManagerAdded(address manager);
    event ManagerRemoved(address manager);
    event SetPlan(
        bytes planID,
        string planName,
        uint256 planAmount,
        uint256 claimMethod
    );
    event DelPlan(bytes planID);
    event SetLockedRecord(
        bytes lockedID,
        bytes planID,
        address account,
        uint256 amount,
        uint256 claimMethod,
        uint256 time
    );
    event ClaimToken(address account, uint256 amount);
    event ClaimLockedRecord(bytes lockedID);
    event CancelLockedRecord(bytes lockedID);

    // Replace constructor with initialization function
    function initialize() public initializer {
        __ReentrancyGuard_init();
        managers.add(msg.sender);
    }

    // Modifier
    modifier onlyManager() {
        require(managers.contains(msg.sender), "Caller is not a manager");
        _;
    }

    // Manager management functions
    function setManagerAccount(address _manager) external onlyManager {
        require(managers.add(_manager), "Address is already manager");
        emit ManagerAdded(_manager);
    }

    // Get manager list
    function getManagerAccounts() external view returns (address[] memory) {
        return managers.values();
    }

    // Check manager
    function checkManagerAccount(
        address _account
    ) external view returns (bool) {
        return managers.contains(_account);
    }

    // Remove manager
    function delManagerAccount(address _manager) external onlyManager {
        require(managers.remove(_manager), "Address is not manager");
        emit ManagerRemoved(_manager);
    }

    // Add locked tokens
    function addLockedToken() external payable onlyManager {
        require(msg.value > 0, "Amount must be positive");
        totalLockedAmount += msg.value;
        totalAvailableAmount += msg.value;
    }

    // Withdraw locked tokens
    function withdrawLockedToken(uint256 _amount) external onlyManager {
        require(_amount > 0, "Amount must be positive");
        if (_amount < totalAvailableAmount) {
            totalAvailableAmount -= _amount;
        } else {
            totalAvailableAmount = 0;
        }
        if (_amount < totalLockedAmount) {
            totalLockedAmount -= _amount;
        } else {
            totalLockedAmount = 0;
        }
        payable(msg.sender).transfer(_amount);
    }

    // Add plan
    function setPlan(
        bytes calldata _planID,
        string calldata _planName,
        uint256 _planAmount,
        uint256 _claimMethod
    ) external onlyManager {
        require(_planAmount > 0, "Amount must be positive");
        require(_claimMethod <= 1, "Invalid claim method");
        require(plans[_planID].planAmount == 0, "Plan already exists");
        require(
            totalAvailableAmount >= _planAmount,
            "Not enough available amount"
        );

        plans[_planID] = Plan({
            planName: _planName,
            planAmount: _planAmount,
            allocatedAmount: 0,
            claimMethod: _claimMethod,
            isActive: true
        });

        activePlans.add(bytes32(_planID));
        totalAvailableAmount -= _planAmount;
        emit SetPlan(_planID, _planName, _planAmount, _claimMethod);
    }

    // Delete plan and related records
    function delPlan(bytes calldata _planID) external onlyManager nonReentrant {
        Plan storage plan = plans[_planID];
        require(plan.planAmount > 0, "Plan not exist");
        uint256 remaining = plan.planAmount - plan.allocatedAmount;
        // Return unused funds to available pool
        totalAvailableAmount += remaining;
        plan.isActive = false;
        activePlans.remove(bytes32(_planID));
        // Process from end to avoid index misalignment (optimization)
        address[] memory accounts = planAccounts[_planID].values();
        for (uint256 i = accounts.length; i > 0; i--) {
            address account = accounts[i - 1];
            uint256[] storage indices = planRecordIndices[_planID][account];

            // Process indices in reverse order (optimization)
            for (uint256 j = indices.length; j > 0; j--) {
                uint256 idx = indices[j - 1];
                if (idx < lockedRecords[account].length) {
                    if (lockedRecords[account][idx].isActive) {
                        emit CancelLockedRecord(
                            lockedRecords[account][idx].lockedID
                        );
                        lockedRecords[account][idx].isActive = false;
                        totalAvailableAmount += lockedRecords[account][idx]
                            .amount;
                    }
                }
            }
            delete planRecordIndices[_planID][account];
            planAccounts[_planID].remove(account);
        }
        emit DelPlan(_planID);
    }

    // Get plan information
    function getPlan(
        bytes calldata _planID
    ) external view returns (Plan memory) {
        return plans[_planID];
    }

    // Add LockedRecord
    function setLockedRecord(
        bytes calldata _lockedID,
        bytes calldata _planID,
        address _account,
        uint256 _amount,
        uint256 _claimMethod,
        uint256 _time
    ) external onlyManager {
        Plan storage plan = plans[_planID];
        require(plan.isActive, "Inactive plan");
        require(_amount > 0, "Amount must be positive");
        require(_claimMethod == plan.claimMethod, "Claim method mismatch");
        require(
            plan.allocatedAmount + _amount <= plan.planAmount,
            "Exceeds plan amount"
        );

        // Update allocated amount
        plan.allocatedAmount += _amount;

        // Add record
        uint256 recordIndex = lockedRecords[_account].length;
        lockedRecords[_account].push(
            LockedRecord({
                lockedID: _lockedID,
                planID: _planID,
                amount: _amount,
                claimMethod: _claimMethod,
                time: _time,
                isActive: true
            })
        );

        // Update index
        planAccounts[_planID].add(_account);
        planRecordIndices[_planID][_account].push(recordIndex);

        emit SetLockedRecord(
            _lockedID,
            _planID,
            _account,
            _amount,
            _claimMethod,
            _time
        );
    }

    // Claim tokens
    function claimToken(address account) external nonReentrant {
        require(
            msg.sender == account || managers.contains(msg.sender),
            "Unauthorized"
        );
        uint256 totalClaimable;
        LockedRecord[] storage records = lockedRecords[account];

        // Managers use claimMethod 0; non-managers use 1
        uint256 currentClaimMethod;
        if (managers.contains(msg.sender)) {
            currentClaimMethod = 0;
        } else {
            currentClaimMethod = 1;
        }

        // Process from end to avoid array shifting (optimization)
        uint256 processed;
        for (uint256 i = records.length; i > 0 && processed < 10; i--) {
            uint256 idx = i - 1;
            LockedRecord storage record = records[idx];

            // Only process records matching the claimMethod
            if (
                record.isActive &&
                block.timestamp >= record.time &&
                record.claimMethod == currentClaimMethod
            ) {
                emit ClaimLockedRecord(record.lockedID);

                totalClaimable += record.amount;
                record.isActive = false;
                processed++;

                // Remove claimed record to save storage (optimization)
                if (idx != records.length - 1) {
                    records[idx] = records[records.length - 1];
                }
                records.pop();
            }
        }
        require(totalClaimable > 0, "No claimable amount");
        (bool success, ) = account.call{value: totalClaimable}("");
        require(success, "Transfer failed");
        emit ClaimToken(account, totalClaimable);
    }

    function getTotalLockedAmount() external view returns (uint256) {
        return totalLockedAmount;
    }

    function getTotalAvailableAmount() external view returns (uint256) {
        return totalAvailableAmount;
    }

    // Temporary function
    function getTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

  function getUserLockedRecords(address _account) 
        external 
        view 
        returns (LockedRecord[] memory) 
    {
        // Fetch all user records
        LockedRecord[] storage userRecords = lockedRecords[_account];
        
        // Count active records
        uint256 activeCount = 0;
        for (uint256 i = 0; i < userRecords.length; i++) {
            if (userRecords[i].isActive) {
                activeCount++;
            }
        }
        
        // Create return array containing only active records
        LockedRecord[] memory activeRecords = new LockedRecord[](activeCount);
        uint256 currentIndex = 0;
        
        for (uint256 i = 0; i < userRecords.length; i++) {
            if (userRecords[i].isActive) {
                activeRecords[currentIndex] = userRecords[i];
                currentIndex++;
            }
        }
        
        return activeRecords;
    }
	
    function deleteLockedRecord(
        bytes calldata _lockedID, 
        bytes calldata _planID, 
        address _account
    ) external onlyManager nonReentrant returns (bool) {
        // Ensure the plan exists
        require(plans[_planID].planAmount > 0, "Plan not exist");
        // Ensure the account belongs to the plan
        require(planAccounts[_planID].contains(_account), "Account not in plan");
        
        bool found = false;
        LockedRecord[] storage records = lockedRecords[_account];
        
        // Iterate through all records for the account
        for (uint256 j = 0; j < records.length; j++) {
            if (keccak256(records[j].lockedID) == keccak256(_lockedID) && 
                keccak256(records[j].planID) == keccak256(_planID) && 
                records[j].isActive) {
                found = true;
                
                // Record amount for later adjustments
                uint256 recordAmount = records[j].amount;
                
                // 1. Return amount to available balance
                totalAvailableAmount += recordAmount;
                
                // 2. Update plan allocated amount
                Plan storage plan = plans[_planID];
                if (plan.allocatedAmount >= recordAmount) {
                    plan.allocatedAmount -= recordAmount;
                } else {
                    plan.allocatedAmount = 0;
                }
                
                // 3. Mark record as inactive
                records[j].isActive = false;
                
                // 4. Optimization: if last element, remove directly
                if (j != records.length - 1) {
                    records[j] = records[records.length - 1];
                }
                records.pop();
                
                // 5. Update plan record index mapping
                uint256[] storage indices = planRecordIndices[_planID][_account];
                for (uint256 k = 0; k < indices.length; k++) {
                    if (indices[k] == j) {
                        // Optimization: remove index by swapping and popping
                        if (k != indices.length - 1) {
                            indices[k] = indices[indices.length - 1];
                        }
                        indices.pop();
                        break;
                    }
                }
                
                // 6. If the account has no other records in the plan, remove it from the plan list
                if (indices.length == 0) {
                    planAccounts[_planID].remove(_account);
                }
                           
                // Record handled; return
                return true;
            }
        }
        
        require(found, "LockedID not found or not active");
        return found;
    }

    function getPlanLockedRecords(bytes calldata _planID) 
        external 
        view 
        returns (LockedRecord[] memory records, address[] memory accounts) 
    {
        // Ensure plan exists
        require(plans[_planID].planAmount > 0, "Plan not exist");
        
        // Get all accounts under this plan
        address[] memory planAccountsList = planAccounts[_planID].values();
        
        // Calculate total record count for the plan
        uint256 totalRecords = 0;
        for (uint256 i = 0; i < planAccountsList.length; i++) {
            address account = planAccountsList[i];
            uint256[] memory indices = planRecordIndices[_planID][account];
            totalRecords += indices.length;
        }
        
        // Initialize return arrays
        records = new LockedRecord[](totalRecords);
        accounts = new address[](totalRecords);
        
        // Fill return arrays
        uint256 currentIndex = 0;
        for (uint256 i = 0; i < planAccountsList.length; i++) {
            address account = planAccountsList[i];
            uint256[] memory indices = planRecordIndices[_planID][account];
            
            for (uint256 j = 0; j < indices.length; j++) {
                uint256 recordIndex = indices[j];
                if (recordIndex < lockedRecords[account].length) {
                    LockedRecord memory record = lockedRecords[account][recordIndex];
                    // Only return records for this plan that are still active
                    if (keccak256(record.planID) == keccak256(_planID) && record.isActive) {
                        records[currentIndex] = record;
                        accounts[currentIndex] = account;
                        currentIndex++;
                    }
                }
            }
        }
        
        // If fewer records are active than expected, resize arrays
        if (currentIndex < totalRecords) {
            // Create new arrays containing only valid records
            LockedRecord[] memory adjustedRecords = new LockedRecord[](currentIndex);
            address[] memory adjustedAccounts = new address[](currentIndex);
            
            for (uint256 i = 0; i < currentIndex; i++) {
                adjustedRecords[i] = records[i];
                adjustedAccounts[i] = accounts[i];
            }
            
            records = adjustedRecords;
            accounts = adjustedAccounts;
        }
        
        return (records, accounts);
    }


    // receive() external payable {}
}
