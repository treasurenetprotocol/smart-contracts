// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "../USTN/USTNFinance.sol";

contract MockUSTNAuction is USTNAInterface {
    auctions public lastAuction;

    function auctionStart(uint mortgage, uint debt, uint _debt) external returns (auctions memory) {
        lastAuction = auctions({
            sales: mortgage,
            startValue: debt,
            nowValue: debt,
            timeOver: block.timestamp,
            state: _debt
        });
        return lastAuction;
    }
}
