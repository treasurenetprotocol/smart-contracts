// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

interface IGovernance {
    /// @dev Used to add new Treasure assets (this method can only be called from the Multisig contract)
    ///   - Events:
    ///    - event AddTreasure(string treasureType,address producerContract,address produceDataContract);
    /// @param _treasureType Asset name
    /// @param _producer Management contract address corresponding to the asset's producer
    /// @param _productionData Management contract address corresponding to the asset's production data
    function addTreasure(
        string memory _treasureType,
        address _producer,
        address _productionData
    ) external;

    /// @dev Return the current threshold set by the Governance multisig contract
    /// @return uint256 threshold
    function fmThreshold() external returns (uint256);

    /// @dev Used to query the contract address corresponding to the asset type of Treasure
    /// @param _treasureType Asset name
    /// @return address Producer management contract address
    /// @return address Production data management contract address
    function getTreasureByKind(string memory _treasureType)
        external
        view
        returns (address, address);
}
