// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "../Governance/ICrosschainTokens.sol";
import "../Governance/IRoles.sol";

// Move interfaces outside the contract
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
    uint256 public constant TN_EXPIRATION_BLOCKS = 100; // TN chain expiration blocks
    uint256 public constant ETH_EXPIRATION_BLOCKS = 50; // ETH chain expiration blocks
    uint256 public constant TRUST_BLOCKS = 5; // Trust blocks

    // State variables
    uint256 private _currentId;
    ICrosschainTokens private _crosschainTokens; // CrosschainTokens contract interface
    IRoles private _roles;

    // Transaction information struct
    struct TransactionInfo {
        uint64 startBlock; // Start block
        uint64 expirationBlock; // Expiration block
        uint64 availableBlock; // Trust block
        // uint8 status; // Transaction status
        bool isProcessed; // Whether processed
        uint256 amount; // Transaction amount
        uint256 fee; // Transaction fee
    }

    // Mapping from transaction ID to transaction info
    mapping(uint256 => TransactionInfo) private _transactions;

    // Cleanup time for completed transactions (in blocks)
    uint256 public constant CLEANUP_BLOCKS = 50000; // About 1 week

    // Record the last cleaned transaction ID
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

    // Define a struct at contract level to store cross-chain information
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

    // Add a new struct to store cross-chain transaction information
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

    // Add ID shift constant
    uint256 private constant CHAIN_ID_SHIFT = 32; // Reserve 32 bits for chain ID

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

        // If it's the first initialization, set all IDs to 0
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

        // Modify ID generation logic
        uint256 currentId = _getCurrentId();
        uint256 newId = (chainId << CHAIN_ID_SHIFT) | (currentId + 1);
        _setCurrentId(currentId + 1);

        // Get and process cross-chain information
        CrossToEthInfo memory info = _prepareCrossToEthInfo(token, amount, chainId);

        // Handle user asset locking
        if (info.sourceERC20address == address(0)) {
            // If it's native token
            if (msg.value != amount) revert("Invalid amount sent");
        } else {
            // If it's ERC20 token, use USTN interface
            IUSTN sourceToken = IUSTN(info.sourceERC20address);
            // Check balance
            uint256 balance = sourceToken.balanceOf(msg.sender);
            uint256 totalAmount = info.transferAmount + info.feeAmount;
            if (balance < totalAmount) revert("Insufficient balance");

            // Deduct tokens from user account
            if (!sourceToken.reduceBalance(msg.sender, totalAmount)) {
                revert("Failed to reduce balance");
            }

            // Add to bridge account
            if (!sourceToken.addBalance(address(this), totalAmount)) {
                revert("Failed to add balance to bridge");
            }
        }

        // Record transaction information
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
                // Mark transaction as processed
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
        // Check if caller has CROSSCHAIN_SENDER role
        require(
            _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
            "Caller is not a CROSSCHAIN_SENDER"
        );

        // Check amount
        if (amount == 0) revert InvalidAmount();
        // if (!this.isConfirmed(id)) revert("Transaction not confirmed");
        // if (this.isExpired(id)) revert("Transaction expired");

        // Get and validate cross-chain information
        CrosschainInfo memory info = _getCrosschainInfo(token, chainId, amount);

        // Handle asset transfer
        _handleAssetTransfer(info, account);

        emit CrossFromEth(id, account, token, amount);
    }

    /// @notice Confirm cross-chain transfer from Ethereum
    /// @param id Transaction ID
    function confirmFromEth(uint256 id) external nonReentrant {
        // Check if caller has CROSSCHAIN_SENDER role
        require(
            _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
            "Caller is not a CROSSCHAIN_SENDER"
        );

        TransactionInfo memory info = _getTransaction(id);
        require(info.startBlock > 0, "Transaction does not exist");
        // require(info.status == 1, "Invalid transaction status");
        require(!info.isProcessed, "Transaction already processed");
        require(block.number <= info.expirationBlock, "Transaction expired");

        // Update transaction status to confirmed
        // info.status = 9; // completed
        _setTransaction(id, info);

        emit ConfirmFromEth(id);
    }

    /// @notice Get current transaction ID
    /// @return uint256 Current transaction ID
    function getCurrentId() external view returns (uint256) {
        return _getCurrentId();
    }

    // // If data needs to be preserved across contract upgrades, add data migration function
    // function migrateTransactionData(uint256 startId, uint256 endId) external onlyOwner {
    //     for(uint256 id = startId; id <= endId; id++) {
    //         TransactionInfo storage info = _transactions[id];
    //         // Perform data migration logic here
    //         // For example, migrate from old storage format to new storage format
    //     }
    // }

    /// @notice Get full transaction record information
    /// @param id Transaction ID
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

    // Added helper function: Get and validate cross-chain information
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

        // Validate token information
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

    // Added helper function: Handle asset transfer
    function _handleAssetTransfer(
        CrosschainInfo memory info,
        address account
    ) private {
        // // Handle source chain asset
        // if (!info.isSourceNative) {
        //     IERC20Upgradeable sourceToken = IERC20Upgradeable(info.sourceERC20address);

        //     // Check allowance and balance
        //     uint256 allowance = sourceToken.allowance(account, address(this));
        //     if (allowance < info.amount) revert("Insufficient allowance");

        //     uint256 balance = sourceToken.balanceOf(account);
        //     if (balance < info.amount) revert("Insufficient balance");

        //     // Transfer tokens
        //     sourceToken.safeTransferFrom(account, address(this), info.amount);
        // }

        // Handle target chain asset
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

    // Modified helper function: Handle target token transfer
    function _handleTargetTokenTransfer(
        IERC20Upgradeable targetToken,
        address account,
        uint256 amount
    ) private {
        // Check bridge contract balance
        uint256 bridgeBalance = targetToken.balanceOf(address(this));
        if (bridgeBalance < amount) {
            // bridge balance insufficient, try mint tokens
            try IERC20Mintable(address(targetToken)).mint(amount) {
                uint256 newBalance = targetToken.balanceOf(address(this));
                if (newBalance < amount) revert InsufficientBalanceAfterMint();
            } catch Error(string memory) {
                revert MintFailed();
            } catch {
                revert MintingNotSupported();
            }
        }

        // Use USTN contract's special interface instead of regular transfer
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

    // Added helper function: Record transaction information
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
        // Check if caller has CROSSCHAIN_SENDER role
        // require(
        //     _roles.hasRole(_roles.CROSSCHAIN_SENDER(), msg.sender),
        //     "Caller is not a CROSSCHAIN_SENDER"
        // );

        // TransactionInfo memory info = _getTransaction(id);
        // require(info.startBlock > 0, "Transaction does not exist");
        // // require(info.status == 1, "Transaction cannot be cancelled");
        // require(!info.isProcessed, "Transaction already processed");
        // // require(block.number <= info.expirationBlock, "Transaction expired");

        // Get token information
        (
            ,
            address sourceERC20address,
            ,
            ,
            ,
            ,
            ,
        ) = _crosschainTokens.getCrosschainTokenByChainId(token, chainId);

        // Return user assets
        if (sourceERC20address == address(0)) {
            // If it's native token
            (bool success, ) = payable(account).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            // If it's ERC20 token, use USTN interface
            IUSTN sourceToken = IUSTN(sourceERC20address);

            //  // Deduct tokens from user account
            // if (!sourceToken.reduceBalance(msg.sender, amount)) {
            //     revert("Failed to reduce balance");
            // }

            // Add to bridge account
            if (!sourceToken.addBalance(account, amount)) {
                revert("Failed to add balance to bridge");
            }
        }

        // // Update transaction status
        // // info.status = 11; // rollback
        // info.isProcessed = true;
        // _setTransaction(id, info);

        emit CrossRollback(id, account, token, amount);
    }

    // Added helper function to parse ID
    function _parseId(uint256 id) private pure returns (uint256 chainId, uint256 sequenceId) {
        chainId = id >> CHAIN_ID_SHIFT;
        sequenceId = id & ((1 << CHAIN_ID_SHIFT) - 1);
    }

    // Added public function to get ID information
    function parseId(uint256 id) external pure returns (uint256 chainId, uint256 sequenceId) {
        return _parseId(id);
    }
}
