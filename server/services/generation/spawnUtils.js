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
/**
 * Trouve une case de sol PROCHE A PIED (BFS 4-directions, par ordre
 * croissant de distance de marche reelle) - pas juste proche en
 * coordonnees. Remplace l'ancienne version (liste de decalages fixes
 * genre [3,0],[0,3]...) qui ne verifiait que la distance a vol d'oiseau
 * : une case a 3 cases en ligne droite peut tres bien se trouver de
 * l'autre cote d'un mur, avec un vrai trajet de plusieurs dizaines de
 * cases pour l'atteindre - bug reel trouve en jeu (le marqueur de
 * remontee pouvait atterrir "proche" en coordonnees mais accessible
 * seulement en faisant le tour de tout le donjon).
 *
 * @param {number[][]} grid
 * @param {{x:number,y:number}} origin
 * @param {{x:number,y:number}[]} [excludeTiles]
 * @param {number} [maxDistance=20] rayon de marche maximal explore, filet de securite
 * @returns {{x:number,y:number}|null} la case de sol non exclue la plus proche A PIED, ou null si aucune trouvee dans maxDistance
 */
function findNearbyFloorTile(
  grid,
  origin,
  excludeTiles = [],
  maxDistance = 20,
) {
  const height = grid.length;
  const width = grid[0].length;
  const isExcluded = (x, y) => excludeTiles.some((t) => t.x === x && t.y === y);

  const visited = new Set([`${origin.x},${origin.y}`]);
  let frontier = [{ x: origin.x, y: origin.y, dist: 0 }];

  while (frontier.length > 0) {
    const next = [];
    for (const { x, y, dist } of frontier) {
      if (dist > 0 && !isExcluded(x, y)) return { x, y }; // premiere case valide en ordre croissant de distance de marche
      if (dist >= maxDistance) continue;
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
        next.push({ x: nx, y: ny, dist: dist + 1 });
      }
    }
    frontier = next;
  }
  return null;
}

/**
 * Reconstruit le chemin le plus court (BFS, 4-directions) entre deux
 * cases de sol. Utilisé uniquement pour EXCLURE ce chemin des
 * candidats de remontee (cf. findUpstairsTile) - jamais pour la
 * navigation en jeu elle-meme.
 * @returns {{x:number,y:number}[]} le chemin, origine et destination
 *   incluses - tableau vide si aucun chemin trouve (ne devrait jamais
 *   arriver, spawn et sortie sont toujours connectes par construction)
 */
function computeShortestPathTiles(grid, from, to) {
  const height = grid.length;
  const width = grid[0].length;
  const visited = Array.from({ length: height }, () =>
    new Array(width).fill(false),
  );
  const cameFrom = new Map();
  visited[from.y][from.x] = true;
  const queue = [from];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.x === to.x && cur.y === to.y) break;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (visited[ny][nx] || grid[ny][nx] !== FLOOR) continue;
      visited[ny][nx] = true;
      cameFrom.set(`${nx},${ny}`, cur);
      queue.push({ x: nx, y: ny });
    }
  }

  if (!visited[to.y][to.x]) return []; // pas de chemin trouve (ne devrait jamais arriver)

  const path = [to];
  let cur = to;
  while (!(cur.x === from.x && cur.y === from.y)) {
    cur = cameFrom.get(`${cur.x},${cur.y}`);
    if (!cur) break;
    path.push(cur);
  }
  return path;
}

/**
 * Trouve une case de sol proche du spawn joueur pour y placer la remontee
 * vers l'etage precedent - a l'oppose de findExitTile (qui vise le point
 * le PLUS loin), on veut ici quelque chose de proche.
 *
 * Evite le chemin le plus court entre le spawn et la sortie quand
 * `exitTile` est fourni - sinon, le marqueur peut atterrir directement
 * dans le couloir de depart (frequent depuis que le spawn est place en
 * coin), forcant un passage dessus - et donc un prompt de confirmation -
 * juste pour continuer a explorer normalement. Repli sur la recherche
 * habituelle (sans exclure le chemin) si aucun candidat hors chemin
 * n'existe, plutot que d'echouer a placer la remontee.
 */
function findUpstairsTile(
  grid,
  playerSpawn,
  excludeTiles = [],
  exitTile = null,
) {
  if (exitTile) {
    const pathTiles = computeShortestPathTiles(grid, playerSpawn, exitTile);
    const withPathExcluded = findNearbyFloorTile(grid, playerSpawn, [
      ...excludeTiles,
      ...pathTiles,
    ]);
    if (withPathExcluded) return withPathExcluded;
    // aucun candidat hors chemin - repli sur la recherche habituelle
  }
  return findNearbyFloorTile(grid, playerSpawn, excludeTiles);
}

module.exports = {
  findSpawnTile,
  findExitTile,
  findUpstairsTile,
  findNearbyFloorTile,
  computeShortestPathTiles,
};
