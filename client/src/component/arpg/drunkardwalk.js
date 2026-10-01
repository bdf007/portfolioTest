import { createRng } from "./rng";

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Miroir client de server/services/generation/gridUtils.js
 * (removeDiagonalPinches + widenNarrowPassages + ensureMinimumPassageWidth
 * uniquement - le reste du fichier source, keepLargestRegion/dilateFloor/
 * ensureHitboxClearance, n'est pas utilise ici) - meme duplication que
 * rng.js cote client, gridUtils.js etant lui aussi un module serveur sans
 * package partage avec le client pour l'instant. Utilise uniquement pour
 * generer l'apercu biomes ci-dessous.
 */
function removeDiagonalPinches(
  grid,
  maxIterations = 10,
  protectedCells = null,
) {
  const height = grid.length;
  const width = grid[0].length;
  let result = grid.map((row) => row.slice());

  function isBorder(x, y) {
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  }
  function isProtected(x, y) {
    return protectedCells ? protectedCells.has(`${x},${y}`) : false;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const additions = [];
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const a = result[y][x];
        const b = result[y][x + 1];
        const c = result[y + 1][x];
        const d = result[y + 1][x + 1];

        if (a === FLOOR && d === FLOOR && b === WALL && c === WALL) {
          if (!isBorder(x + 1, y) && !isProtected(x + 1, y))
            additions.push([x + 1, y]);
        } else if (b === FLOOR && c === FLOOR && a === WALL && d === WALL) {
          if (!isBorder(x, y) && !isProtected(x, y)) additions.push([x, y]);
        }
      }
    }

    if (additions.length === 0) break;

    let changed = false;
    for (const [ax, ay] of additions) {
      if (result[ay][ax] === WALL) {
        result[ay][ax] = FLOOR;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return result;
}

function widenNarrowPassages(grid, maxIterations = 10, protectedCells = null) {
  const height = grid.length;
  const width = grid[0].length;
  let result = grid.map((row) => row.slice());

  function isBorder(x, y) {
    return x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1;
  }
  function isProtected(x, y) {
    return protectedCells ? protectedCells.has(`${x},${y}`) : false;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const additions = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y][x] !== FLOOR) continue;

        const horizontalPinch =
          result[y][x - 1] === FLOOR &&
          result[y][x + 1] === FLOOR &&
          result[y - 1][x] === WALL &&
          result[y + 1][x] === WALL;
        if (horizontalPinch) {
          if (!isBorder(x, y - 1) && !isProtected(x, y - 1))
            additions.push([x, y - 1]);
          else if (!isBorder(x, y + 1) && !isProtected(x, y + 1))
            additions.push([x, y + 1]);
          continue;
        }

        const verticalPinch =
          result[y - 1][x] === FLOOR &&
          result[y + 1][x] === FLOOR &&
          result[y][x - 1] === WALL &&
          result[y][x + 1] === WALL;
        if (verticalPinch) {
          if (!isBorder(x - 1, y) && !isProtected(x - 1, y))
            additions.push([x - 1, y]);
          else if (!isBorder(x + 1, y) && !isProtected(x + 1, y))
            additions.push([x + 1, y]);
        }
      }
    }

    if (additions.length === 0) break;

    let changed = false;
    for (const [ax, ay] of additions) {
      if (result[ay][ax] === WALL) {
        result[ay][ax] = FLOOR;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return result;
}

function ensureMinimumPassageWidth(grid, maxRounds = 8, protectedCells = null) {
  let result = grid;
  for (let round = 0; round < maxRounds; round++) {
    const before = JSON.stringify(result);
    result = removeDiagonalPinches(result, 10, protectedCells);
    result = widenNarrowPassages(result, 10, protectedCells);
    if (JSON.stringify(result) === before) break;
  }
  return result;
}

/**
 * Generateur "marche d'ivrogne" (drunkard's walk) : un ou plusieurs
 * marcheurs partent du centre et creusent du sol en se deplacant
 * aleatoirement (4 directions), jusqu'a atteindre un ratio de sol cible
 * ou epuiser leur budget de pas. Les marcheurs suivants repartent d'une
 * case de sol deja creusee (tiree au hasard), pas forcement du centre,
 * pour obtenir une forme plus organique/ramifiee qu'un seul marcheur.
 *
 * Portage ES module (import/export) du generateur serveur CommonJS
 * d'origine (meme logique, meme signature) pour pouvoir etre appele
 * cote client depuis BiomeGalleryScreen.js (apercu biomes) en plus de
 * l'usage serveur.
 */
export function generateDrunkardWalk({
  width,
  height,
  seed,
  targetFloorRatio = 0.4, // valeur originale : 0.35
  maxSteps = 80000, // valeur originale : 60000
  walkerCount = 5, // valeur originale : 4
}) {
  const grid = createGrid(width, height, WALL);
  const rng = createRng(String(seed));

  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  grid[startY][startX] = FLOOR;

  const floorTiles = [{ x: startX, y: startY }];
  const targetFloorCount = Math.floor(width * height * targetFloorRatio);
  const stepsPerWalker = Math.floor(maxSteps / walkerCount);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let floorCount = 1;

  for (let w = 0; w < walkerCount && floorCount < targetFloorCount; w++) {
    let pos =
      w === 0
        ? { x: startX, y: startY }
        : floorTiles[Math.floor(rng() * floorTiles.length)];

    for (
      let step = 0;
      step < stepsPerWalker && floorCount < targetFloorCount;
      step++
    ) {
      const [dx, dy] = directions[Math.floor(rng() * directions.length)];
      const nx = Math.max(1, Math.min(width - 2, pos.x + dx));
      const ny = Math.max(1, Math.min(height - 2, pos.y + dy));
      pos = { x: nx, y: ny };

      if (grid[ny][nx] === WALL) {
        grid[ny][nx] = FLOOR;
        floorCount++;
        floorTiles.push({ x: nx, y: ny });
      }
    }
  }

  return ensureMinimumPassageWidth(grid);
}

export { WALL, FLOOR };
