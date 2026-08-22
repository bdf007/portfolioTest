const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

const DIRECTIONS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

function pickDirection(lastDir, straightBias, rng, candidates) {
  if (candidates.length === 0) return null;
  if (lastDir) {
    const continuing = candidates.find(
      (d) => d.dx === lastDir.dx && d.dy === lastDir.dy,
    );
    if (continuing && rng() < straightBias) return continuing;
  }
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * Calcule les cases locales (0..roomSize-1) a remplir en sol pour UNE
 * salle, en forme arrondie/organique plutot qu'un carre plein - masque
 * de distance au centre, avec un peu de bruit par case pour eviter un
 * cercle parfaitement lisse (repetitif visuellement d'une salle a
 * l'autre sinon). `roundness` varie par salle (seede) pour que toutes
 * les salles n'aient pas exactement la meme silhouette.
 *
 * GARANTIT toujours sol : le centre, ET le point milieu de chacun des 4
 * bords (0-indexed, meme position que `doorOffset` avec doorWidth=1 dans
 * roomGenerator.js) - le carvage de porte (fait APRES, par l'appelant,
 * exactement comme roomGenerator.js) ne touche que la case de MUR
 * SEPARATRICE entre deux salles, jamais la case de bord de la salle
 * elle-meme - sans cette garantie, une porte pourrait s'ouvrir sur un mur
 * si le masque arrondi avait par hasard exclu ce point precis.
 *
 * IMPORTANT (bug trouve en testant a roomSize=10/doorWidth=2) : forcer un
 * point isole en sol ne garantit PAS qu'il soit connecte au reste de la
 * salle - une case forcee peut se retrouver flottante, ne touchant le
 * blob que par une diagonale (le BFS de connexite est en 4-directionnel,
 * une diagonale ne compte pas). La garantie doit etre un vrai CHEMIN
 * (un "plus" trace depuis le centre jusqu'a chaque bord), pas des points
 * isoles - `doorWidth` elargit ce chemin pour couvrir TOUTE la largeur
 * que la porte va effectivement toucher, pas seulement son milieu.
 */
function carveBlobRoomCells(roomSize, doorWidth, rng) {
  const center = (roomSize - 1) / 2;
  const maxRadius = roomSize / 2;
  const roundness = 0.72 + rng() * 0.2; // 0.72 a 0.92 - jamais assez agressif pour menacer le centre
  const cells = new Set();

  for (let dy = 0; dy < roomSize; dy++) {
    for (let dx = 0; dx < roomSize; dx++) {
      const distX = dx - center;
      const distY = dy - center;
      const dist = Math.sqrt(distX * distX + distY * distY);
      const jitter = (rng() - 0.5) * 0.6; // bruit leger, evite un cercle trop lisse
      if (dist <= maxRadius * roundness + jitter) {
        cells.add(`${dx},${dy}`);
      }
    }
  }

  // garanties de connexion : un "plus" trace en ligne droite depuis le
  // centre jusqu'a chaque bord (pas juste des points), sur toute la
  // largeur de la porte - garantit un VRAI chemin 4-directionnel,
  // independant du masque arrondi ci-dessus
  const doorOffset = Math.floor((roomSize - doorWidth) / 2);
  const cy = Math.round(center);
  const cx = Math.round(center);
  for (let i = 0; i < doorWidth; i++) {
    const col = doorOffset + i;
    for (let y = 0; y < roomSize; y++) cells.add(`${col},${y}`); // colonne complete (bords haut+bas)
    const row = doorOffset + i;
    for (let x = 0; x < roomSize; x++) cells.add(`${x},${row}`); // ligne complete (bords gauche+droite)
  }

  return cells;
}

/**
 * Meme squelette que generateRooms (roomGenerator.js) - marche aleatoire
 * biaisee sur une grille de slots, connexions entre slots adjacents -
 * mais chaque salle est une forme arrondie/organique (cf.
 * carveBlobRoomCells) plutot qu'un carre plein. "Un enchainement de
 * grottes, comme les ruines mais moins carre."
 *
 * @param {Object} options memes options que generateRooms
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateCaveChain({
  width,
  height,
  seed,
  roomSize = 5, // legerement plus grand que le defaut des ruines (3) - une forme arrondie a besoin d'un peu plus de cases pour se voir
  roomCount = 8,
  straightBias = 0.65,
  doorWidth = 1,
  maxAttempts = 5,
}) {
  if (roomSize < 3) {
    throw new Error(
      "generateCaveChain: roomSize doit être >= 3 (sinon la forme arrondie n'a pas la place d'exister)",
    );
  }
  if (doorWidth > roomSize) {
    throw new Error(
      "generateCaveChain: doorWidth ne peut pas dépasser roomSize",
    );
  }

  const wallThickness = 1;
  const pitch = roomSize + wallThickness;

  const slotCols = Math.floor((width - wallThickness) / pitch);
  const slotRows = Math.floor((height - wallThickness) / pitch);

  if (slotCols < 1 || slotRows < 1) {
    throw new Error(
      `generateCaveChain: grille (${width}x${height}) trop petite pour roomSize=${roomSize}`,
    );
  }
  if (roomCount > slotCols * slotRows) {
    throw new Error(
      `generateCaveChain: roomCount=${roomCount} dépasse la capacité de la grille (${slotCols * slotRows} slots disponibles)`,
    );
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? String(seed) : `${seed}#${attempt}`;
    const rng = createRng(attemptSeed);

    const startCol = Math.floor(slotCols / 2);
    const startRow = Math.floor(slotRows / 2);

    const visited = new Set([`${startCol},${startRow}`]);
    const path = [{ col: startCol, row: startRow }];
    const doors = [];

    let current = { col: startCol, row: startRow };
    let lastDir = null;
    let stuckCounter = 0;
    const maxStuck = slotCols * slotRows * 4;

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
        rng,
      });
    }
  }

  console.warn(
    `[caveChainGenerator] seed "${seed}" : roomCount=${roomCount} non atteint après ${maxAttempts} tentatives`,
  );
  return null;
}

function renderToTileGrid(
  width,
  height,
  path,
  doors,
  { roomSize, pitch, wallThickness, doorWidth, rng },
) {
  const grid = createGrid(width, height, WALL);

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

  // creuse chaque salle en forme arrondie (au lieu d'un carre plein)
  for (const slot of path) {
    const { x, y } = slotToTileOrigin(slot);
    const cells = carveBlobRoomCells(roomSize, doorWidth, rng);
    for (const cellKey of cells) {
      const [dx, dy] = cellKey.split(",").map(Number);
      const tx = x + dx;
      const ty = y + dy;
      if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
        grid[ty][tx] = FLOOR;
      }
    }
  }

  // porte entre salles adjacentes - identique a roomGenerator.js (ne
  // touche que la case de mur separatrice, jamais la case de bord de la
  // salle elle-meme, deja garantie sol par carveBlobRoomCells)
  const doorOffset = Math.floor((roomSize - doorWidth) / 2);
  for (const { from, to, dir } of doors) {
    const fromOrigin = slotToTileOrigin(from);

    if (dir.dx !== 0) {
      const wallX = dir.dx > 0 ? fromOrigin.x + roomSize : fromOrigin.x - 1;
      for (let i = 0; i < doorWidth; i++) {
        const ty = fromOrigin.y + doorOffset + i;
        if (wallX >= 0 && wallX < width && ty >= 0 && ty < height) {
          grid[ty][wallX] = FLOOR;
        }
      }
    } else {
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

module.exports = { generateCaveChain, WALL, FLOOR };
