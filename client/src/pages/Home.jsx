import React, { useContext } from "react";
import { UserContext } from "../context/UserContext";

const Home = () => {
  const { user } = useContext(UserContext);
  return (
    <>
      <div>
        {user ? (
          <div>
            <h1>{user && <span>{user}'s</span>} Home</h1>
          </div>
        ) : (
          <h1>Welcome to my portfolio</h1>
        )}
      </div>
    </>
  );
};

export default Home;
