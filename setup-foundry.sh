#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Foundry for TreasureNet Smart Contracts...${NC}"

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is not installed. Please install curl and try again.${NC}"
    exit 1
fi

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo -e "${BLUE}Installing Foundry...${NC}"
    curl -L https://foundry.paradigm.xyz | bash
    
    echo -e "${YELLOW}Foundry has been installed, but you need to setup your environment.${NC}"
    echo -e "${YELLOW}Please run one of these commands in a new terminal:${NC}"
    echo -e "${YELLOW}  - If using zsh: source ~/.zshenv${NC}"
    echo -e "${YELLOW}  - If using bash: source ~/.bashrc${NC}"
    echo -e "${YELLOW}Then run 'foundryup' and finally re-run this script.${NC}"
    exit 0
else
    echo -e "${GREEN}Foundry already installed!${NC}"
    echo -e "${BLUE}Updating Foundry...${NC}"
    foundryup
fi

# Create necessary directories without initializing a new Foundry project
if [ ! -d "./test/foundry" ]; then
    echo -e "${BLUE}Creating Foundry test directory...${NC}"
    mkdir -p test/foundry
fi

# Install forge-std if not already installed
if [ ! -d "./lib/forge-std" ]; then
    echo -e "${BLUE}Installing forge-std library...${NC}"
    forge install foundry-rs/forge-std --no-commit
else
    echo -e "${GREEN}forge-std library already installed!${NC}"
fi

# Check if foundry.toml exists, if not create it
if [ ! -f "./foundry.toml" ]; then
    echo -e "${BLUE}Creating foundry.toml configuration...${NC}"
    cat > foundry.toml << EOL
[profile.default]
src = 'contracts'
test = 'test/foundry'
out = 'out'
libs = ['lib', 'node_modules']
solc = '0.8.29'
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
    echo -e "${GREEN}foundry.toml already exists!${NC}"
fi

echo -e "${GREEN}Foundry setup complete!${NC}"
echo -e "${BLUE}You may need to restart your terminal or source your shell configuration to use Foundry commands.${NC}"
echo -e "${BLUE}Run tests with: forge test${NC}" 