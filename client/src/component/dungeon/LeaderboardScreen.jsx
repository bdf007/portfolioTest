import React, { useEffect, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL;

const DIFFICULTIES = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
  { key: "epique", label: "Épique" },
];

const LeaderboardScreen = ({ onBack }) => {
  const [difficulty, setDifficulty] = useState("facile");
  const [scope, setScope] = useState("global"); // "global" | "mine"
  const [leaderboard, setLeaderboard] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLeaderboard(null);
    setError(null);

    axios
      .post(`${API}/api/dungeon/leaderboard`, { difficulty, scope })
      .then((res) => setLeaderboard(res.data.leaderboard))
      .catch((err) => {
        console.error(err);
        setError("Impossible de charger le classement.");
      });
  }, [difficulty, scope]);

  return (
    <div className="leaderboard-screen">
      <h2>🏆 Classement</h2>
      <button onClick={onBack}>← Retour</button>

      <div className="leaderboard-scope-toggle">
        <button
          onClick={() => setScope("global")}
          className={scope === "global" ? "active-tab" : ""}
          disabled={scope === "global"}
        >
          Classement général (top 10)
        </button>
        <button
          onClick={() => setScope("mine")}
          className={scope === "mine" ? "active-tab" : ""}
          disabled={scope === "mine"}
        >
          Mon classement
        </button>
      </div>

      <div className="leaderboard-tabs">
        {DIFFICULTIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setDifficulty(key)}
            className={difficulty === key ? "active-tab" : ""}
            disabled={difficulty === key}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {!leaderboard && !error && <p>Chargement...</p>}

      {leaderboard && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Joueur</th>
              <th>Score</th>
              <th>Étage atteint</th>
              <th>Fin de partie</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{entry.username}</td>
                <td>{entry.score}</td>
                <td>{entry.floor}</td>
                <td>
                  {entry.status === "abandoned" ? "🏳️ Forfait" : "💀 Mort"}
                </td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5}>
                  Aucun score enregistré pour cette difficulté.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LeaderboardScreen;
