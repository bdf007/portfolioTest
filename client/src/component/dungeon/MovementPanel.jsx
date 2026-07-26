import React from "react";

const MovementPanel = ({
  movesRemaining,
  selectedDirection,
  isBusy,
  onRollDice,
  onMoveOneStep,
  onStopMovement,
}) => {
  const directionDisabled = (dir) =>
    movesRemaining <= 0 ||
    isBusy ||
    (selectedDirection !== null && selectedDirection !== dir);

  return (
    <div className="movement-info-compact">
      <button
        onClick={onRollDice}
        disabled={movesRemaining > 0 || isBusy}
        title="Lancer le dé"
        aria-label="Lancer le dé"
      >
        🎲
      </button>

      <button
        onClick={() => onMoveOneStep("haut")}
        disabled={directionDisabled("haut")}
        title="Haut"
        aria-label="Aller vers le haut"
      >
        ↑
      </button>
      <button
        onClick={() => onMoveOneStep("gauche")}
        disabled={directionDisabled("gauche")}
        title="Gauche"
        aria-label="Aller à gauche"
      >
        ←
      </button>
      <button
        onClick={() => onMoveOneStep("droite")}
        disabled={directionDisabled("droite")}
        title="Droite"
        aria-label="Aller à droite"
      >
        →
      </button>
      <button
        onClick={() => onMoveOneStep("bas")}
        disabled={directionDisabled("bas")}
        title="Bas"
        aria-label="Aller vers le bas"
      >
        ↓
      </button>

      <button
        onClick={onStopMovement}
        disabled={movesRemaining <= 0 || isBusy}
        title="S'arrêter"
        aria-label="S'arrêter"
      >
        🛑
      </button>

      {movesRemaining > 0 && <span className="moves-remaining-badge">{movesRemaining}</span>}
    </div>
  );
};

export default MovementPanel;
