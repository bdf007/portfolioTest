import React from "react";
import Tile from "./Tile";

const DungeonGrid = ({
  tiles,
  heroPosition,
  heroIsDead,
  groundLoot,
  exitReady,
}) => {
  const grid = Array.from({ length: 8 }, () => Array(8).fill(null));

  tiles.forEach((tile) => {
    const { x, y } = tile.position;
    if (grid[y] && x >= 0 && x < 8) {
      grid[y][x] = tile;
    }
  });

  return (
    <div className="board-grid">
      {grid.map((row, y) =>
        row.map((tile, x) => {
          const isHeroHere = heroPosition[0] === x && heroPosition[1] === y;
          const hasGroundLoot = groundLoot?.some(
            (loot) => loot.x === x && loot.y === y,
          );

          return (
            <Tile
              key={`${x}-${y}`}
              tile={tile}
              isHeroHere={isHeroHere}
              heroIsDead={heroIsDead}
              hasGroundLoot={hasGroundLoot}
              exitReady={exitReady}
            />
          );
        }),
      )}
    </div>
  );
};

export default DungeonGrid;
