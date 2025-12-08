// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../TAT/ITAT.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Bid is Initializable, OwnableUpgradeable {

    event BidRecord(address account, uint256 amount);
    event BidStart(uint256 height);

    struct BiderList {
        address bider;
        uint256 amount;
        uint256 block;
    }

    address[] public TATBiders;
    mapping(address => bool) isTATBid;
    mapping(address => uint256) bidAmount;
    mapping(address => uint256) bidBlock;

    /* At least 1 TAT */
    uint256 constant TAT_THRESHOLD = 1 * 1e18;
    uint256 _totalBid;

    address private governance;
    ITAT private _tat;

    // stakeboosting start block
    uint256 private _startBlock;
    uint256 private constant ROUND_BLOCK = 60;

    function initialize(address _tatAddress) public initializer {
        __Ownable_init();
        _tat = ITAT(_tatAddress);
        _startBlock = block.number;
        _totalBid = 0;
        emit BidStart(_startBlock);
    }

    receive() external payable {}

    /* Has the bonus stake been conducted */
    function isTATBider(address account) public view returns (bool){
        /* Waiting for trigger situation beyond the cycle */
        if (block.number > _startBlock + ROUND_BLOCK) {
            return false;
        }
        return isTATBid[account];
    }

    /* Check how much TAT you have invested */
    function mybidAmount() public view returns (uint256){
        /* The user does not exist */
        if (bidAmount[msg.sender] == 0) {
            return 0;
        }
        /* Waiting for trigger situation beyond the cycle */
        if (block.number > _startBlock + ROUND_BLOCK) {
            return 0;
        }
        return bidAmount[msg.sender];
    }

    /* query start block number  */
    function roundStartBlock() public view returns (uint256){
        require(_startBlock > 0, "bonus stake has not started yet");
        uint256 _block = _startBlock;
        if (block.number > _startBlock + ROUND_BLOCK) {
            _block = _startBlock + (block.number - _startBlock) / ROUND_BLOCK * ROUND_BLOCK;
        }
        return _block;
    }

    /* Bonus Stake main process */
    function bidTAT(uint256 amount) public returns (bool){
        require(amount >= TAT_THRESHOLD, "TAT not enough to bid");
        if (block.number > _startBlock + ROUND_BLOCK) {
            _startBlock = _startBlock + (block.number - _startBlock) / ROUND_BLOCK * ROUND_BLOCK;
            _totalBid = 0;
            for (uint256 i = 0; i < TATBiders.length; i++) {
                delete isTATBid[TATBiders[i]];
                delete bidAmount[TATBiders[i]];
                delete bidBlock[TATBiders[i]];
            }
            delete TATBiders;
            //emit BidStart(_startBlock);
        }

        _tat.stake(msg.sender, amount);

        if (!isTATBider(msg.sender)) {
            isTATBid[msg.sender] = true;
            TATBiders.push(msg.sender);
        }
        bidAmount[msg.sender] += amount;
        bidBlock[msg.sender] = block.number;

        _totalBid += amount;

        emit BidRecord(msg.sender, amount);

        return true;

    }

    /* Query List */
    function bidderList() public view returns (BiderList[] memory, uint256, uint256){
        uint256 _block = _startBlock;
        /* Situation where waiting for trigger beyond the cycle */
        if (block.number > _startBlock + ROUND_BLOCK) {
            BiderList[] memory _empty = new BiderList[](0);
            _block = _startBlock + (block.number - _startBlock) / ROUND_BLOCK * ROUND_BLOCK;
            return (_empty, 0, _block);
        }
        // bid TAT records
        BiderList[] memory list = new BiderList[](TATBiders.length);
        for (uint256 i = 0; i < TATBiders.length; i++) {
            list[i].bider = TATBiders[i];
            list[i].amount = bidAmount[TATBiders[i]];
            list[i].block = bidBlock[TATBiders[i]];
        }
        return (list, _totalBid, _block);
    }

}
