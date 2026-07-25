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
    <div className="movement-info">
      <p>Déplacement</p>
      <button onClick={onRollDice} disabled={movesRemaining > 0 || isBusy}>
        🎲 Lancer le dé
      </button>

      <div className="controls">
        <button onClick={() => onMoveOneStep("haut")} disabled={directionDisabled("haut")}>
          ↑ Haut
        </button>
        <div>
          <button onClick={() => onMoveOneStep("gauche")} disabled={directionDisabled("gauche")}>
            ← Gauche
          </button>
          <button onClick={() => onMoveOneStep("droite")} disabled={directionDisabled("droite")}>
            → Droite
          </button>
        </div>
        <button onClick={() => onMoveOneStep("bas")} disabled={directionDisabled("bas")}>
          ↓ Bas
        </button>
      </div>

      <button onClick={onStopMovement} disabled={movesRemaining <= 0 || isBusy}>
        🛑 S'arrêter
      </button>

      {movesRemaining > 0 && <p>Déplacements restants : {movesRemaining}</p>}
    </div>
  );
};

export default MovementPanel;
