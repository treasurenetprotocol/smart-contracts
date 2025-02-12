// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../Governance/ICrosschainTokens.sol";
import "../Governance/IRoles.sol";

// 将接口移到合约外部
interface IERC20Mintable is IERC20Upgradeable {
    function mint(uint256 amount) external returns (bool);
}

interface IUSTN is IERC20Mintable {
    function addBalance(address add, uint amount) external returns (bool);
    function reduceBalance(address add, uint amount) external returns (bool);
}

/// @title Crosschain Bridge Contract
/// @author qiangwei
/// @notice This contract handles cross-chain token transfers
contract CrosschainBridge is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;

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
        uint64 startBlock; // 开始区块
        uint64 expirationBlock; // 过期区块
        uint64 availableBlock; // 可信区块
        // uint8 status; // 交易状态
        bool isProcessed; // 是否已处理
        uint256 amount; // 交易金额
        uint256 fee; // 手续费
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
        uint256 sourcechainid,
        uint256 targetchainid,
        address sourceERC20address,
        address targetERC20address,
        uint256 amount,
        uint256 fee,
        uint256 availableBlock,
        uint256 timeoutBlock,
        uint256 chainId
    );

    event CrossFromEth(
        uint256 indexed id,
        address indexed account,
        string token,
        uint256 amount
    );

    event ConfirmFromEth(uint256 indexed id);

    event CrossRollback(
        uint256 indexed id,
        address indexed account,
        string token,
        uint256 amount
    );

    // Errors
    error InvalidAmount();
    error TokenNotSupported();
    error TransferFailed();
    error InvalidTokenInfo();
    error TokenNotConfigured(string token);
    error InvalidFeeConfig(uint256 fee);
    error TransactionFailed(string reason);
    error MintFailed();
    error InsufficientBalanceAfterMint();
    error MintingNotSupported();

    // Storage slot for persistence across upgrades
    bytes32 private constant CURRENT_ID_POSITION =
        keccak256("crosschain.bridge.current.id.v1");
    bytes32 private constant LAST_CLEANED_ID_POSITION =
        keccak256("crosschain.bridge.last.cleaned.id.v1");
    bytes32 private constant TRANSACTION_POSITION_PREFIX =
        keccak256("crosschain.bridge.transaction.v1.");

    // 在合约级别定义一个结构体来存储跨链信息
    struct CrosschainInfo {
        string token;
        address sourceERC20address;
        address targetERC20address;
        uint256 sourcechainid;
        uint256 targetchainid;
        uint256 amount;
        bool isSourceNative;
        bool isTargetNative;
    }

    // 在合约中添加一个新的结构体来存储跨链交易信息
    struct CrossToEthInfo {
        string token;
        uint256 transferAmount;
        uint256 feeAmount;
        address sourceERC20address;
        address targetERC20address;
        uint256 sourcechainid;
        uint256 targetchainid;
        uint256 availableBlock;
        uint256 expirationBlock;
    }

    // 添加ID位移常量
    uint256 private constant CHAIN_ID_SHIFT = 32; // 为链ID预留32位

    function _getCurrentId() private view returns (uint256) {
        return _currentId;
    }

    function _setCurrentId(uint256 value) private {
        _currentId = value;
    }

    function _getLastCleanedId() private view returns (uint256) {
        return _lastCleanedId;
    }

    function _setLastCleanedId(uint256 value) private {
        _lastCleanedId = value;
    }

    function _getTransactionStoragePosition(
        uint256 id
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(TRANSACTION_POSITION_PREFIX, id));
    }

    function _getTransaction(
        uint256 id
    ) private view returns (TransactionInfo memory) {
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
    /// @param amount Total amount (including fee)
    /// @param chainId Chain ID
    function crossToEth(
        string calldata token,
        uint256 amount,
        uint256 chainId
    ) external payable nonReentrant {
        if (amount == 0) revert InvalidAmount();

        // 修改ID生成逻辑
        uint256 currentId = _getCurrentId();
        uint256 newId = (chainId << CHAIN_ID_SHIFT) | (currentId + 1);
        _setCurrentId(currentId + 1);

        // 获取并处理跨链信息
        CrossToEthInfo memory info = _prepareCrossToEthInfo(token, amount, chainId);

        // 处理用户资产锁定
        if (info.sourceERC20address == address(0)) {
            // 如果是原生代币
            if (msg.value != amount) revert("Invalid amount sent");
        } else {
            // 如果是ERC20代币，使用USTN接口
            IUSTN sourceToken = IUSTN(info.sourceERC20address);
            // 检查余额
            uint256 balance = sourceToken.balanceOf(msg.sender);
            uint256 totalAmount = info.transferAmount + info.feeAmount;
            if (balance < totalAmount) revert("Insufficient balance");

            // 从用户账户扣除代币
            if (!sourceToken.reduceBalance(msg.sender, totalAmount)) {
                revert("Failed to reduce balance");
            }

            // 增加到bridge账户
            if (!sourceToken.addBalance(address(this), totalAmount)) {
                revert("Failed to add balance to bridge");
            }
        }

        // 记录交易信息
        _recordTransaction(newId, info);

        emit CrossToEth(
            newId,
            msg.sender,
            info.token,
            info.sourcechainid,
            info.targetchainid,
            info.sourceERC20address,
            info.targetERC20address,
            info.transferAmount,
            info.feeAmount,
            info.availableBlock,
            info.expirationBlock,
            chainId
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
                // info.status == 9 && // completed
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
    /// @param chainId Chain ID
    function crossFromEth(
        uint256 id,
        string calldata token,
        uint256 amount,
        address account,
        uint256 chainId
    ) external nonReentrant {
        // 检查调用者是否具有 CROSSCHAIN_SENDER 角色
        require(
            _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
            "Caller is not a CROSSCHAIN_SENDER"
        );

        // 检查金额
        if (amount == 0) revert InvalidAmount();
        // if (!this.isConfirmed(id)) revert("Transaction not confirmed");
        // if (this.isExpired(id)) revert("Transaction expired");

        // 获取并验证跨链信息
        CrosschainInfo memory info = _getCrosschainInfo(token, chainId, amount);

        // 处理资产转移
        _handleAssetTransfer(info, account);

        emit CrossFromEth(id, account, token, amount);
    }

    /// @notice Confirm cross-chain transfer from Ethereum
    /// @param id Transaction ID
    function confirmFromEth(uint256 id) external nonReentrant {
        // 检查调用者是否具有 CROSSCHAIN_SENDER 角色
        require(
            _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
            "Caller is not a CROSSCHAIN_SENDER"
        );

        TransactionInfo memory info = _getTransaction(id);
        require(info.startBlock > 0, "Transaction does not exist");
        // require(info.status == 1, "Invalid transaction status");
        require(!info.isProcessed, "Transaction already processed");
        require(block.number <= info.expirationBlock, "Transaction expired");

        // 更新交易状态为已确认
        // info.status = 9; // completed
        _setTransaction(id, info);

        emit ConfirmFromEth(id);
    }

    /// @notice Get current transaction ID
    /// @return uint256 Current transaction ID
    function getCurrentId() external view returns (uint256) {
        return _getCurrentId();
    }

    // // 如果需要在合约升级时保持数据，可以添加数据迁移函数
    // function migrateTransactionData(uint256 startId, uint256 endId) external onlyOwner {
    //     for(uint256 id = startId; id <= endId; id++) {
    //         TransactionInfo storage info = _transactions[id];
    //         // 在这里进行数据迁移逻辑
    //         // 比如从旧的存储格式迁移到新的存储格式
    //     }
    // }

    /// @notice 获取完整的交易记录信息
    /// @param id 交易ID
    function getRecord(
        uint256 id
    )
        external
        view
        returns (
            string memory token,
            uint256 amount,
            uint256 fee,
            uint256 startBlock,
            uint256 expirationBlock,
            uint256 availableBlock,
            // uint256 status,
            bool isProcessed
        )
    {
        TransactionInfo memory info = _getTransaction(id);
        return (
            token,
            info.amount,
            info.fee,
            info.startBlock,
            info.expirationBlock,
            info.availableBlock,
            // info.status,
            info.isProcessed
        );
    }

    // 新增辅助函数：获取并验证跨链信息
    function _getCrosschainInfo(
        string memory token,
        uint256 chainId,
        uint256 amount
    ) private view returns (CrosschainInfo memory) {
        (
            string memory tokenName,
            address sourceERC20address, // sourceCrosschainAddress
            ,
            uint256 sourcechainid,
            address targetERC20address, // targetCrosschainAddress
            ,
            uint256 targetchainid,

        ) = _crosschainTokens.getCrosschainTokenByChainId(token, chainId);

        // 验证代币信息
        if (bytes(tokenName).length == 0) revert TokenNotSupported();

        return
            CrosschainInfo({
                token: token,
                sourceERC20address: sourceERC20address,
                targetERC20address: targetERC20address,
                sourcechainid: sourcechainid,
                targetchainid: targetchainid,
                amount: amount,
                isSourceNative: sourceERC20address == address(0),
                isTargetNative: targetERC20address == address(0)
            });
    }

    // 新增辅助函数：处理资产转移
    function _handleAssetTransfer(
        CrosschainInfo memory info,
        address account
    ) private {
        // // 处理来源链资产
        // if (!info.isSourceNative) {
        //     IERC20Upgradeable sourceToken = IERC20Upgradeable(info.sourceERC20address);

        //     // 检查授权和余额
        //     uint256 allowance = sourceToken.allowance(account, address(this));
        //     if (allowance < info.amount) revert("Insufficient allowance");

        //     uint256 balance = sourceToken.balanceOf(account);
        //     if (balance < info.amount) revert("Insufficient balance");

        //     // 转移代币
        //     sourceToken.safeTransferFrom(account, address(this), info.amount);
        // }

        // 处理目标链资产
        if (info.isTargetNative) {
            if (address(this).balance < info.amount)
                revert("Insufficient balance");
            (bool success, ) = account.call{value: info.amount}("");
            if (!success) revert TransferFailed();
        } else {
            if (info.targetERC20address == address(0))
                revert InvalidTokenInfo();

            IERC20Upgradeable targetToken = IERC20Upgradeable(
                info.targetERC20address
            );
            _handleTargetTokenTransfer(targetToken, account, info.amount);
        }
    }

    // 修改辅助函数：处理目标代币转移
    function _handleTargetTokenTransfer(
        IERC20Upgradeable targetToken,
        address account,
        uint256 amount
    ) private {
        // 检查bridge合约余额
        uint256 bridgeBalance = targetToken.balanceOf(address(this));
        if (bridgeBalance < amount) {
            // bridge余额不足,尝试mint代币
            try IERC20Mintable(address(targetToken)).mint(amount) {
                uint256 newBalance = targetToken.balanceOf(address(this));
                if (newBalance < amount) revert InsufficientBalanceAfterMint();
            } catch Error(string memory) {
                revert MintFailed();
            } catch {
                revert MintingNotSupported();
            }
        }

        // 使用USTN合约的特殊接口而不是普通transfer
        try IUSTN(address(targetToken)).reduceBalance(address(this), amount) {
            try IUSTN(address(targetToken)).addBalance(account, amount) {
                return;
            } catch {
                revert("Add balance failed");
            }
        } catch Error(string memory reason) {
            revert(string(abi.encodePacked("Reduce balance failed: ", reason)));
        } catch {
            revert("Reduce balance failed with unknown reason");
        }
    }

    // 新增辅助函数：准备跨链信息
    function _prepareCrossToEthInfo(
        string memory token,
        uint256 amount,
        uint256 chainId
    ) private view returns (CrossToEthInfo memory) {
        // 获取代币信息
        (
            string memory tokenName,
            address sourceERC20address, // sourceCrosschainAddress
            ,
            uint256 sourcechainid,
            address targetERC20address, // targetCrosschainAddress
            ,
            uint256 targetchainid,
            uint256 fee
        ) = _crosschainTokens.getCrosschainTokenByChainId(token, chainId);

        // 验证代币配置
        if (bytes(tokenName).length == 0)
            revert("Token is not configured in the system");
        if (fee == 0 || fee >= 10000) revert("Fee must be between 0 and 10000");

        // 计算实际转账金额和手续费
        uint256 transferAmount = (amount * 10000) / (10000 + fee);
        uint256 feeAmount = (amount * fee) / (10000 + fee);

        // 验证计算结果
        if (transferAmount == 0) revert("Transfer amount too small");
        if (feeAmount + transferAmount != amount)
            revert("Amount calculation error");

        return
            CrossToEthInfo({
                token: token,
                transferAmount: transferAmount,
                feeAmount: feeAmount,
                sourceERC20address: sourceERC20address,
                targetERC20address: targetERC20address,
                sourcechainid: sourcechainid,
                targetchainid: targetchainid,
                availableBlock: block.number + TRUST_BLOCKS,
                expirationBlock: block.number +
                    (
                        sourcechainid == 1
                            ? ETH_EXPIRATION_BLOCKS
                            : TN_EXPIRATION_BLOCKS
                    )
            });
    }

    // 新增辅助函数：记录交易信息
    function _recordTransaction(
        uint256 id,
        CrossToEthInfo memory info
    ) private {
        TransactionInfo memory infoItem = TransactionInfo({
            startBlock: uint64(block.number),
            expirationBlock: uint64(info.expirationBlock),
            availableBlock: uint64(info.availableBlock),
            isProcessed: false,
            amount: info.transferAmount,
            fee: info.feeAmount
        });

        _setTransaction(id, infoItem);
    }

    function crossRollback(
        uint256 id,
        address account,
        string calldata token,
        uint256 chainId,
        uint256 amount
    ) external nonReentrant {
        // 检查调用者是否具有 CROSSCHAIN_SENDER 角色
        // require(
        //     _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
        //     "Caller is not a CROSSCHAIN_SENDER"
        // );

        // TransactionInfo memory info = _getTransaction(id);
        // require(info.startBlock > 0, "Transaction does not exist");
        // // require(info.status == 1, "Transaction cannot be cancelled");
        // require(!info.isProcessed, "Transaction already processed");
        // // require(block.number <= info.expirationBlock, "Transaction expired");

        // 获取代币信息
        (
            ,
            address sourceERC20address,
            ,
            ,
            ,
            ,
            ,
        ) = _crosschainTokens.getCrosschainTokenByChainId(token, chainId);

        // 返还用户资产
        if (sourceERC20address == address(0)) {
            // 如果是原生代币
            (bool success, ) = payable(account).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // 如果是ERC20代币，使用USTN接口
            IUSTN sourceToken = IUSTN(sourceERC20address);

            //  // 从用户账户扣除代币
            // if (!sourceToken.reduceBalance(msg.sender, amount)) {
            //     revert("Failed to reduce balance");
            // }

            // 增加到bridge账户
            if (!sourceToken.addBalance(account, amount)) {
                revert("Failed to add balance to bridge");
            }
        }

        // // 更新交易状态
        // // info.status = 11; // rollback
        // info.isProcessed = true;
        // _setTransaction(id, info);

        emit CrossRollback(id, account, token, amount);
    }

    // 添加辅助函数用于解析ID
    function _parseId(uint256 id) private pure returns (uint256 chainId, uint256 sequenceId) {
        chainId = id >> CHAIN_ID_SHIFT;
        sequenceId = id & ((1 << CHAIN_ID_SHIFT) - 1);
    }

    // 添加公共函数用于获取ID信息
    function parseId(uint256 id) external pure returns (uint256 chainId, uint256 sequenceId) {
        return _parseId(id);
    }
}
