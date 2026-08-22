const { findExitTile } = require("./spawnUtils");

const WALL = 1;
const FLOOR = 0;

/**
 * BFS simple, renvoie l'ensemble des cases de sol atteignables depuis une
 * origine.
 */
function reachableFloorSet(grid, from) {
  const height = grid.length;
  const width = grid[0].length;
  const visited = new Set([`${from.x},${from.y}`]);
  const stack = [from];
  while (stack.length > 0) {
    const { x, y } = stack.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (grid[ny][nx] !== FLOOR) continue;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return visited;
}

/**
 * Sceller une salle de boss dans un niveau déjà généré.
 *
 * Approche (troisième version - les deux precedentes ont echoue a
 * l'usage, cf. l'historique dans le code source) : on prend le point le
 * plus eloigne du spawn (findExitTile - TOUJOURS valide, sol, atteignable,
 * peu importe le generateur) et on l'utilise directement comme point de
 * connexion. On ETEND la grille vers l'est (nouvelles colonnes = mur,
 * jamais touchees par le generateur, donc aucun risque de chevaucher un
 * chemin existant) et on relie ce point a la marge neuve par un
 * connecteur droit - aussi long que necessaire (le point le plus eloigne
 * n'est pas forcement pres du bord droit selon le generateur, contrairement
 * a ce qu'une version precedente supposait a tort pour roomGenerator.js).
 * Le connecteur n'AJOUTE que du sol, n'en retire jamais - ne peut donc
 * jamais casser une connexite existante.
 *
 * @param {number[][]} grid grille du niveau (renvoyée modifiée, jamais mutée sur place)
 * @param {{x:number,y:number}} playerSpawn
 * @param {number} [roomSize=5] taille interieure de la salle (carrée)
 * @returns {{grid:number[][], doorTile:{x,y}, bossSpawn:{x,y}, exitTile:{x,y}}}
 */
function carveBossRoom(grid, playerSpawn, roomSize = 5) {
  const height = grid.length;
  const originalWidth = grid[0].length;
  const connectionPoint = findExitTile(grid, playerSpawn); // toujours valide

  const doorTile = { x: originalWidth - 1, y: connectionPoint.y };
  const margin = roomSize + 3;
  const newWidth = originalWidth + margin;

  // etend chaque ligne vers l'est (nouvelles cases = mur par defaut)
  const newGrid = grid.map((row) => {
    const extended = row.slice();
    while (extended.length < newWidth) extended.push(WALL);
    return extended;
  });

  // connecteur droit entre le point le plus eloigne et la porte - aussi
  // long que necessaire, n'ajoute que du sol
  const xStart = Math.min(connectionPoint.x, originalWidth - 2);
  const xEnd = Math.max(connectionPoint.x, originalWidth - 2);
  for (let x = xStart; x <= xEnd; x++) {
    newGrid[connectionPoint.y][x] = FLOOR;
  }

  newGrid[doorTile.y][doorTile.x] = WALL; // scelle la porte

  // creuse la salle dans la marge neuve, centree sur la ligne de la porte
  const perpHalf = Math.floor(roomSize / 2);
  const roomStartX = originalWidth;
  for (let dx = 0; dx < roomSize; dx++) {
    for (let p = -perpHalf; p <= perpHalf; p++) {
      const x = roomStartX + dx;
      const y = doorTile.y + p;
      if (y < 1 || y >= height - 1 || x >= newWidth - 1) continue;
      newGrid[y][x] = FLOOR;
    }
  }

  const bossSpawn = { x: roomStartX + roomSize - 1, y: doorTile.y };
  const exitTile = bossSpawn;

  return { grid: newGrid, doorTile, bossSpawn, exitTile };
}

module.exports = { carveBossRoom, reachableFloorSet };
