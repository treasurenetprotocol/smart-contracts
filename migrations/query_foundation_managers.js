const Roles = artifacts.require('Roles');

/**
 * Query all members of the FOUNDATION_MANAGER role
 * This script is read-only and will not modify any contract state
 */
module.exports = async function(deployer, network, accounts) {
  try {
    console.log('Querying all members of the FOUNDATION_MANAGER role...');
    
    // Get the deployed Roles contract instance
    const roles = await Roles.deployed();
    
    // Get the FOUNDATION_MANAGER role identifier
    const FOUNDATION_MANAGER_ROLE = await roles.FOUNDATION_MANAGER();
    console.log('FOUNDATION_MANAGER role ID:', FOUNDATION_MANAGER_ROLE);
    
    // Get all members of the FOUNDATION_MANAGER role
    const managers = await roles.getRoleMemberArray(FOUNDATION_MANAGER_ROLE);
    
    console.log('FOUNDATION_MANAGER member count:', managers.length);
    console.log('FOUNDATION_MANAGER member addresses:');
    managers.forEach((address, index) => {
      console.log(`${index + 1}. ${address}`);
    });
    
  } catch (error) {
    console.error('Query failed:', error);
  }
};
