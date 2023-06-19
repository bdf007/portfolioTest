// import "./App.css";
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Redirect,
} from "react-router-dom";
import User from "./component/user";
import NavBarre from "./component/navBarre";
import ImageUploader from "./component/imageUploader";

// components
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";

function App() {
  return (
    <div>
      <Router>
        <NavBarre />
        <Routes>
          <Route exact path="/" element={<Home />} />
          <Route exact path="/signup" element={<Signup />} />
          <Route exact path="/login" element={<Login />} />
        </Routes>
      </Router>
      {/* <User /> */}
      {/* <ImageUploader /> */}
      {/* <h1>Autheniticate with MERN</h1> */}
    </div>
  );
}

export default App;
