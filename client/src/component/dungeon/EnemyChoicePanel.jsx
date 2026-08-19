import React from "react";

const ENEMY_DISPLAY_NAMES = {
  rat: "rat",
  monstre: "monstre gélatineux",
  "horde-rats": "horde de rats",
  "monstre-gelatineux": "méga-blob",
  "monstre-tresor": "mimic",
  boss: "boss",
};

const EnemyChoicePanel = ({ pendingEnemyChoice, isBusy, stats, onResolve }) => {
  const { options, enemyType } = pendingEnemyChoice;

  return (
    <div className="enemy-choice-popup">
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
