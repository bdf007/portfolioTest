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
  const isGamer = user?.role === "gamer";

  // Un gamer n'a accès qu'à Contact parmi les liens "vitrine" du portfolio
  const visibleNavLinks = isGamer
    ? NAV_LINKS.filter((link) => link.to === "/Contact")
    : NAV_LINKS;

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
          to={isGamer ? "/Dungeon" : "/"}
          onClick={() => setIsOpen(false)}
        >
          {isGamer || user?.role === "betatester" ? (
            "Skip the Dungeon"
          ) : (
            <>
              <span className="app-navbar-prompt">~$</span> Christophe Midelet
            </>
          )}
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
            {visibleNavLinks.map((link) => (
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
              <>
                {!isGamer && user.role !== "user" && (
                  <li className="nav-item">
                    <NavLink
                      className="nav-link app-nav-link"
                      to="/Dungeon"
                      onClick={() => setIsOpen(false)}
                    >
                      Dungeon
                    </NavLink>
                  </li>
                )}
                {user.role === "admin" && (
                  <>
                    <li className="nav-item">
                      <NavLink
                        className="nav-link app-nav-link"
                        to="/AdminDungeon"
                        onClick={() => setIsOpen(false)}
                      >
                        Admin Donjon
                      </NavLink>
                    </li>
                  </>
                )}
                {(user.role === "betatester" || user?.role === "admin") && (
                  <li className="nav-item">
                    <NavLink
                      className="nav-link app-nav-link"
                      to="/Arpg"
                      onClick={() => setIsOpen(false)}
                    >
                      ARPG
                    </NavLink>
                  </li>
                )}
                <li className="nav-item">
                  <span
                    className="nav-link app-nav-link app-nav-logout"
                    style={{ cursor: "pointer" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </span>
                </li>
              </>
            )}
            {!user && (
              <>
                <li className="nav-item">
                  <Link
                    className="nav-link app-nav-link"
                    to="/signup"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign Up
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className="nav-link app-nav-link"
                    to="/login"
                    onClick={() => setIsOpen(false)}
                  >
                    Login
                  </Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default NavBarre;
