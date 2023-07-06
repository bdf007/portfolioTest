import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";

function User() {
  const [listOfUsers, setListOfUsers] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_API_URL}/api/user/getUsers`)
      .then((response) => {
        setListOfUsers(response.data);
      });
  }, []);

  const addUser = () => {
    axios
      .post(`${process.env.REACT_APP_API_URL}/api/user/addUser`, {
        name: name,
        age: age,
        username: username,
      })
      .then((response) => {
        alert("User added successfully");
        console.log("user added successfully");
        setListOfUsers([
          ...listOfUsers,
          { _id: response.data._id, name: name, age: age, username: username },
        ]);
        // reset the value
        setName("");
        setAge(0);
        setUsername("");
        // clear the input field
        document.getElementById("name").value = "";
        document.getElementById("age").value = "";
        document.getElementById("username").value = "";
      });
  };

  const deleteUser = (id) => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/api/user/deleteUser/${id}`)
      .then((response) => {
        alert("User deleted successfully");
        console.log("user deleted successfully");
        setListOfUsers(
          listOfUsers.filter((val) => {
            return val._id !== id;
          })
        );
      });
  };

  return (
    <div>
      <h1>user</h1>
      <div className="usersDisplay">
        {listOfUsers.map((user) => {
          return (
            <div className="user">
              <div className="userInfo">
                <h1 className="userName">Name : {user.name}</h1>
                <h2 className="userAge">Age : {user.age}</h2>
              </div>
              <h2 className="userUsername">Username : {user.username}</h2>
              <button
                className="deleteButton"
                onClick={() => {
                  deleteUser(user._id);
                }}
              >
                Delete
              </button>
            </div>
          );
        })}
      </div>
      <div>
        <input
          type="text"
          id="name"
          placeholder="Name..."
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <input
          type="number"
          id="age"
          placeholder="Age..."
          onChange={(e) => {
            setAge(e.target.value);
          }}
        />
        <input
          type="text"
          id="username"
          placeholder="Username..."
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={addUser}>Add User</button>
      </div>
    </div>
  );
}

export default User;
