const { createRng } = require("./rng");

/**
 * Place des pieges caches sur les cases de sol d'un niveau - tirage
 * INDEPENDANT par case (frequency = probabilite), pas un nombre fixe
 * comme les coffres/ennemis.
 *
 * @param {number[][]} grid
 * @param {string} seed
 * @param {{x:number,y:number}} playerSpawn
 * @param {object} trapConfig {frequency, damageType, damageAmount, inflictsEffect}
 * @param {Set<string>} [allowedTiles]
 * @returns {{x:number,y:number,damageType:string,damageAmount:number,inflictsEffect:object|null}[]}
 */
function generateTraps(grid, seed, playerSpawn, trapConfig, allowedTiles = null) {
  if (!trapConfig || !trapConfig.frequency) return [];

  const rng = createRng(`${seed}-traps`);
  const [minDmg, maxDmg] = Array.isArray(trapConfig.damageAmount)
    ? trapConfig.damageAmount
    : [trapConfig.damageAmount, trapConfig.damageAmount];

  const traps = [];
  const height = grid.length;
  const width = grid[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== 0) continue;
      if (x === playerSpawn.x && y === playerSpawn.y) continue;
      if (allowedTiles && !allowedTiles.has(`${x},${y}`)) continue;
      if (rng() >= trapConfig.frequency) continue;

      traps.push({
        x,
        y,
        damageType: trapConfig.damageType || "physical",
        damageAmount: Math.round(minDmg + rng() * (maxDmg - minDmg)),
        inflictsEffect: trapConfig.inflictsEffect || null,
      });
    }
  }
  return traps;
}

module.exports = { generateTraps };
