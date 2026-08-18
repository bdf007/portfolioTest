import React from "react";

const MovementPanel = ({
  movesRemaining,
  selectedDirection,
  isBusy,
  blockedDirections = [],
  onRollDice,
  onMoveOneStep,
  onRunAllMoves,
  onStopMovement,
}) => {
  const directionDisabled = (dir) =>
    movesRemaining <= 0 ||
    isBusy ||
    (selectedDirection !== null && selectedDirection !== dir) ||
    blockedDirections.includes(dir);

  return (
    <div className="movement-info-compact">
      <div className="movement-row">
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

        {movesRemaining > 0 && (
          <span className="moves-remaining-badge">{movesRemaining}</span>
        )}
      </div>

      <div className="movement-row movement-row-run-all">
        <span className="movement-row-label">Tout le trajet :</span>
        <button
          onClick={() => onRunAllMoves("haut")}
          disabled={directionDisabled("haut")}
          title="Monter jusqu'au bout"
          aria-label="Monter jusqu'au bout"
        >
          ⇈
        </button>
        <button
          onClick={() => onRunAllMoves("gauche")}
          disabled={directionDisabled("gauche")}
          title="Aller à gauche jusqu'au bout"
          aria-label="Aller à gauche jusqu'au bout"
        >
          ⇇
        </button>
        <button
          onClick={() => onRunAllMoves("droite")}
          disabled={directionDisabled("droite")}
          title="Aller à droite jusqu'au bout"
          aria-label="Aller à droite jusqu'au bout"
        >
          ⇉
        </button>
        <button
          onClick={() => onRunAllMoves("bas")}
          disabled={directionDisabled("bas")}
          title="Descendre jusqu'au bout"
          aria-label="Descendre jusqu'au bout"
        >
          ⇊
        </button>
      </div>
    </div>
  );
};

export default MovementPanel;
