import React, { useState } from "react";
import LeaderboardScreen from "./LeaderboardScreen";
import RulesScreen from "./RulesScreen";
import PatchNotesScreen from "./PatchNotesScreen";

const DIFFICULTIES = [
  { key: "facile", label: "Facile" },
  { key: "moyen", label: "Moyen" },
  { key: "difficile", label: "Difficile" },
  { key: "epique", label: "Épique" },
];

const StartScreen = ({ activeGames, onResume, onAbandon, onStartNew }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPatchNotes, setShowPatchNotes] = useState(false);

  if (showLeaderboard) {
    return <LeaderboardScreen onBack={() => setShowLeaderboard(false)} />;
  }

  if (showRules) {
    return <RulesScreen onBack={() => setShowRules(false)} />;
  }

  if (showPatchNotes) {
    return <PatchNotesScreen onBack={() => setShowPatchNotes(false)} />;
  }

  return (
    <div className="start-screen">
      <div className="start-screen-top-links">
        <button
          onClick={() => setShowLeaderboard(true)}
          className="leaderboard-link"
        >
          🏆 Voir le classement
        </button>
        <button onClick={() => setShowRules(true)} className="rules-link">
          📜 Voir les règles
        </button>
        <button
          onClick={() => setShowPatchNotes(true)}
          className="patch-notes-link"
        >
          🛠️ Notes de mise à jour
        </button>
      </div>

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
