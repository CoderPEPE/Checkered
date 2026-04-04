// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
contract CheckeredCredits is ERC20 {
    constructor(address recipient) ERC20("Checkered Credits", "CHEX") {
        _mint(recipient, 1000000 * 10 ** decimals());
    }
}
