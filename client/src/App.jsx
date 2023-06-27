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
import NavBarre from "./component/navBarre";

// css
import "./App.css";

// components
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Education from "./pages/Education";
import Experience from "./pages/Experience";
import Project from "./pages/Project";
import Contact from "./pages/Contact";
import Comment from "./pages/Comment";
import Footer from "./component/footer";

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
    <div className="bg-info">
      <Router>
        <UserContext.Provider value={{ user, setUser }}>
          <ToastContainer />
          <NavBarre />
          <Routes>
            {!user ? (
              <>
                <Route exact path="/" element={<Home />} />
                <Route exact path="/About" element={<About />} />
                <Route exact path="/Education" element={<Education />} />
                <Route exact path="/Experience" element={<Experience />} />
                <Route exact path="/Project" element={<Project />} />
                <Route exact path="/Contact" element={<Contact />} />
                <Route exact path="/signup" element={<Signup />} />
                <Route exact path="/login" element={<Login />} />{" "}
                <Route exact path="/comment" element={<Comment />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route exact path="/" element={<Admin />} />
                <Route exact path="/About" element={<About />} />
                <Route exact path="/Education" element={<Education />} />
                <Route exact path="/Experience" element={<Experience />} />
                <Route exact path="/Project" element={<Project />} />
                <Route exact path="/comment" element={<Comment />} />
                <Route exact path="/Contact" element={<Contact />} />

                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </UserContext.Provider>
        <Footer />
      </Router>
    </div>
  );
}

export default App;
