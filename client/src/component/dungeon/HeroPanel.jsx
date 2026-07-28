import React from "react";
import { HERO_SPRITES } from "./images";

const HeroPanel = ({
  hero,
  heroReady,
  heroConfirmed,
  gameState,
  onCreateHero,
  onRerollHero,
  onConfirmHero,
  onChooseSprite,
}) => {
  const { rerollsRemaining, usedSpriteIds } = gameState;
  const usedList = (usedSpriteIds || []).length >= 4 ? [] : usedSpriteIds || [];

  return (
    <div className="hero-info">
      <h3>Création du héros</h3>

      <div className="sprite-picker">
        <p className="sprite-picker-label">
          Apparence :{" "}
          {hero.spriteId ? `n°${hero.spriteId} sélectionnée` : "à choisir"}
        </p>
        <div className="sprite-picker-options">
          {[1, 2, 3, 4].map((id) => {
            const isUsed = usedList.includes(id) && hero.spriteId !== id;
            const isSelected = hero.spriteId === id;
            return (
              <button
                key={id}
                className={`sprite-option ${isSelected ? "sprite-option-selected" : ""} ${
                  isUsed ? "sprite-option-used" : ""
                }`}
                onClick={() => !isUsed && onChooseSprite(id)}
                disabled={isUsed}
                title={
                  isUsed
                    ? "Déjà utilisée par une vie précédente"
                    : `Apparence ${id}`
                }
              >
                <img src={HERO_SPRITES[id]} alt={`Apparence ${id}`} />
                {isSelected && <span className="sprite-option-check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {!heroReady ? (
        <>
          <p>Essais de dés restants : {rerollsRemaining}</p>
          <button
            onClick={onCreateHero}
            disabled={rerollsRemaining <= 0 || !hero.spriteId}
          >
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
