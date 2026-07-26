import React from "react";

const HeroStatsBar = ({ hero, gameState }) => {
  const { livesRemaining, score, turnCount, keyFound } = gameState;
  const { tete = 0, torse = 0, jambes = 0 } = hero.bodyParts || {};

  return (
    <div className="hero-stats-bar">
      <span>❤️ {livesRemaining}</span>
      <span className="hero-stats-sep">·</span>
      <span>
        PV {tete}-{torse}-{jambes}
      </span>
      <span className="hero-stats-sep">·</span>
      <span>PC {hero.weaponDie}</span>
      <span className="hero-stats-sep">·</span>
      <span>💰 {hero.gold}</span>
      <span className="hero-stats-sep">·</span>
      <span>🏆 {score}</span>
      <span className="hero-stats-sep">·</span>
      <span>⏱️ {turnCount}</span>
      <span className="hero-stats-sep">·</span>
      <span title={keyFound ? "Clé en poche" : "Pas de clé"}>
        🗝️ {keyFound ? "✅" : "❌"}
      </span>
    </div>
  );
};

export default HeroStatsBar;
