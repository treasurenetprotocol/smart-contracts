// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

interface IDAO {
    // Enum representing the state of a proposal
    // - Pending: Proposal is pending and has not been voted on yet
    // - Active: Proposal is active and can be voted on
    // - Canceled: Proposal has been canceled
    // - Defeated: Proposal has been defeated
    // - Succeeded: Proposal has succeeded
    // - Queued: Proposal has been queued for execution
    // - Expired: Proposal has expired
    // - Executed: Proposal has been executed
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    /// @dev Initiate a new proposal
    /// @param targets Target contract address
    /// @param calldatas Contract call data
    /// @param description Description information
    /// @return uint256 proposal id
    /**
     * @dev Create a new proposal. Vote start {IGovernor-votingDelay} blocks after the proposal is created and ends
     * {IGovernor-votingPeriod} blocks after the voting starts.
     *
     * Emits a {ProposalCreated} event.
     */
    function propose(
        address[] memory targets,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId);

    /**
     * @dev Cast a vote
     *
     * Emits a {VoteCast} event.
     */
    function castVote(
        uint256 proposalId,
        uint8 support
    ) external payable returns (uint256 balance);

    function withdraw(uint256 proposalId) external payable returns (uint256);

    /// @dev Move the successfully voted proposal (Succeeded) to the pending execution queue
    /// @param targets Target contract address
    /// @param calldatas contract call data
    /// @param descriptionHash hash of the description information
    /// @return uint256 proposal id
    function queue(
        address[] memory targets,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external returns (uint256);

    /**
     * @dev Execute a successful proposal. This requires the quorum to be reached, the vote to be successful, and the
     * deadline to be reached.
     *
     * Emits a {ProposalExecuted} event.
     *
     * Note: some module can modify the requirements for execution, for example by adding an additional timelock.
     */
    function execute(
        address[] memory targets,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) external payable returns (uint256 proposalId);

    /**
     * @notice module:voting
     * @dev Returns weither `account` has cast a vote on `proposalId`.
     */
    function hasVoted(
        uint256 proposalId,
        address account
    ) external view returns (bool);

    /**
     * @notice module:core
     * @dev Current state of a proposal, following Compound's convention
     */
    function state(uint256 proposalId) external view returns (ProposalState);

    // Set the block reward for the DAO
    // System rewards generated due to block production in the PoS consensus mechanism
    function setBlockReward(uint256 newBlockReward) external;

    // Set the block ratio for the DAO
    function setBlockRatio(uint256 newBlockRatio) external;

    // Get the current block reward for the DAO
    function blockReward() external view returns (uint256);

    // Get the current block ratio for the DAO
    function blockRatio() external view returns (uint256);

    // Update the voting delay for proposals
    function updateDelay(uint256 newDelay) external;

    // Get the current voting delay for proposals
    function votingDelay() external view returns (uint256);
}
