import React from "react";

const ADVENTURE_ROOM_SIZE = 3;
const ROOM_GRID_SIZE = 5;

// Repris du principe de MapTextureGenerator.cs (Unity) déjà porté/testé plus
// tôt dans le projet — mais au niveau des SALLES plutôt que des cases
// individuelles (plus lisible en petit format), et en CSS plutôt qu'en
// canvas, cohérent avec le reste du rendu du jeu.
const Minimap = ({ tiles, heroPosition }) => {
  const [heroX, heroY] = heroPosition;
  const heroRoom = {
    rx: Math.floor(heroX / ADVENTURE_ROOM_SIZE),
    ry: Math.floor(heroY / ADVENTURE_ROOM_SIZE),
  };

  const rooms = [];
  // ry croissant en premier = même convention que le plateau principal
  // (y=0 en haut, "haut" décrémente y) — pour que l'orientation de la
  // mini-carte corresponde à celle du plateau réel.
  for (let ry = 0; ry < ROOM_GRID_SIZE; ry++) {
    for (let rx = 0; rx < ROOM_GRID_SIZE; rx++) {
      const roomTiles = tiles.filter(
        (t) =>
          Math.floor(t.position.x / ADVENTURE_ROOM_SIZE) === rx &&
          Math.floor(t.position.y / ADVENTURE_ROOM_SIZE) === ry,
      );
      const exists = roomTiles.length > 0;
      const explored = roomTiles.some((t) => t.revealed);
      const isCurrent = rx === heroRoom.rx && ry === heroRoom.ry;
      rooms.push({ rx, ry, exists, explored, isCurrent });
    }
  }

  return (
    <div className="minimap-grid" title="Salles explorées">
      {rooms.map((room) => (
        <div
          key={`${room.rx}-${room.ry}`}
          className={`minimap-cell ${
            room.isCurrent
              ? "minimap-current"
              : room.explored
                ? "minimap-explored"
                : room.exists
                  ? "minimap-unexplored"
                  : "minimap-empty"
          }`}
        />
      ))}
    </div>
  );
};

export default Minimap;
