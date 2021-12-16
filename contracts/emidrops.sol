// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

contract emidrops is ReentrancyGuardUpgradeable, OwnableUpgradeable {
    using AddressUpgradeable for address payable;

    // whole available ETH fund for drops
    uint256 public dropFund;

    // operator - activated
    mapping(address => bool) operators;

    event Deposited(uint256 amount);
    event Withdrawn(address beneficiary, uint256 amount);

    function initialize(address admin, address dropAdmin) public virtual initializer {
        __Ownable_init();
        transferOwnership(admin);
        operators[dropAdmin] = true;
    }

    /*************** ADMIN functions ************************************/

    function setOperator(address newOperator, bool isActive) public onlyOwner {
        operators[newOperator] = isActive;
    }

    /**
     * @dev Stores the amount for drops
     */
    function deposit() public payable onlyOwner {
        require(msg.value > 0);
        dropFund += msg.value;
        emit Deposited(msg.value);
    }

    /**
     * @dev Withdraw funds
     * @param amount value for withdrawal
     */
    function withdraw(uint256 amount) public onlyOwner {
        require(dropFund >= amount, "not enough funds for withdraw");
        dropFund -= amount;
        payable(owner()).sendValue(amount);
        emit Withdrawn(owner(), amount);
    }

    /**
     * @dev Owner can transfer out any accidentally sent ERC20 tokens
     * @param tokenAddress Address of ERC-20 token to transfer
     * @param beneficiary Address to transfer to
     * @param amount of tokens to transfer
     */
    function transferAnyERC20Token(
        address tokenAddress,
        address beneficiary,
        uint256 amount
    ) public nonReentrant onlyOwner returns (bool success) {
        require(tokenAddress != address(0), "address 0!");

        return IERC20Upgradeable(tokenAddress).transfer(beneficiary, amount);
    }

    /*************** Operator functions ************************************/

    function drop(
        address[] memory adressList,
        uint256[] memory amountList,
        uint256 dropAmount
    ) public {
        require(dropAmount > 0 && dropAmount <= dropFund, "incorrect dropAmount");
        require(operators[msg.sender], "only actual operator allowed");
        require(adressList.length > 0, "zero list");
        require(adressList.length == amountList.length, "lists length not match");

        uint256 checkAmount;
        for (uint256 index = 0; index < amountList.length; index++) {
            checkAmount += amountList[index];
            payable(adressList[index]).sendValue(amountList[index]);
        }
        require(dropAmount == checkAmount, "amount not much");
        dropFund -= dropAmount;
    }
}
