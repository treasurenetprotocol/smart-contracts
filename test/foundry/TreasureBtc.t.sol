// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.29;

import "forge-std/Test.sol";
import "./Base.t.sol";
import "../../contracts/Treasure/BTC/BtcProducer.sol";
import "../../contracts/Treasure/BTC/BtcData.sol";
import "../../contracts/TAT/TAT.sol";
import "../../contracts/Treasure/interfaces/IProducer.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title TreasureBtcTest
 * @dev Test contract for BTC producer functionality
 * Follows AAA pattern: Arrange, Act, Assert
 */
contract TreasureBtcTest is BaseTest {
    using Strings for uint256;
    
    // Contract instances
    BtcProducer public btcProducer;
    BtcData public btcData;
    TAT public tat;
    
    // Test constants
    bytes32 constant WELL_UNIQUE_ID = bytes32(0x4872484e4579694e575a65745956524879303873690000000000000000000003);
    string constant WELL_NICKNAME = "Treasure-Btc";
    string constant MINTING_ACCOUNT_STRING = "tb1qsgx55dp6gn53tsmyjjv4c2ye403hgxynxs0dnm"; // BTC address format
    
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
        btcProducer = new BtcProducer();
        btcData = new BtcData();
        
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
        btcProducer.initialize(
            DUMMY_MULTISIG,       // mulSigContract
            DUMMY_ROLE,           // roleContract
            "BTC",                // assetType
            address(btcData),     // productionDataContract
            dappNames,            // dappNames
            payees                // payees
        );
        
        // Initialize BtcData contract
        btcData.initialize(
            "BTC",                // _treasureKind
            address(0),           // _oracleContract
            DUMMY_ROLE,           // _rolesContract
            address(0),           // _parameterInfoContract
            address(btcProducer), // _producerContract
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
        
        // Create producer struct - BTC doesn't use API or sulphur values
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
        btcProducer.addProducer(WELL_UNIQUE_ID, producer);
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
            address(btcData),
            abi.encodeWithSelector(bytes4(keccak256("getTDRequestID(bytes32)"))),
            abi.encode(bytes32(""))
        );
        
        vm.mockCall(
            address(btcData),
            abi.encodeWithSelector(bytes4(keccak256("registerTrustedDataRequest(bytes32)"))),
            abi.encode(bytes32("0x1234"))
        );
        
        // Set producer status to Active
        btcProducer.setProducerStatus(WELL_UNIQUE_ID, IProducer.ProducerStatus.Active);
        vm.stopPrank();
        
        // === ASSERT ===
        // Get producer data and verify
        (IProducer.ProducerStatus status, IProducer.ProducerCore memory result) = btcProducer.getProducer(WELL_UNIQUE_ID);
        
        // Verify status is Active
        assertEq(uint(status), uint(IProducer.ProducerStatus.Active));
        
        // Verify producer data - nickname is sufficient as BTC doesn't use API/sulphur
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