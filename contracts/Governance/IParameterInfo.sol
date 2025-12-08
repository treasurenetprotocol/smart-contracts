// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

interface IParameterInfo {
    struct PriceDiscountConfig {
        uint256 API;
        uint256 sulphur;
        uint256[4] discount;
    }

    /**
     * @dev Sets a platform configuration parameter
     * @param key The key of the configuration parameter
     * @param amount The value to set for the configuration parameter
     * @return A boolean indicating whether the operation was successful
     */
    function setPlatformConfig(string memory key, uint256 amount) external returns (bool);

    function getPlatformConfig(string memory key) external view returns (uint256);
    function getUSTNLoanPledgeRateWarningValue() external view returns (uint amount);
    function getUSTNLoanLiquidationRate() external view  returns (uint amount);

    function setPriceDiscountConfig(
        uint256 API,
        uint256 sulphur,
        uint256 discount1,
        uint256 discount2,
        uint256 discount3,
        uint256 discount4
    ) external returns (bool);

    function getPriceDiscountConfig(uint256 _API, uint256 _sulphur) external view returns (uint256);
}
