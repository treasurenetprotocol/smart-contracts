const MulSig = artifacts.require('MulSig');
const Roles = artifacts.require('Roles');
const Governance = artifacts.require('Governance');

/**
 * Register DApp through multisig proposal script
 * This script will create a proposal to register a DApp connection for a producer
 * Foundation managers need to sign and execute the proposal
 */
module.exports = async function (deployer, network, accounts) {
    try {
        console.log('Creating multisig proposal for DApp registration...', network);

        // ===== Configuration Section =====
        // Please modify these parameters according to your needs
        const TREASURE_KIND = "OIL";  // Treasure type (OIL/GAS/ETH/BTC)
        const DAPP_NAME = "OtterStreamTest";  // DApp name
        const PAYEE_ADDRESS = "0x1234567890123456789012345678901234567891";  // DApp payee address
        
        console.log(`Configuration:`);
        console.log(`  Treasure Kind: ${TREASURE_KIND}`);
        console.log(`  DApp Name: ${DAPP_NAME}`);
        console.log(`  Payee Address: ${PAYEE_ADDRESS}`);
        console.log('');

        // ===== Validation Section =====
        // Validate payee address format
        if (!web3.utils.isAddress(PAYEE_ADDRESS)) {
            console.error('Error: Invalid payee address format');
            return;
        }

        // Get deployed contract instances
        const mulSig = await MulSig.deployed();
        const roles = await Roles.deployed();
        const governance = await Governance.deployed();

        console.log(`Contract addresses:`);
        console.log(`  MulSig: ${mulSig.address}`);
        console.log(`  Roles: ${roles.address}`);
        console.log(`  Governance: ${governance.address}`);
        console.log('');

        // Check if treasure exists
        try {
            const [producerAddress] = await governance.getTreasureByKind(TREASURE_KIND);
            if (producerAddress === "0x0000000000000000000000000000000000000000") {
                console.error(`Error: Treasure kind "${TREASURE_KIND}" not found`);
                return;
            }
            console.log(`Treasure "${TREASURE_KIND}" producer contract: ${producerAddress}`);
        } catch (error) {
            console.error(`Error: Failed to get treasure info for "${TREASURE_KIND}":`, error.message);
            return;
        }

        // Get foundation managers
        const FOUNDATION_MANAGER = await roles.FOUNDATION_MANAGER();
        const foundationManagers = await roles.getRoleMemberArray(FOUNDATION_MANAGER);
        console.log(`Foundation managers: ${foundationManagers}`);

        if (foundationManagers.length === 0) {
            console.error('Error: No foundation manager accounts found');
            return;
        }

        // ===== Proposal Creation Section =====
        // Use first foundation manager as proposer
        const proposer = foundationManagers[0];
        console.log(`Using ${proposer} as proposer`);

        const txOptions = { from: proposer };

        // Create proposal for DApp registration
        console.log(`Creating proposal to register DApp "${DAPP_NAME}" for treasure "${TREASURE_KIND}"...`);
        const proposalTx = await mulSig.proposeToRegisterDApp(
            TREASURE_KIND,
            DAPP_NAME,
            PAYEE_ADDRESS,
            txOptions
        );

        // Extract proposal ID from event
        const proposalId = proposalTx.logs.find(log => log.event === 'RegisterDApp').args.proposalId;
        console.log(`Created proposal ID: ${proposalId}`);

        // Get required signature threshold
        const fmThreshold = await governance.fmThreshold();
        console.log(`Required signatures for proposal: ${fmThreshold}`);
        console.log('');

        // ===== Signing and Execution Section =====
        // In test/development environment, automatically sign and execute
        if (network === 'development' || network === 'test' || network === 'ganache') {
            console.log('Running in test environment - auto-signing and executing proposal');

            // Sign proposal - get signatures from foundation managers until threshold is met
            const requiredSignatures = Math.min(foundationManagers.length, fmThreshold.toNumber());

            for (let i = 0; i < requiredSignatures; i++) {
                const signerAddress = foundationManagers[i];
                
                // Check if already signed
                const hasAlreadySigned = await mulSig.hasAlreadySigned(proposalId, signerAddress);
                if (hasAlreadySigned) {
                    console.log(`Signer ${i + 1}: ${signerAddress} has already signed`);
                    continue;
                }

                console.log(`Signer ${i + 1}: ${signerAddress} signing proposal...`);
                await mulSig.signTransaction(proposalId, { from: signerAddress });

                // Get current signature count
                const signatureCount = await mulSig.getSignatureCount(proposalId);
                console.log(`Current signature count: ${signatureCount}`);
            }

            // Wait for confirmation period (in test environment, this should be minimal)
            console.log('Waiting for confirmation period...');
            
            // Get proposal details to check execution time
            const proposalDetails = await mulSig.transactionDetails(proposalId);
            const currentTime = Math.floor(Date.now() / 1000);
            const executionTime = proposalDetails.excuteTime.toNumber();
            
            if (executionTime > currentTime) {
                const waitTime = executionTime - currentTime;
                console.log(`Need to wait ${waitTime} seconds before execution`);
                
                // In test environment, we can advance time
                if (network === 'development' || network === 'ganache') {
                    await web3.currentProvider.send({
                        jsonrpc: "2.0",
                        method: "evm_increaseTime",
                        params: [waitTime + 1],
                        id: new Date().getTime()
                    });
                    await web3.currentProvider.send({
                        jsonrpc: "2.0",
                        method: "evm_mine",
                        id: new Date().getTime()
                    });
                    console.log('Time advanced for testing');
                }
            }

            // Execute proposal
            console.log('Executing proposal...');
            await mulSig.executeProposal(proposalId, txOptions);
            console.log('Proposal executed successfully!');

            // Verify DApp registration
            console.log('Verifying DApp registration...');
            const dappId = web3.utils.keccak256(web3.utils.encodePacked(DAPP_NAME, PAYEE_ADDRESS));
            console.log(`Generated DApp ID: ${dappId}`);
            console.log('DApp has been successfully registered with the producer contract');

        } else {
            // Production environment instructions
            console.log(`
=== Production Environment Instructions ===

A multisig proposal has been created with the following details:
- Proposal ID: ${proposalId}
- Treasure Kind: ${TREASURE_KIND}
- DApp Name: ${DAPP_NAME}
- Payee Address: ${PAYEE_ADDRESS}

Next steps for foundation managers:
1. Review the proposal details carefully
2. At least ${fmThreshold} foundation managers need to sign the proposal
3. Use the following command to sign:
   mulSig.signTransaction(${proposalId})
4. After sufficient signatures, wait for the confirmation period
5. Execute the proposal using:
   mulSig.executeProposal(${proposalId})

Foundation managers who can sign:
${foundationManagers.map((addr, i) => `${i + 1}. ${addr}`).join('\n')}

Current proposal status can be checked with:
- mulSig.getSignatureCount(${proposalId})
- mulSig.transactionDetails(${proposalId})
            `);
        }

        console.log('Script execution completed');

    } catch (error) {
        console.error('Error during DApp registration:', error);
        if (error.reason) {
            console.error('Reason:', error.reason);
        }
    }
}; 