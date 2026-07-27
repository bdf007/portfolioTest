import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { UserContext } from "./context/UserContext";
import { ToastContainer } from "react-toastify";
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
import DungeonPage from "./pages/Dungeon";
import Footer from "./component/footer";

// API functions
import { getUser } from "./api/user";

import axios from "axios";

axios.defaults.withCredentials = true;

function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    getUser()
      .then((res) => {
        if (res.error) {
          // "Pas connecté" est l'état normal pour un visiteur anonyme —
          setUser(null);
        } else {
          setUser({ username: res.username, role: res.role });
        }
      })
      .catch((err) => {
        // Ici, une vraie erreur technique (réseau, serveur injoignable...)
        console.error(err);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Tant que l'appel getUser() n'a pas répondu, on ne rend aucune route.
  // Sans ça, "user" vaut encore null au premier rendu et la route "*"
  // redirige immédiatement vers "/" avant même d'avoir la vraie réponse
  // (particulièrement visible sur un rechargement de page type /Dungeon).
  if (!authChecked) {
    return <div className="app-loading">Chargement...</div>;
  }

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
              {user && <Route path="/Dungeon" element={<DungeonPage />} />}

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
