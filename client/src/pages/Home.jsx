import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";

const Home = () => {
  const { user } = useContext(UserContext);
  return (
    <div className="container text-center" style={{ marginTop: "12rem" }}>
      <div className="alert alert-primary p-5">
        <h1>{user && <span className="text-success">{user}'s</span>} Home</h1>
      </div>
      <h1>Autheniticate with MERN</h1>
    </div>
  );
};

export default Home;
