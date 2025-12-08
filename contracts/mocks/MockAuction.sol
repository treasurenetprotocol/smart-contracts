// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract MockAuction {
    struct Call {
        uint256 mortgage;
        uint256 debt;
        uint256 interest;
        address caller;
    }

    Call public lastCall;

    function auctionStart(uint256 mortgage, uint256 debt, uint256 interest) external returns (bool) {
        lastCall = Call(mortgage, debt, interest, msg.sender);
        return true;
    }
}
