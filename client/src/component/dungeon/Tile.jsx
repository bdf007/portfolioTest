import React from "react";
import {
  shopImage,
  coffreFermeImage,
  coffreOuvertImage,
  gouffreImage,
  herseImage,
  keyImage,
  ratImage,
  bigRatImage,
  bossDragonImage,
  backTileImage,
  openStartDoorImage,
  closeExitDoorImage,
  openExitDoorImage,
  getBlobImage,
  getSolVariant,
} from "./images";

const Tile = ({
  tile,
  isHeroHere,
  hasGroundLoot,
  exitReady,
  solVariant,
  trapFlash,
  walls,
}) => {
  // En Aventure, un emplacement sans salle générée n'a tout simplement pas
  // de tuile (tile === null) — à distinguer d'une case qui existe mais
  // n'est pas encore explorée (tile existe, juste tile.revealed === false).
  // Le premier cas ne doit rien afficher du tout (pas même la texture
  // "case cachée"), le second garde le comportement habituel.
  const isVoid = tile === null || tile === undefined;

  // Flash du détecteur de pièges : affiche temporairement le sprite du piège
  // même si la case n'est pas (encore) révélée — sans jamais modifier
  // tile.revealed, l'effet redevient invisible tout seul après 1,5s (géré
  // côté front dans index.jsx).
  const isFlashingTrap = trapFlash && !tile?.revealed && tile?.type === "piège";

  // Une bordure épaisse marque les côtés murés (mode Aventure) — son
  // absence signale naturellement une porte ou l'intérieur d'une salle,
  // sans avoir besoin de dessiner la porte elle-même.
  const wallClasses = walls
    ? [
        walls.haut && "wall-haut",
        walls.bas && "wall-bas",
        walls.gauche && "wall-gauche",
        walls.droite && "wall-droite",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div
      className={`tile ${isVoid ? "tile-void" : ""} ${isHeroHere ? "hero-position" : ""} ${wallClasses}`}
    >
      {tile?.revealed && (
        <img src={getSolVariant(solVariant)} alt="Sol" className="sol-image" />
      )}

      {tile?.revealed && tile.type === "rat" && !tile.cleared && (
        <img src={ratImage} alt="Rat" className="rat-image" />
      )}
      {tile?.revealed && tile.type === "horde-rats" && !tile.cleared && (
        <img src={bigRatImage} alt="Horde de rats" className="rat-image" />
      )}

      {tile?.revealed &&
        (tile.type === "monstre" || tile.type === "monstre-gelatineux") &&
        !tile.cleared && (
          <img
            src={getBlobImage(tile)}
            alt={
              tile.type === "monstre-gelatineux" ? "Monstre gélatineux" : "Blob"
            }
            className="monster-image"
          />
        )}

      {tile?.revealed && tile.type === "boss" && !tile.cleared && (
        <img src={bossDragonImage} alt="Boss" className="boss-image" />
      )}

      {tile?.revealed && tile.type === "clé" && !tile.cleared && (
        <img src={keyImage} alt="Clé" className="key-image" />
      )}

      {tile?.revealed && tile.type === "magasin" && (
        <img src={shopImage} alt="magasin" className="shop-image" />
      )}

      {tile?.revealed && tile.type === "coffre" && !tile.cleared && (
        <img
          src={coffreFermeImage}
          alt="Coffre fermé"
          className="chest-image"
        />
      )}
      {tile?.revealed && tile.type === "coffre" && tile.cleared && (
        <img
          src={coffreOuvertImage}
          alt="Coffre ouvert"
          className="chest-image"
        />
      )}

      {(tile?.revealed || isFlashingTrap) &&
        tile.type === "piège" &&
        tile.value === -1 && (
          <img
            src={gouffreImage}
            alt="Gouffre"
            className={`goufre-image ${isFlashingTrap ? "trap-flash" : ""}`}
          />
        )}
      {(tile?.revealed || isFlashingTrap) &&
        tile.type === "piège" &&
        tile.value === -2 && (
          <img
            src={herseImage}
            alt="Herse"
            className={`herse-image ${isFlashingTrap ? "trap-flash" : ""}`}
          />
        )}

      {tile?.revealed && tile.type === "entrée" && (
        <img src={openStartDoorImage} alt="Entrée" className="door-image" />
      )}
      {tile?.revealed && tile.type === "sortie" && (
        <img
          src={exitReady ? openExitDoorImage : closeExitDoorImage}
          alt="Sortie"
          className="door-image"
        />
      )}

      {hasGroundLoot && (
        <div className="ground-loot-marker" title="Trésor perdu ici" />
      )}

      {!isVoid && !tile?.revealed && !isHeroHere && (
        <img
          src={backTileImage}
          alt="Case cachée"
          className="back-tile-image"
        />
      )}
    </div>
  );
};

export default Tile;
