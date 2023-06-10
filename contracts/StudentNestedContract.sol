// SPDX-License-Identifier: MIT
pragma solidity >=0.5.8 <0.9.0;

contract StudentNestedContract {
    enum Status {
        pass,
        fail
    }
    struct StudentRequirement {
        uint rollNo;
        string class;
        uint fees;
    }
    struct StudentDetails {
        uint id;
        string name;
        uint marks;
        Status status;
        StudentRequirement stdReq;
    }

    StudentDetails[] public studentDetails;

    mapping(uint => StudentDetails) private studentsInfo;

    event StudentAdded(
        uint rollNo,
        string class,
        uint fees,
        uint id,
        string name,
        uint marks,
        Status status
    );

    function addStudentDetails(
        uint _rollNo,
        string memory _class,
        uint _fees,
        uint _id,
        string memory _name,
        uint _marks,
        Status _status
    ) public {
        StudentRequirement memory stdreq;
        stdreq.rollNo = _rollNo;
        stdreq.class = _class;
        stdreq.fees = _fees;

        StudentDetails memory std;
        std.id = _id;
        std.name = _name;
        std.marks = _marks;
        std.status = _status;

        std.stdReq = stdreq;

        studentDetails.push(std);

        studentsInfo[_id] = std;
        emit StudentAdded(_rollNo, _class, _fees, _id, _name, _marks, _status);
    }

    function getAllStudentsDetails()
        public
        view
        returns (StudentDetails[] memory studentList)
    {
        return studentDetails;
    }

    function getAllStudentsDetailsById(
        uint _id
    ) public view returns (StudentDetails memory studentInfo) {
        for (uint i = 0; i < studentDetails.length; i++) {
            if (studentDetails[i].id == _id) {
                return studentDetails[i];
            }
        }
    }

    function getStudentsFromMap(
        uint _id
    ) public view returns (StudentDetails memory studentInfo) {
        return studentsInfo[_id];
    }
}
