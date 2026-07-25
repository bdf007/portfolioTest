import React from "react";

const HeroPanel = ({ hero, heroPosition, heroReady, onCreateHero }) => {
  return (
    <div className="hero-info">
      <h3>Héros</h3>
      <p>Position : {heroPosition.join(", ")}</p>
      <p>Or : {hero.gold} PO</p>

      {!heroReady ? (
        <button onClick={onCreateHero}>Créer mon héros (lancer les dés)</button>
      ) : (
        <>
          <p>
            PV — Tête : {hero.bodyParts?.tete ?? 0} | Torse :{" "}
            {hero.bodyParts?.torse ?? 0} | Jambes : {hero.bodyParts?.jambes ?? 0}
          </p>
          <p>Points de Combat (arme) : {hero.weaponDie}</p>
        </>
      )}
    </div>
  );
};

export default HeroPanel;
