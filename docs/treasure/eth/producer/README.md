# EthProducer Contract Documentation

The `EthProducer` contract is an implementation of the Producer interface specifically tailored for Ethereum-based production data (e.g. EthMinting). It extends the base `Producer` contract and provides custom logic in the hooks executed before and after adding a new producer. The core functions for managing producer information (adding, updating, status management, and querying) are inherited from the `Producer` contract.

> **Note:** For detailed descriptions of the inherited functions, please refer to the documentation of the `Producer` contract.

## Table of Contents

- [Overview](#overview)
- [Functions](#functions)
  - [initialize](#initialize)
  - [Internal Hooks](#internal-hooks)
- [Inherited Functions](#inherited-functions)
- [Structs and Enums](#structs-and-enums)
- [Events](#events)

## Overview

The `EthProducer` contract is responsible for managing producer data related to Ethereum-based production (e.g. EthMinting). It initializes the producer with required parameters, performs validations, and sets up the producer’s ownership. Custom logic is implemented in the internal hooks to ensure that:
- The producer’s owner is not a zero address.
- The producer's nickname is not empty.
- The producer’s share is properly initialized by setting the owner.

## Functions

### initialize(address _mulSigContract, address _roleContract, string memory _treasureKind, address _productionDataContract, string[] memory _dappNames, address[] memory _payees)

Initializes the EthProducer contract with the required parameters.

- **Parameters:**
  - `_mulSigContract`: Address of the multi-signature contract.
  - `_roleContract`: Address of the roles contract.
  - `_treasureKind`: The type of treasure this producer handles.
  - `_productionDataContract`: Address of the production data contract.
  - `_dappNames`: Array of dapp names associated with this producer.
  - `_payees`: Array of payee addresses.
  
> **Note:** This function calls the internal `__ProducerInitialize` function from the base `Producer` contract.

### Internal Hooks

These functions are internal and are overridden to implement custom validations and initialization logic when adding a new producer.

#### _beforeAddProducer(bytes32 _uniqueId, ProducerCore memory _producer)

Executed before adding a new producer.

- **Parameters:**
  - `_uniqueId`: The unique identifier for the producer.
  - `_producer`: The producer details provided as a `ProducerCore` struct.
- **Behavior:**
  - Calls the base hook from the `Producer` contract.
  - Validates that the producer owner is not the zero address.
  - Ensures the producer nickname is not empty.
  - Initializes the producer’s share by setting the owner.

#### _afterAddProducer(bytes32 _uniqueId)

Executed after adding a new producer.

- **Parameters:**
  - `_uniqueId`: The unique identifier for the producer.
- **Behavior:**
  - Simply calls the base implementation from the `Producer` contract.

## Inherited Functions

The following functions are inherited from the `Producer` contract and manage core producer operations:

- **addProducer(bytes32 _uniqueId, ProducerCore memory _producer)**
  - Adds a new producer to the blockchain.
- **setProducerStatus(bytes32 _uniqueId, ProducerStatus _newStatus)**
  - Sets the status of a producer.
  - > **Warning:** Only the Foundation Manager can invoke this.
- **updateProducer(bytes32 _uniqueId, ProducerCore memory _producer)**
  - Updates the details of a producer.
  - > **Warning:** Only the producer's owner can invoke this and the producer owner cannot be changed.
- **producerStatus(bytes32 _uniqueId) -> ProducerStatus**
  - Returns the status of a producer.
- **getProducer(bytes32 _uniqueId) -> (ProducerStatus, ProducerCore)**
  - Returns the status and details of a producer.
  - > **Warning:** If the producer's status is `NotSet`, the return values will be empty.

For complete details, please refer to the `Producer` contract documentation.

## Structs and Enums

### ProducerCore

Defines the essential details of a producer.

- `string nickname`: The nickname of the producer.
- `address owner`: The address of the producer owner.
- `uint256 API`: The API value of the producer (used only for Oil).
- `uint256 sulphur`: The sulphur level of the producer (used only for Oil).
- `string account`: The account of the producer (used for EthMinting and BtcMinting).

### ProducerStatus

An enum representing the status of a producer.

- `NotSet`: The producer has not been initialized.
- `Active`: The producer is active.
- `Deactive`: The producer is deactivated.

## Events

The following events are emitted by functions inherited from the `Producer` contract:

### AddProducer(bytes32 uniqueId, ProducerCore producer)
Emitted when a new producer is added.

- `uniqueId`: The unique identifier for the producer.
- `producer`: The producer details.

### SetProducerStatus(bytes32 uniqueId, ProducerStatus status)
Emitted when the status of a producer is changed.

- `uniqueId`: The unique identifier for the producer.
- `status`: The new status of the producer.
