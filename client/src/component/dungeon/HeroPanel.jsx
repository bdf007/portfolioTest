import React from "react";

const HeroPanel = ({
  hero,
  heroReady,
  heroConfirmed,
  gameState,
  onCreateHero,
  onRerollHero,
  onConfirmHero,
}) => {
  const { rerollsRemaining } = gameState;

  return (
    <div className="hero-info">
      <h3>Création du héros</h3>

      {!heroReady ? (
        <>
          <p>Essais de dés restants : {rerollsRemaining}</p>
          <button onClick={onCreateHero} disabled={rerollsRemaining <= 0}>
            Créer mon héros (lancer les dés)
          </button>
        </>
      ) : (
        <>
          <p className="hero-roll-result">
            PV — Tête : {hero.bodyParts?.tete ?? 0} · Torse :{" "}
            {hero.bodyParts?.torse ?? 0} · Jambes :{" "}
            {hero.bodyParts?.jambes ?? 0}
          </p>
          <p className="hero-roll-result">PC (arme) : {hero.weaponDie}</p>

          {!heroConfirmed && (
            <div className="hero-confirm-actions">
              <p>Essais de dés restants : {rerollsRemaining}</p>
              <button onClick={onRerollHero} disabled={rerollsRemaining <= 0}>
                🎲 Relancer les dés
              </button>
              <button onClick={onConfirmHero}>
                {rerollsRemaining <= 0
                  ? "🚪 Entrer dans le donjon"
                  : "✅ Garder ce héros"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HeroPanel;
