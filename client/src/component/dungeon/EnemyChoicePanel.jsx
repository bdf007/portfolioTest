import React from "react";

const EnemyChoicePanel = ({ pendingEnemyChoice, isBusy, onResolve }) => {
  const { options, enemyType } = pendingEnemyChoice;

  return (
    <div className="enemy-choice-popup">
      <p>Un {enemyType} vous barre la route !</p>
      {options.includes("sneak_safe") && (
        <button onClick={() => onResolve("sneak_safe")} disabled={isBusy}>
          Se faufiler (garanti, 3 mvts)
        </button>
      )}
      {options.includes("sneak_risky") && (
        <button onClick={() => onResolve("sneak_risky")} disabled={isBusy}>
          Tenter de se faufiler (50%, 2 mvts)
        </button>
      )}
      <button onClick={() => onResolve("fight")} disabled={isBusy}>
        ⚔️ Engager le combat
      </button>
      <button onClick={() => onResolve("stop")} disabled={isBusy}>
        S'arrêter là
      </button>
    </div>
  );
};

export default EnemyChoicePanel;
