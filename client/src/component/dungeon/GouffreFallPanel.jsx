import React from "react";

const GouffreFallPanel = ({ pendingGouffreFall, isBusy, onRoll, onConfirmDeath }) => {
  const { failed, roll } = pendingGouffreFall;

  if (!failed) {
    return (
      <div className="trap-choice-popup">
        <p>⚠️ Un gouffre s'ouvre sous vos pieds...</p>
        <p className="mandatory-warning">Il vous faut un 6 pour vous rattraper au bord !</p>
        <button onClick={onRoll} disabled={isBusy}>
          🎲 Tenter de s'accrocher
        </button>
      </div>
    );
  }

  return (
    <div className="trap-choice-popup">
      <p>🎲 ({roll}) Vous n'arrivez pas à vous accrocher...</p>
      <p className="mandatory-warning">Le vide vous engloutit.</p>
      <button onClick={onConfirmDeath} disabled={isBusy} className="danger">
        💀 ...
      </button>
    </div>
  );
};

export default GouffreFallPanel;
