import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { UserContext } from "../context/UserContext";

// API functions
import { logout } from "../api/user";

const NavBarre = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const handleLogout = async (e) => {
    e.preventDefault();
    logout()
      .then((res) => {
        toast.success(res.message);
        // set user to null
        setUser(null);
        // redirect to login page
        navigate("/login");
      })
      .catch((err) => console.log(err));
  };
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-black">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          Christophe Midelet
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {!user ? (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/About">
                    A propos
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Education">
                    Education
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Experience">
                    Expérience
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Project">
                    Projet
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Contact">
                    Contact
                  </Link>
                </li>

                {/* <li className="nav-item">
                  <Link className="nav-link" to="/signup">
                    Sign Up
                  </Link>
                </li> */}
                {/* <li className="nav-item">
                  <Link className="nav-link" to="/login">
                    Login
                  </Link>
                </li> */}
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/About">
                    About
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Education">
                    Education
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Experience">
                    Experience
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Project">
                    Project
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/Contact">
                    Contact
                  </Link>
                </li>
                <li className="nav-item">
                  <span
                    className="nav-link"
                    style={{ cursor: "pointer" }}
                    onClick={handleLogout}
                  >
                    Logout
                  </span>
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
