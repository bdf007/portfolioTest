const { createRng } = require('./rng');
const { keepLargestRegion } = require('./gridUtils');

const WALL = 1;
const FLOOR = 0;

/**
 * Génération de ville : une place ouverte (tout en sol au départ), sur
 * laquelle on place plusieurs bâtiments rectangulaires (blocs de mur -
 * des obstacles à contourner, pas des salles à traverser pour l'instant,
 * aucun système de boutique/PNJ n'existe encore côté jeu). Pas d'ennemis
 * dans ce biome - géré entièrement via `enemyBaseCount: 0` dans
 * biomeConfig.js, ce générateur n'a rien à savoir sur les ennemis.
 *
 * Contrairement aux grottes (formes organiques) ou aux salles/BSP
 * (connexité garantie par construction), une ville est fondamentalement
 * un espace ouvert avec des obstacles ajoutés - la connexité est donc
 * quasi automatique (les rues subsistent partout où aucun bâtiment n'a
 * été placé), mais on applique quand même keepLargestRegion en filet de
 * sécurité : rien n'empêche mathématiquement deux bâtiments adjacents
 * aux bords opposés d'une grille trop petite de sceller un coin.
 */

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

function rectOverlapsWithMargin(a, b, margin) {
  return !(
    a.x + a.w + margin <= b.x ||
    b.x + b.w + margin <= a.x ||
    a.y + a.h + margin <= b.y ||
    b.y + b.h + margin <= a.y
  );
}

/**
 * Place jusqu'à `buildingCount` bâtiments rectangulaires, sans
 * chevauchement, avec un espacement minimal entre eux et par rapport à
 * la bordure (garantit des rues praticables tout autour). Si un
 * bâtiment ne trouve pas de place après `maxTriesPerBuilding` essais, on
 * continue simplement avec moins de bâtiments plutôt que d'échouer -
 * une ville légèrement moins dense que demandé n'est pas un problème,
 * contrairement à une grotte trop pauvre en sol.
 */
function placeBuildings(grid, width, height, buildingCount, rng, opts) {
  const { minSize, maxSize, minSpacing, maxTriesPerBuilding } = opts;
  const placed = [];

  for (let i = 0; i < buildingCount; i++) {
    for (let attempt = 0; attempt < maxTriesPerBuilding; attempt++) {
      const w = minSize + Math.floor(rng() * (maxSize - minSize + 1));
      const h = minSize + Math.floor(rng() * (maxSize - minSize + 1));
      const x = 2 + Math.floor(rng() * Math.max(1, width - w - 4));
      const y = 2 + Math.floor(rng() * Math.max(1, height - h - 4));

      const rect = { x, y, w, h };
      const overlaps = placed.some((b) => rectOverlapsWithMargin(rect, b, minSpacing));
      if (overlaps) continue;

      placed.push(rect);
      for (let ty = y; ty < y + h; ty++) {
        for (let tx = x; tx < x + w; tx++) {
          grid[ty][tx] = WALL;
        }
      }
      break; // batiment place, on passe au suivant
    }
  }

  return placed;
}

/**
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.buildingCount=8] nombre de bâtiments visés (peut être moins si la place est dense)
 * @param {number} [options.minBuildingSize=4] taille min d'un côté de bâtiment (tuiles)
 * @param {number} [options.maxBuildingSize=8] taille max d'un côté de bâtiment (tuiles)
 * @param {number} [options.minSpacing=3] espacement minimal entre bâtiments (largeur de rue garantie)
 * @param {number} [options.maxTriesPerBuilding=20] tentatives avant d'abandonner un bâtiment
 * @returns {number[][]} grille 2D, 0 = sol (place/rues), 1 = mur (bordure + bâtiments)
 */
function generateTown({
  width,
  height,
  seed,
  buildingCount = 8,
  minBuildingSize = 4,
  maxBuildingSize = 8,
  minSpacing = 3,
  maxTriesPerBuilding = 20,
}) {
  if (width < 20 || height < 20) {
    throw new Error('generateTown: width/height trop petits (minimum 20x20)');
  }

  const rng = createRng(String(seed));

  let grid = createGrid(width, height, FLOOR);
  // bordure en mur, meme convention que les autres generateurs
  for (let x = 0; x < width; x++) {
    grid[0][x] = WALL;
    grid[height - 1][x] = WALL;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = WALL;
    grid[y][width - 1] = WALL;
  }

  placeBuildings(grid, width, height, buildingCount, rng, {
    minSize: minBuildingSize,
    maxSize: maxBuildingSize,
    minSpacing,
    maxTriesPerBuilding,
  });

  // filet de securite : garantit la connexite meme si un placement
  // improbable de batiments avait scelle une poche (cf. commentaire en tete)
  grid = keepLargestRegion(grid, width, height);

  return grid;
}

module.exports = { generateTown, WALL, FLOOR };
