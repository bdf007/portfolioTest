const { generateEnemySpawns } = require("./enemySpawner");
const { rollLoot } = require("./itemTypes");
const { createRng } = require("./rng");

/**
 * Place des coffres sur un niveau déjà généré, avec leur contenu déjà
 * tiré au sort (déterministe, comme le reste de la génération - même
 * seed = mêmes coffres, aux mêmes endroits, avec le même contenu).
 *
 * Réutilise generateEnemySpawns pour le PLACEMENT (l'algorithme -
 * disperser N points sur les cases de sol en respectant des distances
 * minimales - n'a rien de spécifique aux ennemis, malgré son nom) plutôt
 * que de dupliquer la même logique. Seeds distinctes pour position et
 * contenu, pour ne jamais coupler les deux tirages.
 *
 * Le contenu est tiré ICI, à la génération — mais avec une seed
 * DISTINCTE de celle du niveau (`lootSeed`, pas `seed`) : la position
 * des coffres reste fixe pour toujours pour un étage donné (comme la
 * position des ennemis, cohérent avec le reste), mais leur CONTENU doit
 * varier a chaque nouvelle visite, sinon un coffre repéré comme "donne
 * une arme" deviendrait une source infinie du même objet en faisant
 * simplement des allers-retours d'étage (cf. MainScene.js,
 * this.currentFloorLootSeed - régénérée a chaque VRAIE nouvelle visite,
 * conservée telle quelle en cas de simple sauvegarde+reprise).
 *
 * @param {Object} options
 * @param {number[][]} options.grid
 * @param {string} options.seed seed du niveau - position/nombre de coffres (fixe pour toujours)
 * @param {string} [options.lootSeed] seed du contenu - varie a chaque visite (repli sur `seed` si absente, pour rester utilisable meme sans ce parametre)
 * @param {{x:number, y:number}} options.playerSpawn
 * @param {number[]} options.chestCount fourchette [min, max] du nombre de coffres (ex: [1,3]) - tiree au sort avec `seed`
 * @param {Set<string>} [options.allowedTiles] cf. generateEnemySpawns -
 *   exclut une zone scellee (salle de boss non ouverte) du placement
 * @returns {{x:number, y:number, opened:boolean, loot:{itemId:string,quantity:number}|null}[]}
 */
function generateChests({
  grid,
  seed,
  lootSeed,
  playerSpawn,
  chestCount,
  allowedTiles = null,
}) {
  const [min, max] = Array.isArray(chestCount)
    ? chestCount
    : [chestCount, chestCount];
  if (max <= 0) return [];

  const countRng = createRng(`${seed}-chest-count`);
  const count = min + Math.floor(countRng() * (max - min + 1));
  if (count <= 0) return [];

  const positions = generateEnemySpawns({
    grid,
    seed: `${seed}-chest-positions`,
    playerSpawn,
    enemyCount: count,
    minDistanceFromPlayer: 3, // plus proche du spawn que les ennemis (pas dangereux, pas besoin de les eloigner)
    minDistanceBetweenEnemies: 5, // plus espaces entre eux que les ennemis (pas de paquet de coffres cote a cote)
    allowedTiles,
  });

  const lootRng = createRng(`${lootSeed || seed}-chest-loot`);
  return positions.map((pos) => ({
    x: pos.x,
    y: pos.y,
    opened: false,
    loot: rollLoot("chestStandard", lootRng),
  }));
}

module.exports = { generateChests };
