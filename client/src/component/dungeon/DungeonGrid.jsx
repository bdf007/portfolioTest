import React from "react";
import Tile from "./Tile";
import { getHeroWalkSheet } from "./images";

const ADVENTURE_ROOM_SIZE = 3;

// Même règle que canCrossToRoom côté backend — un déplacement entre deux
// salles différentes n'est autorisé qu'au centre de leur bordure commune.
function canCrossToRoom(fromX, fromY, toX, toY) {
  const sameRoom =
    Math.floor(fromX / ADVENTURE_ROOM_SIZE) ===
      Math.floor(toX / ADVENTURE_ROOM_SIZE) &&
    Math.floor(fromY / ADVENTURE_ROOM_SIZE) ===
      Math.floor(toY / ADVENTURE_ROOM_SIZE);
  if (sameRoom) return true;
  if (fromX !== toX)
    return fromY % ADVENTURE_ROOM_SIZE === 1 && toY % ADVENTURE_ROOM_SIZE === 1;
  return fromX % ADVENTURE_ROOM_SIZE === 1 && toX % ADVENTURE_ROOM_SIZE === 1;
}

const DungeonGrid = ({
  tiles,
  heroPosition,
  heroIsDead,
  groundLoot,
  exitReady,
  heroSpriteId,
  heroFacing,
  heroIsWalking,
  solVariant,
  trapFlash,
  gridSize = 8, // 8 = plateau classique inchangé, 15 en mode Aventure
  isAventure = false,
  fillParent = false, // true : le plateau prend 100% de son conteneur (fenêtre de caméra) au lieu de sa taille propre habituelle
}) => {
  const grid = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null),
  );

  tiles.forEach((tile) => {
    const { x, y } = tile.position;
    if (grid[y] && x >= 0 && x < gridSize) {
      grid[y][x] = tile;
    }
  });

  const [heroX, heroY] = heroPosition;

  // Un côté de case est "mur" si aucune case n'existe dans cette direction,
  // ou si une case existe mais que le passage n'est pas autorisé (salle
  // voisine, hors du point de porte). L'absence de mur = porte ou intérieur
  // de salle, sans distinction visuelle nécessaire entre les deux.
  const getWalls = (x, y) => {
    if (!isAventure) return null;
    const dirs = {
      haut: [0, -1],
      bas: [0, 1],
      gauche: [-1, 0],
      droite: [1, 0],
    };
    const walls = {};
    for (const [dir, [dx, dy]] of Object.entries(dirs)) {
      const tx = x + dx;
      const ty = y + dy;
      const neighborExists = grid[ty] && grid[ty][tx];
      walls[dir] = !neighborExists || !canCrossToRoom(x, y, tx, ty);
    }
    return walls;
  };

  return (
    <div
      className="board-grid"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        ...(fillParent
          ? {
              width: "100%",
              height: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              boxShadow: "none",
            }
          : {}),
      }}
    >
      {grid.map((row, y) =>
        row.map((tile, x) => {
          const isHeroHere = heroX === x && heroY === y;
          const hasGroundLoot = groundLoot?.some(
            (loot) => loot.x === x && loot.y === y,
          );

          return (
            <Tile
              key={`${x}-${y}`}
              tile={tile}
              isHeroHere={isHeroHere}
              hasGroundLoot={hasGroundLoot}
              exitReady={exitReady}
              solVariant={solVariant}
              trapFlash={trapFlash}
              walls={tile ? getWalls(x, y) : null}
            />
          );
        }),
      )}

      {/* Élément unique superposé à tout le plateau — sa position glisse via
          transition CSS d'une case à l'autre, au lieu de "sauter" d'un
          parent DOM à un autre comme lorsqu'il vivait dans chaque Tile. */}
      {!heroIsDead && (
        <div
          className={`hero-sprite-overlay facing-${heroFacing || "bas"} ${heroIsWalking ? "walking" : ""}`}
          style={{
            left: fillParent
              ? `${((heroX + 0.5) / gridSize) * 100}%`
              : `calc(10px + (100% - 20px) * ${(heroX + 0.5) / gridSize})`,
            top: fillParent
              ? `${((heroY + 0.5) / gridSize) * 100}%`
              : `calc(10px + (100% - 20px) * ${(heroY + 0.5) / gridSize})`,
            // Largeur calibrée à l'origine pour gridSize=8 (8.5% = 68% d'une
            // case). On garde ce même ratio (68% d'une case) quelle que soit
            // la taille de grille, au lieu d'un pourcentage fixe qui devient
            // trop grand dès que les cases rétrécissent (15 cases en Aventure).
            width: `${(68 / gridSize).toFixed(3)}%`,
            backgroundImage: `url(${getHeroWalkSheet(heroSpriteId)})`,
          }}
          role="img"
          aria-label="Héros"
        />
      )}
    </div>
  );
};

export default DungeonGrid;
