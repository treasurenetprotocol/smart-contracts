# Contributing to TreasureNet Smart Contracts

Thank you for your interest in contributing to the TreasureNet smart contracts! This document provides guidelines and workflows to ensure a smooth contribution process.

## Development Environment Setup

### Prerequisites
- Node.js 20.x
- npm
- Foundry (for testing)

### Initial Setup
1. Fork and clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Foundry:
   ```
   npm run setup:foundry
   ```
4. Set up Git hooks (for automatic linting):
   ```
   npm run prepare
   ```

## Development Workflow

### Code Quality
The repository uses Git hooks to ensure code quality:
- **Pre-commit hook**: Automatically formats Solidity files using `forge fmt`

You can manually run the formatter with:
```
npm run lint:fix  # Format all Solidity files
```

Or check for formatting issues without fixing them:
```
npm run lint  # Check formatting without modifying files
```

### Branching Strategy
- `main`: The production branch, containing the deployed code
- `release/*`: Release branches for staging
- Feature/bugfix branches should be created from `main` and follow the naming convention:
  - Features: `feat--descriptive-name`
  - Bugfixes: `fix--descriptive-name`
  - Refactoring: `refactor--descriptive-name`

### Testing
All code changes must include tests. We use Foundry for testing:

1. **Run Tests**
   ```
   forge test
   ```

2. **Run Tests with Gas Reports**
   ```
   forge test --gas-report
   ```

3. **Generate and Check Coverage**
   ```
   forge coverage --report lcov
   ```

### Gas Optimization
- Use the gas reporter to monitor gas usage: `forge test --gas-report`
- For functions expected to be called frequently, aim to minimize gas costs
- Document any gas optimization strategies used

## Smart Contract Standards

### Code Style
- Follow the Solidity style guide
- Use explicit function visibility modifiers
- Use NatSpec comments for all public interfaces
- Follow consistent naming conventions:
  - Contracts: CamelCase
  - Interfaces: ICamelCase
  - Libraries: CamelCase
  - Functions: camelCase
  - Variables: camelCase
  - Events: CamelCase
  - Modifiers: camelCase

### Security Best Practices
- Follow the [check-effects-interactions pattern](https://docs.soliditylang.org/en/latest/security-considerations.html#use-the-checks-effects-interactions-pattern)
- Be aware of [reentrancy vulnerabilities](https://docs.soliditylang.org/en/latest/security-considerations.html#reentrancy)
- Avoid unbounded loops
- Implement appropriate access controls
- Be cautious with external calls
- Validate all inputs
- Use SafeMath or Solidity 0.8.x built-in overflow checks
- Document security considerations

### Documentation
- Document all public functions with NatSpec comments
- Update README.md if necessary
- Document all security-critical components
- Add inline comments for complex logic

## Pull Request Process

1. Create a PR from your feature branch to `main`
2. Fill out the PR template completely
3. Ensure all CI checks pass
4. Request a review from at least one maintainer
5. Address any feedback or requested changes

### Review Criteria
PRs will be evaluated based on:
- Correctness
- Security
- Gas efficiency
- Test coverage
- Code quality
- Documentation

## Security Disclosures

If you discover a security vulnerability, please do NOT open an issue. Email [security@treasurenet.io](mailto:security@treasurenet.io) instead.

## License
By contributing, you agree that your contributions will be licensed under the project's license (GPL-3.0). 