// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/TokenLocker/TokenLocker.sol";

contract TokenLockerTest is Test {
    TokenLocker internal locker;
    address internal user = address(0xBEEF);

    function setUp() public {
        locker = new TokenLocker();
        locker.initialize();
        vm.deal(address(this), 10 ether);
        locker.addLockedToken{value: 5 ether}();
    }

    function testUserClaimFlow() public {
        bytes memory planId = "PLAN1";
        locker.setPlan(planId, "User Plan", 3 ether, 1);
        locker.setLockedRecord(
            "LOCK1",
            planId,
            user,
            1 ether,
            1,
            block.timestamp + 1 days
        );

        vm.warp(block.timestamp + 2 days);
        uint256 balanceBefore = user.balance;

        vm.prank(user);
        locker.claimToken(user);

        assertEq(user.balance, balanceBefore + 1 ether);
    }

    function testManagerClaimFlow() public {
        bytes memory planId = "PLANM";
        locker.setPlan(planId, "Manager Plan", 2 ether, 0);
        locker.setLockedRecord(
            "LOCKM",
            planId,
            user,
            1 ether,
            0,
            block.timestamp + 1 days
        );

        vm.warp(block.timestamp + 2 days);
        uint256 balanceBefore = user.balance;

        locker.claimToken(user);

        assertEq(user.balance, balanceBefore + 1 ether);
    }
}
