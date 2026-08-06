import React from "react";

const FloorRecapScreen = ({ recap, onContinue, onSaveAndQuit }) => {
  const {
    completedFloor,
    turnsTaken,
    turnBonus,
    totalScore,
    livesRemaining,
    nextFloor,
    victory,
  } = recap;

  return (
    <div className="floor-recap-screen">
      <h2>🎉 Étage {completedFloor} réussi !</h2>
      <p>Tours utilisés : {turnsTaken}</p>
      <p>Bonus de rapidité : +{turnBonus} points</p>
      <p className="final-score">Score total : {totalScore}</p>
      <p>❤️ Vies restantes : {livesRemaining}</p>
      {victory ? (
        <p>🏆 C'était le dernier étage — vous avez triomphé du donjon !</p>
      ) : (
        <p>Prochaine étape : étage {nextFloor}</p>
      )}

      <div className="floor-recap-actions">
        <button onClick={onContinue}>
          {victory
            ? "🏆 Voir la victoire"
            : `Continuer vers l'étage ${nextFloor}`}
        </button>
        <button onClick={onSaveAndQuit}>💾 Sauvegarder et quitter</button>
      </div>
    </div>
  );
};

export default FloorRecapScreen;
