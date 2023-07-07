import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Footer = () => {
  return (
    <footer className="footer-bs bg-primary ">
      <div className="row pe-0 ps-0 me-0 ms-0">
        <div className="footer-brand ">
          <ul className="ms-auto list-inline d-flex justify-content-around">
            <li className="nav-item list-inline-item">
              <Link className="nav-link" to="/">
                Home
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/About">
                A propos
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Education">
                Education
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Experience">
                Expérience
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Project">
                Projet
              </Link>
            </li>
            <li className="list-inline-item">
              <Link className="nav-link" to="/Contact">
                Contact
              </Link>
            </li>
          </ul>
          <p className="text-center">
            site réalisé avec MongoDB, Express, React, NodeJS
          </p>

          <p className="text-center">© 2023, All rights reserved</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
