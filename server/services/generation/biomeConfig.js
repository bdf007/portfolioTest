/**
 * Un biome = un générateur de niveau + un tileset visuel associé,
 * valables pour une plage de profondeurs, plus la liste des archétypes
 * d'ennemis (cf. enemyStats.js) qui peuvent y apparaître.
 *
 * Le code qui construit la tilemap Phaser ne dépend jamais du biome
 * directement : il reçoit juste le tableau 2D produit par `generator`,
 * quel que soit l'algorithme utilisé derrière. Même logique pour les
 * ennemis : ArpgController choisit un type par ennemi dans `enemyTypes`,
 * le client se contente d'afficher le sprite correspondant (cf.
 * spriteRegistry.js côté client) - il ne choisit jamais lui-même.
 *
 * `generatorParams` (optionnel) - reglages propres au generateur du
 * biome (roomSize, doorWidth, wallProbability, passageWidth, width/
 * height...), fusionnes PAR-DESSUS une base {width:40, height:40} dans
 * ArpgController.js. Ajuster le "ressenti" d'un biome (des salles plus
 * grandes, un labyrinthe plus large...) se fait donc ICI, jamais en
 * modifiant le generateur lui-meme (qui reste generique, partage entre
 * tous les biomes qui l'utilisent) ni le switch d'ArpgController.js.
 * Absent = le generateur utilise ses propres valeurs par defaut.
 */
const MAX_DEPTH = 100; // pas de biome infini - le jeu s'arrete a cet etage

const BIOMES = [
  {
    id: "cave",
    minDepth: 1,
    maxDepth: 1,
    generator: "cellular",
    tileset: "cave",
    enemyBaseCount: 10,
    enemyTypes: ["bat1", "bat1a"],
    chestCount: [1, 3],
    generatorParams: { wallProbability: 0.1, minFloorRatio: 0.6 },
  },
  {
    id: "desert",
    minDepth: 2,
    maxDepth: 2,
    generator: "cellular",
    tileset: "desert",
    enemyBaseCount: 10,
    enemyTypes: ["bee1", "bird1", "maxibee1"],
    chestCount: [1, 3],
    generatorParams: { wallProbability: 0.3, minFloorRatio: 0.4 },
  },
  {
    id: "desert",
    minDepth: 3,
    maxDepth: 3,
    generator: "randomwalk",
    tileset: "desert",
    enemyBaseCount: 7,
    enemyTypes: ["BigBug"],
    chestCount: [1, 3],
    generatorParams: {
      roomSize: 5,
      roomCount: 10,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "forest",
    minDepth: 4,
    maxDepth: 4,
    generator: "drunkardwalk",
    tileset: "tree",
    enemyBaseCount: 15,
    enemyTypes: ["GiantFox"],
    chestCount: [2, 3],
    generatorParams: { targetFloorRatio: 0.5, maxSteps: 60000, walkerCount: 5 },
  },
  {
    id: "desert",
    minDepth: 5,
    maxDepth: 5,
    generator: "noise",
    tileset: "desert",
    enemyBaseCount: 10,
    enemyTypes: ["orc4", "orc5", "orc6"],
    chestCount: [2, 4],
    generatorParams: { noiseScale: 10 },
  },
  {
    id: "forest",
    minDepth: 6,
    maxDepth: 6,
    generator: "voronoi",
    tileset: "tree",
    enemyBaseCount: 11,
    enemyTypes: ["orc7", "orc8"],
    chestCount: [2, 4],
    generatorParams: { cellCount: 25 },
  },
  {
    id: "forest",
    minDepth: 7,
    maxDepth: 7,
    generator: "voronoi",
    tileset: "tree",
    enemyBaseCount: 11,
    enemyTypes: ["orc7", "orc8"],
    chestCount: [2, 4],
    generatorParams: { cellCount: 3 },
  },
  {
    id: "forest",
    minDepth: 8,
    maxDepth: 8,
    generator: "voronoi",
    tileset: "tree",
    enemyBaseCount: 11,
    enemyTypes: ["orc7", "orc8"],
    chestCount: [2, 4],
    generatorParams: { cellCount: 10 },
  },
  {
    id: "maze",
    minDepth: 9,
    maxDepth: 9,
    generator: "maze",
    tileset: "desert",
    enemyBaseCount: 12,
    enemyTypes: ["orc1", "orc2", "orc3"],
    chestCount: [2, 3],
    // passageWidth:2 (pas le defaut 1 du generateur, "labyrinthe pur"
    // traditionnel) - un couloir d'une seule case serait tres
    // inconfortable pour l'esquive/les projectiles/le deplacement des
    // ennemis une fois le niveau reellement jouable
    generatorParams: { passageWidth: 2 },
  },
  {
    id: "maze",
    minDepth: 10,
    maxDepth: 11,
    generator: "maze",
    tileset: "tree",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 5 },
  },
  {
    id: "maze",
    minDepth: 12,
    maxDepth: 12,
    generator: "maze",
    tileset: "tree",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 5, wallThickness: 3 },
  },
  {
    id: "maze",
    minDepth: 13,
    maxDepth: 13,
    generator: "maze",
    tileset: "tree",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 2, wallThickness: 3 },
  },
  {
    id: "maze",
    minDepth: 14,
    maxDepth: 14,
    generator: "maze",
    tileset: "tree",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 2, wallThickness: 2 },
  },
  {
    id: "maze",
    minDepth: 15,
    maxDepth: 16,
    generator: "maze",
    tileset: "tree",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 2, wallThickness: 3 },
  },
  {
    id: "voronoi",
    minDepth: 17,
    maxDepth: 19,
    generator: "voronoi",
    tileset: "voronoi",
    enemyBaseCount: 11,
    enemyTypes: ["orc7", "orc8"],
    chestCount: [2, 4],
  },

  {
    id: "temple",
    minDepth: 20,
    maxDepth: MAX_DEPTH,
    generator: "bsp",
    tileset: "temple",
    enemyBaseCount: 10,
    enemyTypes: ["enemy1", "enemy2"],
    chestCount: [2, 4],
    // niveaux plus grands et plus ouverts en fin de progression, cf.
    // /areas/phaser-arpg.md - d'ou une grille plus large que les autres
    // biomes
    generatorParams: { width: 60, height: 60 },
  },
  // D'autres biomes sont prevus entre depth 10 et MAX_DEPTH (l'enchainement
  // exact reste a definir) - le jour venu, reduire la plage de `temple`
  // et inserer les nouvelles entrees ici, chacune avec sa propre plage
  // finie. Aucun changement necessaire au mecanisme des villes
  // (TOWN_INTERVAL) ni a MAX_DEPTH pour ca - les deux se combinent
  // automatiquement avec n'importe quelle liste de plages (teste).
];

/**
 * La ville n'est PAS une plage de profondeurs comme les autres - elle
 * revient périodiquement (cf. TOWN_INTERVAL) par-dessus la progression
 * normale, y compris à l'intérieur de la plage infinie de `temple`.
 * Découper des plages contiguës autour de chaque occurrence serait
 * impraticable (il en faudrait une infinité) - on intercepte donc les
 * profondeurs concernées AVANT la recherche par plage habituelle,
 * plutôt que d'essayer de faire tenir la ville dans le même système que
 * cave/ruins/temple. La progression normale n'a besoin d'aucun
 * ajustement de bornes pour ça : depth 9 reste géré par ruins, depth 11
 * reprend temple exactement comme si depth 10 n'avait jamais existé.
 */
const TOWN_BIOME = {
  id: "town",
  generator: "town",
  tileset: "town",
  enemyBaseCount: 0,
  enemyTypes: [],
  chestCount: [0, 0], // zone sure, pas de butin de donjon (une boutique viendra separement)
};

const TOWN_INTERVAL = 10;

function isTownDepth(depth) {
  return depth % TOWN_INTERVAL === 0;
}

function getBiomeForDepth(depth) {
  if (isTownDepth(depth)) {
    return TOWN_BIOME;
  }

  const biome = BIOMES.find((b) => depth >= b.minDepth && depth <= b.maxDepth);
  if (biome) return biome;

  // aucune plage ne matche : soit depth <= 0 (ne devrait jamais arriver),
  // soit depth > MAX_DEPTH. Il n'existe pas encore de vrai ecran de fin
  // de partie/victoire a l'etage 100 - ce repli est un garde-fou
  // temporaire qui reste sur le DERNIER biome reel plutot que de
  // regresser brutalement vers 'cave', le temps qu'une vraie condition
  // de fin soit construite.
  return depth > MAX_DEPTH ? BIOMES[BIOMES.length - 1] : BIOMES[0];
}

module.exports = {
  BIOMES,
  TOWN_BIOME,
  TOWN_INTERVAL,
  MAX_DEPTH,
  isTownDepth,
  getBiomeForDepth,
};
