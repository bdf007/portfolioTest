// import "./App.css";
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { UserContext } from "./context/UserContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import User from "./component/user";
import NavBarre from "./component/navBarre";
import ImageUploader from "./component/imageUploader";

// components
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";

// API functions
import { getUser } from "./api/user";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = getUser()
      .then((res) => {
        if (res.error) toast(res.error);
        else setUser(res.username);
      })
      .catch((err) => toast(err));

    return () => unsubscribe;
  }, []);
  return (
    <div>
      <Router>
        <UserContext.Provider value={{ user, setUser }}>
          <ToastContainer />
          <NavBarre />
          <Routes>
            {!user ? (
              <>
                <Route exact path="/" element={<Home />} />
                <Route exact path="/signup" element={<Signup />} />
                <Route exact path="/login" element={<Login />} />{" "}
              </>
            ) : (
              <>
                <Route exact path="/" element={<Home />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </UserContext.Provider>
      </Router>
      {/* <User /> */}
      <ImageUploader />
    </div>
  );
}

export default App;
