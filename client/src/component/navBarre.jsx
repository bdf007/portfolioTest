import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";

// API functions
import { logout } from "../api/user";

const NAV_LINKS = [
  { to: "/About", label: "À propos" },
  { to: "/Education", label: "Éducation" },
  { to: "/Experience", label: "Expérience" },
  { to: "/Project", label: "Projets" },
  { to: "/Ludotheque", label: "Ludothèque" },
  { to: "/Contact", label: "Contact" },
];

const NavBarre = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async (e) => {
    e.preventDefault();
    logout()
      .then((res) => {
        toast.success(res.message);
        setUser(null);
        setIsOpen(false);
        navigate("/login");
      })
      .catch((err) => console.log(err));
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark app-navbar">
      <div className="container-fluid">
        <Link
          className="navbar-brand app-navbar-brand"
          to="/"
          onClick={() => setIsOpen(false)}
        >
          <span className="app-navbar-prompt">~$</span> Christophe Midelet
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-controls="navbarNav"
          aria-expanded={isOpen}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className={`collapse navbar-collapse ${isOpen ? "show" : ""}`}
          id="navbarNav"
        >
          <ul className="navbar-nav ms-auto">
            {NAV_LINKS.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink
                  className="nav-link app-nav-link"
                  to={link.to}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            {user && (
              <li className="nav-item">
                <span
                  className="nav-link app-nav-link app-nav-logout"
                  style={{ cursor: "pointer" }}
                  onClick={handleLogout}
                >
                  Logout
                </span>
              </li>
            )}

            {/* Réservé pour une future utilisation :
            <li className="nav-item">
              <Link className="nav-link app-nav-link" to="/signup">
                Sign Up
              </Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link app-nav-link" to="/login">
                Login
              </Link>
            </li>
            */}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavBarre;
