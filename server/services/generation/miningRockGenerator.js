const { createRng } = require("./rng");

const FLOOR = 0;

function pickWeighted(rng, entries) {
  const totalWeight = entries.reduce((s, e) => s + (e.weight || 1), 0);
  let roll = rng() * totalWeight;
  for (const entry of entries) {
    roll -= entry.weight || 1;
    if (roll <= 0) return entry.itemId;
  }
  return entries[entries.length - 1].itemId;
}

/**
 * Genere, RAREMENT (miningConfig.rockChance, probabilite par etage - PAS
 * par case), un gisement de minage sur cet etage - une seule case, avec
 * un niveau d'outil requis et un nombre de coups avant epuisement.
 *
 * Contrairement aux salles secretes, aucune contrainte d'isolement -
 * le gisement est pose sur une case de sol NORMALE, praticable comme
 * n'importe quelle autre (le joueur peut marcher dessus/a travers,
 * volontairement, pour ne jamais se retrouver bloque si son outil
 * actuel n'a pas le niveau requis).
 *
 *
 * @param {number[][]} grid
 * @param {string} lootSeed variable a chaque VRAIE nouvelle visite,
 *   comme les coffres/pieges - le gisement change d'endroit/de contenu
 *   a chaque revisite reelle, stable en simple sauvegarde+reprise
 * @param {{x:number,y:number}} playerSpawn
 * @param {object} [miningConfig] cf. biomeConfig.js
 * @param {Set<string>} [allowedTiles] meme registre que coffres/pieges
 * @returns {{x:number,y:number,requiredTier:number,resourceItemId:string,totalHits:number}|null}
 */
function generateMiningRock(
  grid,
  lootSeed,
  playerSpawn,
  miningConfig,
  allowedTiles,
) {
  if (!miningConfig || !miningConfig.rockChance) return null;

  const rng = createRng(`${lootSeed}-mining-rock`);
  if (rng() >= miningConfig.rockChance) return null;

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
  if (candidates.length === 0) return null;

  const chosen = candidates[Math.floor(rng() * candidates.length)];

  const [minHits, maxHits] = Array.isArray(miningConfig.totalHits)
    ? miningConfig.totalHits
    : [miningConfig.totalHits || 4, miningConfig.totalHits || 4];
  const totalHits = minHits + Math.floor(rng() * (maxHits - minHits + 1));

  return {
    x: chosen.x,
    y: chosen.y,
    requiredTier: miningConfig.requiredTier || 1,
    resourceItemId: miningConfig.resourceItemId,
    totalHits,
    gemChance: miningConfig.gemChance || 0,
    gemPool: miningConfig.gemPool || [],
  };
}

module.exports = { generateMiningRock };
