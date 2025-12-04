require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CosmosERC20', function () {
  async function deploy() {
    const [gravity, user, other] = await ethers.getSigners();
    const CosmosERC20 = await ethers.getContractFactory('CosmosERC20');
    const token = await CosmosERC20.deploy(gravity.address, 'CosmosAsset', 'cATOM', 6);
    return { token, accounts: { gravity, user, other } };
  }

  it('sets decimals and initial supply anchored to gravity balance', async function () {
    const { token } = await deploy();
    expect(await token.decimals()).to.equal(6);
    expect(await token.totalSupply()).to.equal(0);
  });

  it('tracks totalSupply as MAX - gravity balance when gravity distributes tokens', async function () {
    const { token, accounts } = await deploy();
    const amount = 1000n;
    await token.connect(accounts.gravity).transfer(accounts.user.address, amount);

    expect(await token.balanceOf(accounts.user.address)).to.equal(amount);
    expect(await token.totalSupply()).to.equal(amount);

    await token.connect(accounts.user).transfer(accounts.other.address, 400);
    expect(await token.totalSupply()).to.equal(amount); // internal transfers do not change supply
  });
});
