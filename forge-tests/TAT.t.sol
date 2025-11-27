// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/TAT/TAT.sol";

contract TATRecordTest is Test {
    TAT internal tat;
    address internal user = address(0xBEEF);

    function setUp() public {
        tat = new TAT();
        tat.initialize("TAT", "TAT", address(1));
    }

    function testSetAndRotateRecords() public {
        tat.setTATRecord(user, 100);
        vm.warp(block.timestamp + 31 days);
        tat.setTATRecord(user, 200);
        vm.warp(block.timestamp + 31 days);
        tat.setTATRecord(user, 300);

        (uint256[] memory months, uint256[] memory amounts) = tat.getTATRecord(user);
        assertEq(months.length, 3);
        assertEq(amounts.length, 3);
        assertEq(amounts[0], 100);
        assertEq(amounts[1], 200);
        assertEq(amounts[2], 300);

        // Fourth record should overwrite the oldest slot
        vm.warp(block.timestamp + 31 days);
        tat.setTATRecord(user, 400);
        (, amounts) = tat.getTATRecord(user);

        assertEq(amounts.length, 3);
        assertFalse(_contains(amounts, 100));
        assertTrue(_contains(amounts, 200));
        assertTrue(_contains(amounts, 300));
        assertTrue(_contains(amounts, 400));
    }

    function _contains(uint256[] memory arr, uint256 val) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == val) {
                return true;
            }
        }
        return false;
    }
}
