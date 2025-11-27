// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/Oracle/Oracle.sol";

contract RolesAlwaysTrue {
    function hasRole(bytes32, address) external pure returns (bool) {
        return true;
    }
}

contract OracleMintStatusTest is Test {
    Oracle internal oracle;

    function setUp() public {
        RolesAlwaysTrue roles = new RolesAlwaysTrue();
        oracle = new Oracle();
        oracle.initialize(address(roles));
    }

    function testLockAndResetMintStatus() public {
        // Start unlocked
        assertTrue(oracle.getTCashMintStatus());
        assertEq(oracle.getTCashMintLockPrice(), 0);

        // Price drops > lock threshold -> lock minting
        oracle.checkAndUpdateTCashMintStatus(60, 100, 3000, 11000);
        assertFalse(oracle.getTCashMintStatus());
        assertEq(oracle.getTCashMintLockPrice(), 60);

        // Price recovers beyond reset threshold -> unlock
        oracle.checkAndUpdateTCashMintStatus(120, 60, 3000, 11000);
        assertTrue(oracle.getTCashMintStatus());
        assertEq(oracle.getTCashMintLockPrice(), 0);
    }
}
