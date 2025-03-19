// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "../Governance/IRoles.sol";
import "./TCashLoan.sol";

contract TCashAuction is Initializable, OwnableUpgradeable {
    // 事件定义
    event AuctionStart(
        uint256 indexed auctionID,
        uint256 indexed loanID,
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 startTime,
        uint256 endTime
    );

    event AuctionBid(
        uint256 indexed auctionID,
        address indexed bidder,
        uint256 bidAmount
    );

    event AuctionEnd(
        uint256 indexed auctionID,
        address indexed winner,
        uint256 finalPrice
    );

    // 拍卖结构
    struct Auction {
        uint256 auctionID;
        uint256 loanID;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 startTime;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool ended;
    }

    // 状态变量
    TCashLoan public tcashLoan;
    IRoles public roles;

    uint256 public nextAuctionID;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => uint256)) public bids;
    mapping(uint256 => address[]) public bidders;

    // 拍卖参数
    uint256 public constant AUCTION_DURATION = 24 hours;
    uint256 public constant MIN_BID_INCREASE = 5; // 5%

    // 初始化函数
    function initialize(
        address _tcashLoan,
        address _roles
    ) public initializer {
        __Ownable_init();
        tcashLoan = TCashLoan(_tcashLoan);
        roles = IRoles(_roles);
    }

    // 开始拍卖
    function startAuction(
        uint256 loanID,
        uint256 collateralAmount,
        uint256 debtAmount
    ) external returns (uint256) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        
        uint256 auctionID = nextAuctionID++;
        Auction storage newAuction = auctions[auctionID];
        
        newAuction.auctionID = auctionID;
        newAuction.loanID = loanID;
        newAuction.collateralAmount = collateralAmount;
        newAuction.debtAmount = debtAmount;
        newAuction.startTime = block.timestamp;
        newAuction.endTime = block.timestamp + AUCTION_DURATION;
        newAuction.ended = false;

        emit AuctionStart(
            auctionID,
            loanID,
            collateralAmount,
            debtAmount,
            newAuction.startTime,
            newAuction.endTime
        );

        return auctionID;
    }

    // 出价
    function bid(uint256 auctionID) external payable returns (bool) {
        Auction storage auction = auctions[auctionID];
        require(!auction.ended, "Auction ended");
        require(block.timestamp <= auction.endTime, "Auction expired");
        require(msg.value > 0, "Invalid bid amount");

        uint256 currentBid = bids[auctionID][msg.sender] + msg.value;
        require(currentBid > auction.highestBid, "Bid too low");

        // 更新最高出价
        if (currentBid > auction.highestBid) {
            auction.highestBid = currentBid;
            auction.highestBidder = msg.sender;
        }

        // 记录出价
        bids[auctionID][msg.sender] = currentBid;
        if (!isBidder(auctionID, msg.sender)) {
            bidders[auctionID].push(msg.sender);
        }

        emit AuctionBid(auctionID, msg.sender, currentBid);

        return true;
    }

    // 结束拍卖
    function endAuction(uint256 auctionID) external returns (bool) {
        require(roles.hasRole("FOUNDATION_MANAGER", msg.sender), "Not authorized");
        
        Auction storage auction = auctions[auctionID];
        require(!auction.ended, "Auction already ended");
        require(block.timestamp > auction.endTime, "Auction not expired");

        auction.ended = true;

        // 如果有中标者，转移抵押品
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.collateralAmount);
        }

        emit AuctionEnd(auctionID, auction.highestBidder, auction.highestBid);

        return true;
    }

    // 查询拍卖信息
    function getAuction(uint256 auctionID) external view returns (Auction memory) {
        return auctions[auctionID];
    }

    // 查询用户出价
    function getUserBid(uint256 auctionID, address user) external view returns (uint256) {
        return bids[auctionID][user];
    }

    // 查询拍卖出价者列表
    function getBidders(uint256 auctionID) external view returns (address[] memory) {
        return bidders[auctionID];
    }

    // 内部函数
    function isBidder(uint256 auctionID, address user) internal view returns (bool) {
        for (uint256 i = 0; i < bidders[auctionID].length; i++) {
            if (bidders[auctionID][i] == user) {
                return true;
            }
        }
        return false;
    }
} 