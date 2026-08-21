const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

const DIRECTIONS = [
  { dx: 0, dy: -1 }, // haut
  { dx: 0, dy: 1 }, // bas
  { dx: -1, dy: 0 }, // gauche
  { dx: 1, dy: 0 }, // droite
];

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Choisit une direction en favorisant fortement la continuité par rapport
 * à la dernière direction empruntée - c'est ce qui donne des couloirs
 * lisibles (peu de zigzags) plutôt qu'une marche aléatoire pure.
 *
 * @param {Object|null} lastDir direction précédente, ou null au premier pas
 * @param {number} straightBias probabilité [0-1] de continuer tout droit
 *   quand c'est possible
 * @param {Function} rng
 * @param {Object[]} candidates directions valides pour ce pas (bornes de
 *   grille + pas déjà visité respectés)
 */
function pickDirection(lastDir, straightBias, rng, candidates) {
  if (candidates.length === 0) return null;

  if (lastDir) {
    const continuing = candidates.find(
      (d) => d.dx === lastDir.dx && d.dy === lastDir.dy,
    );
    if (continuing && rng() < straightBias) {
      return continuing;
    }
  }

  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Place les salles par random walk biaisé sur une grille de "slots" (une
 * case de ce quadrillage = une salle + son mur de séparation), puis
 * convertit le résultat en grille de tuiles pleine résolution.
 *
 * @param {Object} options
 * @param {number} options.width largeur en tuiles de la grille finale
 * @param {number} options.height hauteur en tuiles de la grille finale
 * @param {string} options.seed
 * @param {number} [options.roomSize=3] taille (largeur=hauteur) de chaque salle, en tuiles
 * @param {number} [options.roomCount=8] nombre de salles à placer
 * @param {number} [options.straightBias=0.65] probabilité de continuer tout droit
 * @param {number} [options.doorWidth=1] largeur de l'ouverture entre deux salles adjacentes
 * @param {number} [options.maxAttempts=5] tentatives avant d'abandonner si le
 *   nombre de salles demandé ne peut pas être atteint sur cette grille
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateRooms({
  width,
  height,
  seed,
  roomSize = 3,
  roomCount = 8,
  straightBias = 0.65,
  doorWidth = 1,
  maxAttempts = 5,
}) {
  if (roomSize < 1) {
    throw new Error("generateRooms: roomSize doit être >= 1");
  }
  if (doorWidth > roomSize) {
    throw new Error("generateRooms: doorWidth ne peut pas dépasser roomSize");
  }

  const wallThickness = 1;
  const pitch = roomSize + wallThickness; // distance entre deux slots de salle

  const slotCols = Math.floor((width - wallThickness) / pitch);
  const slotRows = Math.floor((height - wallThickness) / pitch);

  if (slotCols < 1 || slotRows < 1) {
    throw new Error(
      `generateRooms: grille (${width}x${height}) trop petite pour roomSize=${roomSize}`,
    );
  }
  if (roomCount > slotCols * slotRows) {
    throw new Error(
      `generateRooms: roomCount=${roomCount} dépasse la capacité de la grille (${slotCols * slotRows} slots disponibles)`,
    );
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? String(seed) : `${seed}#${attempt}`;
    const rng = createRng(attemptSeed);

    const startCol = Math.floor(slotCols / 2);
    const startRow = Math.floor(slotRows / 2);

    const visited = new Set([`${startCol},${startRow}`]);
    const path = [{ col: startCol, row: startRow }];
    // portes à percer : chaque entrée relie deux slots adjacents déjà visités
    const doors = [];

    let current = { col: startCol, row: startRow };
    let lastDir = null;
    let stuckCounter = 0;
    const maxStuck = slotCols * slotRows * 4; // filet de sécurité anti-boucle infinie

    while (path.length < roomCount && stuckCounter < maxStuck) {
      const candidates = DIRECTIONS.filter((d) => {
        const nc = current.col + d.dx;
        const nr = current.row + d.dy;
        return (
          nc >= 0 &&
          nc < slotCols &&
          nr >= 0 &&
          nr < slotRows &&
          !visited.has(`${nc},${nr}`)
        );
      });

      const dir = pickDirection(lastDir, straightBias, rng, candidates);

      if (!dir) {
        // impasse : on repart depuis un slot déjà visité au hasard,
        // comme un backtrack, plutôt que d'abandonner la génération
        current = path[Math.floor(rng() * path.length)];
        lastDir = null;
        stuckCounter++;
        continue;
      }

      const next = { col: current.col + dir.dx, row: current.row + dir.dy };
      visited.add(`${next.col},${next.row}`);
      path.push(next);
      doors.push({ from: current, to: next, dir });

      current = next;
      lastDir = dir;
      stuckCounter = 0;
    }

    if (path.length >= roomCount) {
      return renderToTileGrid(width, height, path, doors, {
        roomSize,
        pitch,
        wallThickness,
        doorWidth,
      });
    }
  }

  console.warn(
    `[roomGenerator] seed "${seed}" : roomCount=${roomCount} non atteint après ${maxAttempts} tentatives`,
  );
  return null;
}

/**
 * Convertit la liste de slots visités + portes en grille de tuiles pleine
 * résolution (murs partout par défaut, sol pour l'intérieur des salles et
 * les ouvertures entre salles adjacentes).
 */
function renderToTileGrid(
  width,
  height,
  path,
  doors,
  { roomSize, pitch, wallThickness, doorWidth },
) {
  const grid = createGrid(width, height, WALL);

  // les coordonnees de slot partent du centre de la grille de slots (col/row
  // ~ slotCols/2), donc il faut les ramener a une origine 0,0 avant de
  // pouvoir centrer la forme dans la grille de tuiles - sans ca, le
  // recentrage s'additionne aux coordonnees deja larges et pousse tout
  // dans un coin
  const minCol = Math.min(...path.map((s) => s.col));
  const minRow = Math.min(...path.map((s) => s.row));
  const maxCol = Math.max(...path.map((s) => s.col));
  const maxRow = Math.max(...path.map((s) => s.row));

  const usedCols = maxCol - minCol + 1;
  const usedRows = maxRow - minRow + 1;
  const totalUsedWidth = usedCols * pitch + wallThickness;
  const totalUsedHeight = usedRows * pitch + wallThickness;
  const offsetX = Math.max(0, Math.floor((width - totalUsedWidth) / 2));
  const offsetY = Math.max(0, Math.floor((height - totalUsedHeight) / 2));

  function slotToTileOrigin(slot) {
    return {
      x: offsetX + wallThickness + (slot.col - minCol) * pitch,
      y: offsetY + wallThickness + (slot.row - minRow) * pitch,
    };
  }

  // creuse l'intérieur de chaque salle
  for (const slot of path) {
    const { x, y } = slotToTileOrigin(slot);
    for (let dy = 0; dy < roomSize; dy++) {
      for (let dx = 0; dx < roomSize; dx++) {
        const tx = x + dx;
        const ty = y + dy;
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
          grid[ty][tx] = FLOOR;
        }
      }
    }
  }

  // perce une porte au milieu du mur partagé entre chaque paire de salles connectées
  const doorOffset = Math.floor((roomSize - doorWidth) / 2);
  for (const { from, to, dir } of doors) {
    const fromOrigin = slotToTileOrigin(from);

    if (dir.dx !== 0) {
      // connexion horizontale : la porte traverse la colonne de mur entre les deux salles
      const wallX = dir.dx > 0 ? fromOrigin.x + roomSize : fromOrigin.x - 1;
      for (let i = 0; i < doorWidth; i++) {
        const ty = fromOrigin.y + doorOffset + i;
        if (wallX >= 0 && wallX < width && ty >= 0 && ty < height) {
          grid[ty][wallX] = FLOOR;
        }
      }
    } else {
      // connexion verticale : la porte traverse la ligne de mur entre les deux salles
      const wallY = dir.dy > 0 ? fromOrigin.y + roomSize : fromOrigin.y - 1;
      for (let i = 0; i < doorWidth; i++) {
        const tx = fromOrigin.x + doorOffset + i;
        if (tx >= 0 && tx < width && wallY >= 0 && wallY < height) {
          grid[wallY][tx] = FLOOR;
        }
      }
    }
  }

  return grid;
}

module.exports = { generateRooms, WALL, FLOOR };
