import React from "react";

export const VictoryScreen = ({ onNewGame }) => (
  <div className="victory-screen">
    <h2>🎉 Victoire !</h2>
    <p>Vous vous êtes échappé du donjon avec la clé, après avoir vaincu le boss !</p>
    <button onClick={onNewGame}>Nouvelle partie</button>
  </div>
);

export const GameOverScreen = ({ onNewGame }) => (
  <div className="game-over-screen">
    <h2>Game Over</h2>
    <p>Vous avez abandonné le donjon.</p>
    <button onClick={onNewGame}>Nouvelle partie</button>
  </div>
);
