const { createRng } = require("./rng");
const { reachableFloorSet } = require("./bossRoom");
const { getEnemyStatsForDepth } = require("./enemyStats");

const WALL = 1;
const FLOOR = 0;

/**
 * Trouve les emplacements ou une salle secrete peut etre creusee, en
 * verifiant par SIMULATION REELLE (creuse + scelle la porte + refait un
 * calcul d'accessibilite complet) que la salle obtenue est VRAIMENT
 * isolee - pas juste "semble isolee" a partir d'une heuristique locale.
 *
 * Necessaire suite a un bug constate en jeu : une simple verification
 * "la case de la porte + la zone de la salle ne sont pas deja
 * accessibles" ne suffit pas dans un terrain organique (cavernes) - la
 * salle peut se retrouver adjacente a un AUTRE passage deja existant,
 * ou le creusement de la salle 3x3 peut chevaucher la colonne/ligne de
 * la porte elle-meme (roomSize=3 => la porte n'est qu'UNE case parmi 3
 * sur cette face, les 2 autres restaient alors des ouvertures non
 * voulues, jamais rescellees). D'ou :
 * - `roomX`/`roomY` decales de 2 pas (pas 1) depuis la porte, pour que
 *   le creusement de la salle ne touche JAMAIS la colonne/ligne de la
 *   porte, qui reste donc murée naturellement sans rescellement manuel
 * - simulation complete (creuse + mur sur la porte + reachableFloorSet)
 *   avant d'accepter un candidat, plutot que de deviner a l'avance
 *
 * Plus couteux (une simulation BFS par candidat brut) mais reste de
 * l'ordre de quelques ms a quelques dizaines de ms par appel - negligeable
 * a la generation d'un etage, executee une seule fois.
 */
function findRoomCandidates(
  grid,
  reachable,
  width,
  height,
  roomSize,
  playerSpawn,
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
      // decale de 2 pas (pas 1) depuis la porte - cf. commentaire ci-dessus
      const roomX = doorX + dx * 2;
      const roomY = doorY + dy * 2;
      if (
        roomX < margin ||
        roomY < margin ||
        roomX >= width - margin ||
        roomY >= height - margin
      )
        continue;
      rawCandidates.push({ doorX, doorY, roomX, roomY });
    }
  }

  const validCandidates = [];
  for (const c of rawCandidates) {
    const testGrid = grid.map((row) => row.slice());
    carveRoom(testGrid, c.roomX, c.roomY, roomSize);
    testGrid[c.doorY][c.doorX] = WALL;
    const testReachable = reachableFloorSet(testGrid, playerSpawn);
    if (!testReachable.has(`${c.roomX},${c.roomY}`)) {
      validCandidates.push(c);
    }
  }
  return validCandidates;
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
 * @param {number[][]} grid
 * @param {string} seed
 * @param {{x:number,y:number}} playerSpawn
 * @param {number} [secretRoomChance] probabilite (0-1) qu'une salle
 *   secrete existe sur CET etage - absent/0 = jamais
 * @param {number} depth
 * @param {object} biome cf. biomeConfig.js - utilise enemyTypes pour le
 *   trigger 'combat'
 * @returns {object|null} null si aucune salle cette fois (frequence non
 *   atteinte, ou aucun emplacement valide trouve sur cette grille)
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
  const candidates = findRoomCandidates(
    grid,
    reachable,
    width,
    height,
    roomSize,
    playerSpawn,
  );
  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(rng() * candidates.length)];
  const newGrid = grid.map((row) => row.slice());
  carveRoom(newGrid, chosen.roomX, chosen.roomY, roomSize);

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
    // porte deja MUREE naturellement (jamais touchee par carveRoom,
    // decalee de 2 pas - cf. findRoomCandidates) - ouverte cote client
    // par interaction, rien a faire ici
  } else if (triggerType === "lever") {
    newGrid[chosen.doorY][chosen.doorX] = WALL; // deja murée naturellement (idem ci-dessus) - reaffectation explicite, juste par securite/clarte

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

/**
 * Verification LEGERE (aucune grille necessaire) - repond juste "cet
 * etage a-t-il une salle secrete", pour un PNJ de ville qui veut y
 * faire allusion sans avoir besoin de regenerer tout le donjon
 * correspondant.
 */
function secretRoomExists(seed, secretRoomChance) {
  if (!secretRoomChance) return false;
  const rng = createRng(`${seed}-secret-room`);
  return rng() < secretRoomChance;
}

module.exports = { generateSecretRoom, secretRoomExists };
