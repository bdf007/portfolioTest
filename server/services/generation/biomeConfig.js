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
    maxDepth: 10,
    generator: "cellular",
    tileset: "cave",
    enemyBaseCount: 40,
    enemyTypes: [
      "gazer1",
      "demonLady1",
      "lamia6",
      "vampire1",
      "angryBrownMushroom",
      "colorBat6",
      "fairy2",
      "elementalfairy1",
      "monks1",
      "gazer4",
      "soldier4",
    ],
    chestCount: [1, 3],
    generatorParams: {
      width: 80,
      height: 80,
      wallProbability: 0.4,
      minFloorRatio: 0.4,
    },
  },

  {
    id: "desert1",
    minDepth: 11,
    maxDepth: 15,
    generator: "randomwalk",
    tileset: "desert",
    enemyBaseCount: 20,
    enemyTypes: ["bug1a", "bug1b"],
    chestCount: [1, 3],
    generatorParams: {
      roomSize: 5,
      roomCount: 20,
      stratBias: 0.8,
      doorWidth: 2,
    },
  },
  {
    id: "desert2",
    minDepth: 16,
    maxDepth: 20,
    generator: "noise",
    tileset: "desert",
    enemyBaseCount: 15,
    enemyTypes: ["fox1", "fox2"],
    chestCount: [2, 4],
    generatorParams: { noiseScale: 10 },
  },
  {
    id: "forest2",
    minDepth: 21,
    maxDepth: 25,
    generator: "voronoi",
    tileset: "tree",
    enemyBaseCount: 11,
    enemyTypes: ["orc7", "orc8"],
    chestCount: [2, 4],
    generatorParams: { cellCount: 25 },
  },
  {
    id: "maze1",
    minDepth: 26,
    maxDepth: 30,
    generator: "maze",
    tileset: "desert",
    enemyBaseCount: 12,
    enemyTypes: ["orc1", "orc2", "orc3"],
    chestCount: [2, 3],
    // passageWidth:2 (pas le defaut 1 du generateur, "labyrinthe pur"
    // traditionnel) - un couloir d'une seule case serait tres
    // inconfortable pour l'esquive/les projectiles/le deplacement des
    // ennemis une fois le niveau reellement jouable
    generatorParams: { passageWidth: 2, wallThickness: 1 },
  },
  {
    id: "maze2",
    minDepth: 31,
    maxDepth: 35,
    generator: "maze",
    tileset: "desert",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { passageWidth: 5, wallThickness: 3 },
  },
  {
    id: "desert3",
    minDepth: 36,
    maxDepth: 40,
    generator: "cellular",
    tileset: "desert",
    enemyBaseCount: 12,
    enemyTypes: ["naga1", "naga2", "naga3"],
    chestCount: [1, 3],
    generatorParams: { wallProbability: 0.35, minFloorRatio: 0.4 },
  },

  {
    id: "temple",
    minDepth: 41,
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
