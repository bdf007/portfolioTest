const { createRng } = require("./rng");
const { reachableFloorSet } = require("./bossRoom");
const { getEnemyStatsForDepth } = require("./enemyStats");

const WALL = 1;
const FLOOR = 0;

/**
 * Verifie SANS clone de grille ni BFS qu'un bloc roomSize x roomSize
 * centre sur (cx, cy) est entierement compose de mur - pre-filtre rapide
 * avant la simulation couteuse (clone + BFS), qui elle reste necessaire
 * pour confirmer une VRAIE isolation (cf. commentaire plus bas).
 */
function isAllWall(grid, cx, cy, half, width, height) {
  for (let oy = -half; oy <= half; oy++) {
    for (let ox = -half; ox <= half; ox++) {
      const x = cx + ox;
      const y = cy + oy;
      if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return false;
      if (grid[y][x] !== WALL) return false;
    }
  }
  return true;
}

/**
 * Repere les emplacements ou une salle secrete POURRAIT tenir a
 * l'interieur du terrain deja genere (contrairement a l'extension de
 * grille, cf. extendGridForSecretRoom, qui greffe la salle a l'exterieur
 * - fonctionne toujours mais rendu moins organique).
 *
 * Deux passes :
 * 1. Pre-filtre RAPIDE (isAllWall, pas de clone/BFS) - elimine l'immense
 *    majorite des candidats bruts en O(candidats x roomSize^2). Sur un
 *    labyrinthe a couloirs fins (wallThickness < roomSize), le mur ne
 *    forme jamais de bloc plein assez grand nulle part - ce pre-filtre
 *    le detecte en quelques dizaines de ms au lieu de faire tourner la
 *    simulation couteuse sur des milliers de candidats voues a l'echec
 *    (bug constate en prod : 41s+ puis timeout nginx, cf. CHANTIERS.md).
 * 2. Simulation complete (clone + BFS reel) sur les candidats qui passent
 *    le pre-filtre, mais SEULEMENT jusqu'au premier qui valide (candidats
 *    melanges au prealable) - la position exacte du bloc dans le mur ne
 *    garantit pas a 100% l'isolation reelle (topologie non locale), d'ou
 *    le besoin de garder cette verification, mais elle ne coute plus
 *    cher puisqu'on s'arrete au premier succes.
 *
 * @returns {{doorX,doorY,roomX,roomY}|null}
 */
function findInternalRoomCandidate(
  grid,
  reachable,
  width,
  height,
  roomSize,
  playerSpawn,
  rng,
) {
  const half = Math.floor(roomSize / 2);
  const margin = half + 3;
  const rawCandidates = [];
  for (const key of reachable) {
    const [x, y] = key.split(",").map(Number);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const doorX = x + dx;
      const doorY = y + dy;
      if (
        doorX < margin ||
        doorY < margin ||
        doorX >= width - margin ||
        doorY >= height - margin
      )
        continue;
      if (grid[doorY][doorX] !== WALL) continue;
      // decale de 2 pas (pas 1) depuis la porte, pour que le creusement
      // de la salle ne touche jamais la colonne/ligne de la porte, qui
      // reste donc muree naturellement sans rescellement manuel
      const roomX = doorX + dx * 2;
      const roomY = doorY + dy * 2;
      if (
        roomX < margin ||
        roomY < margin ||
        roomX >= width - margin ||
        roomY >= height - margin
      )
        continue;
      if (!isAllWall(grid, roomX, roomY, half, width, height)) continue;
      rawCandidates.push({ doorX, doorY, roomX, roomY });
    }
  }

  // melange (Fisher-Yates, seede) puis validation complete paresseuse,
  // arret au premier candidat reellement isole
  for (let i = rawCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rawCandidates[i], rawCandidates[j]] = [rawCandidates[j], rawCandidates[i]];
  }

  for (const c of rawCandidates) {
    const testGrid = grid.map((row) => row.slice());
    carveRoom(testGrid, c.roomX, c.roomY, roomSize);
    testGrid[c.doorY][c.doorX] = WALL;
    const testReachable = reachableFloorSet(testGrid, playerSpawn);
    if (!testReachable.has(`${c.roomX},${c.roomY}`)) {
      return c;
    }
  }
  return null;
}

/**
 * Trouve un emplacement pour la salle secrete en ETENDANT la grille vers
 * l'est (meme principe que carveBossRoom, cf. bossRoom.js) - solution de
 * SECOURS, utilisee uniquement quand findInternalRoomCandidate n'a rien
 * trouve (mur trop fin pour contenir une salle nulle part). Fonctionne
 * TOUJOURS, quels que soient passageWidth/wallThickness/le generateur,
 * mais rendu moins organique (la salle "depasse" visiblement du niveau
 * plutot que d'etre integree dedans).
 *
 * @returns {{grid:number[][], doorTile:{x,y}, roomCenter:{x,y}}}
 */
function extendGridForSecretRoom(grid, playerSpawn, reachable, roomSize, rng) {
  const height = grid.length;
  const originalWidth = grid[0].length;

  const reachableList = [...reachable];
  const [ox, oy] = reachableList[Math.floor(rng() * reachableList.length)]
    .split(",")
    .map(Number);

  const half = Math.floor(roomSize / 2);
  const margin = roomSize + 3;
  const newWidth = originalWidth + margin;

  const newGrid = grid.map((row) => {
    const extended = row.slice();
    while (extended.length < newWidth) extended.push(WALL);
    return extended;
  });

  const doorTile = { x: originalWidth - 1, y: oy };

  const xStart = Math.min(ox, originalWidth - 2);
  const xEnd = Math.max(ox, originalWidth - 2);
  for (let x = xStart; x <= xEnd; x++) {
    newGrid[oy][x] = FLOOR;
  }

  newGrid[doorTile.y][doorTile.x] = WALL; // scelle la porte

  const roomStartX = originalWidth;
  let carvedYMin = Infinity;
  let carvedYMax = -Infinity;
  for (let dx = 0; dx < roomSize; dx++) {
    for (let p = -half; p <= half; p++) {
      const x = roomStartX + dx;
      const y = doorTile.y + p;
      if (y < 1 || y >= height - 1 || x >= newWidth - 1) continue;
      newGrid[y][x] = FLOOR;
      if (y < carvedYMin) carvedYMin = y;
      if (y > carvedYMax) carvedYMax = y;
    }
  }

  const roomCenterY =
    carvedYMin <= carvedYMax
      ? Math.round((carvedYMin + carvedYMax) / 2)
      : doorTile.y;

  const roomCenter = {
    x: roomStartX + Math.floor(roomSize / 2),
    y: roomCenterY,
  };

  return { grid: newGrid, doorTile, roomCenter };
}

function carveRoom(grid, centerX, centerY, roomSize) {
  const half = Math.floor(roomSize / 2);
  const height = grid.length;
  const width = grid[0].length;
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const rx = centerX + dx;
      const ry = centerY + dy;
      if (rx < 1 || ry < 1 || rx >= width - 1 || ry >= height - 1) continue;
      grid[ry][rx] = FLOOR;
    }
  }
}

/**
 * Genere, RAREMENT (secretRoomChance, probabilite par etage - PAS par
 * case, contrairement aux pieges), une salle secrete sur cet etage - un
 * seul type de declenchement tire au hasard parmi 3, jamais plusieurs a
 * la fois sur le meme etage :
 *
 * - 'wall'   : mur illusoire SCELLE, ouvert par interaction (E) une fois
 *              adjacent - cote client uniquement, rien ici cote donnees
 * - 'lever'  : salle SCELLEE, 1 a 3 leviers caches ailleurs sur l'etage
 *              (memes cases de sol que le reste, pas dans la salle
 *              elle-meme), tous a actionner pour ouvrir la porte
 * - 'combat' : salle DEJA ouverte (jamais scellee, juste a l'ecart du
 *              chemin principal) - son coffre ne se deverrouille qu'une
 *              fois tous les ennemis places dedans vaincus
 *
 * Jamais appelee sur un etage a boss (cf. ArpgController - risquerait
 * de creuser dans/pres de la salle du boss, jamais teste ensemble).
 *
 * Trouve l'emplacement en 2 passes : (1) poche INTERNE au terrain deja
 * genere si geometriquement possible (rendu organique), (2) sinon,
 * extension de la grille en secours (fonctionne toujours, rendu moins
 * organique) - cf. commentaires de findInternalRoomCandidate /
 * extendGridForSecretRoom ci-dessus pour le detail et l'historique du
 * bug de timeout que ce systeme a 2 passes corrige.
 *
 * @param {number[][]} grid
 * @param {string} seed
 * @param {{x:number,y:number}} playerSpawn
 * @param {number} [secretRoomChance] probabilite (0-1) qu'une salle
 *   secrete existe sur CET etage - absent/0 = jamais
 * @param {number} depth
 * @param {object} biome cf. biomeConfig.js - utilise enemyTypes pour le
 *   trigger 'combat'
 * @returns {object|null} null si aucune salle cette fois (frequence non
 *   atteinte - il y a toujours un emplacement trouve des que la chance
 *   est tiree, grace au secours par extension de grille)
 */
function generateSecretRoom(
  grid,
  seed,
  playerSpawn,
  secretRoomChance,
  depth,
  biome,
) {
  if (!secretRoomChance) return null;
  const rng = createRng(`${seed}-secret-room`);
  if (rng() >= secretRoomChance) return null;

  const height = grid.length;
  const width = grid[0].length;
  const roomSize = 3;
  const reachable = reachableFloorSet(grid, playerSpawn);

  // 1. essaie d'abord une poche INTERNE (rendu organique, integre au niveau)
  const internal = findInternalRoomCandidate(
    grid,
    reachable,
    width,
    height,
    roomSize,
    playerSpawn,
    rng,
  );

  let newGrid;
  let chosen;
  if (internal) {
    newGrid = grid.map((row) => row.slice());
    carveRoom(newGrid, internal.roomX, internal.roomY, roomSize);
    chosen = internal;
  } else {
    // 2. secours : aucune poche interne possible (mur trop fin pour
    // cette taille de salle) - on greffe la salle en exterieur, comme
    // pour les salles de boss
    const extended = extendGridForSecretRoom(
      grid,
      playerSpawn,
      reachable,
      roomSize,
      rng,
    );
    newGrid = extended.grid;
    chosen = {
      doorX: extended.doorTile.x,
      doorY: extended.doorTile.y,
      roomX: extended.roomCenter.x,
      roomY: extended.roomCenter.y,
    };
  }

  const triggerTypes = ["wall", "lever", "combat"];
  const triggerType = triggerTypes[Math.floor(rng() * triggerTypes.length)];

  const rewardTypes = ["unique", "recipe", "loot"];
  const rewardType = rewardTypes[Math.floor(rng() * rewardTypes.length)];

  const result = {
    triggerType,
    doorTile: { x: chosen.doorX, y: chosen.doorY },
    roomCenter: { x: chosen.roomX, y: chosen.roomY },
    roomSize,
    rewardType,
  };

  if (triggerType === "wall") {
    // porte deja bloquee (murée naturellement pour le cas interne, ou
    // scellee explicitement dans extendGridForSecretRoom pour le cas
    // exterieur) - ouverte cote client par interaction, rien a faire ici
  } else if (triggerType === "lever") {
    newGrid[chosen.doorY][chosen.doorX] = WALL; // deja bloquee, reaffectation explicite par securite/clarte

    const leverCount = 1 + Math.floor(rng() * 3); // 1 a 3
    const leverCandidates = [...reachable].filter((k) => {
      const [x, y] = k.split(",").map(Number);
      return !(x === playerSpawn.x && y === playerSpawn.y);
    });
    const leverTiles = [];
    for (let i = 0; i < leverCount && leverCandidates.length > 0; i++) {
      const idx = Math.floor(rng() * leverCandidates.length);
      const [x, y] = leverCandidates[idx].split(",").map(Number);
      leverTiles.push({ x, y });
      leverCandidates.splice(idx, 1);
    }
    result.leverTiles = leverTiles;
  } else if (triggerType === "combat") {
    newGrid[chosen.doorY][chosen.doorX] = FLOOR; // DEJA ouverte - pas scellee, juste a l'ecart

    const enemyCount = 2 + Math.floor(rng() * 2); // 2 a 3
    const enemyTypeCandidates = biome.enemyTypes || ["enemyDefault"];
    const half = Math.floor(roomSize / 2);
    const enemySpawns = [];
    for (let i = 0; i < enemyCount; i++) {
      const ex = chosen.roomX + Math.floor(rng() * (2 * half + 1)) - half;
      const ey = chosen.roomY + Math.floor(rng() * (2 * half + 1)) - half;
      const typeKey =
        enemyTypeCandidates[Math.floor(rng() * enemyTypeCandidates.length)];
      const stats = getEnemyStatsForDepth(depth, typeKey);
      enemySpawns.push({
        x: ex,
        y: ey,
        type: typeKey,
        hp: stats.hp,
        maxHp: stats.hp,
        damage: stats.damage,
        defense: stats.defense,
        speed: stats.speed,
        xpReward: stats.xpReward,
        attackType: stats.attackType,
        damageType: stats.damageType || "physical",
        resistances: stats.resistances || {},
      });
    }
    result.enemySpawns = enemySpawns;
  }

  result.grid = newGrid;
  return result;
}

module.exports = { generateSecretRoom };
