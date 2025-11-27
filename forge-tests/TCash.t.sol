// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Test.sol";
import "../contracts/TCash/TCash.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockRoles {
    bytes32 private constant _MINTER = keccak256("TCASH_MINTER");
    bytes32 private constant _BURNER = keccak256("TCASH_BURNER");

    mapping(bytes32 => mapping(address => bool)) private _roles;

    function TCASH_MINTER() external pure returns (bytes32) {
        return _MINTER;
    }

    function TCASH_BURNER() external pure returns (bytes32) {
        return _BURNER;
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function grantMinter(address account) external {
        _roles[_MINTER][account] = true;
    }

    function grantBurner(address account) external {
        _roles[_BURNER][account] = true;
    }
}

contract MockOracle {
    bool private _mintStatus = true;

    function setStatus(bool status) external {
        _mintStatus = status;
    }

    function getTCashMintStatus() external view returns (bool) {
        return _mintStatus;
    }
}

contract TCashTest is Test {
    TCash internal tcash;
    MockRoles internal roles;
    MockOracle internal oracle;

    function setUp() public {
        TCash implementation = new TCash();
        bytes memory initData = abi.encodeWithSelector(TCash.initialize.selector, address(this));
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        tcash = TCash(address(proxy));

        roles = new MockRoles();
        oracle = new MockOracle();

        tcash.setRoles(address(roles));
        tcash.setOracle(address(oracle));

        roles.grantMinter(address(this));
        roles.grantBurner(address(this));
    }

    function testInitialMint() public {
        assertEq(tcash.totalSupply(), 1_000_000 * 1e18);
        assertEq(tcash.balanceOf(address(this)), 1_000_000 * 1e18);
    }

    function testMintRespectsOracleStatus() public {
        oracle.setStatus(true);
        assertTrue(tcash.mint(address(1), 100));
        assertEq(tcash.balanceOf(address(1)), 100);

        oracle.setStatus(false);
        vm.expectRevert("TCash minting is currently disabled");
        tcash.mint(address(1), 1);
    }

    function testAddAndReduceBalance() public {
        oracle.setStatus(true);
        tcash.addBalance(address(1), 50);
        assertEq(tcash.balanceOf(address(1)), 50);

        assertTrue(tcash.reduceBalance(address(1), 20));
        assertEq(tcash.balanceOf(address(1)), 30);
    }
}
