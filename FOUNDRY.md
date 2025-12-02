# Foundry Setup for TreasureNet Smart Contracts

This document explains how to set up and use Foundry for testing the TreasureNet smart contracts.

## What is Foundry?

[Foundry](https://github.com/foundry-rs/foundry) is a fast, portable and modular toolkit for Ethereum application development written in Rust. It consists of:

- **Forge**: Ethereum testing framework (like Truffle)
- **Cast**: Swiss army knife for interacting with EVM smart contracts
- **Anvil**: Local Ethereum node, similar to Ganache
- **Chisel**: Solidity REPL

## Setup

We've provided a simple setup script that will install and configure Foundry for this project:

```bash
npm run setup:foundry
```

If the script encounters any issues, you might need to manually install Foundry:

1. Install Foundry:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   source ~/.zshenv  # or ~/.bashrc
   foundryup
   ```

2. Run the setup script again:
   ```bash
   npm run setup:foundry
   ```

## Running Tests

To run the Foundry tests:

```bash
npm run test:foundry
```

To run tests with gas reporting:

```bash
npm run test:foundry:gas
```

To generate test coverage:

```bash
npm run test:foundry:coverage
```

To run both Truffle and Foundry tests:

```bash
npm run test:all
```

## Writing Tests

Foundry tests are written in Solidity. You can find examples in the `test/foundry/` directory.

### Basic Test Structure

```solidity
// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.10;

import "forge-std/Test.sol";
import "../../contracts/YourContract.sol";

contract YourContractTest is Test {
    YourContract public yourContract;
    
    function setUp() public {
        yourContract = new YourContract();
        // Setup code here
    }
    
    function testSomething() public {
        // Test code here
        assertTrue(true);
    }
}
```

### Useful Testing Features

- `vm.prank(address)`: Next call will be made from the specified address
- `vm.expectRevert(string)`: Expect the next call to revert with the specified message
- `vm.expectEmit()`: Expect the next call to emit a specific event
- `vm.deal(address, uint256)`: Give ETH to an address
- `makeAddr(string)`: Create a deterministic address from a string

## CI/CD Integration

Foundry tests are automatically run in the CI pipeline for all PRs and pushes to the main branch.

## Troubleshooting

If you encounter any issues with Foundry:

1. Make sure Foundry is properly installed:
   ```bash
   forge --version
   ```

2. If you get "command not found", try sourcing your shell configuration:
   ```bash
   source ~/.zshenv  # or ~/.bashrc
   ```

3. Ensure you have the right Solidity version (0.8.10):
   ```bash
   forge --version
   ```

4. If you're having trouble with dependencies, try installing them manually:
   ```bash
   forge install foundry-rs/forge-std
   ``` 