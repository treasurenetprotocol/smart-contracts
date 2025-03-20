// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.29;

import "forge-std/Test.sol";
import "./Base.t.sol";
import "../../contracts/Treasure/ETH/EthProducer.sol";
import "../../contracts/Treasure/ETH/EthData.sol";
import "../../contracts/TAT/TAT.sol";
import "../../contracts/Treasure/interfaces/IProducer.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TreasureEthTest
 * @dev Test contract for ETH producer functionality
 * Follows AAA pattern: Arrange, Act, Assert
 */
contract TreasureEthTest is BaseTest {
    using Strings for uint256;
    
    // Contract instances
    EthProducer public ethProducer;
    EthData public ethData;
    TAT public tat;
    
    // Test constants
    bytes32 constant WELL_UNIQUE_ID = bytes32(0x4872484e4579694e575a65745956524879303873690000000000000000000003);
    string constant WELL_NICKNAME = "Treasure-ETH";
    string constant MINTING_ACCOUNT_STRING = "0xe1aabd4ed39af0f1e023b6f1bca4e01237418aff";
    
    // Production data structure for testing
    struct TestProductionData {
        uint256 amount;
        uint256 price;
        uint256 blockNumber;
        uint256 blockReward;
    }
    
    TestProductionData productionData;
    
    // Mock contract addresses
    address constant DUMMY_MULTISIG = address(0x1111111111111111111111111111111111111111);
    address constant DUMMY_ROLE = address(0x2222222222222222222222222222222222222222);
    
    /**
     * @dev Setup function that runs before each test
     * Deploys and initializes all required contracts
     */
    function setUp() public override {
        // Call the parent setUp
        super.setUp();
        
        // === ARRANGE ===
        // Deploy contracts as admin
        vm.startPrank(ADMIN);
        
        // Deploy TAT contract and initialize
        tat = new TAT();
        tat.initialize("TreasureNet Asset Token", "TAT", address(0));
        
        // Deploy Producer and Data contracts
        ethProducer = new EthProducer();
        ethData = new EthData();
        
        // Mock role check to always return true
        vm.mockCall(
            DUMMY_ROLE,
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)"))),
            abi.encode(true)
        );
        
        // Create empty arrays for initialization
        string[] memory dappNames = new string[](0);
        address[] memory payees = new address[](0);
        
        // Initialize producer contract
        ethProducer.initialize(
            DUMMY_MULTISIG,       // mulSigContract
            DUMMY_ROLE,           // roleContract
            "ETH",                // assetType
            address(ethData),     // productionDataContract
            dappNames,            // dappNames
            payees                // payees
        );
        
        // Initialize EthData contract
        ethData.initialize(
            "ETH",                // _treasureKind
            address(0),           // _oracleContract
            DUMMY_ROLE,           // _rolesContract
            address(0),           // _parameterInfoContract
            address(ethProducer), // _producerContract
            address(tat)          // _tatContract
        );
        
        vm.stopPrank();
        
        // Initialize test data
        productionData = TestProductionData(1000, 10, 180, 100);
    }
    
    /**
     * @dev Test adding a producer and changing its status
     * Follows AAA pattern: Arrange, Act, Assert
     */
    function testAddProducerAndModifyStatus() public {
        // === ARRANGE ===
        vm.startPrank(PRODUCER_ACCOUNT);
        
        // Create producer struct - ETH doesn't use API or sulphur values
        IProducer.ProducerCore memory producer = IProducer.ProducerCore({
            nickname: WELL_NICKNAME,
            owner: PRODUCER_ACCOUNT,
            API: 0,
            sulphur: 0,
            account: MINTING_ACCOUNT_STRING
        });
        
        // Mock role check to always return true
        vm.mockCall(
            DUMMY_ROLE,
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)"))),
            abi.encode(true)
        );
        
        // === ACT ===
        // Add producer to the contract
        ethProducer.addProducer(WELL_UNIQUE_ID, producer);
        vm.stopPrank();
        
        // Change producer status as admin
        vm.startPrank(ADMIN);
        
        // Mock role check again
        vm.mockCall(
            DUMMY_ROLE,
            abi.encodeWithSelector(bytes4(keccak256("hasRole(bytes32,address)"))),
            abi.encode(true)
        );
        
        // Mock ProductionData contract methods
        vm.mockCall(
            address(ethData),
            abi.encodeWithSelector(bytes4(keccak256("getTDRequestID(bytes32)"))),
            abi.encode(bytes32(""))
        );
        
        vm.mockCall(
            address(ethData),
            abi.encodeWithSelector(bytes4(keccak256("registerTrustedDataRequest(bytes32)"))),
            abi.encode(bytes32("0x1234"))
        );
        
        // Set producer status to Active
        ethProducer.setProducerStatus(WELL_UNIQUE_ID, IProducer.ProducerStatus.Active);
        vm.stopPrank();
        
        // === ASSERT ===
        // Get producer data and verify
        (IProducer.ProducerStatus status, IProducer.ProducerCore memory result) = ethProducer.getProducer(WELL_UNIQUE_ID);
        
        // Verify status is Active
        assertEq(uint(status), uint(IProducer.ProducerStatus.Active));
        
        // Verify producer data - nickname is sufficient as ETH doesn't use API/sulphur
        assertEq(result.nickname, WELL_NICKNAME);
    }
    
    /**
     * @dev Helper function to convert address to string
     * @param _addr Address to convert
     * @return String representation of the address
     */
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        
        for (uint i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        
        return string(str);
    }
} 