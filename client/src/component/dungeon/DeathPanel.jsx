import React from "react";

const DeathPanel = ({ livesRemaining, onRecreateHero, onAbandonGame }) => {
  return (
    <div className="death-choice-panel">
      <h4>💀 Vous êtes mort !</h4>
      <p>Vos biens sont restés au sol, à l'endroit de votre mort.</p>
      <p>Vies restantes : {livesRemaining}</p>
      <button onClick={onRecreateHero}>Recréer un héros</button>
      <button onClick={onAbandonGame} className="danger">
        Abandonner la partie
      </button>
    </div>
  );
};

export default DeathPanel;
