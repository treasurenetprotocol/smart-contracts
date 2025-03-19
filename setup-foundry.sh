#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Foundry for TreasureNet Smart Contracts...${NC}"

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${BLUE}Installing Foundry...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    
    # Source the environment files
    if [ -f "$HOME/.zshenv" ]; then
        source "$HOME/.zshenv"
    elif [ -f "$HOME/.bashrc" ]; then
        source "$HOME/.bashrc"
    fi
    
    # Add foundry to PATH for this session
    export PATH="$PATH:$HOME/.foundry/bin"
    
    # Run foundryup to install Foundry
    if command -v foundryup &> /dev/null; then
        foundryup
    else
        echo -e "${BLUE}Please run 'source ~/.zshenv' or 'source ~/.bashrc' in a new terminal, then run 'foundryup' manually.${NC}"
        echo -e "${BLUE}After that, run 'npm run setup:foundry' again.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Foundry already installed!${NC}"
    echo -e "${BLUE}Updating Foundry...${NC}"
    foundryup
fi

# Initialize Foundry in the project if not already initialized
if [ ! -d "./lib" ] || [ ! -f "./foundry.toml" ]; then
    echo -e "${BLUE}Initializing Foundry in the project...${NC}"
    forge init --force --no-commit --no-git
    
    # Clean up default files that we don't need
    echo -e "${BLUE}Cleaning up template files...${NC}"
    rm -rf ./src
    rm -rf ./test/Counter.t.sol
    rm -rf ./script
    
    # Create custom foundry.toml configuration
    cat > foundry.toml << EOL
[profile.default]
src = 'contracts'
test = 'test/foundry'
out = 'out'
libs = ['lib', 'node_modules']
solc = '0.8.10'
optimizer = true
optimizer_runs = 200
remappings = [
    '@openzeppelin/=node_modules/@openzeppelin/',
]

[profile.ci]
verbosity = 4
fuzz_runs = 1000

[etherscan]
treasurenet = { key = "\${ETHERSCAN_API_KEY}" }
EOL
else
    # Only install forge-std if initialization wasn't just done
    # Check if forge-std is already installed
    if [ ! -d "./lib/forge-std" ]; then
        echo -e "${BLUE}Installing forge-std library...${NC}"
        forge install foundry-rs/forge-std --no-commit
    else
        echo -e "${GREEN}forge-std library already installed!${NC}"
    fi
fi

# Clean up any template files that might have been created
echo -e "${BLUE}Cleaning up any remaining template files...${NC}"
rm -rf ./src 2>/dev/null
rm -rf ./test/Counter.t.sol 2>/dev/null
rm -rf ./script 2>/dev/null

# Create the foundry test directory if it doesn't exist
mkdir -p test/foundry

echo -e "${GREEN}Foundry setup complete!${NC}"
echo -e "${BLUE}You may need to restart your terminal to use Foundry commands.${NC}"
echo -e "${BLUE}Run tests with: forge test${NC}" 