import React from "react";
import {
  ratImage,
  bigRatImage,
  bossDragonImage,
  chestMimicImage,
  getBlobImage,
  getHeroSprite,
} from "./images";

const ENEMY_DISPLAY_NAMES = {
  rat: "rat",
  monstre: "monstre gélatineux",
  "horde-rats": "horde de rats",
  "monstre-gelatineux": "méga-blob",
  "monstre-tresor": "mimic",
  boss: "boss",
};

function getEnemySprite(pendingCombat) {
  const { enemyType, enemy } = pendingCombat;
  switch (enemyType) {
    case "rat":
      return ratImage;
    case "horde-rats":
      return bigRatImage;
    case "monstre":
      return getBlobImage({ type: "monstre", color: enemy.color });
    case "monstre-gelatineux":
      return getBlobImage({ type: "monstre-gelatineux", color: enemy.color });
    case "monstre-tresor":
      return chestMimicImage;
    case "boss":
      return bossDragonImage;
    default:
      return null;
  }
}

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

  const enemySprite = getEnemySprite(pendingCombat);

  return (
    <div className="combat-panel">
      <h4>
        Combat contre{" "}
        {ENEMY_DISPLAY_NAMES[pendingCombat.enemyType] ||
          pendingCombat.enemyType}
      </h4>
      {pendingCombat.mandatory && (
        <p className="mandatory-warning">
          ⚠️ Combat obligatoire, impossible de fuir !
        </p>
      )}

      <div className="combat-vs-row">
        <img
          src={getHeroSprite(hero.spriteId)}
          alt="Héros"
          className="combat-vs-sprite"
        />
        <span className="combat-vs-label">VS</span>
        {enemySprite && (
          <img
            src={enemySprite}
            alt={
              ENEMY_DISPLAY_NAMES[pendingCombat.enemyType] ||
              pendingCombat.enemyType
            }
            className="combat-vs-sprite"
          />
        )}
      </div>

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
