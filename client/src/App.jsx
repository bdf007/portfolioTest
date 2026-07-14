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
import "./App.css";

// components
import NavBarre from "./component/navBarre";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Education from "./pages/Education";
import Experience from "./pages/Experience";
import Project from "./pages/Project";
import Contact from "./pages/Contact";
import Ludotheque from "./pages/Ludotheque";
import Footer from "./component/footer";

// API functions
import { getUser } from "./api/user";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUser()
      .then((res) => {
        if (res.error) toast(res.error);
        else setUser({ username: res.username, role: res.role });
      })
      .catch((err) => toast(err));
  }, []);

  return (
    <Router>
      <UserContext.Provider value={{ user, setUser }}>
        <div className="App">
          <ToastContainer />
          <NavBarre />

          <main className="app-main">
            <Routes>
              <Route path="/" element={user ? <Admin /> : <Home />} />
              <Route path="/About" element={<About />} />
              <Route path="/Education" element={<Education />} />
              <Route path="/Experience" element={<Experience />} />
              <Route path="/Project" element={<Project />} />
              <Route path="/Contact" element={<Contact />} />
              <Route path="/Ludotheque" element={<Ludotheque />} />

              {!user && (
                <>
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/login" element={<Login />} />
                </>
              )}

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </UserContext.Provider>
    </Router>
  );
}

export default App;
