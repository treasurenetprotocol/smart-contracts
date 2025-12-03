// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../USTN/USTNAuction.sol";

contract MockUSTNFinance {
    struct AuctionOverCall {
        address bidder;
        uint256 tokens;
        uint256 interest;
        uint256 principal;
    }

    AuctionOverCall public lastCall;

    function auctionOver(
        address bidder,
        uint256 tokens,
        uint256 interest,
        uint256 principal
    ) external returns (bool) {
        lastCall = AuctionOverCall(bidder, tokens, interest, principal);
        return true;
    }

    function startAuction(address auction, uint256 mortgage, uint256 debt, uint256 interest) external {
        USTNAuction(auction).auctionStart(mortgage, debt, interest);
    }
}
