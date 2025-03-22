// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AirDrop is Initializable, OwnableUpgradeable {
    // FoundationManager
    address[] private _fms;
    // BoardDirector
    address[] private _boardDirectors;

    // Two types of users: Foundation and VIP users
    enum Role {
        Unknown,
        FOUNDATION,
        VIP
    }

    // Foundation withdrawal stage
    enum ClaimStage {
        StageUnknown,
        Stage1,
        Stage2
    }

    /*uint256 private constant STAGE_TIMELOCK = 90 days;*/
    /* for test 15mins */
    uint256 private constant STAGE_TIMELOCK = 15 minutes;
    /*uint256 private constant AirDrop_TIMELOCK = 30 days;*/
    /* for test 10mins */
    uint256 private constant AirDrop_TIMELOCK = 5 minutes;
    uint256 private constant RELEASE_PERIODS = 12;

    // UNIT granted to the foundation at different stages
    mapping(ClaimStage => uint256) private _toFoundation;
    // Foundation payable account
    address private _foundation;

    // Initial total amount granted to VIPs
    uint256 private _remainedToVips;
    // Monthly airdrop total amount (granted to VIPs)
    mapping(uint256 => uint256) private _totalPerMonth;

    // VIP account => Claim ratio
    mapping(address => uint256) private _vips;

    // vip => month => ratio
    // Record the historical claim ratio of monthly earnings for VIPs
    mapping(address => mapping(uint256 => uint256)) private _vipHistoryRatios;
    // Record whether the historical claim ratio of monthly earnings for VIPs has change
    mapping(address => mapping(uint256 => bool)) private _vipChangedAtMonth;

    address[] private _vipAccs;

    uint256 private _totalRatios;
    // Record the current month of withdrawal for the VIP account, starting at 0, meaning never withdrawn
    mapping(address => uint256) private _vipClaimedMonth;
    // Total amount already withdrawn by VIPs
    mapping(address => uint256) private _vipClaimedAmount;
    // Start time for VIP withdrawals
    uint256 private _startAt;

    // Proposal with MulSig
    mapping(uint256 => Proposal) private proposals;
    mapping(uint256 => bool) private proposalExecuted;
    uint256 private currProposalId;

    uint256 private PROPOSAL_TIME_LOCK;

    receive() external payable { }

    function initialize(
        address[] memory vips,
        uint256[] memory ratios,
        address[] memory foundationManagers,
        address[] memory boardDirectors
    )
        public
        initializer
    {
        __Ownable_init();
        require(foundationManagers.length >= 2, "must provide >2 foundation managers");
        require(boardDirectors.length >= 3, "must provide > 3 board directorys");
        require(vips.length != 0, "zero vips accounts");
        require(vips.length == ratios.length, "vips.length must equal to ratios.length");

        // The foundation has 30 million, with 15 million granted directly in the first stage
        /*_toFoundation[ClaimStage.Stage1] = 15000000 * 1e18;*/
        /* for test 15*/
        _toFoundation[ClaimStage.Stage1] = 15 * 1e18;
        // _timeline[ClaimStage.Stage1] = block.timestamp;
        // The second stage occurs 3 months after the first stage, unlocking an additional 15 million
        /*_toFoundation[ClaimStage.Stage2] = 15000000 * 1e18;*/
        /* for test 15 */
        _toFoundation[ClaimStage.Stage2] = 15 * 1e18;
        // _timeline[ClaimStage.Stage2] = block.timestamp + 90 days;

        // The airdrop starts at the current contract initialization time
        _startAt = block.timestamp;

        // Grant 60 million to VIP customers
        /* _remainedToVips = 60000000 * 1e18;*/
        /* for test 60 */
        _remainedToVips = 60 * 1e18;
        for (uint256 i = 1; i <= RELEASE_PERIODS; i++) {
            _totalPerMonth[i] = _remainedToVips / RELEASE_PERIODS;
        }

        // NOTE: always use 1st FM as the payable
        _foundation = foundationManagers[0];
        for (uint256 i = 0; i < foundationManagers.length; i++) {
            require(foundationManagers[i] != address(0), "has empty fm account");
            _fms.push(foundationManagers[i]);
        }
        for (uint256 i = 0; i < boardDirectors.length; i++) {
            require(boardDirectors[i] != address(0), "has empty board director account");
            _boardDirectors.push(boardDirectors[i]);
        }

        uint256 totalRatios;
        for (uint256 i = 0; i < vips.length; i++) {
            require(vips[i] != address(0), "has empty vip account");
            require(vips[i] != _foundation, "vip can't be foundation at the same time");
            require(_vips[vips[i]] == 0, "found duplicate vip account");

            _vips[vips[i]] = ratios[i];

            // First-month claim ratio
            _vipHistoryRatios[vips[i]][1] = ratios[i];
            _vipChangedAtMonth[vips[i]][1] = true;

            _vipAccs.push(vips[i]);

            totalRatios = totalRatios + ratios[i];
        }
        /*require(totalRatios <= 100, "total ratios must <= 100");*/
        require(totalRatios <= 100 * 1e6, "total ratios must <= 100 * 1e6");
        _totalRatios = totalRatios;

        /*PROPOSAL_TIME_LOCK = 48 hours;*/
        /* for test 1mins */
        PROPOSAL_TIME_LOCK = 1 minutes;
    }

    modifier onlyFoundation() {
        require(msg.sender == _foundation, "only Foundation account is allowed");
        _;
    }

    modifier onlyFM() {
        bool found;
        for (uint256 i = 0; i < _fms.length; i++) {
            if (_fms[i] == msg.sender) {
                found = true;
                break;
            }
        }
        require(found, "only FoundationManager allowed");
        _;
    }

    function deployedAt() public view returns (uint256) {
        return _startAt;
    }

    function getRole(address account) public view returns (Role) {
        if (account == _foundation) {
            return Role.FOUNDATION;
        }
        if (_vips[account] != 0) {
            return Role.VIP;
        }
        return Role.Unknown;
    }

    function getVIPs() public view onlyFM returns (address[] memory, uint256[] memory) {
        uint256[] memory ratios = new uint256[](_vipAccs.length);
        for (uint256 i = 0; i < _vipAccs.length; i++) {
            ratios[i] = _vips[_vipAccs[i]];
        }
        return (_vipAccs, ratios);
    }

    function getVIPInfo(address vip) public view returns (uint256, uint256, uint256, uint256) {
        (uint256 totalClaimable, uint256 sinceMonth, uint256 toMonth) = _vipClaimable(vip);
        return (_vipClaimedAmount[vip], totalClaimable, sinceMonth, toMonth);
    }

    function remainedToVIPs() public view returns (uint256) {
        return _remainedToVips;
    }

    function claimable() public view returns (Role, uint256, ClaimStage, uint256, uint256) {
        address sender = msg.sender;
        // Foundation
        if (sender == _foundation) {
            (uint256 unaclaimedCmount, ClaimStage stage) = _foundationClaimable();
            return (Role.FOUNDATION, unaclaimedCmount, stage, 0, 0);
        }

        // VIP
        (uint256 amount, uint256 sinceMonth, uint256 toMonth) = _vipClaimable(sender);

        return (Role.VIP, amount, ClaimStage.Stage1, sinceMonth, toMonth);
    }

    function _foundationClaimable() internal view returns (uint256, ClaimStage) {
        ClaimStage currentStage = ClaimStage.Stage1;
        if (block.timestamp > _startAt + STAGE_TIMELOCK) {
            currentStage = ClaimStage.Stage2;
        }
        uint256 amount;
        // Determine whether the current stage has been withdrawn
        if (_toFoundation[currentStage] > 0) {
            amount += _toFoundation[currentStage];
        }
        // Determine whether stage 1 has been withdrawn
        if (currentStage == ClaimStage.Stage2 && _toFoundation[ClaimStage.Stage1] > 0) {
            amount += _toFoundation[ClaimStage.Stage1];
        }
        return (amount, currentStage);
    }

    function _vipClaimable(address vip) internal view returns (uint256, uint256, uint256) {
        // Determine if the withdrawal has been completed
        if (_remainedToVips == 0) {
            return (0, 0, 0);
        }

        // Calculate the total amount that can be withdrawn from the last withdrawal month to the current month
        uint256 current = _currentMonth();

        // The maximum month is 12
        if (current > RELEASE_PERIODS) {
            current = RELEASE_PERIODS;
        }

        uint256 claimedMonth = _vipClaimedMonth[vip];
        // Determine if the withdrawal has reached the current month
        if (claimedMonth == current) {
            return (0, 0, 0);
        }

        // Calculate between the current unwithdrawn month and the current withdrawable month
        uint256 totalClaimable;
        for (uint256 i = claimedMonth + 1; i <= current; i++) {
            //Calculate the amount withdrawable for that month (total amount withdrawable for that month * withdrawal
            // ratio)
            uint256 actualRatio;
            for (uint256 j = i; j > 0; j--) {
                // Find the most recent update as the actual ratio for the current month
                if (_vipChangedAtMonth[vip][j]) {
                    actualRatio = _vipHistoryRatios[vip][j];
                    break;
                }
            }

            uint256 amount = 0;
            /*amount = (_totalPerMonth[i] * actualRatio) / 100;*/
            if (i == 1) {
                amount = (_totalPerMonth[i] * actualRatio) / 100;
            } else {
                amount = _totalPerMonth[i] * actualRatio / 100 / 1e6;
                //1e6 actualRatio 1e6 decimal issue,from the second period onwards
            }
            totalClaimable = totalClaimable + amount;
        }
        return (totalClaimable, claimedMonth + 1, current);
    }

    event Claimed(Role role, uint256 claimedAmount, ClaimStage stage, uint256 sinceMonth, uint256 toMonth);

    function claim() public {
        if (msg.sender == _foundation) {
            (uint256 amount, ClaimStage stage) = _foundationClaim();
            emit Claimed(Role.FOUNDATION, amount, stage, 0, 0);
            return;
        }

        (uint256 vipAmount, uint256 sinceMonth, uint256 toMonth) = _vipClaim();
        emit Claimed(Role.VIP, vipAmount, ClaimStage.Stage1, sinceMonth, toMonth);

        return;
    }

    function foundationWithdrawed() public view returns (uint256) {
        return _toFoundation[ClaimStage.Stage1];
    }

    // foundationClaimis used for foundation withdrawals
    event FoundationClaimed(address foundation, ClaimStage stage, uint256 amount);

    function _foundationClaim() internal returns (uint256, ClaimStage) {
        (uint256 amount, ClaimStage currentStage) = _foundationClaimable();

        require(amount > 0, "foundation is unclaimable");

        _toFoundation[currentStage] = 0;

        if (currentStage == ClaimStage.Stage2 && _toFoundation[ClaimStage.Stage1] > 0) {
            _toFoundation[ClaimStage.Stage1] = 0;
        }

        payable(_foundation).transfer(amount);
        emit FoundationClaimed(_foundation, currentStage, amount);

        return (amount, currentStage);
    }

    event VIPClaimed(address vip, uint256 sinceMonth, uint256 toMonth, uint256 amount);

    function _vipClaim() internal returns (uint256, uint256, uint256) {
        // Calculate the current withdrawable amount
        (uint256 amount, uint256 sinceMonth, uint256 toMonth) = _vipClaimable(msg.sender);

        require(amount > 0, "this vip is unclaimable");

        // Update the current unwithdrawn amount
        _remainedToVips = _remainedToVips - amount;

        // Update the withdrawal records for VIPs
        _vipClaimedMonth[msg.sender] = toMonth;
        _vipClaimedAmount[msg.sender] += amount;

        payable(msg.sender).transfer(amount);

        emit VIPClaimed(msg.sender, sinceMonth, toMonth, amount);

        return (amount, sinceMonth, toMonth);
    }

    // eceiveIntermidiateFund UNIT to `toVIPs`
    event ReceivedInterFund(address from, uint256 currentMonth, uint256 amount, uint256 remainedToVips);

    function receiveIntermidiateFund() public payable {
        require(msg.value > 0, "zero UNIT");
        uint256 month = _currentMonth();
        // If the current month is the 12th month or after the 12th month, it indicates that the airdrop has ended
        if (month >= RELEASE_PERIODS) {
            return;
        }
        // Recalculate the monthly withdrawable amount
        uint256 remainedMonths = RELEASE_PERIODS - _currentMonth();
        for (uint256 i = month + 1; i <= RELEASE_PERIODS; i++) {
            _totalPerMonth[i] = _totalPerMonth[i] + msg.value / remainedMonths;
        }
        _remainedToVips = _remainedToVips + msg.value;
        emit ReceivedInterFund(msg.sender, _currentMonth(), msg.value, _remainedToVips);
    }

    event FoundationClaimedVIPs(address account, uint256 amount);
    // After 1 year, the foundation can withdraw all the airdrop funds allocated for VIPs

    function foundationClaimVIPs() public onlyFoundation {
        require(_currentMonth() > RELEASE_PERIODS, "only excceedes the total periods(1year/12months)");
        require(_remainedToVips > 0, "all claimed by VIPs(zero remainedToVips)");

        payable(_foundation).transfer(_remainedToVips);

        emit FoundationClaimedVIPs(_foundation, _remainedToVips);

        _remainedToVips = 0;
    }

    // The current withdrawable month (3.1 == 3)
    function _currentMonth() internal view returns (uint256) {
        return (block.timestamp - _startAt) / AirDrop_TIMELOCK;
    }

    /* Integrate with MulSig */

    // Modify user whitelist and user ratio(MulSig)
    enum ProposalPurpose {
        ChangeVIP
    }

    struct Proposal {
        address proposer;
        ProposalPurpose purpose;
        address[] vips;
        uint256[] ratios;
        // Number of signatures
        uint8 sigCount;
        // Execution time
        uint256 excuteTime;
        mapping(address => uint8) signatures;
    }

    //
    function _nextProposalId() internal returns (uint256) {
        currProposalId++;
        return currProposalId;
    }

    // send the proposal
    event SendProposal(uint256 proposalId, address proposer, ProposalPurpose purpose, address[] vips, uint256[] ratios);

    //allows the contract deployer to submit proposals to the contract
    function propose(
        ProposalPurpose purpose,
        address[] memory vips,
        uint256[] memory ratios
    )
        public
        returns (uint256)
    {
        require(vips.length == ratios.length, "vips and ratios must have same length");
        //Initialize temporary variable to store the total ratios
        uint256 tempTotal = _totalRatios;
        for (uint256 i = 0; i < vips.length; i++) {
            require(vips[i] != address(0), "has zero vip address");
            /*require(ratios[i] <= 100, "ratio must <= 100");*/
            require(ratios[i] <= 100 * 1e6, "ratio must <= 100 * 1e6");
            //Get the current ratio for the VIP address
            uint256 currRatio = _vips[vips[i]];
            tempTotal = tempTotal - currRatio + ratios[i];
        }
        /*require(tempTotal <= 100, "total ratio must <=100");*/
        require(tempTotal <= 100 * 1e6, "total ratio must <=100 * 1e6");

        uint256 proposalId = _nextProposalId();

        Proposal storage proposal = proposals[proposalId];
        proposal.purpose = purpose;
        proposal.proposer = msg.sender;
        proposal.vips = vips;
        proposal.ratios = ratios;

        emit SendProposal(proposalId, msg.sender, purpose, vips, ratios);

        return proposalId;
    }

    // 0: UnKnown 1: FoundationManager 2:BoardDirector
    function _fmOrBd(address account) internal view returns (uint256) {
        for (uint256 i = 0; i < _fms.length; i++) {
            if (_fms[i] == account) {
                return 1;
            }
        }

        for (uint256 i = 0; i < _boardDirectors.length; i++) {
            if (_boardDirectors[i] == account) {
                return 2;
            }
        }

        return 0;
    }

    function threshold() public pure returns (uint256) {
        return 3;
    }

    event ProposalSucc(uint256 proposalId, uint256 executeTime);
    event ProposalSigned(uint256 proposalId, address signer);

    /// @dev Issued by FoundationManager, agree to a certain proposal
    /// @param _proposalId ID corresponding to the proposal
    /// @return bool Was the request successful?
    function signTransaction(uint256 _proposalId) public returns (bool) {
        uint256 role = _fmOrBd(msg.sender);
        require(role != 0, "only FoundationManager or BoardDirector can sign");
        Proposal storage pro = proposals[_proposalId];
        require(pro.signatures[msg.sender] != 1, "already signed");

        pro.signatures[msg.sender] = 1;

        require(pro.sigCount < threshold(), "proposal already meet threshold");
        pro.sigCount++;

        // Meet the threshold and set the execution time (effective time)
        if (pro.sigCount == threshold()) {
            pro.excuteTime = block.timestamp + PROPOSAL_TIME_LOCK;
            emit ProposalSucc(_proposalId, pro.excuteTime);
        }
        emit ProposalSigned(_proposalId, msg.sender);

        return true;
    }

    event ProposalExecuted(uint256 proposalId, ProposalPurpose purpose);
    event ChangeVIP(address vip, uint256 before, uint256 now);

    function executeProposal(uint256 _proposalId) public {
        require(!proposalExecuted[_proposalId], "proposal has been executed");

        Proposal storage pro = proposals[_proposalId];
        require(pro.proposer != address(0), "propsoal with this proposalId may not exist");
        /*require(pro.excuteTime > 0 && pro.excuteTime <= block.timestamp, "executeTime not meet");*/
        require(pro.sigCount >= threshold(), "proposal not meet threshold");

        if (pro.purpose == ProposalPurpose.ChangeVIP) {
            uint256 tempTotal = _totalRatios;
            for (uint256 i = 0; i < pro.vips.length; i++) {
                uint256 currRatio = _vips[pro.vips[i]];
                _vips[pro.vips[i]] = pro.ratios[i];
                if (currRatio == 0) {
                    _vipAccs.push(pro.vips[i]);
                }
                // Record historical ratio
                // Affects the profit ratio of the second stage
                // |  currMonth() | curr | next  |
                _vipHistoryRatios[pro.vips[i]][_currentMonth() + 1] = pro.ratios[i];
                _vipChangedAtMonth[pro.vips[i]][_currentMonth() + 1] = true;
                tempTotal = tempTotal - currRatio + pro.ratios[i];
                emit ChangeVIP(pro.vips[i], currRatio, pro.ratios[i]);
            }
            /*require(tempTotal <= 100, "total ratios must <= 100");*/
            require(tempTotal <= 100 * 1e6, "total ratios must <= 100 * 1e6");
            _totalRatios = tempTotal;
        }

        proposalExecuted[_proposalId] = true;

        emit ProposalExecuted(_proposalId, pro.purpose);
    }
}
