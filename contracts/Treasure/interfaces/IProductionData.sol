// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IProductionData {
    event VerifiedProduction(bytes32 _uniqueId, uint256 month, uint256 amount);

    enum ProduceDataStatus {
        UNAUDITED,
        FINISHED,
        FAILED
    }

    struct AssetValue {
        uint256 Date;
        uint256 Value;
        uint256 Timestamp;
    }

    // TODO: customize based on different asset
    struct ProduceData {
        bytes32 uniqueId; // The producer uniqueid
        uint256 counterId;
        address account;
        // amount in ETH & BTC
        uint256 amount; // amount this month
        // price in ETH & BTC
        uint256 price; //  price(Count of tat token) this month
        uint256 date;
        uint256 month;
        // ETH & BTC
        string miner;
        uint256 blockNumber;
        uint256 blockReward;
        ProduceDataStatus status;
    }

    // By Oracle
    function receiveAssetValue(bytes32 _requestId, uint256 _date, uint256 _value) external returns (uint256);

    function cancelAssetValueRequest() external returns (bool);

    function getAssetValueRequestID() external view returns (bytes32);

    function getAssetValue(uint256 _date) external returns (uint256);

    // register oracle request
    function registerTrustedDataRequest(bytes32 _uniqueId) external returns (bytes32);

    function cancelTrustedDataRequest(bytes32 _uniqueId) external returns (bool);

    function getTDRequestID(bytes32 _uniqueId) external view returns (bytes32);

    // TODO[Refine] by oracle
    function receiveTrustedProductionData(
        bytes32 _requestId,
        bytes32 _uniqueId,
        ProduceData memory _produceData
    )
        external;

    // TODO[Refine] by producer itself
    function setProductionData(bytes32 _uniqueId, ProduceData memory _produceData) external;

    function getProductionData(bytes32 _uniqueId, uint256 month) external returns (ProduceData memory);

    function clearing(bytes32 _uniqueId, uint256 _month) external;
}
