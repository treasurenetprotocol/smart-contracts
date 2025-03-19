// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.10;

interface IShare {
    enum Flag {
        NotHolder,
        Holder
    }

    struct Holder {
        uint256 index;
        uint256 ratio;
        // Flag indicating whether the address is a holder or not
        Flag flag;
    }

    event SetHolder(
        bytes32 uniqueId,
        address holder,
        uint256 ratio,
        uint256 currentTotalHolders,
        uint256 currentTotalShared
    );
    event SplitHolder(
        bytes32 uniqueId,
        address from,
        address to,
        uint256 ratio
    );
    event DeleteHolder(bytes32 uniqueId, address holder);

    // Share management
    // Returns the maximum number of shares allowed.
    function maxShares() external returns (uint256);

    function totalHolders(bytes32 _uniqueId) external view returns (uint256);

    function totalShared(bytes32 _uniqueId) external view returns (uint256);

    /**
     * @dev Retrieves the details of a holder for a specific asset.
     * @param _uniqueId The unique identifier of the asset.
     * @param _holder The address of the holder.
     * @return The details of the holder.
     */
    function holder(
        bytes32 _uniqueId,
        address _holder
    ) external view returns (Holder memory);

    /**
     * @dev Checks if an address is a holder of shared ownership for a specific asset.
     * @param _uniqueId The unique identifier of the asset.
     * @param _holder The address to check.
     * @return True if the address is a holder, false otherwise.
     */
    function isHolder(
        bytes32 _uniqueId,
        address _holder
    ) external view returns (bool);

    /**
     * @dev Sets the holders and their share ratios for a specific asset.
     * @param _uniqueId The unique identifier of the asset.
     * @param _holders The addresses of the holders.
     * @param _ratios The share ratios corresponding to each holder.
     */
    function setHolders(
        bytes32 _uniqueId,
        address[] memory _holders,
        uint256[] memory _ratios
    ) external;

    /**
     * @dev Splits a holder's share ratio and assigns the split portion to a new holder.
     * @param _uniqueId The unique identifier of the asset.
     * @param _toHolder The address of the new holder.
     * @param _ratio The ratio to split.
     * @return uint256 The new ratios after splitting.
     */
    function splitHolder(
        bytes32 _uniqueId,
        address _toHolder,
        uint256 _ratio
    ) external returns (uint256, uint256);

    // Deletes a holder and redistributes their share to the remaining holders.
    function deleteHolder(bytes32 _uniqueId, address _holder) external;

    function calculateRewards(
        bytes32 _uniqueId,
        uint256 total
    ) external returns (address[] memory, uint256[] memory);
}
