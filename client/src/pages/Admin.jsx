import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import Home from "./Home";
import "../App.css";

const Admin = () => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);

  const getUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`${process.env.REACT_APP_API_URL}/api/user/${id}`);
      getUsers();
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      getUsers();
    }
  }, [user]);

  return (
    <div className="admin-page">
      {!user ? (
        <div className="admin-panel">
          <h1 className="admin-panel-title">Accès non autorisé</h1>
        </div>
      ) : (
        <>
          <div className="admin-panel">
            <h1 className="page-title">
              <span className="admin-username">{user.username}</span>{" "}
              <span className="admin-role-badge">{user.role}</span>
            </h1>
          </div>

          {user.role === "admin" && (
            <div className="uploader">
              <h2 className="page-title">Utilisateurs</h2>
              <div className="terminal">
                <div className="terminal-bar">
                  <span className="dot dot-red" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                  <span className="terminal-title">users.log</span>
                </div>
                <div className="terminal-body">
                  {users.length === 0 && (
                    <p className="entry-description">Aucun utilisateur.</p>
                  )}
                  {users.map((u) => (
                    <div className="entry" key={u._id}>
                      <h3 className="entry-title"># {u.username}</h3>
                      <p className="entry-meta">
                        {u.email} — {u.role}
                      </p>
                      <div className="entry-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() => deleteUser(u._id)}
                          disabled={u.role === "admin"}
                        >
                          Supprimer l'utilisateur
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <Home />
    </div>
  );
};

export default Admin;
