import React from "react";
import { ITEM_ICONS } from "./images";

const HeroStatsBar = ({ hero, gameState }) => {
  const { livesRemaining, score, turnCount, keyFound } = gameState;
  const { tete = 0, torse = 0, jambes = 0 } = hero.bodyParts || {};

  const inventory = hero.inventory || [];
  const countOf = (...keys) => inventory.filter((i) => keys.includes(i)).length;

  // Regroupées par icône partagée : potionCoffre/potionSimple ont le même
  // effet (même sprite), pareil pour armeCoffre/armeBonus, et les deux
  // bombes n'ont qu'une icône générique commune — la distinction entre les
  // deux types de bombe reste visible en ouvrant l'inventaire.
  const itemCounts = [
    {
      icon: ITEM_ICONS.potionSimple,
      count: countOf("potionCoffre", "potionSimple"),
      label: "Potions",
    },
    {
      icon: ITEM_ICONS.potionTriple,
      count: countOf("potionTriple"),
      label: "Potions triples",
    },
    {
      icon: ITEM_ICONS.armeBonus,
      count: countOf("armeCoffre", "armeBonus"),
      label: "Améliorations d'arme",
    },
    {
      icon: ITEM_ICONS.bombeCarre,
      count: countOf("bombeCarre", "bombeLigne"),
      label: "Bombes",
    },
  ];

  return (
    <div className="hero-stats-bar">
      <span>❤️ {livesRemaining}</span>
      <span className="hero-stats-sep">·</span>
      <span>
        PV {tete}-{torse}-{jambes}
      </span>
      <span className="hero-stats-sep">·</span>
      <span>PC {hero.weaponDie}</span>
      <span className="hero-stats-sep">·</span>
      <span>💰 {hero.gold}</span>
      <span className="hero-stats-sep">·</span>
      <span>🏆 {score}</span>
      <span className="hero-stats-sep">·</span>
      <span>⏱️ {turnCount}</span>
      <span className="hero-stats-sep">·</span>
      <span title={keyFound ? "Clé en poche" : "Pas de clé"}>
        🗝️ {keyFound ? "✅" : "❌"}
      </span>
      <span className="hero-stats-sep">·</span>
      {itemCounts.map((item) => (
        <span key={item.label} title={item.label} className="hero-stats-item">
          <img src={item.icon} alt="" className="hero-stats-item-icon" />
          {item.count}
        </span>
      ))}
    </div>
  );
};

export default HeroStatsBar;
