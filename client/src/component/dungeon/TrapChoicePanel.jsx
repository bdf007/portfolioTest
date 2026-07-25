import React from "react";

const TrapChoicePanel = ({ pendingTrap, isBusy, onResolve }) => {
  const { options, trapType } = pendingTrap;

  return (
    <div className="trap-choice-popup">
      <p>
        {trapType === "gouffre"
          ? "⚠️ Un gouffre s'ouvre devant vous !"
          : "Une herse vous barre la route."}
      </p>
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
        <button onClick={() => onResolve("fall")} disabled={isBusy} className="danger">
          Se jeter dans le gouffre
        </button>
      )}
    </div>
  );
};

export default TrapChoicePanel;
