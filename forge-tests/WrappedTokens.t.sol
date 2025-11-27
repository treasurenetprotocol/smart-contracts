// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/WUNIT/WUNIT.sol";
import "../contracts/WTCASH/WTCASH.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract WrappedTokensTest is Test {
    function testWUNITMintBurn() public {
        address[] memory operators = new address[](1);
        operators[0] = address(this);
        WUNIT wunit = _deployWUNIT(operators);

        assertTrue(wunit.mint(address(this), 100));
        assertEq(wunit.balanceOf(address(this)), 100);

        // Only operator can burn its own balance
        assertTrue(wunit.burn(50));
        assertEq(wunit.balanceOf(address(this)), 50);
    }

    function testWTCASHOperators() public {
        address[] memory operators = new address[](1);
        operators[0] = address(this);
        WTCASH wtcash = _deployWTCASH(operators);

        wtcash.addOperator(address(1));
        vm.prank(address(1));
        wtcash.mint(address(2), 200);
        assertEq(wtcash.balanceOf(address(2)), 200);

        vm.prank(address(1));
        wtcash.reduceBalance(address(2), 50);
        assertEq(wtcash.balanceOf(address(2)), 150);
    }

    function _deployWUNIT(address[] memory operators) internal returns (WUNIT) {
        WUNIT implementation = new WUNIT();
        bytes memory initData = abi.encodeWithSelector(
            WUNIT.initialize.selector,
            operators
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        return WUNIT(address(proxy));
    }

    function _deployWTCASH(address[] memory operators) internal returns (WTCASH) {
        WTCASH implementation = new WTCASH();
        bytes memory initData = abi.encodeWithSelector(
            WTCASH.initialize.selector,
            operators
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        return WTCASH(address(proxy));
    }
}
