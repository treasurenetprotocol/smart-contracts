require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployLoanFixture() {
  const signers = await ethers.getSigners();
  const [mulSig, foundationManager, tcashManager, user, other] = signers;

  // Roles
  const Roles = await ethers.getContractFactory('Roles');
  const roles = await upgrades.deployProxy(
    Roles,
    [
      mulSig.address,
      [foundationManager.address], // FOUNDATION_MANAGER
      [], // auction managers
      [], // feeders
      [], // crosschain senders
      [tcashManager.address] // TCASH minter/burner
    ],
    { initializer: 'initialize' }
  );

  // ParameterInfo with minimal config (no interest for simpler repayment)
  const ParameterInfo = await ethers.getContractFactory('ParameterInfo');
  const parameterInfo = await upgrades.deployProxy(
    ParameterInfo,
    [mulSig.address],
    { initializer: 'initialize' }
  );

  // Oracle mock
  const MockOracle = await ethers.getContractFactory('MockOracle');
  const oracle = await MockOracle.deploy();
  await oracle.setStatus(true);
  await oracle.setPrice('UNIT', ethers.parseEther('1'));
  await oracle.setPrice('TCASH', ethers.parseEther('1'));

  // TAT mock with positive credit
  const MockTAT = await ethers.getContractFactory('MockTAT');
  const tat = await MockTAT.deploy();

  // TCash token
  const TCash = await ethers.getContractFactory('TCash');
  const tcash = await upgrades.deployProxy(TCash, [tcashManager.address], {
    initializer: 'initialize'
  });
  await tcash.setRoles(await roles.getAddress());
  await tcash.setOracle(await oracle.getAddress());

  // Loan contract (non-proxy to allow role grant before initialize)
  const TCashLoan = await ethers.getContractFactory('TCashLoan');
  const loan = await TCashLoan.deploy();

  // Grant minter/burner roles to loan
  const minterRole = await roles.TCASH_MINTER();
  const burnerRole = await roles.TCASH_BURNER();
  await roles.connect(mulSig).grantRole(minterRole, await loan.getAddress());
  await roles.connect(mulSig).grantRole(burnerRole, await loan.getAddress());

  await loan.initialize(
    await tcash.getAddress(),
    await roles.getAddress(),
    await parameterInfo.getAddress(),
    await oracle.getAddress(),
    await tat.getAddress()
  );

  // Auction mock
  const MockAuction = await ethers.getContractFactory('MockAuction');
  const auction = await MockAuction.deploy();
  await loan.connect(mulSig).setAuctionContract(await auction.getAddress());

  return {
    roles,
    parameterInfo,
    oracle,
    tat,
    tcash,
    loan,
    auction,
    accounts: { mulSig, foundationManager, tcashManager, user, other }
  };
}

describe('TCashLoan', function () {
  it('creates loans and mints tcash using collateral', async function () {
    const { loan, tcash, accounts } = await loadFixture(deployLoanFixture);

    const beforeBalance = await tcash.balanceOf(accounts.user.address);
    const tx = await loan.connect(accounts.user).createLoan({ value: ethers.parseEther('1') });
    const receipt = await tx.wait();
    const loanID = receipt.logs.find((l) => l.fragment?.name === 'LoanRecord').args.loanID;

    const afterBalance = await tcash.balanceOf(accounts.user.address);
    expect(afterBalance).to.be.gt(beforeBalance); // minted

    const loanData = await loan.getLoan(loanID);
    expect(loanData.account).to.equal(accounts.user.address);
    expect(loanData.amounts[0]).to.equal(ethers.parseEther('1')); // collateral
    expect(loanData.status).to.equal(0); // active
    expect(await loan.getUserLoanCount(accounts.user.address)).to.equal(1);
  });

  it('repays loan and clears status with collateral return', async function () {
    const { loan, tcash, accounts } = await loadFixture(deployLoanFixture);
    const tx = await loan.connect(accounts.user).createLoan({ value: ethers.parseEther('1') });
    const loanID = (await tx.wait()).logs.find((l) => l.fragment?.name === 'LoanRecord').args.loanID;

    const loanData = await loan.getLoan(loanID);
    const repayAmount = loanData.amounts[1];
    const userBalance = await tcash.balanceOf(accounts.user.address);
    if (userBalance < repayAmount) {
      await tcash.connect(accounts.tcashManager).mint(accounts.user.address, repayAmount - userBalance);
    }

    await expect(() =>
      loan.connect(accounts.user).repay(loanID, repayAmount)
    ).to.changeEtherBalances(
      [loan, accounts.user],
      [ethers.parseEther('-1'), ethers.parseEther('1')]
    );

    const updated = await loan.getLoan(loanID);
    expect(updated.status).to.equal(1); // cleared
    expect(updated.amounts[0]).to.equal(0); // collateral released
  });

  it('allows foundation manager to start liquidation and triggers auction', async function () {
    const { loan, auction, oracle, accounts } = await loadFixture(deployLoanFixture);

    // create loan
    const tx = await loan.connect(accounts.user).createLoan({ value: ethers.parseEther('1') });
    const loanID = (await tx.wait()).logs.find((l) => l.fragment?.name === 'LoanRecord').args.loanID;

    // tweak prices to avoid reverts and set config if needed
    await oracle.setPrice('UNIT', ethers.parseEther('1'));
    await oracle.setPrice('TCASH', ethers.parseEther('1'));

    await expect(
      loan.connect(accounts.foundationManager).startLiquidation(loanID)
    ).to.not.be.reverted;

    const call = await auction.lastCall();
    expect(call.mortgage).to.equal(ethers.parseEther('1'));
    expect(call.debt).to.equal((await loan.getLoan(loanID)).amounts[1]);
    expect(call.caller).to.equal(await loan.getAddress());
  });
});
