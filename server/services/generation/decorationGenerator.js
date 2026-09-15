const { generateEnemySpawns } = require("./enemySpawner");
const { createRng } = require("./rng");

/**
 * Place des elements purement DECORATIFS sur un niveau - aucune
 * interaction, aucun contenu, juste une position et un type de decor
 * choisi au hasard parmi decorTypes. Reutilise generateEnemySpawns pour
 * le placement, comme generateChests.
 *
 * Contrairement aux coffres/caisses/rochers/arbres, la position varie a
 * chaque VRAIE nouvelle visite (lootSeed) - un decor n'a pas besoin de
 * rester fixe pour toujours, rien n'en depend cote gameplay.
 *
 * @param {Object} options
 * @param {number[][]} options.grid
 * @param {string} options.lootSeed
 * @param {{x:number,y:number}} options.playerSpawn
 * @param {number[]} options.count fourchette [min,max]
 * @param {string[]} options.decorTypes types de decor disponibles (cles
 *   arbitraires, resolues cote client en sprite/couleur)
 * @param {Set<string>} [options.allowedTiles]
 * @returns {{x:number,y:number,decorType:string}[]}
 */
function generateDecorations({
  grid,
  lootSeed,
  playerSpawn,
  count,
  decorTypes,
  allowedTiles = null,
}) {
  if (!decorTypes || decorTypes.length === 0) return [];
  const [min, max] = Array.isArray(count) ? count : [count, count];
  if (max <= 0) return [];

  const countRng = createRng(`${lootSeed}-decor-count`);
  const total = min + Math.floor(countRng() * (max - min + 1));
  if (total <= 0) return [];

  const positions = generateEnemySpawns({
    grid,
    seed: `${lootSeed}-decor-positions`,
    playerSpawn,
    enemyCount: total,
    minDistanceFromPlayer: 1,
    minDistanceBetweenEnemies: 2, // plus serres que coffres/rochers - purement visuel, pas de gameplay a proteger
    allowedTiles,
  });

  const typeRng = createRng(`${lootSeed}-decor-types`);
  return positions.map((pos) => ({
    x: pos.x,
    y: pos.y,
    decorType: decorTypes[Math.floor(typeRng() * decorTypes.length)],
  }));
}

module.exports = { generateDecorations };
