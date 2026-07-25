import React from "react";
import { chestMimicImage } from "./images";

const NO_RETREAT_TYPES = ["horde-rats", "monstre-tresor"];

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
    !NO_RETREAT_TYPES.includes(pendingCombat.enemyType);

  return (
    <div className="combat-panel">
      <h4>
        Combat contre{" "}
        {pendingCombat.enemyType === "monstre-tresor"
          ? "un mimic"
          : pendingCombat.enemyType}
      </h4>
      {pendingCombat.enemyType === "monstre-tresor" && (
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
          {pendingCombat.enemy.bodyParts.jambes}
        </p>
      ) : (
        <p>PV adversaire : {pendingCombat.enemy.pv}</p>
      )}

      <button onClick={onAttack} disabled={isBusy}>
        🗡️ Attaquer
      </button>
      {canRetreat && <button onClick={onStopCombat}>🏃 Se replier</button>}

      <ul>
        {combatLog.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
};

export default CombatPanel;
