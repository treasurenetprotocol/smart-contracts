const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const Oracle = artifacts.require('Oracle');
const TCashLoan = artifacts.require('TCashLoan');
const TCashAuction = artifacts.require('TCashAuction');
const TCash = artifacts.require('TCash');

/**
 * Query all members of the TCASH_MINTER role
 * This script is read-only and will not modify any contract state
 */
module.exports = async function(deployer, network, accounts) {
  try {
    // console.log('Querying all members of the TCASH_MINTER role...');
    
    // // Get deployed Roles contract instance
    // const roles = await Roles.deployed();
    
    // // Get TCASH_MINTER role identifier
    // const TCASH_MINTER_ROLE = await roles.TCASH_MINTER();
    // console.log('TCASH_MINTER role ID:', TCASH_MINTER_ROLE);
    
    // // Get all TCASH_MINTER members
    // const minters = await roles.getRoleMemberArray(TCASH_MINTER_ROLE);

    // const hasRole = await roles.hasRole(TCASH_MINTER_ROLE, "0x45b10BEC2A86893F6C8733e4138aa8F2d4A9576E");
    // console.log('hasRole:', hasRole);
    
    // console.log('TCASH_MINTER member count:', minters.length);
    // console.log('TCASH_MINTER member addresses:');
    // minters.forEach((address, index) => {
    //   console.log(`${index + 1}. ${address}`);
    // });

    const parameterInfo = await ParameterInfo.deployed();
    const oracle = await Oracle.deployed();

    // await oracle.updatePrice("UNIT", web3.utils.toWei("1.2", "ether")); // assume 1 UNIT = 1 ETH
    // await oracle.updatePrice("TCASH", web3.utils.toWei("2", "ether")); // assume 1 TCASH = 0.1 ETH
    // console.log('Oracle price data initialized');

    const warningRatio = await parameterInfo.getPlatformConfig("TCASHMCT");
    const liquidationRatio = await parameterInfo.getPlatformConfig("TCASHLT");
    console.log('warningRatio:', warningRatio.toString());
    console.log('liquidationRatio:', liquidationRatio.toString());

    const unitPrice = await oracle.getPrice("UNIT"); // assume 1 UNIT = 1 ETH
    const tcashPrice = await oracle.getPrice("TCASH"); // assume 1 TCASH = 0.1 ETH

    console.log('unitPrice (raw):', unitPrice.toString());
    console.log('tcashPrice (raw):', tcashPrice.toString());
    
    // Assume prices are in wei; convert to ETH units
    const unitPriceInEth = web3.utils.fromWei(unitPrice.toString(), 'ether');
    const tcashPriceInEth = web3.utils.fromWei(tcashPrice.toString(), 'ether');
    
    console.log('unitPrice (ETH):', unitPriceInEth);
    console.log('tcashPrice (ETH):', tcashPriceInEth);

    
    const tcashLoan = await TCashLoan.deployed();
    const loanCollateralRatio = await tcashLoan.getLoanCollateralRatio("4");
    console.log('loanCollateralRatio:', loanCollateralRatio.toString());
    // Show collateral ratio as a percentage (if needed)
    console.log('loanCollateralRatio (%)', loanCollateralRatio.toString() / 10000);
   

    const tcashAuction = await TCashAuction.deployed();
    // const loan = await tcashLoan.setAuctionContract(tcashAuction.address);

    const tcash = await TCash.deployed();
    // const tcashRes = await tcash.setAuctionContract(tcashAuction.address);

    // console.log('loan:', loan);
    const liquidation = await tcashLoan.startLiquidation("2");
    console.log('liquidation:', liquidation);

    // Query all auctions
    const auctions = await tcashAuction.queryAuctions();
    console.log('\n=== Auction Items ===');
    console.log('Total auctions:', auctions.length);

    // Iterate through each auction and display details
    for (let i = 0; i < auctions.length; i++) {
        console.log(`\nAuction #${i}:`);
        console.log('Collateral amount:', web3.utils.fromWei(auctions[i].sales.toString(), 'ether'), 'UNIT');
        console.log('Starting price:', web3.utils.fromWei(auctions[i].startValue.toString(), 'ether'), 'TCASH');
        console.log('Current highest bid:', web3.utils.fromWei(auctions[i].nowValue.toString(), 'ether'), 'TCASH');
        console.log('End time:', new Date(auctions[i].timeOver * 1000).toLocaleString());
        console.log('State:', auctions[i].state);
        console.log('Debt amount:', web3.utils.fromWei(auctions[i].debt.toString(), 'ether'), 'TCASH');

        // Query highest bidder
        // const [highestBider, highestBidValue] = await tcashAuction.queryBider(i);
        // console.log('Current highest bidder:', highestBider);
        // console.log('Highest bid:', web3.utils.fromWei(highestBidValue.toString(), 'ether'), 'TCASH');

        // Query all bidding records
        const biders = await tcashAuction.getAuctionBider(i);
        console.log('\nBid records:');
        for (let j = 0; j < biders.length; j++) {
            console.log(`Bid #${j + 1}:`);
            console.log('Time:', new Date(biders[j].time * 1000).toLocaleString());
            console.log('Bidder:', biders[j].bider);
            console.log('Bid amount:', web3.utils.fromWei(biders[j].value.toString(), 'ether'), 'TCASH');
        }
    }

  } catch (error) {
    console.error('Query failed:', error);
  }
};
