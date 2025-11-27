// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "Governance/DAO/DAO.sol";
import "Governance/MulSig.sol";
import "Governance/Roles.sol";
import "Governance/ParameterInfo.sol";
import "../contracts/Oracle/Oracle.sol";

/// @notice Deploy core components: DAO, MulSig, Roles, ParameterInfo, Oracle
/// - Mirrors migrations/1_initial_deployment.js
contract DeployCore is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        ProxyAdmin proxyAdmin = new ProxyAdmin();

        // DAO
        DAO daoImpl = new DAO();
        bytes memory daoInit = abi.encodeWithSelector(DAO.initialize.selector, "DAO", 2, 10);
        TransparentUpgradeableProxy daoProxy =
            new TransparentUpgradeableProxy(address(daoImpl), address(proxyAdmin), daoInit);

        // MulSig (no init yet; Crosschain step will initialize)
        MulSig mulSigImpl = new MulSig();
        TransparentUpgradeableProxy mulSigProxy =
            new TransparentUpgradeableProxy(address(mulSigImpl), address(proxyAdmin), "");

        // Roles (no init yet; Crosschain step will initialize)
        Roles rolesImpl = new Roles();
        TransparentUpgradeableProxy rolesProxy =
            new TransparentUpgradeableProxy(address(rolesImpl), address(proxyAdmin), "");

        // ParameterInfo
        ParameterInfo paramImpl = new ParameterInfo();
        bytes memory paramInit = abi.encodeWithSelector(ParameterInfo.initialize.selector, address(mulSigProxy));
        TransparentUpgradeableProxy paramProxy =
            new TransparentUpgradeableProxy(address(paramImpl), address(proxyAdmin), paramInit);

        // Oracle
        Oracle oracleImpl = new Oracle();
        bytes memory oracleInit = abi.encodeWithSelector(Oracle.initialize.selector, address(rolesProxy));
        TransparentUpgradeableProxy oracleProxy =
            new TransparentUpgradeableProxy(address(oracleImpl), address(proxyAdmin), oracleInit);

        vm.stopBroadcast();

        console2.log("ProxyAdmin          :", address(proxyAdmin));
        console2.log("DAO (proxy)         :", address(daoProxy));
        console2.log("MulSig (proxy)      :", address(mulSigProxy));
        console2.log("Roles (proxy)       :", address(rolesProxy));
        console2.log("ParameterInfo (proxy):", address(paramProxy));
        console2.log("Oracle (proxy)      :", address(oracleProxy));
    }
}
