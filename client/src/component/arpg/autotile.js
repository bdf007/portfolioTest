const WALL = 1;

/**
 * Moteur d'autotile générique - calcule, pour chaque case de mur d'une
 * grille, laquelle des 47 formes standard ("blob47", format RPG Maker/
 * Godot/Tiled) elle doit utiliser selon ses 8 voisins, pour que les murs
 * se raccordent visuellement (coins, bords) au lieu d'un pavage répétitif.
 *
 * Deux parties bien séparées, volontairement :
 * 1. Le CALCUL (cette fonction) - objectif, mathématique, identique quel
 *    que soit l'outil/artiste qui a dessiné le tileset. Testé ici,
 *    garanti correct.
 * 2. La CORRESPONDANCE "index blob47 -> case exacte du fichier image" -
 *    ça, ça dépend entièrement de la disposition choisie par l'outil qui
 *    a produit le fichier (SpliTiler, le convertisseur Tiled, etc.) - se
 *    configure séparément par tileset, jamais deviné ici.
 *
 * Convention des bits de voisinage (dans l'ordre horaire depuis le nord) :
 *   N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
 */
const N = 1,
  NE = 2,
  E = 4,
  SE = 8,
  S = 16,
  SW = 32,
  W = 64,
  NW = 128;

/**
 * Bitmask brut (8 bits, 256 valeurs possibles) : quels voisins d'une case
 * de mur sont eux-memes des murs. Une case hors grille compte comme mur
 * (coherent avec la bordure toujours murée des generateurs).
 */
function computeRawBitmask(grid, x, y) {
  const height = grid.length;
  const width = grid[0].length;

  function isWall(nx, ny) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
    return grid[ny][nx] === WALL;
  }

  let mask = 0;
  if (isWall(x, y - 1)) mask |= N;
  if (isWall(x + 1, y - 1)) mask |= NE;
  if (isWall(x + 1, y)) mask |= E;
  if (isWall(x + 1, y + 1)) mask |= SE;
  if (isWall(x, y + 1)) mask |= S;
  if (isWall(x - 1, y + 1)) mask |= SW;
  if (isWall(x - 1, y)) mask |= W;
  if (isWall(x - 1, y - 1)) mask |= NW;
  return mask;
}

/**
 * Réduit le bitmask brut (256 valeurs) aux 47 formes visuellement
 * distinctes : un coin diagonal (ex: NE) n'a d'effet visuel que si les
 * deux voisins cardinaux adjacents (N et E) sont AUSSI des murs - sinon
 * ce coin est invisible/sans objet, donc on l'ignore. C'est cette regle
 * (standard, universelle - RPG Maker, Godot, Tiled l'utilisent tous)
 * qui fait tomber 256 combinaisons brutes a 47 formes reellement
 * distinctes.
 */
function reduceToVisualMask(rawMask) {
  let mask = rawMask;
  if (!(mask & N && mask & E)) mask &= ~NE;
  if (!(mask & E && mask & S)) mask &= ~SE;
  if (!(mask & S && mask & W)) mask &= ~SW;
  if (!(mask & W && mask & N)) mask &= ~NW;
  return mask;
}

/**
 * Table de correspondance visualMask -> index 0-46, dans l'ordre standard
 * "blob47" (meme ordre que les sorties de SpliTiler/du convertisseur
 * Tiled). Générée une seule fois, pas ecrite a la main : la liste exacte
 * des 47 masques visuels valides est déterministe (toute combinaison de
 * 8 bits qui survit a reduceToVisualMask), on les trie et on numerote.
 */
function buildBlob47Table() {
  const validMasks = new Set();
  for (let raw = 0; raw < 256; raw++) {
    validMasks.add(reduceToVisualMask(raw));
  }
  const sorted = [...validMasks].sort((a, b) => a - b);
  const table = new Map();
  sorted.forEach((mask, index) => table.set(mask, index));
  return table;
}

const BLOB47_TABLE = buildBlob47Table();

/**
 * Fonction principale : pour une case de mur donnée, renvoie son index
 * blob47 (0-46) - a utiliser ensuite pour chercher la bonne frame dans
 * le tileset converti (cf. le commentaire en tete de fichier).
 *
 * @param {number[][]} grid grille du niveau (0=sol, 1=mur)
 * @param {number} x
 * @param {number} y
 * @returns {number} index 0-46
 */
function getWallBlob47Index(grid, x, y) {
  const raw = computeRawBitmask(grid, x, y);
  const visual = reduceToVisualMask(raw);
  return BLOB47_TABLE.get(visual);
}

/**
 * Construit une grille de FRAMES PHASER directement utilisable par
 * `this.make.tilemap({ data: ... })`, à partir de la grille sol/mur du
 * niveau (0/1) et d'une table de correspondance "index blob47 -> frame
 * dans le tileset converti".
 *
 * C'est le point de branchement avec le reste du jeu : une fois le
 * tileset RPG Maker converti au format 47-tuiles (cf. SpliTiler ou le
 * script Tiled - voir les commentaires en tête de fichier) et
 * `wallBlobIndexToFrame` rempli (47 entrées, une par forme), le résultat
 * de cette fonction remplace directement le tableau `grid` brut qu'on
 * passe aujourd'hui à `this.make.tilemap()` dans MainScene.js.
 *
 * @param {number[][]} grid grille du niveau (0=sol, 1=mur)
 * @param {number} floorFrame frame a utiliser pour toutes les cases de sol
 * @param {number[]} wallBlobIndexToFrame tableau de 47 entrees : wallBlobIndexToFrame[i]
 *   = numero de frame dans le tileset converti pour la forme blob47 i
 * @returns {number[][]} grille de frames, meme dimensions que `grid`
 */
function buildAutotileRenderGrid(grid, floorFrame, wallBlobIndexToFrame) {
  const height = grid.length;
  const width = grid[0].length;
  const renderGrid = Array.from({ length: height }, () =>
    new Array(width).fill(floorFrame),
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === WALL) {
        const blobIndex = getWallBlob47Index(grid, x, y);
        renderGrid[y][x] = wallBlobIndexToFrame[blobIndex];
      }
    }
  }

  return renderGrid;
}

/**
 * Bitmask de coin (4 bits : NE/SE/SW/NW) - different du blob47 (8
 * directions, coins conditionnes par les bords adjacents) : ici chaque
 * coin depend UNIQUEMENT du voisin diagonal correspondant, directement.
 * C'est le format "corner" de Tiled (le plus simple des 3 types Wang),
 * celui utilise par ce pack - contrairement au format "Mixed" (8
 * points) vise par blob47 plus haut dans ce fichier.
 */
function computeWallCornerIndex(grid, x, y) {
  const height = grid.length;
  const width = grid[0].length;
  function isWall(nx, ny) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
    return grid[ny][nx] === 1;
  }
  // chaque coin ne compte comme "mur" que si les 4 cases du bloc 2x2
  // qui le partagent (la case elle-meme + les 2 cardinales adjacentes +
  // la diagonale) sont TOUTES des murs - jamais juste la diagonale
  // seule, sinon un couloir de mur d'une seule case d'epaisseur
  // (cardinales = sol de part et d'autre) est mal categorise
  let mask = 0;
  if (isWall(x, y - 1) && isWall(x + 1, y) && isWall(x + 1, y - 1)) mask |= 1; // NE
  if (isWall(x + 1, y) && isWall(x, y + 1) && isWall(x + 1, y + 1)) mask |= 2; // SE
  if (isWall(x, y + 1) && isWall(x - 1, y) && isWall(x - 1, y + 1)) mask |= 4; // SW
  if (isWall(x - 1, y) && isWall(x, y - 1) && isWall(x - 1, y - 1)) mask |= 8; // NW
  return mask;
}

function buildCornerAutotileRenderGrid(grid, floorFrame, cornerIndexToFrame) {
  const height = grid.length;
  const width = grid[0].length;
  const renderGrid = Array.from({ length: height }, () =>
    new Array(width).fill(floorFrame),
  );
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === 1) {
        const idx = computeWallCornerIndex(grid, x, y);
        renderGrid[y][x] = cornerIndexToFrame[idx] ?? floorFrame;
      }
    }
  }
  return renderGrid;
}

module.exports = {
  getWallBlob47Index,
  buildAutotileRenderGrid,
  computeRawBitmask,
  reduceToVisualMask,
  BLOB47_TABLE,
  N,
  NE,
  E,
  SE,
  S,
  SW,
  W,
  NW,
  computeWallCornerIndex,
  buildCornerAutotileRenderGrid,
};
