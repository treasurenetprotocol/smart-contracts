// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../TCash/TCashAuction.sol";

contract MockTCashLoan {
    struct AuctionOverCall {
        address bidder;
        uint256 tokens;
        uint256 interest;
        uint256 principal;
    }

    AuctionOverCall public lastCall;

    function startAuction(address auction, uint256 mortgage, uint256 debt, uint256 _debt) external {
        TCashAuction(auction).auctionStart(mortgage, debt, _debt);
    }

    function auctionOver(
        address bidder,
        uint256 tokens,
        uint256 interest,
        uint256 principal
    ) external returns (bool) {
        lastCall = AuctionOverCall(bidder, tokens, interest, principal);
        return true;
    }
}
