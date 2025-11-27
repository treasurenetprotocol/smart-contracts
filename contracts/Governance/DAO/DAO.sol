// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./GovernorUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract DAO is OwnableUpgradeable, GovernorUpgradeable {
    /* Block time when DAO contract is deployed */
    uint256 private _deployedBlockTime;
    /* Current block reward */
    uint256 private _blockReward;
    /* Current block ratio */
    uint256 private _blockRatio;
    /* Voting period */
    uint256 private _votingPeriod;

    event MinDelayChange(uint256 oldDuration, uint256 newDuration);

    /*  Voting type:
        Against: Against
        For: Agree
        Abstain: Abstain
    */
    enum VoteType {
        Against,
        For,
        Abstain
    }

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        mapping(address => bool) hasVoted;
    }

    mapping(uint256 => ProposalVote) private _proposalVotes;

    event ProposalThresholdSet(
        uint256 oldProposalThreshold,
        uint256 newProposalThreshold
    );

    modifier onlyDAO() {
        require(_msgSender() == address(this), "only DAO");
        _;
    }

    /* contract initialization
       _name: DAO organization name
       _minTimeDelay: minimum time delay (timestamp)
       _votingPeriod: voting period
    */
    function initialize(
        string memory _name,
        uint256 _minTimeDelay,
        uint256 __votingPeriod
    ) public initializer {
        __Ownable_init();
        __Governor_init(_name, _minTimeDelay);

        _deployedBlockTime = block.number;

        _blockReward = 10 * 1e18;

        _blockRatio = 5 * 10000;

        // with blocks
        _votingPeriod = __votingPeriod;
    }

    receive() external payable {}

    fallback() external payable {}

    // Governor implementation

    function COUNTING_MODE()
        public
        pure
        virtual
        override
        returns (string memory)
    {
        return "support=bravo&quorum=for,abstain";
    }

    /* Whether the user has voted
       proposalId: ID of the proposal
       account: address of the user
       bool: whether the user has voted
    */
    function hasVoted(
        uint256 proposalId,
        address account
    ) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    /* View the current voting details of the proposal
       proposalId: ID of the proposal
       uint256: The number of negative votes
       uint256: The number of agree votes
       uint256: The number of abstain votes
    */
    function proposalVotes(
        uint256 proposalId
    ) public view virtual returns (uint256, uint256, uint256) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];
        return (
            proposalvote.againstVotes,
            proposalvote.forVotes,
            proposalvote.abstainVotes
        );
    }

    /* update time depay (completed through DAO proposal)
       newDelay: new time delay (timestamp)
    */
    function updateDelay(uint256 newDelay) public virtual override onlyDAO {
        _updateDelay(newDelay);
    }

    /* Query the current votingDelay */
    function votingDelay() public view override returns (uint256) {
        return _getDelay();
    }

    /* updates the voting cycle (completed through DAO proposal)
       newVotingPeriod: new voting period
    */
    function updateVotingPeriod(
        uint256 newVotingPeriod
    ) public virtual onlyDAO {
        _votingPeriod = newVotingPeriod;
    }

    /* Query the current voting cycle
       uint256: voting period
    */
    function votingPeriod() public view override returns (uint256) {
        return _votingPeriod;
    }

    /* Set block reward
       newBlockReward: new block reward
    */
    function setBlockReward(uint256 newBlockReward) public onlyDAO {
        _blockReward = newBlockReward;
    }

    /* Set block ratio
       newBlockRatio: new block ratio
    */
    function setBlockRatio(uint256 newBlockRatio) public onlyDAO {
        _blockRatio = newBlockRatio;
    }

    /* get block reward */
    function blockReward() public view returns (uint256) {
        return _blockReward;
    }

    /* get block ratio */
    function blockRatio() public view returns (uint256) {
        return _blockRatio;
    }

    /* The quorum for the proposal to take effect
       blockNumber: block number
       uint256: quorum
    */
    function quorum(
        uint256 blockNumber
    ) public view override returns (uint256) {
        if (blockNumber <= _deployedBlockTime) {
            return 0;
        }
        /* _blockRatio needs to be divided by 10000 to provide greater precision */
        return
            ((blockNumber - _deployedBlockTime) * _blockReward * _blockRatio) /
            100 /
            10000;
    }

    function _quorumReached(
        uint256 proposalId
    ) internal view virtual override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        return
            quorum(proposalSnapshot(proposalId)) <=
            proposalvote.forVotes + proposalvote.abstainVotes;
    }

    function _voteSucceeded(
        uint256 proposalId
    ) internal view virtual override returns (bool) {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        return proposalvote.forVotes > proposalvote.againstVotes;
    }

    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight
    ) internal virtual override {
        ProposalVote storage proposalvote = _proposalVotes[proposalId];

        require(
            !proposalvote.hasVoted[account],
            "GovernorVotingSimple: vote already cast"
        );
        proposalvote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalvote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalvote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalvote.abstainVotes += weight;
        } else {
            revert("GovernorVotingSimple: invalid value for enum VoteType");
        }
    }
}
