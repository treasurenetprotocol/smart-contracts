require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { anyValue } = require('@nomicfoundation/hardhat-chai-matchers/withArgs');
const { ethers, upgrades, network } = require('hardhat');

async function deployBridgeFixture() {
  const signers = await ethers.getSigners();
  const [owner, crossSender, user, feeRecipient] = signers;

  const MockCrosschainTokens = await ethers.getContractFactory('MockCrosschainTokens');
  const crosschainTokens = await MockCrosschainTokens.deploy();

  const MockRoles = await ethers.getContractFactory('MockRoles');
  const roles = await MockRoles.deploy();
  await roles.setRole(await roles.CROSSCHAIN_SENDER(), crossSender.address, true);

  const MockToken = await ethers.getContractFactory('MockToken');
  const token = await MockToken.deploy('USTN', 'USTN');
  await token['mint(address,uint256)'](user.address, ethers.parseEther('1000'));

  const CrosschainBridge = await ethers.getContractFactory('CrosschainBridge');
  const bridge = await upgrades.deployProxy(
    CrosschainBridge,
    [await crosschainTokens.getAddress(), await roles.getAddress()],
    { initializer: 'initialize' }
  );

  // Configure token on mock crosschain registry
  await crosschainTokens.setInfo(
    31337,
    'USTN',
    await token.getAddress(),
    await token.getAddress(),
    31337,
    1,
    100 // 1% fee
  );
  await crosschainTokens.setInfo(
    0,
    'USTN',
    await token.getAddress(),
    await token.getAddress(),
    0,
    1,
    100
  );

  return { bridge, crosschainTokens, roles, token, accounts: { owner, crossSender, user, feeRecipient } };
}

describe('CrosschainBridge', function () {
  it('locks ERC20 on crossToEth and stores transaction metadata', async function () {
    const { bridge, token, accounts } = await loadFixture(deployBridgeFixture);

    const fee = 100n;
    const base = 10n ** 12n;
    const amount = (10000n + fee) * base; // divisible for exact split
    const transferAmount = 10000n * base;
    const feeAmount = fee * base;
    const chainId = 0n;
    await expect(bridge.connect(accounts.user).crossToEth('USTN', amount, Number(chainId)))
      .to.emit(bridge, 'CrossToEth')
      .withArgs(
        anyValue, // id
        accounts.user.address,
        'USTN',
        Number(chainId),
        1,
        await token.getAddress(),
        await token.getAddress(),
        transferAmount,
        feeAmount,
        anyValue,
        anyValue,
        Number(chainId)
      );

    // User balance decreased, bridge balance increased
    const initial = ethers.parseEther('1000');
    expect(await token.balanceOf(accounts.user.address)).to.equal(initial - amount);
    expect(await token.balanceOf(await bridge.getAddress())).to.equal(amount);

    // Transaction id increments and expirations are set
    expect(await bridge.getCurrentId()).to.equal(1);
    const expectedId = (chainId << 32n) | 1n;
    const expiration = await bridge.getExpirationBlock(expectedId);
    expect(expiration).to.be.gt(0);
  });

  it('mints target token on crossFromEth for authorized sender', async function () {
    const { bridge, token, roles, accounts } = await loadFixture(deployBridgeFixture);

    await roles.setRole(await roles.CROSSCHAIN_SENDER(), accounts.crossSender.address, true);

    await expect(
      bridge.connect(accounts.crossSender).crossFromEth(
        1,
        'USTN',
        ethers.parseEther('5'),
        accounts.user.address,
        31337
      )
    )
      .to.emit(bridge, 'CrossFromEth')
      .withArgs(1, accounts.user.address, 'USTN', ethers.parseEther('5'));

    expect(await token.balanceOf(accounts.user.address)).to.equal(ethers.parseEther('1005'));
  });

  it('rolls back ERC20 and marks transaction processed in cleanup', async function () {
    const { bridge, token, roles, accounts } = await loadFixture(deployBridgeFixture);
    await roles.setRole(await roles.CROSSCHAIN_SENDER(), accounts.crossSender.address, true);

    const fee = 100n;
    const base = 10n ** 12n;
    const amount = (10000n + fee) * base;
    const chainId = 0n;
    const expectedId = (chainId << 32n) | 1n;
    await bridge.connect(accounts.user).crossToEth('USTN', amount, Number(chainId));
    await bridge
      .connect(accounts.crossSender)
      .crossRollback(expectedId, accounts.user.address, 'USTN', Number(chainId), amount);
    expect(await token.balanceOf(accounts.user.address)).to.equal(ethers.parseEther('1000'));

    const expiration = await bridge.getExpirationBlock(expectedId);
    const targetBlock = expiration + 50000n + 1n;
    const current = await ethers.provider.getBlockNumber();
    const delta = targetBlock - BigInt(current);
    if (delta > 0) {
      const hex = '0x' + delta.toString(16);
      await network.provider.send('hardhat_mine', [hex]);
    }

    await bridge.cleanup(10);
    const [, , , , , , processed] = await bridge.getRecord(expectedId);
    expect(processed).to.equal(true);
  });

  it('withdraws accumulated fees by owner', async function () {
    const { bridge, token, accounts } = await loadFixture(deployBridgeFixture);
    const fee = 100n;
    const base = 10n ** 12n;
    const amount = (10000n + fee) * base;
    const feeAmount = fee * base;
    await bridge.connect(accounts.user).crossToEth('USTN', amount, 0);

    await expect(
      bridge
        .connect(accounts.owner)
        .withdrawFee(await token.getAddress(), feeAmount, accounts.feeRecipient.address)
    ).to.changeTokenBalances(
      token,
      [bridge, accounts.feeRecipient],
      [-feeAmount, feeAmount]
    );
  });
});
