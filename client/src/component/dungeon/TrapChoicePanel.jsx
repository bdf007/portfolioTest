import React from "react";

const OBSTACLE_ENEMY_TYPES = [
  "monstre",
  "rat",
  "boss",
  "horde-rats",
  "monstre-gelatineux",
];

const TrapChoicePanel = ({ pendingTrap, tiles, isBusy, onResolve }) => {
  const { options, trapType, jumpTo } = pendingTrap;

  const jumpLandsOnEnemy =
    !!jumpTo &&
    tiles?.some(
      (t) =>
        t.position.x === jumpTo.x &&
        t.position.y === jumpTo.y &&
        t.revealed &&
        !t.cleared &&
        OBSTACLE_ENEMY_TYPES.includes(t.type),
    );

  return (
    <div className="trap-choice-popup">
      <p>
        {trapType === "gouffre"
          ? "⚠️ Un gouffre s'ouvre devant vous !"
          : "Une herse vous barre la route."}
      </p>
      {jumpLandsOnEnemy &&
        (options.includes("jump_safe") || options.includes("jump_risky")) && (
          <p className="mandatory-warning">
            ⚠️ Un ennemi occupe la case d'en face : sauter engagera un combat
            obligatoire, sans possibilité de repli !
          </p>
        )}
      {options.includes("walk") && (
        <button onClick={() => onResolve("walk")} disabled={isBusy}>
          Marcher (-1 PV)
        </button>
      )}
      {options.includes("jump_safe") && (
        <button onClick={() => onResolve("jump_safe")} disabled={isBusy}>
          Sauter (garanti, 3 mvts)
        </button>
      )}
      {options.includes("jump_risky") && (
        <button onClick={() => onResolve("jump_risky")} disabled={isBusy}>
          Tenter le saut (50%, 2 mvts)
        </button>
      )}
      {options.includes("stop") && (
        <button onClick={() => onResolve("stop")} disabled={isBusy}>
          S'arrêter là
        </button>
      )}
      {options.includes("fall") && (
        <button
          onClick={() => onResolve("fall")}
          disabled={isBusy}
          className="danger"
        >
          Se jeter dans le gouffre
        </button>
      )}
    </div>
  );
};

export default TrapChoicePanel;
