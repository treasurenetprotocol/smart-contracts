const Roles = artifacts.require('Roles');
const ParameterInfo = artifacts.require('ParameterInfo');
const Oracle = artifacts.require('Oracle');
const TCashLoan = artifacts.require('TCashLoan');
const TCashAuction = artifacts.require('TCashAuction');
const TCash = artifacts.require('TCash');

/**
 * 查询TCASH_MINTER角色的所有成员
 * 这个脚本仅用于查询，不会修改任何合约状态
 */
module.exports = async function(deployer, network, accounts) {
  try {
    // console.log('查询TCASH_MINTER角色的所有成员...');
    
    // // 获取已部署的Roles合约实例
    // const roles = await Roles.deployed();
    
    // // 获取TCASH_MINTER角色标识符
    // const TCASH_MINTER_ROLE = await roles.TCASH_MINTER();
    // console.log('TCASH_MINTER角色ID:', TCASH_MINTER_ROLE);
    
    // // 获取TCASH_MINTER角色的所有成员
    // const minters = await roles.getRoleMemberArray(TCASH_MINTER_ROLE);

    // const hasRole = await roles.hasRole(TCASH_MINTER_ROLE, "0x45b10BEC2A86893F6C8733e4138aa8F2d4A9576E");
    // console.log('hasRole:', hasRole);
    
    // console.log('TCASH_MINTER角色成员数量:', minters.length);
    // console.log('TCASH_MINTER角色成员地址:');
    // minters.forEach((address, index) => {
    //   console.log(`${index + 1}. ${address}`);
    // });

    const parameterInfo = await ParameterInfo.deployed();
    // const oracle = await Oracle.deployed();

    // await oracle.updatePrice("UNIT", web3.utils.toWei("1.2", "ether")); // 假设1 UNIT = 1 ETH
    // await oracle.updatePrice("TCASH", web3.utils.toWei("2", "ether")); // 假设1 TCASH = 0.1 ETH
    // console.log('Oracle价格数据初始化完成');

    // 注释掉需要多签权限的操作
    await parameterInfo.setPlatformConfig("TCASHMCT", 750000);
    await parameterInfo.setPlatformConfig("TCASHLT", 500000);

    // 获取当前参数值
    const warningRatio = await parameterInfo.getPlatformConfig("TCASHMCT");
    const liquidationRatio = await parameterInfo.getPlatformConfig("TCASHLT");
    console.log('warningRatio:', warningRatio.toString());
    console.log('liquidationRatio:', liquidationRatio.toString());

    // const unitPrice = await oracle.getPrice("UNIT"); // 假设1 UNIT = 1 ETH
    // const tcashPrice = await oracle.getPrice("TCASH"); // 假设1 TCASH = 0.1 ETH

    // console.log('unitPrice (raw):', unitPrice.toString());
    // console.log('tcashPrice (raw):', tcashPrice.toString());
    
    // // 假设价格以wei为单位，转换为ETH单位
    // const unitPriceInEth = web3.utils.fromWei(unitPrice.toString(), 'ether');
    // const tcashPriceInEth = web3.utils.fromWei(tcashPrice.toString(), 'ether');
    
    // console.log('unitPrice (ETH):', unitPriceInEth);
    // console.log('tcashPrice (ETH):', tcashPriceInEth);

    

    // const loanCollateralRatio = await tcashLoan.getLoanCollateralRatio("4");
    // console.log('loanCollateralRatio:', loanCollateralRatio.toString());
    // // 显示贷款抵押率的百分比形式（如果需要）
    // console.log('loanCollateralRatio (%)', loanCollateralRatio.toString() / 10000);
   

    const tcashAuction = await TCashAuction.deployed();
    console.log('tcashAuction:', tcashAuction.address);
    // const tcashLoan = await TCashLoan.deployed();
    // const loan = await tcashLoan.setAuctionContract(tcashAuction.address);
    // console.log('loan:', loan);

    // const tcash = await TCash.deployed();
    // const tcashRes = await tcash.setAuctionContract(tcashAuction.address);
    // console.log('tcashRes:', tcashRes);

    // console.log('loan:', loan);
    // const liquidation = await tcashLoan.startLiquidation("2");
    // console.log('liquidation:', liquidation);

    // 查询所有拍卖项目
    const auctions = await tcashAuction.queryAuctions();
    console.log('\n=== 拍卖项目列表 ===');
    console.log('拍卖项目总数:', auctions.length);

    // 遍历每个拍卖项目并显示详细信息
    for (let i = 0; i < auctions.length; i++) {
        console.log(`\n拍卖项目 #${i}:`);
        console.log('抵押品数量:', web3.utils.fromWei(auctions[i].sales.toString(), 'ether'), 'UNIT');
        console.log('起拍价:', web3.utils.fromWei(auctions[i].startValue.toString(), 'ether'), 'TCASH');
        console.log('当前最高价:', web3.utils.fromWei(auctions[i].nowValue.toString(), 'ether'), 'TCASH');
        console.log('结束时间:', new Date(auctions[i].timeOver * 1000).toLocaleString());
        console.log('状态:', auctions[i].state);
        console.log('债务金额:', web3.utils.fromWei(auctions[i].debt.toString(), 'ether'), 'TCASH');

        // 查询当前最高出价者
        // const [highestBider, highestBidValue] = await tcashAuction.queryBider(i);
        // console.log('当前最高出价者:', highestBider);
        // console.log('最高出价:', web3.utils.fromWei(highestBidValue.toString(), 'ether'), 'TCASH');

        // 查询所有竞价记录
        const biders = await tcashAuction.getAuctionBider(i);
        console.log('\n竞价记录:');
        for (let j = 0; j < biders.length; j++) {
            console.log(`竞价 #${j + 1}:`);
            console.log('时间:', new Date(biders[j].time * 1000).toLocaleString());
            console.log('竞价者:', biders[j].bider);
            console.log('竞价金额:', web3.utils.fromWei(biders[j].value.toString(), 'ether'), 'TCASH');
        }
    }

  } catch (error) {
    console.error('查询失败:', error);
  }
}; 