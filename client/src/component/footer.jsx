import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Footer = () => {
  return (
    <footer className="footer-bs bg-primary ">
      <div className="row ">
        <div className="footer-brand float-right ">
          <ul className="ms-auto list-inline d-flex justify-content-between">
            <li className="nav-item list-inline-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/About">
                About
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Education">
                Education
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Experience">
                Experience
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Project">
                Project
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Contact">
                Contact
              </Link>
            </li>
          </ul>
          <p>© 2045 Bootstrap, All rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
