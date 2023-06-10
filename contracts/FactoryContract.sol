// SPDX-License-Identifier: MIT
pragma solidity >=0.5.8 <0.9.0;
import { StudentNestedContract } from "./StudentNestedContract.sol";

contract FactoryContract {
    event ContractCreated(address newContract, uint256 timestamp);

    address[] public deployedContracts;

    function createContract() public {
        StudentNestedContract newContract = new StudentNestedContract();
        deployedContracts.push(address(newContract));
        emit ContractCreated(address(newContract), block.timestamp);
    }

    function getDeployedContracts() public view returns (address[] memory contracts) {
        return deployedContracts;
    }

	function addStudentToContract(uint _offset, uint _rollNo, string memory _class, uint _fees, uint _id, string memory _name, uint _marks, bool _status) public {
		StudentNestedContract(deployedContracts[_offset]).addStudentDetails(_rollNo, _class, _fees, _id, _name, _marks, _status ? StudentNestedContract.Status.pass : StudentNestedContract.Status.fail);
	}

	function getStudents(uint _offset) public view returns (StudentNestedContract.StudentDetails[] memory students) {
		return StudentNestedContract(deployedContracts[_offset]).getAllStudentsDetails();
	}
}