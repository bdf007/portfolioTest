import React from "react";

const ENEMY_DISPLAY_NAMES = {
  rat: "rat",
  monstre: "monstre gélatineux",
  "horde-rats": "horde de rats",
  "monstre-gelatineux": "méga-blob",
  "monstre-tresor": "mimic",
  boss: "boss",
};

const CombatChoicePanel = ({
  enemyType,
  forced,
  onStartCombat,
  onDeclineCombat,
  onAttemptHide,
}) => {
  return (
    <div className="combat-choice">
      <p>
        Un {ENEMY_DISPLAY_NAMES[enemyType] || enemyType} vous barre la route !
      </p>
      {forced && (
        <p className="mandatory-warning">
          ⚠️ Toujours au contact, impossible de vous éloigner — combattez, ou
          tentez de vous dissimuler (1D6, 50%).
        </p>
      )}
      <button onClick={onStartCombat}>⚔️ Combattre</button>
      {forced ? (
        <button onClick={onAttemptHide}>🎲 Tenter de se cacher (50%)</button>
      ) : (
        <button onClick={onDeclineCombat}>➡️ Continuer sa route</button>
      )}
    </div>
  );
};

export default CombatChoicePanel;
