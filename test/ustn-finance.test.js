require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployFinanceFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundationManager, user, auctionMgr] = signers;

  // Roles mock
  const MockRoles = await ethers.getContractFactory('MockRoles');
  const roles = await MockRoles.deploy();
  const foundationRole = ethers.keccak256(ethers.toUtf8Bytes('FOUNDATION_MANAGER'));
  await roles.setRole(foundationRole, foundationManager.address, true);

  // Parameter config
  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const params = await upgrades.deployProxy(ParameterInfo, [mulSig.address], { initializer: 'initialize' });
  await params.connect(mulSig).setPlatformConfig('reserveRatio', 5000); // 50%
  await params.connect(mulSig).setPlatformConfig('loanPledgeRate', 20000);
  await params.connect(mulSig).setPlatformConfig('loanInterestRate', 10);

  // Oracle mock with prices
  const MockOracle = await ethers.getContractFactory('MockOracle');
  const oracle = await MockOracle.deploy();
  await oracle.setCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('UNIT')), 2);
  await oracle.setCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('USTN')), 1);

  // USTN mock
  const MockUSTN = await ethers.getContractFactory('MockUSTN');
  const ustn = await MockUSTN.deploy();
  await ustn.setAuctionManager(auctionMgr.address);
  await ustn.setBalance(user.address, 20_000_000_000n); // enough for deposits

  // USTNAuction mock
  const MockUSTNAuction = await ethers.getContractFactory('MockUSTNAuction');
  const ustnAuction = await MockUSTNAuction.deploy();

  const USTNFinance = await ethers.getContractFactory('USTNFinance');
  const finance = await USTNFinance.deploy();
  await finance.initialize(
    await roles.getAddress(),
    await params.getAddress(),
    await oracle.getAddress(),
    await ustn.getAddress(),
    await ustnAuction.getAddress(),
  );

  return { finance, roles, params, oracle, ustn, ustnAuction, accounts: { mulSig, foundationManager, user, auctionMgr } };
}

describe('USTNFinance', () => {
  it('accepts deposits/withdrawals and updates bank loan limit', async () => {
    const { finance, ustn, accounts } = await loadFixture(deployFinanceFixture);
    const depositAmount = 10_000_000_000n;

    await finance.connect(accounts.user).deposit(depositAmount);
    expect(await finance.loanPossible()).to.equal(depositAmount / 2n); // reserveRatio 50%
    expect(await finance.connect(accounts.user).queryDepositBalance()).to.equal(depositAmount);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(10_000_000_000n); // reduced by deposit

    await finance.connect(accounts.user).withdrawal(2_000_000_000n);
    expect(await finance.loanPossible()).to.equal(8_000_000_000n / 2n);
    expect(await finance.connect(accounts.user).queryDepositBalance()).to.equal(8_000_000_000n);
  });

  it('creates loans backed by UNIT collateral and records debt', async () => {
    const { finance, ustn, params, oracle, accounts } = await loadFixture(deployFinanceFixture);

    await finance.connect(accounts.user).deposit(10_000_000_000n);
    const pledgeRate = await params.getPlatformConfig('loanPledgeRate');
    const unitPrice = await oracle.getCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('UNIT')));
    const ustnPrice = await oracle.getCurrencyValue(ethers.keccak256(ethers.toUtf8Bytes('USTN')));

    const loanAmount = (unitPrice * 1_000_000_000n * pledgeRate) / 10000n / ustnPrice; // loansRate(1e9)
    await finance.connect(accounts.user).loans({ value: 1_000_000_000n });

    const loans = await finance.connect(accounts.user).queryLoan();
    expect(loans.length).to.equal(1);
    expect(loans[0].debt).to.be.gte(loanAmount);
    expect(loans[0].interest).to.be.gt(0);
    expect(await ustn.balanceOf(accounts.user.address)).to.equal(10_000_000_000n + loanAmount);
    expect(await finance.loanPossible()).to.equal(5_000_000_000n - loanAmount); // bankLoanLimit decreased
  });

  it('allows full repayment and returns proportional collateral', async () => {
    const { finance, ustn, accounts } = await loadFixture(deployFinanceFixture);
    await finance.connect(accounts.user).deposit(10_000_000_000n);
    await finance.connect(accounts.user).loans({ value: 1_000_000_000n });

    const loans = await finance.connect(accounts.user).queryLoan();
    const repay = loans[0].debt;
    const beforeBalance = await ustn.balanceOf(accounts.user.address);

    // ensure enough USTN (already minted)
    await finance.connect(accounts.user).loansBack(0, repay);

    const afterLoans = await finance.connect(accounts.user).queryLoan();
    expect(afterLoans[0].debt).to.equal(0);
    expect(afterLoans[0].mortgage).to.equal(0);
    expect(await ustn.balanceOf(accounts.user.address)).to.be.lt(beforeBalance); // spent to repay
  });

  it('distributes accumulated loan interest to depositors by FoundationManager', async () => {
    const { finance, accounts } = await loadFixture(deployFinanceFixture);
    await finance.connect(accounts.user).deposit(10_000_000_000n);
    await finance.connect(accounts.user).loans({ value: 1_000_000_000n }); // accrues interest
    await ethers.provider.send('evm_increaseTime', [600]); // pass liquidationTime to accrue points
    await ethers.provider.send('evm_mine');

    const before = await finance.connect(accounts.user).queryDepositBalance();
    await finance.connect(accounts.foundationManager).distributeDepositInterest();
    const after = await finance.connect(accounts.user).queryDepositBalance();
    expect(after).to.be.gt(before);
  });
});
