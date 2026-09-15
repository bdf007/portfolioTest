const { createRng } = require("./rng");

const FLOOR = 0;

function pickWeightedEntry(rng, entries) {
  const totalWeight = entries.reduce((s, e) => s + (e.weight || 1), 0);
  let roll = rng() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight || 1;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1];
}

/**
 * Genere des noeuds de recolte (arbres/plantes) sur cet etage - copie
 * quasi conforme de miningRockGenerator.js (memes principes : cases de
 * sol normales, praticables, aucune contrainte d'isolement), volontairement
 * dupliquee plutot que fusionnee pour ne jamais risquer de casser le
 * systeme de minage deja teste et stable.
 *
 * Plus FREQUENT que le minage par defaut (forageConfig.nodeChance/
 * minNodes/maxNodes plus genereux dans biomeConfig.js) - objectif de
 * remplir visuellement le biome, pas d'etre rare comme les rochers/
 * salles secretes.
 *
 * @returns {{x:number,y:number,requiredTier:number,resourceItemId:string,totalHits:number,bonusChance:number,bonusPool:object[]}[]}
 */
function generateForageNodes(grid, lootSeed, playerSpawn, forageConfig, allowedTiles) {
  if (!forageConfig || !forageConfig.nodeChance) return [];

  const rng = createRng(`${lootSeed}-forage-node`);
  if (rng() >= forageConfig.nodeChance) return [];

  const height = grid.length;
  const width = grid[0].length;
  const candidates = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== FLOOR) continue;
      if (x === playerSpawn.x && y === playerSpawn.y) continue;
      if (allowedTiles && !allowedTiles.has(`${x},${y}`)) continue;
      candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return [];

  const minNodes = forageConfig.minNodes || 1;
  const maxNodes = forageConfig.maxNodes || minNodes;
  const nodeCount = Math.min(
    candidates.length,
    minNodes + Math.floor(rng() * (maxNodes - minNodes + 1)),
  );

  const resourcePool = forageConfig.resourcePool || [];
  const [minHits, maxHits] = Array.isArray(forageConfig.totalHits)
    ? forageConfig.totalHits
    : [forageConfig.totalHits || 4, forageConfig.totalHits || 4];

  const nodes = [];
  const remainingCandidates = [...candidates];
  for (let i = 0; i < nodeCount && remainingCandidates.length > 0; i++) {
    const idx = Math.floor(rng() * remainingCandidates.length);
    const spot = remainingCandidates[idx];
    remainingCandidates.splice(idx, 1);

    const pickedResource =
      resourcePool.length > 0
        ? pickWeightedEntry(rng, resourcePool)
        : { itemId: "wood", requiredTier: 1 };

    const totalHits = minHits + Math.floor(rng() * (maxHits - minHits + 1));

    nodes.push({
      x: spot.x,
      y: spot.y,
      requiredTier: pickedResource.requiredTier || 1,
      resourceItemId: pickedResource.itemId,
      totalHits,
      bonusChance: forageConfig.bonusChance || 0,
      bonusPool: forageConfig.bonusPool || [],
    });
  }
  return nodes;
}

module.exports = { generateForageNodes };
