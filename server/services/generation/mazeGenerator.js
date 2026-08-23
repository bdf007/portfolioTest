const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Génère un labyrinthe parfait avec un backtracker.
 *
 * - Chaque cellule est reliée à une autre par un unique chemin.
 * - Aucune boucle.
 * - wallThickness contrôle réellement l'épaisseur des murs.
 * - passageWidth contrôle la largeur des couloirs.
 *
 * @param {Object} options
 * @param {number} options.width largeur totale de la grille
 * @param {number} options.height hauteur totale de la grille
 * @param {string} options.seed seed aléatoire
 * @param {number} [options.passageWidth=1] largeur des couloirs en cases
 * @param {number} [options.wallThickness=1] épaisseur des murs en cases
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateMaze({
  width,
  height,
  seed,
  passageWidth = 1,
  wallThickness = 1,
}) {
  if (passageWidth < 1 || wallThickness < 1) {
    throw new Error(
      "generateMaze: passageWidth et wallThickness doivent être >= 1",
    );
  }

  /*
   * Une cellule de passage est composée de :
   *
   *   passageWidth + wallThickness
   *
   * Exemple :
   *
   * passageWidth = 2
   * wallThickness = 3
   *
   * [ CELL ][ MUR ][ MUR ][ MUR ][ CELL ]
   *
   * Le pitch représente donc la distance entre deux cellules.
   */
  const pitch = passageWidth + wallThickness;

  /*
   * On garde un mur extérieur de wallThickness cases.
   */
  const cellCols = Math.floor(
    (width - 2 * wallThickness + wallThickness) / pitch,
  );

  const cellRows = Math.floor(
    (height - 2 * wallThickness + wallThickness) / pitch,
  );

  if (cellCols < 2 || cellRows < 2) {
    throw new Error(
      `generateMaze: grille (${width}x${height}) trop petite pour passageWidth=${passageWidth} et wallThickness=${wallThickness}`,
    );
  }

  const grid = createGrid(width, height, WALL);
  const rng = createRng(String(seed));

  /**
   * Position de l'origine d'une cellule logique.
   */
  function cellOrigin(cx, cy) {
    return {
      x: wallThickness + cx * pitch,
      y: wallThickness + cy * pitch,
    };
  }

  /**
   * Creuse une cellule.
   */
  function carveCell(cx, cy) {
    const { x, y } = cellOrigin(cx, cy);

    for (let dy = 0; dy < passageWidth; dy++) {
      for (let dx = 0; dx < passageWidth; dx++) {
        if (x + dx >= 0 && x + dx < width && y + dy >= 0 && y + dy < height) {
          grid[y + dy][x + dx] = FLOOR;
        }
      }
    }
  }

  /**
   * Creuse le mur séparant deux cellules.
   *
   * Le passage traverse maintenant toute l'épaisseur du mur.
   */
  function carvePassage(fromCx, fromCy, toCx, toCy) {
    const from = cellOrigin(fromCx, fromCy);
    const to = cellOrigin(toCx, toCy);

    /*
     * Déplacement horizontal
     */
    if (fromCy === toCy) {
      const startX = Math.min(from.x, to.x) + passageWidth;
      const startY = from.y;

      for (let dx = 0; dx < wallThickness; dx++) {
        for (let dy = 0; dy < passageWidth; dy++) {
          const x = startX + dx;
          const y = startY + dy;

          if (x >= 0 && x < width && y >= 0 && y < height) {
            grid[y][x] = FLOOR;
          }
        }
      }
    } else {

    /*
     * Déplacement vertical
     */
      const startX = from.x;
      const startY = Math.min(from.y, to.y) + passageWidth;

      for (let dy = 0; dy < wallThickness; dy++) {
        for (let dx = 0; dx < passageWidth; dx++) {
          const x = startX + dx;
          const y = startY + dy;

          if (x >= 0 && x < width && y >= 0 && y < height) {
            grid[y][x] = FLOOR;
          }
        }
      }
    }
  }

  /*
   * Génération du labyrinthe
   */

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
      .map(([dx, dy]) => ({
        cx: current.cx + dx,
        cy: current.cy + dy,
      }))
      .filter(
        (neighbor) =>
          neighbor.cx >= 0 &&
          neighbor.cx < cellCols &&
          neighbor.cy >= 0 &&
          neighbor.cy < cellRows &&
          !visited[neighbor.cy][neighbor.cx],
      );

    /*
     * Aucun voisin disponible :
     * retour en arrière.
     */
    if (unvisitedNeighbors.length === 0) {
      stack.pop();
      continue;
    }

    /*
     * Choix aléatoire du prochain voisin.
     */
    const next =
      unvisitedNeighbors[Math.floor(rng() * unvisitedNeighbors.length)];

    visited[next.cy][next.cx] = true;

    /*
     * On creuse la nouvelle cellule.
     */
    carveCell(next.cx, next.cy);

    /*
     * Puis on creuse le mur entre les deux.
     */
    carvePassage(current.cx, current.cy, next.cx, next.cy);

    /*
     * On continue le parcours depuis cette cellule.
     */
    stack.push(next);
  }

  return grid;
}

module.exports = {
  generateMaze,
  WALL,
  FLOOR,
};
