// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "./IShare.sol";

interface IProducer is IShare {
    event AddProducer(bytes32 uniqueId, ProducerCore producer);
    event SetProducerStatus(
        bytes32 uniqueId,
        bytes32 requestId,
        ProducerStatus status
    );

    event Link(
        bytes32 key,
        bytes32[] uniqueIds,
        uint256[] ratios,
        string[] nicknames,
        bytes32 dappId
    );

    // TODO: customize based on different asset
    // unique id == hash(location_id,location,UWI)
    struct ProducerCore {
        string nickname;
        address owner;
        // Only for OIL & GAS
        uint256 API;
        uint256 sulphur;
        // Only for ETH
        string account;
    }

    enum ProducerStatus {
        // OIL&GAS
        NotSet,
        Active,
        Deactive
    }

    /**
     * @dev Adds a new producer.
     * @param uniqueId The unique ID of the producer.
     * @param _producer The core details of the producer.
     */
    function addProducer(
        bytes32 uniqueId,
        ProducerCore memory _producer
    ) external;

    /**
     * @dev Gets the status and core details of a producer.
     * @param _uniqueId The unique ID of the producer.
     * @return The status and core details of the producer.
     */
    function getProducer(
        bytes32 _uniqueId
    ) external view returns (ProducerStatus, ProducerCore memory);

    /**
     * @dev Sets the status of a producer.
     * @param _uniqueId The unique ID of the producer.
     * @param _newStatus The new status to set.
     */
    function setProducerStatus(
        bytes32 _uniqueId,
        ProducerStatus _newStatus
    ) external;

    // Retrieves the status of a producer.
    function producerStatus(
        bytes32 uniqueId
    ) external view returns (ProducerStatus);

    /**
     * @dev Updates the details of an existing producer.
     * @param uniqueId The unique ID of the producer.
     * @param _producer The updated core details of the producer.
     */
    function updateProdcuer(
        bytes32 uniqueId,
        ProducerCore memory _producer
    ) external;

    /**
     * @dev Registers a DApp connection with the producer contract.
     * @param dapp The name of the DApp.
     * @param payee The address of the payee associated with the DApp.
     * @return The ID of the registered DApp connection.
     */
    function registerDAppConnect(
        string memory dapp,
        address payee
    ) external returns (bytes32);

    // Retrieves the payee address associated with a DApp connection.
    function getDAppPayee(bytes32 _dappId) external returns (address);

    /**
     * @dev Links multiple producers to a single key and DApp.
     * @param _uniqueIds The unique IDs of the producers to link.
     * @param _key The key to link the producers.
     * @param _dappId The ID of the DApp to link the producers with.
     */
    function link(
        bytes32[] memory _uniqueIds,
        bytes32 _key,
        bytes32 _dappId
    ) external;
}
