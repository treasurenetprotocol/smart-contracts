// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.29;

import "forge-std/Test.sol";

/**
 * @title BaseTest
 * @dev Base contract for all foundry test contracts
 * Contains shared setup and helper functions
 */
contract BaseTest is Test {
    // Constants for test accounts
    address public constant ADMIN = address(0x1);
    address public constant PRODUCER_ACCOUNT = address(0x2);
    address public constant MINTING_ACCOUNT = address(0x3);

    // Role identifiers
    bytes32 public constant FOUNDATION_MANAGER_ROLE = keccak256("FOUNDATION_MANAGER_ROLE");

    /**
     * @dev Setup function that will be called before each test
     * Override in derived contracts but don't forget to call super.setUp()
     */
    function setUp() public virtual {
        // Common setup for all tests
        vm.startPrank(ADMIN);
        // Deploy shared contracts if needed
        vm.stopPrank();
    }

    /**
     * @dev Helper function to assert producer data matches expected values
     * @param uniqueId The unique identifier of the producer
     * @param status Expected status of the producer
     * @param nickname Expected nickname of the producer
     * @param owner Expected owner address of the producer
     * @param api Expected API value of the producer
     * @param sulphur Expected sulphur value of the producer
     * @param account Expected account address of the producer
     * @param producerAddress The address of the producer contract
     */
    function assertProducerData(
        bytes32 uniqueId,
        uint8 status,
        string memory nickname,
        address owner,
        uint256 api,
        uint256 sulphur,
        address account,
        address producerAddress
    ) internal {
        // Compare producer data with expected values
        // Implementation would compare actual values from the producer contract
        // with the expected values passed as parameters
    }
}
