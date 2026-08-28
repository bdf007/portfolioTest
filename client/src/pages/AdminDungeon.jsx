import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../context/UserContext";
import { HERO_SPRITES } from "../component/dungeon/images";
import "../App.css";

const API = process.env.REACT_APP_API_URL;

const ROLES = ["user", "gamer", "admin", "betatester"];

// Terminée = mort OU abandon, regroupées dans un seul filtre — la distinction
// entre les deux n'a pas d'importance pour repérer ce qui est nettoyable.
const STATUS_FILTERS = [
  { value: "all", label: "Tous les statuts" },
  { value: "in_progress", label: "En cours" },
  { value: "finished", label: "Terminées" },
];

const matchesStatusFilter = (game, filter) => {
  if (filter === "all") return true;
  if (filter === "finished") {
    return (
      game.status === "victory" ||
      game.status === "defeat" ||
      game.status === "abandoned"
    );
  }
  return game.status === filter;
};

// Format compact (29/07 14:32) plutôt que la date longue complète — gagne de
// la place dans un tableau déjà chargé en colonnes.
const formatCompactDate = (isoDate) => {
  const d = new Date(isoDate);
  const day = d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${time}`;
};

const AdminDungeon = () => {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [games, setGames] = useState(null);
  const [error, setError] = useState(null);
  const [usernameFilter, setUsernameFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  const getUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/users`);
      setUsers(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  const getGames = async () => {
    try {
      const res = await axios.get(`${API}/api/dungeon/admin/games`);
      setGames(res.data.games);
    } catch (err) {
      console.log(err);
      setError("Impossible de charger les parties.");
    }
  };

  const updateRole = async (id, role) => {
    try {
      await axios.put(`${API}/api/user/${id}/role`, { role });
      getUsers();
    } catch (err) {
      console.log(err);
      setError("Erreur lors du changement de rôle.");
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`${API}/api/user/${id}`);
      getUsers();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteGame = async (id) => {
    try {
      await axios.delete(`${API}/api/dungeon/admin/games/${id}`);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      console.log(err);
      setError("Erreur lors de la suppression de la partie.");
    }
  };

  useEffect(() => {
    if (user && user.role === "admin") {
      getUsers();
      getGames();
    }
  }, [user]);

  const uniqueUsernames = games
    ? [...new Set(games.map((g) => g.username))].sort()
    : [];
  const uniqueDifficulties = games
    ? [...new Set(games.map((g) => g.difficulty))].sort()
    : [];

  // Rang GLOBAL de chaque partie au sein de SA difficulté (classement général,
  // toutes parties confondues), et rang PERSONNEL (au sein des seules parties
  // de ce joueur, dans cette difficulté) — les deux peuvent diverger : #20 au
  // général n'empêche pas d'être #2 sur son propre classement.
  const globalRanks = {};
  const personalRanks = {};
  if (games) {
    const byDifficulty = {};
    const byUserDifficulty = {};

    games.forEach((g) => {
      if (g.status === "in_progress") return;
      if (!byDifficulty[g.difficulty]) byDifficulty[g.difficulty] = [];
      byDifficulty[g.difficulty].push(g);

      const key = `${g.username}|${g.difficulty}`;
      if (!byUserDifficulty[key]) byUserDifficulty[key] = [];
      byUserDifficulty[key].push(g);
    });

    Object.values(byDifficulty).forEach((list) => {
      list.sort(
        (a, b) =>
          b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt),
      );
      list.forEach((g, i) => {
        globalRanks[g.id] = i + 1;
      });
    });

    Object.values(byUserDifficulty).forEach((list) => {
      list.sort(
        (a, b) =>
          b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt),
      );
      list.forEach((g, i) => {
        personalRanks[g.id] = i + 1;
      });
    });
  }

  const filteredGames = games
    ? games.filter(
        (g) =>
          (usernameFilter === "all" || g.username === usernameFilter) &&
          matchesStatusFilter(g, statusFilter) &&
          (difficultyFilter === "all" || g.difficulty === difficultyFilter) &&
          (modeFilter === "all" || (g.mode || "normal") === modeFilter),
      )
    : [];

  // En cours d'abord (pas encore de rang), puis par rang global croissant —
  // regroupe naturellement les parties "jamais visibles sur aucun classement
  // général" ensemble.
  const sortedFilteredGames = [...filteredGames].sort((a, b) => {
    const aInProgress = a.status === "in_progress";
    const bInProgress = b.status === "in_progress";
    if (aInProgress && !bInProgress) return -1;
    if (!aInProgress && bInProgress) return 1;
    if (aInProgress && bInProgress) return 0;
    return (globalRanks[a.id] ?? Infinity) - (globalRanks[b.id] ?? Infinity);
  });

  // Invisible pour de bon sur les DEUX classements (général ET personnel du
  // joueur) — sinon la partie reste consultable par le joueur lui-même même
  // si elle a disparu du classement général.
  const gamesWithRanks = sortedFilteredGames.map((g) => {
    const rank = globalRanks[g.id];
    const personalRank = personalRanks[g.id];
    const neverOnLeaderboard =
      (!rank || rank > 10) && (!personalRank || personalRank > 10);
    return { ...g, rank, personalRank, neverOnLeaderboard };
  });

  return (
    <div className="admin-page">
      {!user || user.role !== "admin" ? (
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

          {error && <p style={{ color: "var(--text-lightRed)" }}>{error}</p>}

          {/* -------------------- Utilisateurs -------------------- */}
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
                    <p className="entry-meta">{u.email}</p>
                    <div
                      className="entry-actions"
                      style={{ alignItems: "center" }}
                    >
                      <select
                        className="field-input"
                        style={{ width: "auto", marginBottom: 0 }}
                        value={u.role}
                        onChange={(e) => updateRole(u._id, e.target.value)}
                        disabled={u.username === user.username} // on ne se rétrograde pas soi-même par erreur
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
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

          {/* -------------------- Parties du donjon -------------------- */}
          <div className="uploader">
            <h2 className="page-title">
              Parties (toutes difficultés, tous statuts)
            </h2>
            <div className="panel">
              {games === null && (
                <p className="entry-description">Chargement...</p>
              )}

              {games && (
                <>
                  <div
                    className="entry-actions"
                    style={{ marginBottom: "1rem", flexWrap: "wrap" }}
                  >
                    <select
                      className="field-input"
                      style={{ width: "auto", marginBottom: 0 }}
                      value={usernameFilter}
                      onChange={(e) => setUsernameFilter(e.target.value)}
                    >
                      <option value="all">Tous les joueurs</option>
                      {uniqueUsernames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="field-input"
                      style={{ width: "auto", marginBottom: 0 }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      {STATUS_FILTERS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className="field-input"
                      style={{ width: "auto", marginBottom: 0 }}
                      value={difficultyFilter}
                      onChange={(e) => setDifficultyFilter(e.target.value)}
                    >
                      <option value="all">Toutes difficultés</option>
                      {uniqueDifficulties.map((diff) => (
                        <option key={diff} value={diff}>
                          {diff}
                        </option>
                      ))}
                    </select>

                    <select
                      className="field-input"
                      style={{ width: "auto", marginBottom: 0 }}
                      value={modeFilter}
                      onChange={(e) => setModeFilter(e.target.value)}
                    >
                      <option value="all">Tous modes</option>
                      <option value="normal">Normal</option>
                      <option value="aventure">Aventure</option>
                    </select>
                  </div>

                  <div className="admin-games-table-wrapper">
                    <table className="admin-games-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>#perso</th>
                          <th>Joueur</th>
                          <th>Diff.</th>
                          <th>Mode</th>
                          <th>Statut</th>
                          <th>Score</th>
                          <th>Activité</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {gamesWithRanks.map((g) => (
                          <tr
                            key={g.id}
                            style={
                              g.neverOnLeaderboard
                                ? { opacity: 0.55 }
                                : undefined
                            }
                          >
                            <td>{g.rank ? `#${g.rank}` : "-"}</td>
                            <td>
                              {g.personalRank ? `#${g.personalRank}` : "-"}
                            </td>
                            <td>
                              <div className="admin-player-cell">
                                <img
                                  src={
                                    HERO_SPRITES[g.spriteId] || HERO_SPRITES[1]
                                  }
                                  alt=""
                                  className="admin-game-sprite"
                                />
                                {g.username}
                              </div>
                            </td>
                            <td>{g.difficulty}</td>
                            <td>
                              {g.mode === "aventure" ? "Aventure" : "Classique"}
                            </td>
                            <td>{g.status}</td>
                            <td>{g.score}</td>
                            <td>{formatCompactDate(g.updatedAt)}</td>
                            <td>
                              <button
                                className="admin-delete-x"
                                onClick={() => deleteGame(g.id)}
                                title="Supprimer cette partie"
                                aria-label="Supprimer cette partie"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                        {gamesWithRanks.length === 0 && (
                          <tr>
                            <td colSpan={8}>
                              Aucune partie ne correspond à ces filtres.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Vue mobile — cartes plutôt que scroll horizontal */}
                  <ul className="admin-games-cards">
                    {gamesWithRanks.map((g) => (
                      <li
                        key={g.id}
                        className="admin-game-card"
                        style={
                          g.neverOnLeaderboard ? { opacity: 0.55 } : undefined
                        }
                      >
                        <div className="admin-game-card-top">
                          <img
                            src={HERO_SPRITES[g.spriteId] || HERO_SPRITES[1]}
                            alt=""
                            className="admin-game-sprite"
                          />
                          <span className="admin-game-card-username">
                            {g.username}
                          </span>
                          <button
                            className="admin-delete-x"
                            onClick={() => deleteGame(g.id)}
                            title="Supprimer cette partie"
                            aria-label="Supprimer cette partie"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="admin-game-card-body">
                          <span>{g.difficulty}</span>
                          <span>
                            {g.mode === "aventure" ? "Aventure" : "Classique"}
                          </span>
                          <span>{g.status}</span>
                          <span>Score {g.score}</span>
                          <span>Général {g.rank ? `#${g.rank}` : "-"}</span>
                          <span>
                            Perso {g.personalRank ? `#${g.personalRank}` : "-"}
                          </span>
                          <span>{formatCompactDate(g.updatedAt)}</span>
                        </div>
                      </li>
                    ))}
                    {gamesWithRanks.length === 0 && (
                      <li className="entry-description">
                        Aucune partie ne correspond à ces filtres.
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDungeon;
