import React from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Footer = () => {
  return (
    <footer className="footer-bs">
      <nav className="footer-nav" aria-label="Navigation du pied de page">
        <Link className="footer-link" to="/">
          Home
        </Link>
        <Link className="footer-link" to="/About">
          À propos
        </Link>
        <Link className="footer-link" to="/Education">
          Éducation
        </Link>
        <Link className="footer-link" to="/Experience">
          Expérience
        </Link>
        <Link className="footer-link" to="/Project">
          Projets
        </Link>
        <Link className="footer-link" to="/Contact">
          Contact
        </Link>
      </nav>

      <p className="footer-text">
        <Link to="/Login" className="footer-inline-link">
          site
        </Link>{" "}
        réalisé avec MongoDB, Express, React, NodeJS
      </p>

      <p className="footer-social">
        <a
          className="footer-link-subtle"
          href="https://github.com/bdf007"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <span aria-hidden="true"> · </span>
        <a
          className="footer-link-subtle"
          href="https://www.linkedin.com/in/christophe-midelet-73626393/"
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
      </p>

      <p className="footer-copyright">© 2026, All rights reserved</p>
    </footer>
  );
};

export default Footer;
