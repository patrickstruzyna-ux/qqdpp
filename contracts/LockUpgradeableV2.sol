// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./LockUpgradeable.sol";

contract LockUpgradeableV2 is LockUpgradeable {
    // New state variable
    uint public withdrawalFee;

    // New function to set withdrawal fee
    function setWithdrawalFee(uint _fee) public onlyOwner {
        require(_fee <= 100, "Fee cannot exceed 100%");
        withdrawalFee = _fee;
    }

    // Override withdraw function with fee implementation
    function withdraw() public override {
        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        uint balance = address(this).balance;
        uint fee = (balance * withdrawalFee) / 100;
        uint withdrawAmount = balance - fee;

        emit Withdrawal(withdrawAmount, block.timestamp);

        owner.transfer(withdrawAmount);
    }
}