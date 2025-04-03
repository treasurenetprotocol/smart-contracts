const Roles = artifacts.require('Roles');

/**
 * 查询FOUNDATION_MANAGER角色的所有成员
 * 这个脚本仅用于查询，不会修改任何合约状态
 */
module.exports = async function(deployer, network, accounts) {
  try {
    console.log('查询FOUNDATION_MANAGER角色的所有成员...');
    
    // 获取已部署的Roles合约实例
    const roles = await Roles.deployed();
    
    // 获取FOUNDATION_MANAGER角色标识符
    const FOUNDATION_MANAGER_ROLE = await roles.FOUNDATION_MANAGER();
    console.log('FOUNDATION_MANAGER角色ID:', FOUNDATION_MANAGER_ROLE);
    
    // 获取FOUNDATION_MANAGER角色的所有成员
    const managers = await roles.getRoleMemberArray(FOUNDATION_MANAGER_ROLE);
    
    console.log('FOUNDATION_MANAGER角色成员数量:', managers.length);
    console.log('FOUNDATION_MANAGER角色成员地址:');
    managers.forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });
    
  } catch (error) {
    console.error('查询失败:', error);
  }
}; 