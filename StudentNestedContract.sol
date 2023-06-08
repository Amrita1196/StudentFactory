// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

enum Status{
    pass,
    fail
}
 struct studentRequirement{
    uint rollNo;
    string class;
    uint fees;

}
struct studentDetails{
    uint id;
    string name;
    uint marks;
    Status status;

    studentRequirement std_req;

}

contract StudentNestedContract{
    studentDetails[] public student_Details;

    mapping (uint=>studentDetails) studentsInfo;
     
     event student_details(uint rollNo,string class,uint fees,uint id, string name, uint marks, Status status);

     function addStudentDetails(uint _rollNo,string memory _class,uint _fees,uint _id, string memory _name, uint _marks, Status _status)public {
             
             studentRequirement memory stdreq;
             stdreq.rollNo=_rollNo;
             stdreq.class=_class;
             stdreq.fees=_fees;

             studentDetails memory std;
             std.id=_id;
             std.name=_name;
             std.marks=_marks;
             std.status=_status;

             std.std_req=stdreq;

             student_Details.push(std);

             studentsInfo[_id]=std;


             emit student_details(_rollNo,_class,_fees,_id,_name,_marks,_status);
     }


     function getAllStudentsDetails()public  view returns (studentDetails [] memory studentList){
         return student_Details;
     }

     function getAllStudentsDetailsById(uint _Id)public  view returns (studentDetails  memory  studentInfo){
         for(uint i=0;i<student_Details.length;i++){
             if(student_Details[i].id == _Id){

                 return  student_Details[i];

             }
         }
     }

     function getStudentsFromMap(uint _id) public view returns (studentDetails memory studentInfo){
         return studentsInfo[_id];
     }


}