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
 * Genere, RAREMENT (miningConfig.rockChance, un seul tirage par etage -
 * PAS par gisement), un ou plusieurs gisements de minage sur cet etage -
 * entre minRocks et maxRocks si le tirage de rarete reussit, jamais
 * plus qu'un seul tirage de rarete pour tout l'etage.
 *
 * Chaque gisement pioche INDEPENDAMMENT sa ressource dans resourcePool
 * (pondere, meme mecanisme que gemPool) - deux gisements sur le meme
 * etage peuvent donc donner des metaux differents.
 *
 * Contrairement aux salles secretes, aucune contrainte d'isolement -
 * chaque gisement est pose sur une case de sol NORMALE, praticable
 * comme n'importe quelle autre (le joueur peut marcher dessus/a
 * travers, volontairement, pour ne jamais se retrouver bloque si son
 * outil actuel n'a pas le niveau requis).
 *
 * @param {number[][]} grid
 * @param {string} lootSeed variable a chaque VRAIE nouvelle visite,
 *   comme les coffres/pieges - les gisements changent d'endroit/de
 *   contenu a chaque revisite reelle, stables en simple sauvegarde+reprise
 * @param {{x:number,y:number}} playerSpawn
 * @param {object} [miningConfig] cf. biomeConfig.js
 * @param {Set<string>} [allowedTiles] meme registre que coffres/pieges
 * @returns {{x:number,y:number,requiredTier:number,resourceItemId:string,totalHits:number,gemChance:number,gemPool:object[]}[]}
 *   tableau vide si aucun gisement cette fois (frequence non atteinte,
 *   ou aucun emplacement valide)
 */
function generateMiningRocks(
  grid,
  lootSeed,
  playerSpawn,
  miningConfig,
  allowedTiles,
) {
  if (!miningConfig || !miningConfig.rockChance) return [];

  const rng = createRng(`${lootSeed}-mining-rock`);
  if (rng() >= miningConfig.rockChance) return [];

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

  const minRocks = miningConfig.minRocks || 1;
  const maxRocks = miningConfig.maxRocks || minRocks;
  const rockCount = Math.min(
    candidates.length,
    minRocks + Math.floor(rng() * (maxRocks - minRocks + 1)),
  );

  const resourcePool = miningConfig.resourcePool || [];
  const [minHits, maxHits] = Array.isArray(miningConfig.totalHits)
    ? miningConfig.totalHits
    : [miningConfig.totalHits || 4, miningConfig.totalHits || 4];

  const rocks = [];
  const remainingCandidates = [...candidates];
  for (let i = 0; i < rockCount && remainingCandidates.length > 0; i++) {
    const idx = Math.floor(rng() * remainingCandidates.length);
    const spot = remainingCandidates[idx];
    remainingCandidates.splice(idx, 1);

    const pickedResource =
      resourcePool.length > 0
        ? pickWeightedEntry(rng, resourcePool)
        : {
            itemId: miningConfig.resourceItemId,
            requiredTier: miningConfig.requiredTier,
          }; // repli retrocompatible pour un ancien biomeConfig sans resourcePool

    const totalHits = minHits + Math.floor(rng() * (maxHits - minHits + 1));

    rocks.push({
      x: spot.x,
      y: spot.y,
      requiredTier: pickedResource.requiredTier || 1,
      resourceItemId: pickedResource.itemId,
      totalHits,
      gemChance: miningConfig.gemChance || 0,
      gemPool: miningConfig.gemPool || [],
    });
  }
  return rocks;
}

module.exports = { generateMiningRocks };
