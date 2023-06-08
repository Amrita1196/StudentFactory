// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./StudentNestedContract.sol";

contract FactoryContact {
    event ContractCreated(address newContract, uint256 timestamp);

    StudentNestedContract[] public deployedContracts;

    function createContract() public {
        StudentNestedContract newContract = new StudentNestedContract();
        deployedContracts.push(newContract);
        emit ContractCreated(address(newContract), block.timestamp);
    }

    function getDeployedContracts() public view returns (StudentNestedContract[] memory) {
        return deployedContracts;
    }
}