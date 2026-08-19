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
  stats,
  onStartCombat,
  onDeclineCombat,
  onAttemptHide,
}) => {
  return (
    <div className="combat-choice">
      <p>
        Un {ENEMY_DISPLAY_NAMES[enemyType] || enemyType} vous barre la route !
      </p>

      {stats && (
        <div className="enemy-stats-preview">
          {stats.bodyParts ? (
            <>
              <span>🗡️ PC : {stats.weaponDie}</span>
              <span>❤️ Tête : {stats.bodyParts.tete}</span>
              <span>❤️ Torse : {stats.bodyParts.torse}</span>
              <span>❤️ Jambes : {stats.bodyParts.jambes}</span>
            </>
          ) : (
            <>
              <span>🗡️ PC : {stats.weaponDie}</span>
              <span>❤️ PV : {stats.pv}</span>
            </>
          )}
        </div>
      )}

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
