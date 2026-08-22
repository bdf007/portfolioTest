const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Labyrinthe PARFAIT (backtracker récursif) - un unique chemin possible
 * entre deux cases quelconques, aucune boucle, aucune salle ouverte.
 * Radicalement différent de tout ce qu'on a construit jusqu'ici : pas de
 * grandes zones ouvertes, sensation oppressante/écrasante.
 *
 * Fonctionne sur une grille de "cellules" logiques espacées par
 * `passageWidth + wallThickness` (comme roomGenerator.js/caveChainGenerator.js) -
 * chaque cellule est visitée exactement une fois, en profondeur d'abord
 * avec retour en arrière (pile explicite plutôt que récursion, pour ne
 * jamais dépasser la profondeur d'appel sur un grand labyrinthe).
 *
 * Connexité GARANTIE par construction : c'est la définition même d'un
 * arbre couvrant (chaque cellule visitée l'est via un couloir depuis une
 * cellule déjà visitée) - aucune vérification a posteriori nécessaire,
 * un backtracker récursif ne peut PAS produire de zone isolée.
 *
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.passageWidth=1] largeur des couloirs, en cases -
 *   1 (defaut) = labyrinthe "pur" traditionnel, coherent avec doorWidth=1
 *   des autres generateurs a TILE_SIZE=32 ; 2 = plus large/praticable,
 *   au prix d'un aspect moins "vrai labyrinthe etroit"
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateMaze({ width, height, seed, passageWidth = 1 }) {
  const wallThickness = 1;
  const pitch = passageWidth + wallThickness;

  const cellCols = Math.floor((width - wallThickness) / pitch);
  const cellRows = Math.floor((height - wallThickness) / pitch);

  if (cellCols < 2 || cellRows < 2) {
    throw new Error(
      `generateMaze: grille (${width}x${height}) trop petite pour passageWidth=${passageWidth}`,
    );
  }

  const grid = createGrid(width, height, WALL);
  const rng = createRng(String(seed));

  function cellOrigin(cx, cy) {
    return { x: wallThickness + cx * pitch, y: wallThickness + cy * pitch };
  }

  function carveCell(cx, cy) {
    const { x, y } = cellOrigin(cx, cy);
    for (let dy = 0; dy < passageWidth; dy++) {
      for (let dx = 0; dx < passageWidth; dx++) {
        if (y + dy < height && x + dx < width) grid[y + dy][x + dx] = FLOOR;
      }
    }
  }

  function carvePassage(fromCx, fromCy, toCx, toCy) {
    // carve la case de cellule ET le mur separateur entre les deux -
    // meme principe que le "connecteur" entre salles dans roomGenerator.js
    const from = cellOrigin(fromCx, fromCy);
    const to = cellOrigin(toCx, toCy);
    const wallX = Math.min(from.x, to.x) + (fromCx === toCx ? 0 : passageWidth);
    const wallY = Math.min(from.y, to.y) + (fromCy === toCy ? 0 : passageWidth);

    if (fromCx !== toCx) {
      // connexion horizontale : mur separateur d'une case de large, sur toute la hauteur du passage
      for (let dy = 0; dy < passageWidth; dy++) {
        if (wallY + dy < height) grid[wallY + dy][wallX] = FLOOR;
      }
    } else {
      // connexion verticale
      for (let dx = 0; dx < passageWidth; dx++) {
        if (wallX + dx < width) grid[wallY][wallX + dx] = FLOOR;
      }
    }
  }

  const visited = createGrid(cellCols, cellRows, false);
  const stack = [{ cx: 0, cy: 0 }];
  visited[0][0] = true;
  carveCell(0, 0);

  const directions = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const unvisitedNeighbors = directions
      .map(([dx, dy]) => ({ cx: current.cx + dx, cy: current.cy + dy }))
      .filter(
        (n) =>
          n.cx >= 0 &&
          n.cx < cellCols &&
          n.cy >= 0 &&
          n.cy < cellRows &&
          !visited[n.cy][n.cx],
      );

    if (unvisitedNeighbors.length === 0) {
      stack.pop(); // impasse, retour en arriere
      continue;
    }

    const next =
      unvisitedNeighbors[Math.floor(rng() * unvisitedNeighbors.length)];
    visited[next.cy][next.cx] = true;
    carveCell(next.cx, next.cy);
    carvePassage(current.cx, current.cy, next.cx, next.cy);
    stack.push(next);
  }

  return grid;
}

module.exports = { generateMaze, WALL, FLOOR };
