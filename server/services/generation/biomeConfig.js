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
    id: "cave1",
    minDepth: 1,
    maxDepth: 6,
    generator: "cavechain",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    bossRoomSize: 40,
    enemyTypes: ["deer1", "angryBrownMushroom", "gnome"],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1, // 0.15 pour 15% de chances par etage - reste absent/0 sur un biome = jamais de salle secrete
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,

      resourcePool: [
        { itemId: "copperOre", weight: 5, requiredTier: 1 },
        { itemId: "coalOre", weight: 1, requiredTier: 1 },
      ],
      totalHits: [1, 6], // nombre de coups avant epuisement
      gemChance: 0.15, // 15% de chance PAR COUP d'obtenir une gemme a la place du metal
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
        { itemId: "ironOre", weight: 0.5 },
      ],
    },
    generatorParams: {
      width: 40,
      height: 40,
      roomSize: 5,
      roomCount: 10,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "cave2",
    minDepth: 7,
    maxDepth: 7,
    generator: "randomwalk",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    bossRoomSize: 40,
    enemyTypes: ["angryTrent"],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1, // 0.15 pour 15% de chances par etage - reste absent/0 sur un biome = jamais de salle secrete
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,

      resourcePool: [{ itemId: "ironOre", weight: 1, requiredTier: 2 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: {
      width: 40,
      height: 40,
      roomSize: 5,
      roomCount: 10,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "desert1",
    minDepth: 8,
    maxDepth: 8,
    generator: "randomwalk",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["gnome"],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "silverOre", weight: 1, requiredTier: 3 }], // objet obtenu a chaque coup
      totalHits: [1, 6], // nombre de coups avant epuisement
      gemChance: 0.15, // 15% de chance PAR COUP d'obtenir une gemme a la place du metal
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: {
      width: 40,
      height: 40,
      roomSize: 5,
      roomCount: 20,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "forest2",
    minDepth: 9,
    maxDepth: 9,
    generator: "voronoi",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["knifedBat"],
    chestCount: [2, 4],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "goldOre", weight: 5, requiredTier: 5 }], // objet obtenu a chaque coup
      totalHits: [1, 6], // nombre de coups avant epuisement
      gemChance: 0.15, // 15% de chance PAR COUP d'obtenir une gemme a la place du metal
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: { cellCount: 25 },
  },
  {
    id: "cave4",
    minDepth: 10,
    maxDepth: 10,
    generator: "noise",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["mudGolem"],
    chestCount: [1, 3],
    bossRoomSize: 40,
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "platinumOre", weight: 5, requiredTier: 6 }], // objet obtenu a chaque coup
      totalHits: [1, 6], // nombre de coups avant epuisement
      gemChance: 0.15, // 15% de chance PAR COUP d'obtenir une gemme a la place du metal
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: {
      width: 40,
      height: 40,
      passageWidth: 2,
      wallThickness: 1,
    },
  },
  {
    id: "desert2",
    minDepth: 11,
    maxDepth: 11,
    generator: "randomwalk",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["redBeetle"],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "cobaltOre", weight: 5, requiredTier: 7 }], // objet obtenu a chaque coup
      totalHits: [1, 6], // nombre de coups avant epuisement
      gemChance: 0.15, // 15% de chance PAR COUP d'obtenir une gemme a la place du metal
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: {
      width: 40,
      height: 40,
      roomSize: 5,
      roomCount: 20,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "desert3",
    minDepth: 12,
    maxDepth: 12,
    generator: "noise",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["pinkOgre"],
    chestCount: [2, 4],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "adamantineOre", weight: 5, requiredTier: 8 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: { noiseScale: 10 },
  },
  {
    id: "forest2",
    minDepth: 13,
    maxDepth: 13,
    generator: "voronoi",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["mudGolem"],
    chestCount: [2, 4],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "crimsonOre", weight: 5, requiredTier: 9 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: { cellCount: 25 },
  },
  {
    id: "maze2",
    minDepth: 14,
    maxDepth: 14,
    generator: "maze",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    bossRoomSize: 40,
    enemyTypes: ["deer1"],
    chestCount: [2, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "angelicOre", weight: 5, requiredTier: 10 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    // passageWidth:2 (pas le defaut 1 du generateur, "labyrinthe pur"
    // traditionnel) - un couloir d'une seule case serait tres
    // inconfortable pour l'esquive/les projectiles/le deplacement des
    // ennemis une fois le niveau reellement jouable
    generatorParams: { passageWidth: 2, wallThickness: 2 },
  },
  {
    id: "maze3",
    minDepth: 15,
    maxDepth: 16,
    generator: "maze",
    tileset: "cityTiles",
    enemyBaseCount: 3,
    enemyTypes: ["deer1"],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "fatefulOre", weight: 5, requiredTier: 11 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: { passageWidth: 5, wallThickness: 2 },
  },
  {
    id: "desert4",
    minDepth: 17,
    maxDepth: 18,
    generator: "cellular",
    tileset: "cityTiles",
    enemyBaseCount: 10,
    enemyTypes: [
      "redBeetle",
      "pinkOgre",
      "mudGolem",
      "angryTrent",
      "gnome",
      "knifedBat",
    ],
    chestCount: [1, 3],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "novaOre", weight: 5, requiredTier: 12 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
    generatorParams: { wallProbability: 0.35, minFloorRatio: 0.4 },
  },

  {
    id: "temple",
    minDepth: 19,
    maxDepth: MAX_DEPTH,
    generator: "bsp",
    tileset: "cityTiles",
    enemyBaseCount: 10,
    bossRoomSize: 40,
    enemyTypes: [
      "redBeetle",
      "pinkOgre",
      "mudGolem",
      "angryTrent",
      "gnome",
      "knifedBat",
    ],
    chestCount: [2, 4],
    trapConfig: {
      frequency: 0.006,
      damageType: "physical",
      damageAmount: [8, 15],
      inflictsEffect: null,
    },
    secretRoomChance: 1,
    miningConfig: {
      rockChance: 0.3, // chance qu'AU MOINS un gisement apparaisse cet etage
      minRocks: 1,
      maxRocks: 3,
      resourcePool: [{ itemId: "novaOre", weight: 5, requiredTier: 12 }],
      totalHits: [3, 6],
      gemChance: 0.15,
      gemPool: [
        { itemId: "smokyQuartz", weight: 5 },
        { itemId: "ruby", weight: 2 },
        { itemId: "aquaMarine", weight: 1 },
        { itemId: "peridot", weight: 0.5 },
      ],
    },
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
