require('@nomicfoundation/hardhat-chai-matchers');
const { expect } = require('chai');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { ethers, upgrades } = require('hardhat');

async function deployWrapper(factoryName) {
  const signers = await ethers.getSigners();
  const [admin, operator, newOperator, user] = signers;
  const Factory = await ethers.getContractFactory(factoryName);
  const token = await upgrades.deployProxy(Factory, [[operator.address]], { initializer: 'initialize' });
  return { token, accounts: { admin, operator, newOperator, user } };
}

function fixtureFor(name) {
  return async function wrappedFixture() {
    return deployWrapper(name);
  };
}

function missingRoleMsg(account, role) {
  return `AccessControl: account ${account.toLowerCase()} is missing role ${role}`;
}

[
  { name: 'WTCASH', display: 'wrapped tcash token', symbol: 'wTCash' },
  { name: 'WUNIT', display: 'wrapped unit token', symbol: 'wUnit' }
].forEach(({ name, display, symbol }) => {
  describe(name, function () {
    it('initializes metadata, admin and operator roles', async function () {
      const { token, accounts } = await loadFixture(fixtureFor(name));
      const adminRole = await token.DEFAULT_ADMIN_ROLE();
      const opRole = await token.OPERATOR_ROLE();

      expect(await token.name()).to.equal(display);
      expect(await token.symbol()).to.equal(symbol);
      expect(await token.hasRole(adminRole, accounts.admin.address)).to.equal(true);
      expect(await token.hasRole(opRole, accounts.operator.address)).to.equal(true);
    });

    it('allows only operators to mint/burn/add/reduce and checks balances', async function () {
      const { token, accounts } = await loadFixture(fixtureFor(name));
      const opRole = await token.OPERATOR_ROLE();

      await expect(token.connect(accounts.user).mint(accounts.user.address, 1)).to.be.revertedWith(
        missingRoleMsg(accounts.user.address, opRole)
      );

      await expect(token.connect(accounts.operator).mint(accounts.user.address, 1000)).to.emit(
        token,
        'Transfer'
      );

      await expect(token.connect(accounts.user).reduceBalance(accounts.user.address, 1)).to.be.revertedWith(
        missingRoleMsg(accounts.user.address, opRole)
      );

      await expect(
        token.connect(accounts.operator).reduceBalance(accounts.user.address, 0)
      ).to.be.revertedWith('Amount must be greater than zero');

      await expect(
        token.connect(accounts.operator).reduceBalance(accounts.user.address, 2000)
      ).to.be.revertedWith('Insufficient balance');

      await expect(token.connect(accounts.operator).reduceBalance(accounts.user.address, 500))
        .to.emit(token, 'Transfer')
        .withArgs(accounts.user.address, ethers.ZeroAddress, 500n);

      await token.connect(accounts.operator)['mint(address,uint256)'](accounts.operator.address, 300);
      await expect(token.connect(accounts.operator).burn(100))
        .to.emit(token, 'Transfer')
        .withArgs(accounts.operator.address, ethers.ZeroAddress, 100n);
    });

    it('admin can add/remove operators; non-admin cannot', async function () {
      const { token, accounts } = await loadFixture(fixtureFor(name));
      const opRole = await token.OPERATOR_ROLE();
      const adminRole = await token.DEFAULT_ADMIN_ROLE();

      await expect(
        token.connect(accounts.newOperator).addOperator(accounts.newOperator.address)
      ).to.be.revertedWith(missingRoleMsg(accounts.newOperator.address, adminRole));

      await token.connect(accounts.admin).addOperator(accounts.newOperator.address);
      expect(await token.hasRole(opRole, accounts.newOperator.address)).to.equal(true);

      await token.connect(accounts.admin).removeOperator(accounts.newOperator.address);
      expect(await token.hasRole(opRole, accounts.newOperator.address)).to.equal(false);
    });
  });
});
