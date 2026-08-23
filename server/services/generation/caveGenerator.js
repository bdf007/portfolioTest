/**
 * Génération de grotte par automate cellulaire.
 *
 * Principe :
 * 1. Remplir une grille width x height aléatoirement (~45% de murs),
 *    bordure toujours en mur pour ne jamais avoir de sortie de carte.
 * 2. Appliquer plusieurs passes de lissage avec une règle asymétrique
 *    naissance/mort (paramètres de référence RogueBasin) :
 *      - une case MUR devient SOL si elle a moins de `deathLimit` voisins murs
 *      - une case SOL devient MUR si elle a plus de `birthLimit` voisins murs
 *    Une règle symétrique (même seuil pour les deux) érode le mur en continu
 *    d'itération en itération au lieu de se stabiliser - d'où les deux
 *    paramètres distincts.
 * 3. Garantir la connexité : on identifie toutes les régions de sol par
 *    flood fill, on ne garde que la plus grande, le reste redevient mur.
 *    Sans cette étape, l'automate cellulaire produit régulièrement des
 *    poches de sol isolées, inaccessibles en jeu.
 */

const { createRng } = require("./rng");
const { keepLargestRegion, ensureMinimumPassageWidth } = require("./gridUtils");

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

function randomFill(grid, width, height, wallProbability, rng) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder =
        x === 0 || y === 0 || x === width - 1 || y === height - 1;
      grid[y][x] = isBorder || rng() < wallProbability ? WALL : FLOOR;
    }
  }
}

function countWallNeighbours(grid, width, height, x, y) {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      // hors grille = considéré comme mur, pour resserrer les bords naturellement
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        count++;
      } else if (grid[ny][nx] === WALL) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Règle asymétrique : une case murée qui perd trop de voisins murs s'écroule
 * en sol ; une case de sol qui accumule trop de voisins murs se referme.
 * C'est la dissymétrie entre deathLimit et birthLimit qui permet au système
 * de se stabiliser en formes organiques plutôt que de tout éroder.
 */
function smoothPass(grid, width, height, deathLimit, birthLimit) {
  const next = createGrid(width, height, FLOOR);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const walls = countWallNeighbours(grid, width, height, x, y);
      const alive = grid[y][x] === WALL;
      next[y][x] = alive
        ? walls < deathLimit
          ? FLOOR
          : WALL
        : walls > birthLimit
          ? WALL
          : FLOOR;
    }
  }
  return next;
}

/**
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.wallProbability=0.40] proportion initiale de murs
 * @param {number} [options.iterations=4] nombre de passes de lissage
 * @param {number} [options.deathLimit=3] seuil de voisins murs sous lequel un mur s'écroule
 * @param {number} [options.birthLimit=4] seuil de voisins murs au-dessus duquel du sol se referme
 * @param {number} [options.minFloorRatio=0.30] en dessous de ce ratio de sol, la
 *   grotte est jugée trop pauvre (effondrée en petite poche isolée) et on retente
 * @param {number} [options.maxAttempts=5] nombre max de tentatives avant d'abandonner
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateCave({
  width,
  height,
  seed,
  wallProbability = 0.4,
  iterations = 4,
  deathLimit = 3,
  birthLimit = 4,
  minFloorRatio = 0.3,
  maxAttempts = 5,
}) {
  if (width < 10 || height < 10) {
    throw new Error("generateCave: width/height trop petits (minimum 10x10)");
  }

  const totalTiles = width * height;
  let lastGrid = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // seed dérivée à chaque tentative : la seed d'origine reste reproductible
    // (attempt=0 redonne toujours le même résultat pour une seed donnée),
    // mais on peut s'écarter du cas dégénéré sans devoir demander une seed
    // différente à l'appelant
    const attemptSeed = attempt === 0 ? String(seed) : `${seed}#${attempt}`;
    const rng = createRng(attemptSeed);

    let grid = createGrid(width, height, FLOOR);
    randomFill(grid, width, height, wallProbability, rng);

    for (let i = 0; i < iterations; i++) {
      grid = smoothPass(grid, width, height, deathLimit, birthLimit);
    }

    grid = keepLargestRegion(grid, width, height);
    // corrige les pincements droits/diagonaux (cf. gridUtils.js) - a
    // 32px/case, une seule case de large suffit deja largement pour la
    // hitbox du heros (~18-24px), pas besoin de la dilatation plus
    // agressive utilisee un temps a l'echelle 16px. N'ajoute que du sol,
    // ne peut donc jamais casser la connexite garantie par
    // keepLargestRegion juste au-dessus.
    grid = ensureMinimumPassageWidth(grid);
    lastGrid = grid;

    let floorCount = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell === FLOOR) floorCount++;
      }
    }

    if (floorCount / totalTiles >= minFloorRatio) {
      return grid;
    }
  }

  // toutes les tentatives ont échoué à atteindre le ratio minimal : on
  // renvoie quand même la dernière grille plutôt que de planter le niveau,
  // avec un avertissement pour garder une trace en cas de souci récurrent
  console.warn(
    `[caveGenerator] seed "${seed}" : ratio de sol minimal (${minFloorRatio}) non atteint après ${maxAttempts} tentatives`,
  );
  return lastGrid;
}

module.exports = { generateCave, WALL, FLOOR };
