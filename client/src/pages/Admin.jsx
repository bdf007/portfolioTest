import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import Home from "./Home";

const Admin = () => {
  const { user } = useContext(UserContext);
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
      <Home />
    </div>
  );
};

export default Admin;
