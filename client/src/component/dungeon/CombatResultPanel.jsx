import React from "react";

const CombatResultPanel = ({ result, onContinue }) => {
  const { type, log, goldReward } = result;

  return (
    <div className="combat-panel">
      <h4>{type === "victory" ? "🎉 Victoire !" : "💀 Vaincu..."}</h4>

      <ul className="combat-log">
        <li className="combat-log-round">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </li>
      </ul>

      {type === "victory" && <p className="hero-roll-result">+{goldReward} PO</p>}

      <button onClick={onContinue}>Continuer</button>
    </div>
  );
};

export default CombatResultPanel;
