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
    
    // TAT铸造记录结构
    struct TATRecord {
        uint256[3] months;  // 年月记录，格式：YYYYMM
        uint256[3] amounts; // 对应的铸造数量
        uint8 currentIndex; // 当前记录的索引位置，循环使用0-2
    }
    
    // 用户地址 => 铸造记录
    mapping(address => TATRecord) private _tatRecords;
    
    // 只有ProductionData合约可以调用
    modifier onlyProductionData() {
        // 从治理合约获取ProductionData地址
        bool isProductionData = false;
        for (uint i = 0; i < 10; i++) { // 假设最多有10种treasure类型
            string memory treasureKind = getKindByIndex(i);
            if (bytes(treasureKind).length == 0) break;
            
            (, address productionContract) = _governance.getTreasureByKind(treasureKind);
            if (_msgSender() == productionContract) {
                isProductionData = true;
                break;
            }
        }
        require(isProductionData, "Only ProductionData contract can call");
        _;
    }
    
    // 辅助函数 - 获取指定索引的treasure类型，具体实现需要根据实际情况调整
    function getKindByIndex(uint256 index) internal view returns (string memory) {
        // 这里需要根据实际情况从治理合约获取种类信息
        // 此处为简化实现，实际应该从_governance合约获取
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
        
        // 获取当前年月，格式YYYYMM
        uint256 currentMonth = getCurrentYearMonth();
        
        // 记录用户铸造历史
        setTATRecord(to, amount, currentMonth);
        
        // 铸造代币
        _mint(to, amount);
        
        // 发出事件
        emit TATHistory(_treasureKind, _uniqueId, msg.sender, to, amount);
    }
    
    /**
     * @dev 获取当前年月，格式YYYYMM
     * @return 当前年月，例如202407表示2024年7月
     */
    function getCurrentYearMonth() internal view returns (uint256) {
        // 获取当前时间戳
        uint256 timestamp = block.timestamp;
        
        // 转换为日期（简化实现）
        // 这是一个简化的计算，实际应用中可能需要更精确的日期计算方法
        
        // 计算年份: 基于1970年1月1日开始
        uint256 secondsInDay = 86400; // 24小时 * 60分钟 * 60秒
        uint256 secondsInYear = secondsInDay * 365; // 简化，不考虑闰年
        
        uint256 yearsSince1970 = timestamp / secondsInYear;
        uint256 year = 1970 + yearsSince1970;
        
        // 计算月份
        uint256 secondsRemainingInYear = timestamp % secondsInYear;
        uint256 daysRemainingInYear = secondsRemainingInYear / secondsInDay;
        
        // 简化实现，大约估算月份
        uint256 month = (daysRemainingInYear * 12) / 365 + 1;
        
        // 限制月份范围
        if (month > 12) month = 12;
        
        // 组合成YYYYMM格式
        return year * 100 + month;
    }

    /* Temp faucet */
    function faucet(address user, uint256 amount) public {
        require(user != address(0), "Zero address");
        
        // 获取当前年月
        uint256 currentMonth = getCurrentYearMonth();
        
        // 记录用户铸造历史
        setTATRecord(user, amount, currentMonth);
        
        // 铸造代币
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
     * @dev 设置用户TAT铸造记录
     * @param account 用户地址
     * @param amount 铸造代币数量
     * @param month 年月(格式YYYYMM)
     */
    function setTATRecord(
        address account,
        uint256 amount,
        uint256 month
    ) public onlyProductionData {
        require(account != address(0), "User address cannot be zero");
        require(amount > 0, "Mint amount must be greater than 0");
        
        TATRecord storage record = _tatRecords[account];
        
        // 检查是否已经存在该月份的记录
        for (uint8 i = 0; i < 3; i++) {
            if (record.months[i] == month) {
                // 如果存在相同月份，则累加金额
                record.amounts[i] += amount;
                return;
            }
        }
        
        // 不存在相同月份记录，添加新记录
        // 如果还未初始化，设置currentIndex为0
        if (record.months[0] == 0 && record.months[1] == 0 && record.months[2] == 0) {
            record.currentIndex = 0;
        } else {
            // 否则更新到下一个位置（循环使用0-2）
            record.currentIndex = (record.currentIndex + 1) % 3;
        }
        
        // 更新记录
        record.months[record.currentIndex] = month;
        record.amounts[record.currentIndex] = amount;
    }
    
    /**
     * @dev 获取用户TAT铸造记录
     * @param account 用户地址
     * @return months 记录的年月数组
     * @return amounts 对应的铸造金额数组
     */
    function getTATRecord(address account) public view returns (uint256[] memory months, uint256[] memory amounts) {
        TATRecord storage record = _tatRecords[account];
        
        // 计算有效记录数量
        uint8 validCount = 0;
        for (uint8 i = 0; i < 3; i++) {
            if (record.months[i] != 0) {
                validCount++;
            }
        }
        
        // 创建返回数组
        months = new uint256[](validCount);
        amounts = new uint256[](validCount);
        
        // 填充数组
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
