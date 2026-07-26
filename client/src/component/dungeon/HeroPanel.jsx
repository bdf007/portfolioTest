import React from "react";

const HeroPanel = ({
  hero,
  heroReady,
  heroConfirmed,
  gameState,
  difficulty,
  onCreateHero,
  onRerollHero,
  onConfirmHero,
}) => {
  const { rerollsRemaining, floor, keyFound } = gameState;

  return (
    <div className="hero-info">
      <h3>Héros — Étage {floor}</h3>
      <p>Difficulté : {difficulty}</p>
      <p>Or : {hero.gold} PO</p>
      {keyFound && <p className="key-owned-indicator">🗝️ Vous portez la clé du donjon !</p>}

      {!heroReady ? (
        <>
          <p>Essais de dés restants : {rerollsRemaining}</p>
          <button onClick={onCreateHero} disabled={rerollsRemaining <= 0}>
            Créer mon héros (lancer les dés)
          </button>
        </>
      ) : (
        !heroConfirmed && (
          <div className="hero-confirm-actions">
            <p>Essais de dés restants : {rerollsRemaining}</p>
            <button onClick={onRerollHero} disabled={rerollsRemaining <= 0}>
              🎲 Relancer les dés
            </button>
            <button onClick={onConfirmHero}>
              {rerollsRemaining <= 0 ? "🚪 Entrer dans le donjon" : "✅ Garder ce héros"}
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default HeroPanel;
