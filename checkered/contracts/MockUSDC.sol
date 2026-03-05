// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testnet deployment and testing
 * @dev Allows anyone to mint tokens for testing purposes
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to any address (for testing only)
     * @param to Recipient address
     * @param amount Amount in USDC units (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
