import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";
import "../App.css";

const FOOTER_LINKS = [
  { to: "/", label: "Home" },
  { to: "/About", label: "À propos" },
  { to: "/Education", label: "Éducation" },
  { to: "/Experience", label: "Expérience" },
  { to: "/Project", label: "Projets" },
  { to: "/Contact", label: "Contact" },
];

const Footer = () => {
  const { user } = useContext(UserContext);
  const isGamer = user?.role === "gamer";

  const visibleLinks = isGamer
    ? FOOTER_LINKS.filter((link) => link.to === "/Contact")
    : FOOTER_LINKS;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="footer-bs">
      <nav className="footer-nav" aria-label="Navigation du pied de page">
        {visibleLinks.map((link) => (
          <Link
            key={link.to}
            className="footer-link"
            to={link.to}
            onClick={scrollToTop}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="footer-text">
        site réalisé avec MongoDB, Express, React, NodeJS
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
