import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";
import TechnologieUploader from "../component/tecchnologieUploader";

const Admin = () => {
  const { user } = useContext(UserContext);
  return !user ? (
    <div className="container text-center" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>Not autorized</h1>
      </div>
    </div>
  ) : (
    <div className="container text-center" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>
          {" "}
          <span className="text-success">{user}'s</span> Admin
        </h1>
      </div>
      <h1>Autheniticate with MERN</h1>

      <h2>Technologie</h2>
      <TechnologieUploader />
    </div>
  );
};

export default Admin;
