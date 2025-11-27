// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/Governance/ParameterInfo.sol";

contract ParameterInfoTest is Test {
    ParameterInfo internal param;

    function setUp() public {
        param = new ParameterInfo();
        param.initialize(address(this));
    }

    function testInitialValues() public {
        assertEq(param.getPlatformConfig("marginRatio"), 100);
        assertEq(param.getPlatformConfig("TCASHMLT"), 3000);
        assertEq(param.getPlatformConfig("TCASHMRST"), 11000);
    }

    function testSetPlatformConfig() public {
        assertTrue(param.setPlatformConfig("TCASHMLT", 4000));
        assertEq(param.getPlatformConfig("TCASHMLT"), 4000);
    }

    function testSetPlatformConfigRevertsOnOverflow() public {
        vm.expectRevert(bytes("overflow"));
        param.setPlatformConfig("marginRatio", 20000);
    }
}
