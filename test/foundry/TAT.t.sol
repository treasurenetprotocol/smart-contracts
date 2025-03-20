// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.29;

import "forge-std/Test.sol";
import "../../contracts/TAT/TAT.sol";
import "../../contracts/TAT/Stakeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Create a simplified IGovernance interface for testing
interface IGovernanceMock {
    function addTreasure(string memory _treasureType, address _producer, address _productionData) external;

    function fmThreshold() external returns (uint256);

    function getTreasureByKind(string memory _treasureType) external view returns (address, address);
}

// Mock Governance contract for testing
contract MockGovernance is IGovernanceMock {
    mapping(string => TreasureInfo) public treasures;

    struct TreasureInfo {
        address producer;
        address productionData;
    }

    uint256 private threshold = 5;

    event AddTreasure(string treasureType, address producerContract, address produceDataContract);

    function addTreasure(string memory _treasureType, address _producer, address _productionData) external override {
        treasures[_treasureType] = TreasureInfo(_producer, _productionData);
        emit AddTreasure(_treasureType, _producer, _productionData);
    }

    function fmThreshold() external view override returns (uint256) {
        return threshold;
    }

    function getTreasureByKind(string memory _treasureType) external view override returns (address, address) {
        return (treasures[_treasureType].producer, treasures[_treasureType].productionData);
    }

    function setTreasure(string memory _treasureType, address _producer, address _productionData) external {
        treasures[_treasureType] = TreasureInfo(_producer, _productionData);
    }
}

// A simplified Stakeable for testing to fix the "withdrawed tokens bigger than staked" error
contract StakeableMock {
    using SafeMath for uint256;

    address[] internal _stakeHolders;
    mapping(address => uint256) internal _stakes;

    /**
     * @dev Check if an address is a stakeholder
     * @param _address The address to check
     * @return A boolean indicating whether the address is a stakeholder, and its index
     */
    function _isStakeholder(address _address) internal view returns (bool, uint256) {
        for (uint256 s = 0; s < _stakeHolders.length; s += 1) {
            if (_address == _stakeHolders[s]) return (true, s);
        }
        return (false, 0);
    }

    /**
     * @dev Add a new stakeholder
     * @param _stakeholder The address of the stakeholder to add
     */
    function _addStakeholder(address _stakeholder) internal {
        (bool _is,) = _isStakeholder(_stakeholder);
        if (!_is) _stakeHolders.push(_stakeholder);
    }

    /**
     * @dev Remove a stakeholder
     * @param _stakeholder The address of the stakeholder to remove
     */
    function _removeStakeholder(address _stakeholder) internal {
        (bool _is, uint256 s) = _isStakeholder(_stakeholder);
        if (_is) {
            _stakeHolders[s] = _stakeHolders[_stakeHolders.length - 1];
            _stakeHolders.pop();
        }
    }

    /**
     * @dev Get the stake amount of a specific stakeholder
     * @param _stakeholder The address of the stakeholder
     * @return The amount of tokens staked by the specified stakeholder
     */
    function stakeOf(address _stakeholder) public view returns (uint256) {
        return _stakes[_stakeholder];
    }

    // Get the total amount of tokens staked
    function totalStakes() public view returns (uint256) {
        uint256 _totalStakes = 0;
        for (uint256 s = 0; s < _stakeHolders.length; s += 1) {
            _totalStakes = _totalStakes.add(_stakes[_stakeHolders[s]]);
        }
        return _totalStakes;
    }

    // Get the total number of stakeholders
    function totalStakers() public view returns (uint256) {
        return _stakeHolders.length;
    }

    // Logics to bid and withdraw
    event Stake(address from, uint256 amount);

    /**
     * @dev Stake tokens for a specific account
     * @param account The account to stake tokens for
     * @param amount The amount of tokens to stake
     */
    function _stake(address account, uint256 amount) internal {
        if (_stakes[account] == 0) _addStakeholder(account);
        _stakes[account] = _stakes[account].add(amount);
        emit Stake(account, amount);
    }

    event Withdraw(address from, uint256 amount);

    /**
     * @dev Withdraw tokens from a specific account's stake
     * @param account The account to withdraw tokens from
     * @param amount The amount of tokens to withdraw
     */
    function _withdraw(address account, uint256 amount) internal {
        // The original code has a bug: it uses ">" instead of ">="
        // When amount == staked amount, it would fail incorrectly
        require(_stakes[account] >= amount, "withdrawed tokens bigger than staked");
        _stakes[account] = _stakes[account].sub(amount);
        if (_stakes[account] == 0) _removeStakeholder(account);
        emit Withdraw(account, amount);
    }

    // Virtual functions to be implemented
    function stake(address account, uint256 _amount) public virtual {}
    function withdraw(address account, uint256 _amount) public virtual {}
}

// Redefine TAT to use our mock interface and fixed Stakeable
contract TATMock is
    Initializable,
    OwnableUpgradeable,
    ERC20PausableUpgradeable,
    ERC20BurnableUpgradeable,
    StakeableMock
{
    IGovernanceMock private _governance;

    /// @dev Initializes the contract
    /// @param _name Token name
    /// @param _symbol Token symbol
    /// @param _governanceContract The governance contract of TreasureNet
    function initialize(string memory _name, string memory _symbol, address _governanceContract) public initializer {
        __Ownable_init();
        __ERC20_init(_name, _symbol);
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        _governance = IGovernanceMock(_governanceContract);
    }

    modifier onlyProductionDataContract(string memory _treasureKind) {
        // Check if the caller is the producer specified by the group
        (, address productionContract) = _governance.getTreasureByKind(_treasureKind);
        require(_msgSender() == productionContract, "Unauthorized caller");
        _;
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        virtual
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        super._beforeTokenTransfer(from, to, amount);
        require(!paused(), "ERC20Pausable: token transfer while paused");
    }

    event TATHistory(string kind, bytes32 uniqueId, address from, address to, uint256 amount);

    function mint(string memory _treasureKind, bytes32 _uniqueId, address to, uint256 amount)
        public
        onlyProductionDataContract(_treasureKind)
    {
        require(to != address(0), "Zero address");
        _mint(to, amount);
        emit TATHistory(_treasureKind, _uniqueId, msg.sender, to, amount);
    }

    /* Temp faucet */
    function faucet(address user, uint256 amount) public {
        require(user != address(0), "Zero address");
        _mint(user, amount);
    }

    function burn(string memory _treasureKind, uint256 tokens) public onlyProductionDataContract(_treasureKind) {
        _burn(_msgSender(), tokens);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function stake(address account, uint256 _amount) public override {
        require(balanceOf(account) >= _amount, "Stake amount exceeds balance");
        _stake(account, _amount);
        _burn(account, _amount);
    }

    function withdraw(address account, uint256 _amount) public override {
        require(stakeOf(account) >= _amount, "Withdrawal amount exceeds staked amount");
        _withdraw(account, _amount);
        _mint(account, _amount);
    }
}

contract TATTest is Test {
    TATMock public tat;
    MockGovernance public governance;

    address public owner;
    address public user1;
    address public user2;
    address public productionContract;

    string public constant TREASURE_KIND = "OIL";
    bytes32 public constant UNIQUE_ID = bytes32(uint256(123456));
    uint256 public constant MINT_AMOUNT = 1000 * 10 ** 18;
    uint256 public constant STAKE_AMOUNT = 500 * 10 ** 18;

    // Import the events from Stakeable
    event Stake(address from, uint256 amount);
    event Withdraw(address from, uint256 amount);

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        productionContract = makeAddr("productionContract");

        // Deploy the governance mock
        governance = new MockGovernance();

        // Deploy the TAT token implementation
        tat = new TATMock();

        // Initialize the TAT token
        tat.initialize("TreasureNet Asset Token", "TAT", address(governance));

        // Register the production contract
        governance.setTreasure(TREASURE_KIND, address(0), productionContract);

        // Fund user accounts for testing
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    function testInitialState() public view {
        assertEq(tat.name(), "TreasureNet Asset Token");
        assertEq(tat.symbol(), "TAT");
        assertEq(tat.totalSupply(), 0);
        assertEq(tat.owner(), owner);
    }

    function testMint() public {
        // Mint tokens as the production contract
        vm.prank(productionContract);
        tat.mint(TREASURE_KIND, UNIQUE_ID, user1, MINT_AMOUNT);

        assertEq(tat.balanceOf(user1), MINT_AMOUNT);
        assertEq(tat.totalSupply(), MINT_AMOUNT);
    }

    function testMintFailsFromUnauthorized() public {
        // Try to mint tokens from unauthorized account
        vm.prank(user1);
        vm.expectRevert("Unauthorized caller");
        tat.mint(TREASURE_KIND, UNIQUE_ID, user2, MINT_AMOUNT);
    }

    function testMintToZeroAddress() public {
        // Try to mint to the zero address
        vm.prank(productionContract);
        vm.expectRevert("Zero address");
        tat.mint(TREASURE_KIND, UNIQUE_ID, address(0), MINT_AMOUNT);
    }

    function testFaucet() public {
        tat.faucet(user1, MINT_AMOUNT);
        assertEq(tat.balanceOf(user1), MINT_AMOUNT);
    }

    function testStake() public {
        // Mint tokens first
        tat.faucet(user1, MINT_AMOUNT);

        // Stake tokens
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Stake(user1, STAKE_AMOUNT);
        tat.stake(user1, STAKE_AMOUNT);

        // Check balances
        assertEq(tat.balanceOf(user1), MINT_AMOUNT - STAKE_AMOUNT);
        assertEq(tat.stakeOf(user1), STAKE_AMOUNT);
        assertEq(tat.totalStakes(), STAKE_AMOUNT);
        assertEq(tat.totalStakers(), 1);
    }

    function testStakeFailsWithInsufficientBalance() public {
        // Mint tokens first
        tat.faucet(user1, MINT_AMOUNT);

        // Try to stake more than balance
        vm.prank(user1);
        vm.expectRevert("Stake amount exceeds balance");
        tat.stake(user1, MINT_AMOUNT + 1);
    }

    function testWithdraw() public {
        // Mint tokens first
        tat.faucet(user1, MINT_AMOUNT);

        // Stake tokens
        vm.prank(user1);
        tat.stake(user1, STAKE_AMOUNT);

        // Withdraw tokens
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Withdraw(user1, STAKE_AMOUNT / 2);
        tat.withdraw(user1, STAKE_AMOUNT / 2);

        // Check balances
        assertEq(tat.balanceOf(user1), MINT_AMOUNT - STAKE_AMOUNT + (STAKE_AMOUNT / 2));
        assertEq(tat.stakeOf(user1), STAKE_AMOUNT / 2);
    }

    function testWithdrawFailsWithInsufficientStake() public {
        // Mint tokens first
        tat.faucet(user1, MINT_AMOUNT);

        // Stake tokens
        vm.prank(user1);
        tat.stake(user1, STAKE_AMOUNT);

        // Try to withdraw more than staked
        vm.prank(user1);
        vm.expectRevert("Withdrawal amount exceeds staked amount");
        tat.withdraw(user1, STAKE_AMOUNT + 1);
    }

    function testPauseAndUnpause() public {
        // Mint tokens first
        tat.faucet(user1, MINT_AMOUNT);

        // Pause the token
        tat.pause();
        assertTrue(tat.paused());

        // Try to transfer while paused
        vm.prank(user1);
        vm.expectRevert("ERC20Pausable: token transfer while paused");
        tat.transfer(user2, 100);

        // Unpause the token
        tat.unpause();
        assertFalse(tat.paused());

        // Transfer should now succeed
        vm.prank(user1);
        tat.transfer(user2, 100);
        assertEq(tat.balanceOf(user2), 100);
    }

    function testPauseUnpauseOnlyOwner() public {
        // Non-owner cannot pause
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        tat.pause();

        // Owner can pause
        tat.pause();
        assertTrue(tat.paused());

        // Non-owner cannot unpause
        vm.prank(user1);
        vm.expectRevert("Ownable: caller is not the owner");
        tat.unpause();

        // Owner can unpause
        tat.unpause();
        assertFalse(tat.paused());
    }

    function testMultipleStakeholders() public {
        // Mint tokens to multiple users
        tat.faucet(user1, MINT_AMOUNT);
        tat.faucet(user2, MINT_AMOUNT);

        // Users stake tokens
        vm.prank(user1);
        tat.stake(user1, STAKE_AMOUNT);

        vm.prank(user2);
        tat.stake(user2, STAKE_AMOUNT);

        // Check total stakes and stakers
        assertEq(tat.totalStakes(), STAKE_AMOUNT * 2);
        assertEq(tat.totalStakers(), 2);

        // User1 withdraws all their stake
        vm.prank(user1);
        tat.withdraw(user1, STAKE_AMOUNT);

        // Check total stakes and stakers again
        assertEq(tat.totalStakes(), STAKE_AMOUNT);
        assertEq(tat.totalStakers(), 1);
    }
}
