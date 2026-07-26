import React from "react";
import { chestMimicImage } from "./images";

const CombatPanel = ({
  pendingCombat,
  hero,
  combatLog,
  isBusy,
  onAttack,
  onStopCombat,
}) => {
  const canRetreat =
    pendingCombat.attacksHero === pendingCombat.attacksEnemy &&
    pendingCombat.attacksHero > 0 &&
    !pendingCombat.mandatory;

  return (
    <div className="combat-panel">
      <h4>
        Combat contre{" "}
        {pendingCombat.enemyType === "mimic"
          ? "un mimic"
          : pendingCombat.enemyType}
      </h4>
      {pendingCombat.mandatory && (
        <p className="mandatory-warning">
          ⚠️ Combat obligatoire, impossible de fuir !
        </p>
      )}
      {pendingCombat.enemyType === "mimic" && (
        <img src={chestMimicImage} alt="Mimic" className="mimic-image" />
      )}
      <p>
        Vos PV — Tête : {hero.bodyParts?.tete ?? 0} | Torse :{" "}
        {hero.bodyParts?.torse ?? 0} | Jambes : {hero.bodyParts?.jambes ?? 0}
      </p>
      {pendingCombat.enemy.bodyParts ? (
        <p>
          Adversaire — Tête : {pendingCombat.enemy.bodyParts.tete} | Torse :{" "}
          {pendingCombat.enemy.bodyParts.torse} | Jambes :{" "}
          {pendingCombat.enemy.bodyParts.jambes} | PC :{" "}
          {pendingCombat.enemy.weaponDie}
        </p>
      ) : (
        <p>
          PV adversaire : {pendingCombat.enemy.pv} | PC :{" "}
          {pendingCombat.enemy.weaponDie}
        </p>
      )}

      <button onClick={onAttack} disabled={isBusy}>
        🗡️ Attaquer
      </button>
      {canRetreat && <button onClick={onStopCombat}>🏃 Se replier</button>}

      <ul className="combat-log">
        {[...combatLog].reverse().map((roundLines, i) => (
          <li key={combatLog.length - i} className="combat-log-round">
            <span className="combat-log-round-number">
              Round {combatLog.length - i}
            </span>
            {roundLines.map((line, j) => (
              <p key={j}>{line}</p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CombatPanel;
