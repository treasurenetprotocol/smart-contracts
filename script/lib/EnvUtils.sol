// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.10;

/// @notice Tiny helpers for reading deployment env vars.
library EnvUtils {
    /// @dev Parse comma-separated 0x addresses into an array; empty string returns empty array.
    function parseAddresses(string memory csv) internal pure returns (address[] memory addrs) {
        bytes memory b = bytes(csv);
        if (b.length == 0) return addrs;

        uint256 count = 1;
        for (uint256 i; i < b.length; i++) {
            if (b[i] == bytes1(",")) {
                count++;
            }
        }

        addrs = new address[](count);
        uint256 idx;
        uint256 start;
        for (uint256 i; i <= b.length; i++) {
            if (i == b.length || b[i] == bytes1(",")) {
                addrs[idx] = _toAddress(_slice(b, start, i - start));
                idx++;
                start = i + 1;
            }
        }
    }

    function _slice(bytes memory data, uint256 start, uint256 len) private pure returns (bytes memory out) {
        out = new bytes(len);
        for (uint256 i; i < len; i++) {
            out[i] = data[start + i];
        }
    }

    function _toAddress(bytes memory str) private pure returns (address addr) {
        require(str.length == 42, "address format");
        require(str[0] == "0" && (str[1] == "x" || str[1] == "X"), "address prefix");
        uint160 res;
        for (uint256 i = 2; i < 42; i++) {
            uint8 v = uint8(str[i]);
            res <<= 4;
            if (v >= 48 && v <= 57) res |= uint160(v - 48);          // 0-9
            else if (v >= 65 && v <= 70) res |= uint160(v - 55);     // A-F
            else if (v >= 97 && v <= 102) res |= uint160(v - 87);    // a-f
            else revert("invalid hex char");
        }
        addr = address(res);
    }
}
