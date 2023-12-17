import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import Home from "./Home";

const Admin = () => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);

  //get all users
  const getUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // delete user
  const deleteUser = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/user/${id}`);
      getUsers();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user.role === "admin") {
      getUsers();
    }
  }, [user.role]);

  return !user ? (
    <div className="container text-center home" style={{ marginTop: "5rem" }}>
      <div className="alert alert-primary p-5">
        <h1>Not autorized</h1>
      </div>
    </div>
  ) : (
    <div className="container text-center home" style={{ marginTop: "5rem" }}>
      <div className="alert alert-primary p-5">
        <h1>
          {" "}
          <span className="text-success">{user.username}'s</span>{" "}
          <span className="text-danger">{user.role}</span> Page
        </h1>
      </div>
      <div>
        {user && user.role === "admin" && (
          <>
            <h1 className="text-primary">Users</h1>
            <div className="row">
              {users.map((user) => (
                <div className="col-md-3" key={user._id}>
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">{user.username}</h5>
                      <p className="card-text">{user.email}</p>
                      <p className="card-text">{user.role}</p>
                      <button
                        className="btn btn-danger"
                        onClick={() => deleteUser(user._id)}
                        disabled={user.role === "admin"}
                      >
                        Supprimer l'utilisateur
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <Home />;
    </div>
  );
};

export default Admin;
