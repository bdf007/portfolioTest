import React from "react";

const CombatChoicePanel = ({ enemyType, onStartCombat, onDeclineCombat }) => {
  return (
    <div className="combat-choice">
      <p>Un {enemyType} vous barre la route !</p>
      <button onClick={onStartCombat}>⚔️ Combattre</button>
      <button onClick={onDeclineCombat}>➡️ Continuer sa route</button>
    </div>
  );
};

export default CombatChoicePanel;
