// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Governance/ICrosschainTokens.sol";
import "../Governance/IRoles.sol";

/// @title Crosschain Bridge Contract
/// @author qiangwei
/// @notice This contract handles cross-chain token transfers
contract CrosschainBridge is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant TN_EXPIRATION_BLOCKS = 100; // TN链过期区块数
    uint256 public constant ETH_EXPIRATION_BLOCKS = 50; // ETH链过期区块数
    uint256 public constant TRUST_BLOCKS = 5; // 可信区块数

    // State variables
    uint256 private _currentId;
    ICrosschainTokens private _crosschainTokens; // CrosschainTokens合约接口
    IRoles private _roles;

    // 交易信息结构体
    struct TransactionInfo {
        uint64 startBlock;     // 开始区块
        uint64 expirationBlock;// 过期区块
        uint8 status;         // 交易状态
        bool isNativeToken;   // 是否为原生代币
        bool isProcessed;     // 是否已处理
        uint64 availableBlock; // 可信区块
    }
    
    // 交易ID到交易信息的映射
    mapping(uint256 => TransactionInfo) private _transactions;

    // 已完成交易的清理时间（区块数）
    uint256 public constant CLEANUP_BLOCKS = 50000; // 约1周

    // 记录最后一个已清理的交易ID
    uint256 private _lastCleanedId;

    // Storage gap for future upgrades
    uint256[47] private __gap;

    // Events
    event CrossToEth(
        uint256 indexed id,
        address indexed account,
        string token,
        uint256 amount,
        uint256 fee,
        uint256 sourcechainid,
        address sourceERC20address,
        address targetERC20address,
        uint256 targetchainid,
        uint256 availableBlock,
        uint256 expirationBlock
    );

    event CrossFromEth(
        uint256 indexed id,
        address indexed account,
        string token,
        uint256 amount
    );

    event ConfirmFromEth(uint256 indexed id);

    // Errors
    error InvalidAmount();
    error TokenNotSupported();
    error TransferFailed();
    error InvalidTokenInfo();

    // Storage slot for persistence across upgrades
    bytes32 private constant CURRENT_ID_POSITION = keccak256("crosschain.bridge.current.id.v1");
    bytes32 private constant LAST_CLEANED_ID_POSITION = keccak256("crosschain.bridge.last.cleaned.id.v1");
    bytes32 private constant TRANSACTION_POSITION_PREFIX = keccak256("crosschain.bridge.transaction.v1.");

    function _getCurrentId() private view returns (uint256) {
        bytes32 position = CURRENT_ID_POSITION;
        uint256 value;
        assembly {
            value := sload(position)
        }
        return value;
    }

    function _setCurrentId(uint256 value) private {
        bytes32 position = CURRENT_ID_POSITION;
        assembly {
            sstore(position, value)
        }
    }

    function _getLastCleanedId() private view returns (uint256) {
        bytes32 position = LAST_CLEANED_ID_POSITION;
        uint256 value;
        assembly {
            value := sload(position)
        }
        return value;
    }

    function _setLastCleanedId(uint256 value) private {
        bytes32 position = LAST_CLEANED_ID_POSITION;
        assembly {
            sstore(position, value)
        }
    }

    function _getTransactionStoragePosition(
        uint256 id
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(TRANSACTION_POSITION_PREFIX, id));
    }

    function _getTransaction(uint256 id) private view returns (TransactionInfo memory) {
        return _transactions[id];
    }

    function _setTransaction(uint256 id, TransactionInfo memory info) private {
        _transactions[id] = info;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract
    /// @param crosschainTokensContract CrosschainTokens contract address
    /// @param rolesContract Roles contract address
    function initialize(
        address crosschainTokensContract,
        address rolesContract
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        _crosschainTokens = ICrosschainTokens(crosschainTokensContract);
        _roles = IRoles(rolesContract);

        // 如果是首次初始化，设置所有ID为0
        if (_getCurrentId() == 0) {
            _setCurrentId(0);
            _setLastCleanedId(0);
        }
    }

    /// @notice Transfer tokens from current chain to Ethereum
    /// @param token Token name
    /// @param amount Token amount
    function crossToEth(
        string calldata token,
        uint256 amount
    ) external payable nonReentrant {
        // 检查金额
        if (amount == 0) revert InvalidAmount();

        // 增加交易ID
        uint256 newId = _getCurrentId() + 1;
        _setCurrentId(newId);

        // 从CrosschainTokens合约获取代币信息
        (
            string memory tokenName,
            address sourceERC20address,
            address sourceCrosschainAddress,
            uint256 sourcechainid, // targetERC20address
            // targetCrosschainAddress
            // targetchainid
            ,
            ,
            ,
            uint256 fee
        ) = _crosschainTokens.getCrosschainToken(token);

        // 验证代币信息
        if (bytes(tokenName).length == 0) revert TokenNotSupported();

        // 判断是否为原生代币
        bool isNative = bytes(token).length == 0 ||
        //需要修改
            keccak256(bytes(token)) == keccak256(bytes("TN"));

        // 如果不是原生代币，验证合约地址
        if (!isNative && sourceERC20address == address(0))
            revert InvalidTokenInfo();

        // 计算实际转账金额（考虑手续费）
        uint256 feeAmount = (amount * fee) / 10000;
        uint256 transferAmount = amount - feeAmount;
        // 根据sourcechainid判断是TN侧还是ETH侧，计算过期区块高度
        uint64 expirationBlock;
        //需要修改
        if (sourcechainid == 1) {
            // ETH侧
            expirationBlock = uint64(block.number + ETH_EXPIRATION_BLOCKS);
        } else {
            // TN侧
            expirationBlock = uint64(block.number + TN_EXPIRATION_BLOCKS); 
        }
     
        //TransactionInfoItem
        TransactionInfo memory infoItem = TransactionInfo({
            startBlock: uint64(block.number),
            expirationBlock: expirationBlock,
            status: 1, // receviedA
            isNativeToken: isNative,
            isProcessed: false,
            availableBlock: uint64(block.number + TRUST_BLOCKS),
            });
        // 设置交易信息
        _setTransaction(
            newId,
            infoItem
        );

        // 处理资产转移
        if (isNative) {
            // 原生代币处理
            if (msg.value != amount) revert InvalidAmount();
            // 如果有手续费，转移到 CROSSCHAIN_SENDER 角色账户
            if (feeAmount > 0) {
                // 获取第一个 CROSSCHAIN_SENDER 角色的账户
                address[] memory senders = _roles.getRoleMemberArray(_roles.CROSSCHAIN_SENDER());
                require(senders.length > 0, "No CROSSCHAIN_SENDER configured");
                
                (bool success, ) = senders[0].call{value: feeAmount}("");
                if (!success) revert TransferFailed();
            }
        } else {
            // ERC20代币处理
            try
                IERC20(sourceERC20address).safeTransferFrom(
                    msg.sender,
                    address(this),
                    transferAmount
                )
            {
                // 转账成功，如果有手续费，转移到 CROSSCHAIN_SENDER 角色账户
                if (feeAmount > 0) {
                    address[] memory senders = _roles.getRoleMemberArray(_roles.CROSSCHAIN_SENDER());
                    require(senders.length > 0, "No CROSSCHAIN_SENDER configured");
                    
                    IERC20(sourceERC20address).safeTransferFrom(
                        msg.sender,
                        senders[0],
                        feeAmount
                    );
                }
            } catch {
                revert TransferFailed();
            }
        }
        
        // 发送事件
        emit CrossToEth(
            newId,
            msg.sender, //交易者账号
            token, // 代币名称
            transferAmount, // 发送实际转账金额（扣除手续费后）
            feeAmount, // 手续费
            sourcechainid, // 源链ID
            sourceERC20address, // 源ERC20合约地址
            targetERC20address, // 目标ERC20合约地址
            targetchainid, // 目标链ID
            infoItem.availableBlock,
            infoItem.expirationBlock
        );
    }

    /// @notice Get expiration block for a transaction
    /// @param id Transaction ID
    /// @return uint256 Expiration block number
    function getExpirationBlock(uint256 id) external view returns (uint256) {
        return _getTransaction(id).expirationBlock;
    }

    /// @notice Check if a transaction is expired
    /// @param id Transaction ID
    /// @return bool True if expired
    function isExpired(uint256 id) external view returns (bool) {
        TransactionInfo memory info = _getTransaction(id);
        return info.expirationBlock > 0 && block.number > info.expirationBlock;
    }

    /// @notice Check if a transaction is confirmed
    /// @param id Transaction ID
    /// @return bool True if confirmed
    function isConfirmed(uint256 id) external view returns (bool) {
        TransactionInfo memory info = _getTransaction(id);
        return info.startBlock > 0 && block.number >= info.availableBlock;
    }

    /// @notice Clean up old completed transactions
    /// @param batchSize Number of transactions to check in this cleanup
    function cleanup(uint256 batchSize) external {
        uint256 currentId = _getCurrentId();
        uint256 startId = _getLastCleanedId() + 1;
        uint256 endId = startId + batchSize;
        if (endId > currentId) {
            endId = currentId;
        }

        for (uint256 id = startId; id <= endId; id++) {
            TransactionInfo memory info = _getTransaction(id);
            if (
                info.status == 9 && // completed
                !info.isProcessed &&
                block.number > info.expirationBlock + CLEANUP_BLOCKS
            ) {
                // 将交易标记为已处理
                info.isProcessed = true;
                _setTransaction(id, info);
            }
        }

        _setLastCleanedId(endId);
    }

    /// @notice Handle cross-chain transfers from Ethereum
    /// @param id Transaction ID
    /// @param token Token name
    /// @param amount Token amount
    /// @param account Transaction initiator
    function crossFromEth(
        uint256 id,
        string calldata token,
        uint256 amount,
        address account
    ) external nonReentrant {
        // 检查调用者是否具有 CROSSCHAIN_SENDER 角色
        require(
            _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
            "Caller is not a CROSSCHAIN_SENDER"
        );

        // 检查金额
        if (amount == 0) revert InvalidAmount();

        TransactionInfo memory info = _getTransaction(id);

        // 检查交易是否已确认（已达到可信区块高度）
        if (!this.isConfirmed(id)) revert("Transaction not confirmed");

        // 检查交易是否已过期
        if (this.isExpired(id)) revert("Transaction expired");

        // 检查交易状态
        if (info.status != 1) revert("Invalid transaction status");

        // 从CrosschainTokens合约获取代币信息
        (
            string memory tokenName, // sourceERC20address
            // sourceCrosschainAddress
            // sourcechainid
            ,
            ,
            ,
            address targetERC20address, // targetCrosschainAddress
            // targetchainid
            ,
            ,

        ) = _crosschainTokens.getCrosschainToken(token);

        // 验证代币信息
        if (bytes(tokenName).length == 0) revert TokenNotSupported();

        // 判断是否为原生代币
        bool isNative = bytes(token).length == 0 ||
            keccak256(bytes(token)) == keccak256(bytes("TN"));

        // 处理资产转移
        if (isNative) {
            // 检查合约余额是否足够
            if (address(this).balance < amount) revert("Insufficient balance");

            // 转移金额给接收者
            (bool success, ) = account.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // ERC20代币处理
            if (targetERC20address == address(0)) revert InvalidTokenInfo();

            // 检查合约余额是否足够
            if (IERC20(targetERC20address).balanceOf(address(this)) < amount)
                revert("Insufficient balance");

            // 转移金额给接收者
            try
                IERC20(targetERC20address).safeTransfer(account, amount)
            {} catch {
                revert TransferFailed();
            }
        }

        // 更新交易状态为已完成
        info.status = 9; // completed
        _setTransaction(id, info);

        emit CrossFromEth(id, account, token, amount);
    }

    /// @notice Confirm cross-chain transfer from Ethereum
    /// @param id Transaction ID
    function confirmFromEth(uint256 id) external nonReentrant {
        emit ConfirmFromEth(id);
    }

    /// @notice Get current transaction ID
    /// @return uint256 Current transaction ID
    function getCurrentId() external view returns (uint256) {
        return _getCurrentId();
    }

    // 如果需要在合约升级时保持数据，可以添加数据迁移函数
    function migrateTransactionData(uint256 startId, uint256 endId) external onlyOwner {
        for(uint256 id = startId; id <= endId; id++) {
            TransactionInfo storage info = _transactions[id];
            // 在这里进行数据迁移逻辑
            // 比如从旧的存储格式迁移到新的存储格式
        }
    }
}
