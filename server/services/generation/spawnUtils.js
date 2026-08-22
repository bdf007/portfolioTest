const FLOOR = 0;
const { createRng } = require("./rng");

/**
 * Trouve la première case de sol en partant d'un COIN de la grille (choisi
 * au hasard parmi les 4, de façon seedée) et en s'éloignant en spirale -
 * utilisé aussi bien pour le spawn du joueur que comme point de référence
 * pour le placement des ennemis (enemySpawner.js a besoin de connaître le
 * spawn joueur pour respecter sa distance minimale).
 *
 * Partir d'un coin plutôt que du centre est un choix délibéré : le joueur
 * découvre alors le niveau en s'en éloignant progressivement, plutôt que
 * de démarrer au beau milieu d'une carte déjà générée - narrativement
 * plus cohérent. La case la plus éloignée (cf. findExitTile, qui sert de
 * sortie) se retrouve alors naturellement proche du coin opposé.
 *
 * @param {number[][]} grid
 * @param {string} [seed] pour varier le coin choisi d'un niveau à l'autre
 *   (même seed = même coin, comme le reste de la génération) - si absente,
 *   repli déterministe sur le premier coin (haut-gauche) plutôt que de
 *   planter, pour tout appelant qui ne fournirait pas encore de seed.
 */
function findSpawnTile(grid, seed) {
  const height = grid.length;
  const width = grid[0].length;

  const corners = [
    { x: 2, y: 2 }, // haut-gauche
    { x: width - 3, y: 2 }, // haut-droite
    { x: 2, y: height - 3 }, // bas-gauche
    { x: width - 3, y: height - 3 }, // bas-droite
  ];

  const anchor = seed
    ? corners[
        Math.floor(createRng(String(seed) + "-spawn-corner")() * corners.length)
      ]
    : corners[0];
  const cx = Math.max(0, Math.min(width - 1, anchor.x));
  const cy = Math.max(0, Math.min(height - 1, anchor.y));

  if (grid[cy][cx] === FLOOR) return { x: cx, y: cy };

  for (let radius = 1; radius < Math.max(width, height); radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (grid[y][x] === FLOOR) return { x, y };
      }
    }
  }

  return { x: 1, y: 1 };
}

/**
 * Trouve la case de sol la plus eloignee du spawn joueur, par distance de
 * marche reelle (BFS) plutot qu'a vol d'oiseau - dans une grotte sinueuse,
 * la case la plus loin en ligne droite peut etre a deux pas par un
 * chemin detourne, alors que le BFS garantit vraiment "au bout du
 * parcours". Sert a placer la sortie de niveau (escalier).
 *
 * Le graphe est deja garanti connexe par les generateurs (cave/rooms/bsp),
 * donc chaque case de sol est necessairement atteinte par ce parcours -
 * pas de cas "sortie inaccessible" a gerer ici.
 */
function findExitTile(grid, playerSpawn) {
  const height = grid.length;
  const width = grid[0].length;

  const visited = Array.from({ length: height }, () =>
    new Array(width).fill(false),
  );
  visited[playerSpawn.y][playerSpawn.x] = true;

  let frontier = [{ x: playerSpawn.x, y: playerSpawn.y }];
  let farthest = { x: playerSpawn.x, y: playerSpawn.y };

  while (frontier.length > 0) {
    const next = [];
    for (const { x, y } of frontier) {
      farthest = { x, y }; // la derniere vague explorée est la plus loin
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (visited[ny][nx] || grid[ny][nx] !== FLOOR) continue;
        visited[ny][nx] = true;
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }

  return farthest;
}

/**
 * Trouve une case de sol proche d'une origine donnee, en testant une
 * liste de decalages fixes dans l'ordre - meme principe que le placement
 * du PNJ de quete a l'origine (100% de reussite sur 20 grottes testees).
 * Accepte une liste de cases a EVITER (deja utilisees par un autre
 * element - remontee, autre PNJ...) pour ne jamais faire coincider deux
 * landmarks sur la meme case. Retourne null si aucune case valide n'est
 * trouvee (carte trop exigue) plutot que de planter - l'appelant doit
 * alors simplement ne pas placer l'element ce coup-ci.
 */
function findNearbyFloorTile(grid, origin, excludeTiles = []) {
  const offsets = [
    [3, 0],
    [0, 3],
    [-3, 0],
    [0, -3],
    [2, 2],
    [-2, 2],
    [2, -2],
    [-2, -2],
    [4, 0],
    [0, 4],
    [-4, 0],
    [0, -4],
    [5, 0],
    [0, 5],
    [-5, 0],
    [0, -5],
    [3, 3],
    [-3, 3],
    [3, -3],
    [-3, -3],
  ];
  const height = grid.length;
  const width = grid[0].length;
  const isExcluded = (x, y) => excludeTiles.some((t) => t.x === x && t.y === y);

  for (const [dx, dy] of offsets) {
    const x = origin.x + dx;
    const y = origin.y + dy;
    if (
      y >= 0 &&
      y < height &&
      x >= 0 &&
      x < width &&
      grid[y][x] === FLOOR &&
      !isExcluded(x, y)
    ) {
      return { x, y };
    }
  }
  return null;
}

/**
 * Trouve une case de sol proche du spawn joueur pour y placer la remontee
 * vers l'etage precedent - a l'oppose de findExitTile (qui vise le point
 * le PLUS loin), on veut ici quelque chose de proche.
 */
function findUpstairsTile(grid, playerSpawn, excludeTiles = []) {
  return findNearbyFloorTile(grid, playerSpawn, excludeTiles);
}

module.exports = {
  findSpawnTile,
  findExitTile,
  findUpstairsTile,
  findNearbyFloorTile,
};
