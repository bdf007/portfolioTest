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

const Tile = ({ tile, isHeroHere, hasGroundLoot, exitReady, solVariant }) => {
  return (
    <div className={`tile ${isHeroHere ? "hero-position" : ""}`}>
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

      {tile?.revealed && tile.type === "piège" && tile.value === -1 && (
        <img src={gouffreImage} alt="Gouffre" className="goufre-image" />
      )}
      {tile?.revealed && tile.type === "piège" && tile.value === -2 && (
        <img src={herseImage} alt="Herse" className="herse-image" />
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

      {!tile?.revealed && !isHeroHere && (
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
