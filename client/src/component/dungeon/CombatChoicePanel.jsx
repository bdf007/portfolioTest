import React from "react";

const ENEMY_DISPLAY_NAMES = {
  rat: "rat",
  monstre: "monstre gélatineux",
  "horde-rats": "horde de rats",
  "monstre-gelatineux": "méga-blob",
  "monstre-tresor": "mimic",
  boss: "boss",
};

const CombatChoicePanel = ({ enemyType, onStartCombat, onDeclineCombat }) => {
  return (
    <div className="combat-choice">
      <p>
        Un {ENEMY_DISPLAY_NAMES[enemyType] || enemyType} vous barre la route !
      </p>
      <button onClick={onStartCombat}>⚔️ Combattre</button>
      <button onClick={onDeclineCombat}>➡️ Continuer sa route</button>
    </div>
  );
};

export default CombatChoicePanel;
