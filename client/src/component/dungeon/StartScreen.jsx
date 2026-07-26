import React, { useState } from "react";
import LeaderboardScreen from "./LeaderboardScreen";

const DIFFICULTIES = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
  { key: "epique", label: "Épique" },
];

const StartScreen = ({ activeGames, onResume, onAbandon, onStartNew }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (showLeaderboard) {
    return <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  }

  return (
    <div className="start-screen">
      <button
        onClick={() => setShowLeaderboard(true)}
        className="leaderboard-link"
      >
        🏆 Voir le classement
      </button>

      {activeGames.length > 0 && (
        <div className="saved-games-list">
          <h2>Parties en cours</h2>
          <ul>
            {activeGames.map((game) => (
              <li key={game._id}>
                <span>
                  {game.difficulty} — Étage {game.gameState.floor} — Score{" "}
                  {game.gameState.score} — Or : {game.hero.gold} PO
                </span>
                <button onClick={() => onResume(game)}>Reprendre</button>
                <button onClick={() => onAbandon(game._id)} className="danger">
                  Abandonner
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="new-game-picker">
        <h2>Nouvelle partie</h2>
        <p>Choisissez la difficulté :</p>
        <div className="difficulty-picker">
          {DIFFICULTIES.map(({ key, label }) => (
            <button key={key} onClick={() => onStartNew(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
