const { createRng } = require('./rng');

/**
 * Table des objets du jeu - même principe que enemyStats.js/questTypes.js :
 * un seul fichier à modifier pour ajouter un objet, sans toucher au
 * reste du système. Fondation du système d'inventaire - rien d'autre
 * (coffres, butin, inventaire, effets) ne peut exister sans ça.
 *
 * Quatre catégories, chacune avec ses propres champs pertinents :
 * - 'consumable' : `effect` (ex: { heal: 30 }), consommé à l'usage
 * - 'equipment' : `slot` (weapon/armor/accessory) + `statBonus` (ex:
 *   { meleeDamage: 5 }) - les clés de statBonus correspondent aux
 *   propriétés déjà utilisées par leveling.js (meleeDamage, rangedDamage,
 *   defense, maxHp)
 * - 'questItem' : pas d'effet propre, juste un objet à posséder/rendre -
 *   la mécanique de quête "en rapporter N" n'est PAS encore construite
 *   (questTypes.js ne connaît aujourd'hui que 'killEnemies') - cette
 *   catégorie existe pour que l'objet PUISSE exister dans le monde, pas
 *   pour que la quête associée fonctionne déjà de bout en bout
 * - 'currency' : `stackable` toujours vrai, une quantité plutôt qu'une
 *   possession unitaire
 *
 * Tous les objets sont `stackable` sauf l'équipement (un exemplaire à la
 * fois par emplacement, cohérent avec le concept d'équiper une seule
 * épée à la fois).
 */
const ITEM_TYPES = {
  healthPotion: {
    id: 'healthPotion',
    category: 'consumable',
    name: 'Potion de soin',
    description: "Restaure 30 PV à l'usage.",
    effect: { heal: 30 },
    stackable: true,
  },

  ironSword: {
    id: 'ironSword',
    category: 'equipment',
    slot: 'weapon',
    name: 'Épée de fer',
    description: '+5 dégâts au corps à corps.',
    statBonus: { meleeDamage: 5 },
    stackable: false,
  },

  huntingBow: {
    id: 'huntingBow',
    category: 'equipment',
    slot: 'weapon',
    name: 'Arc de chasse',
    description: '+4 dégâts à distance.',
    statBonus: { rangedDamage: 4 },
    stackable: false,
  },

  leatherArmor: {
    id: 'leatherArmor',
    category: 'equipment',
    slot: 'armor',
    name: 'Armure de cuir',
    description: '+3 défense.',
    statBonus: { defense: 3 },
    stackable: false,
  },

  vitalityCharm: {
    id: 'vitalityCharm',
    category: 'equipment',
    slot: 'accessory',
    name: 'Charme de vitalité',
    description: '+20 PV maximum.',
    statBonus: { maxHp: 20 },
    stackable: false,
  },

  gold: {
    id: 'gold',
    category: 'currency',
    name: 'Or',
    description: 'Monnaie du jeu.',
    stackable: true,
  },

  // exemple d'objet de quete - existe dans le monde, mais aucune quete
  // de type "en rapporter N" ne sait encore l'exploiter (cf. commentaire
  // en tete de fichier)
  ancientRelic: {
    id: 'ancientRelic',
    category: 'questItem',
    name: 'Relique ancienne',
    description: 'Un artefact qui semble important.',
    stackable: false,
  },
};

/**
 * Tables de butin par SOURCE (pas par biome/profondeur pour l'instant -
 * un coffre standard donne toujours depuis la même table, quel que soit
 * l'étage). Poids RELATIFS (pas des %) - `rollLoot` les normalise.
 * `itemId: null` est une entrée valide ("rien ne tombe cette fois"),
 * pas une absence de champ - explicite plutôt qu'implicite, pour que
 * "aucun butin" soit un résultat volontaire et lisible dans la table,
 * pas un cas particulier caché dans le code.
 */
const LOOT_TABLES = {
  chestStandard: [
    { itemId: 'healthPotion', weight: 35 },
    { itemId: 'gold', weight: 35, quantityRange: [5, 20] },
    { itemId: 'ironSword', weight: 10 },
    { itemId: 'huntingBow', weight: 10 },
    { itemId: 'leatherArmor', weight: 8 },
    { itemId: 'vitalityCharm', weight: 2 },
  ],

  enemyDrop: [
    { itemId: null, weight: 50 }, // la plupart des ennemis ne laissent rien
    { itemId: 'gold', weight: 35, quantityRange: [1, 5] },
    { itemId: 'healthPotion', weight: 15 },
  ],

  bossDrop: [
    { itemId: 'ironSword', weight: 25 },
    { itemId: 'huntingBow', weight: 25 },
    { itemId: 'leatherArmor', weight: 20 },
    { itemId: 'vitalityCharm', weight: 10 },
    { itemId: 'gold', weight: 20, quantityRange: [50, 100] },
  ],

  // recompense de quete : l'XP reste la recompense principale (deja geree
  // par questTypes.js), cette table n'ajoute qu'une CHANCE de bonus en
  // objet - poids "rien" tres majoritaire, pour ne pas transformer
  // chaque quete en garantie d'equipement gratuit
  questReward: [
    { itemId: null, weight: 60 },
    { itemId: 'gold', weight: 20, quantityRange: [10, 30] },
    { itemId: 'healthPotion', weight: 10 },
    { itemId: 'ironSword', weight: 4 },
    { itemId: 'huntingBow', weight: 4 },
    { itemId: 'leatherArmor', weight: 2 },
  ],
};

/**
 * Tire un objet dans une table de butin, de façon seedée (reproductible -
 * même seed = même tirage, comme le reste de la génération). Renvoie
 * `null` si la table n'existe pas OU si le tirage tombe sur une entrée
 * `itemId: null` (rien ne tombe, résultat volontaire).
 *
 * @param {string} tableName clé de LOOT_TABLES
 * @param {Function} rng générateur seedé (cf. rng.js)
 * @returns {{itemId: string, quantity: number} | null}
 */
function rollLoot(tableName, rng) {
  const table = LOOT_TABLES[tableName];
  if (!table) return null;

  const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * totalWeight;

  for (const entry of table) {
    if (roll < entry.weight) {
      if (!entry.itemId) return null;
      const quantity = entry.quantityRange
        ? entry.quantityRange[0] + Math.floor(rng() * (entry.quantityRange[1] - entry.quantityRange[0] + 1))
        : 1;
      return { itemId: entry.itemId, quantity };
    }
    roll -= entry.weight;
  }

  return null; // filet de securite (ne devrait jamais arriver si les poids sont corrects)
}

module.exports = { ITEM_TYPES, LOOT_TABLES, rollLoot };
