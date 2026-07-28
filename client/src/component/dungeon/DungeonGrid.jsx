import React from "react";
import Tile from "./Tile";
import { getHeroWalkSheet } from "./images";

const DungeonGrid = ({
  tiles,
  heroPosition,
  heroIsDead,
  groundLoot,
  exitReady,
  heroSpriteId,
  heroFacing,
  heroIsWalking,
}) => {
  const grid = Array.from({ length: 8 }, () => Array(8).fill(null));

  tiles.forEach((tile) => {
    const { x, y } = tile.position;
    if (grid[y] && x >= 0 && x < 8) {
      grid[y][x] = tile;
    }
  });

  const [heroX, heroY] = heroPosition;

  return (
    <div className="board-grid">
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
            left: `calc(10px + (100% - 20px) * ${(heroX + 0.5) / 8})`,
            top: `calc(10px + (100% - 20px) * ${(heroY + 0.5) / 8})`,
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
