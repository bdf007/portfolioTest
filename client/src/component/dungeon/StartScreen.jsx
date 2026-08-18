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

const MODES = [
  { key: "normal", label: "Classique", hint: "Un plateau, une salle unique" },
  {
    key: "aventure",
    label: "Aventure",
    hint: "Donjon en salles reliées par des portes",
  },
];

const StartScreen = ({ activeGames, onResume, onAbandon, onStartNew }) => {
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showPatchNotes, setShowPatchNotes] = useState(false);
  const [selectedMode, setSelectedMode] = useState("normal");

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
                  {game.difficulty}
                  {game.mode === "aventure" ? " (Aventure)" : ""} — Étage{" "}
                  {game.gameState.floor} — Score {game.gameState.score} — Or :{" "}
                  {game.hero.gold} PO
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

        <p>Choisissez le mode :</p>
        <div className="difficulty-picker">
          {MODES.map(({ key, label, hint }) => (
            <button
              key={key}
              onClick={() => setSelectedMode(key)}
              className={selectedMode === key ? "active-tab" : ""}
              title={hint}
            >
              {label}
            </button>
          ))}
        </div>

        <p>Choisissez la difficulté :</p>
        <div className="difficulty-picker">
          {DIFFICULTIES.map(({ key, label }) => (
            <button key={key} onClick={() => onStartNew(key, selectedMode)}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
