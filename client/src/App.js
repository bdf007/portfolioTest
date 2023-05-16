import "./App.css";
import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [listOfUsers, setListOfUsers] = useState([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    axios.get("http://localhost:5000/getUsers").then((response) => {
      setListOfUsers(response.data);
    });
  }, []);

  const addUser = () => {
    axios
      .post("http://localhost:5000/addUser", {
        name: name,
        age: age,
        username: username,
      })
      .then((response) => {
        alert("User added successfully");
        setListOfUsers([
          ...listOfUsers,
          { _id: response.data._id, name: name, age: age, username: username },
        ]);
      });
  };

  return (
    <div className="App">
      <div className="usersDisplay">
        {listOfUsers.map((user) => {
          return (
            <div className="user">
              <div className="userInfo">
                <h1 className="userName">Name : {user.name}</h1>
                <h2 className="userAge">Age : {user.age}</h2>
              </div>
              <h2 className="userUsername">Username : {user.username}</h2>
            </div>
          );
        })}
      </div>
      <div>
        <input
          type="text"
          placeholder="Name..."
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        <input
          type="number"
          placeholder="Age..."
          onChange={(e) => {
            setAge(e.target.value);
          }}
        />
        <input
          type="text"
          placeholder="Username..."
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={addUser}>Add User</button>
      </div>
    </div>
  );
}

export default App;
