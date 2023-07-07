import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";

const Admin = () => {
  const { user } = useContext(UserContext);
  return !user ? (
    <div className="container text-center home" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>Not autorized</h1>
      </div>
    </div>
  ) : (
    <div className="container text-center home" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>
          {" "}
          <span className="text-success">{user}'s</span> Admin
        </h1>
      </div>
    </div>
  );
};

export default Admin;
