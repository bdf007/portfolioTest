const { createRng } = require("./rng");

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
  woodenDagger: {
    id: 'woodenDagger',
    category: 'equipment',
    slot: 'mainHand', // une main - peut cohabiter avec un bouclier (offHand) ou une seconde arme (double armement automatique si offHand est libre, cf. MainScene.equipItem)
    twoHanded: false,
    grantsRanged: false, // explicite plutot qu'absent - purement melee, ne debloque jamais l'attaque a distance seule (cf. MainScene.canUseRangedAttack)
    name: 'Dague en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: -2 },
    stackable: false,
    price: 2,
  },
  woodenSword: {
    id: 'woodenSword',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: false,
    grantsRanged: false,
    name: 'Épée en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: 0 },
    stackable: false,
    price: 2,
  },
  woodenBow: {
    id: 'woodenBow',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,  // occupe les DEUX mains - equiper libere mainHand ET offHand (cf. MainScene.equipItem)
    grantsRanged: true, // sans arme marquee ainsi equipee (ici ou en offHand), l'attaque a distance est indisponible - cf. MainScene.canUseRangedAttack
    requiresAmmo: ["woodenArrow"], // itemId EXACT requis (pas juste un booleen) - un carreau ne peut pas alimenter un arc, cf. MainScene.performRangedAttack
    name: 'Arc en bois',
    description: "+1 dégât à distance. Nécessite des flèches. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1, meleeRange: 0 },
    stackable: false,
    price: 2,
  },
  woodenSpear: {
    id: 'woodenSpear',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Lance en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: +2 },
    stackable: false,
    price: 2,
  },
  woodenAxe: {
    id: 'woodenAxe',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Hache de guerre en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange:0 },
    stackable: false,
    price: 2,
  },
  woodenMallet: {
    id: 'woodenMallet',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Masse en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: 0 },
    stackable: false,
    price: 2,
  },
  woodenShovel: {
    id: 'woodenShovel',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Pelle en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    price: 2,
  },
  woodenPickaxe: {
    id: 'woodenPickaxe',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Pioche en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    price: 2,
  },
  woodenHammer: {
    id: 'woodenHammer',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Marteau de guerre en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    price: 2,
  },
  woodenSickle: {
    id: 'woodenSickle',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: false,
    name: 'Faucille en bois',
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    price: 2,
  },
  ironDagger: {
    id: 'ironDagger',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: false,
    grantsRanged: false, // explicite plutot qu'absent - purement melee, ne debloque jamais l'attaque a distance seule (cf. MainScene.canUseRangedAttack)
    name: 'Dague en fer',
    description: '+4 dégâts au corps à corps.',
    statBonus: { meleeDamage: 5 },
    stackable: false,
    price: 40,
  },
  ironSword: {
    id: 'ironSword',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: false,
    grantsRanged: false, // explicite plutot qu'absent - purement melee, ne debloque jamais l'attaque a distance seule (cf. MainScene.canUseRangedAttack)
    name: 'Épée de fer',
    description: '+5 dégâts au corps à corps.',
    statBonus: { meleeDamage: 5 },
    stackable: false,
    price: 60,
  },
  healthPotion: {
    id: 'healthPotion',
    category: 'consumable',
    name: 'petite potion de soin',
    description: "Restaure 30 PV à l'usage.",
    effect: { heal: 30 },
    stackable: true,
    price: 15, // vendable en boutique - cf. shopGenerator.js. Absent = jamais en vente (or, objets de quete)
  },
  mediumHealthPotion: {
    id: 'mediumHealthPotion',
    category: 'consumable',
    name: 'Moyenne potion de soin',
    description: "Restaure 60 PV à l'usage.",
    effect: { heal: 30 },
    stackable: true,
    price: 28,	
  },
   bigHealthPotion: {
    id: 'bigHealthPotion',
    category: 'consumable',
    name: 'Grande potion de soin',
    description: "Restaure 120 PV à l'usage.",
    effect: { heal: 120 },
    stackable: true,
    price: 200,	
  },
  manaPotion: {
    id: 'manaPotion',
    category: 'consumable',
    name: 'petite potion de mana',
    description: "Restaure 30 PM à l'usage.",
    effect: { mana: 10 },
    stackable: true,
    price: 12, // vendable en boutique - cf. shopGenerator.js. Absent = jamais en vente (or, objets de quete)
  },
  mediumManaPotion: {
    id: 'mediumManaPotion',
    category: 'consumable',
    name: 'Moyenne potion de mana',
    description: "Restaure 40 PM à l'usage.",
    effect: { mana: 40 },
    stackable: true,
    price: 22,	
  },
   bigManaPotion: {
    id: 'bigManaPotion',
    category: 'consumable',
    name: 'Grande potion de mana',
    description: "Restaure 80 PM à l'usage.",
    effect: { mana: 80 },
    stackable: true,
    price: 150,	
  },


  huntingBow: {
    id: 'huntingBow',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: true, // sans arme marquee ainsi equipee (ici ou en offHand), l'attaque a distance est indisponible - cf. MainScene.canUseRangedAttack
    requiresAmmo: 'woodenArrow', // itemId EXACT requis (pas juste un booleen) - un carreau ne peut pas alimenter un arc, cf. MainScene.performRangedAttack
    name: 'Arc de chasse',
    description: '+4 dégâts à distance.',
    statBonus: { rangedDamage: 4 },
    stackable: false,
    price: 55,
  },
  crossbow: {
    id: 'crossbow',
    category: 'equipment',
    slot: 'mainHand', // une main - peut cohabiter avec une epee (double armement automatique si l'autre main est libre, cf. MainScene.equipItem) ou un bouclier
    twoHanded: false,
    grantsRanged: true,
    requiresAmmo: 'crossbowBolt', // munition DISTINCTE des fleches
    name: 'Arbalète',
    description: '+3 dégâts à distance. Se manie a une main.',
    statBonus: { rangedDamage: 3 },
    stackable: false,
    price: 50,
  },

  leatherArmor: {
    id: 'leatherArmor',
    category: 'equipment',
    slot: 'armor',
    name: 'Armure de cuir',
    description: '+3 défense.',
    statBonus: { defense: 3 },
    stackable: false,
    price: 45,
  },

  vitalityCharm: {
    id: 'vitalityCharm',
    category: 'equipment',
    slot: 'necklace',
    name: 'Charme de vitalité',
    description: '+20 PV maximum.',
    statBonus: { maxHp: 20 },
    stackable: false,
    price: 70,
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

  woodenShield: {
    id: 'woodenShield',
    category: 'equipment',
    slot: 'offHand',
    twoHanded: false,
    grantsRanged: false,
    name: 'Bouclier en bois',
    description: "+1 défense. Équipement d'entraînement de départ.",
    statBonus: { defense: 1 },
    stackable: false,
  },


  woodenStaff: {
    id: 'woodenStaff',
    category: 'equipment',
    slot: 'mainHand',
    twoHanded: true,
    grantsRanged: true,
    requiresAmmo: false,
    manaCost: 1,
    name: 'Bâton en bois',
    description: "+1 dégât à distance. Canalise la magie (1 mana par tir), sans munitions. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1 },
    stackable: false,
  },
  woodenArrow: {
    id: 'woodenArrow',
    category: 'ammo',
    slot: 'quiver',
    name: 'Flèche en bois',
    description: '+1 dégât à distance tant que des flèches sont encochées.',
    statBonus: { rangedDamage: 1 },
    stackable: true,
    price: 2,
  },
  crossbowBolt: {
    id: 'crossbowBolt',
    category: 'ammo',
    slot: 'quiver',
    name: 'Carreau',
    description: "+1 dégât à distance tant que des carreaux sont encochés. Munition de l'arbalète uniquement.",
    statBonus: { rangedDamage: 1 },
    stackable: true,
    price: 3,
  },
  sealedPackage: {
    id: 'sealedPackage',
    category: 'questItem',
    name: 'Colis scellé',
    description: 'À livrer à son destinataire, sans l\'ouvrir.',
    stackable: false,
  },
}

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
    { itemId: "healthPotion", weight: 35 },
    { itemId: "manaPotion", weight: 35 },
    { itemId: "gold", weight: 35, quantityRange: [5, 20] },
    { itemId: "ironSword", weight: 10 },
    { itemId: "huntingBow", weight: 10 },
    { itemId: "crossbow", weight: 10 },
    { itemId: "leatherArmor", weight: 8 },
    { itemId: "vitalityCharm", weight: 2 },
  ],

  enemyDrop: [
    { itemId: null, weight: 20 }, // la plupart des ennemis ne laissent rien
    { itemId: "gold", weight: 28, quantityRange: [1, 5] },
    { itemId: "healthPotion", weight: 10 },
    { itemId: "manaPotion", weight: 10 },
    { itemId: "ironSword", weight: 10 },
    { itemId: "woodenArrow", weight: 13, quantityRange: [1, 4] }, // seul objet "en bois" lootable - cf. itemDefs.js
    { itemId: "crossbowBolt", weight: 9, quantityRange: [1, 4] },
  ],

  bossDrop: [
    { itemId: "ironSword", weight: 25 },
    { itemId: "huntingBow", weight: 25 },
    { itemId: "crossbow", weight: 25 },
    { itemId: "leatherArmor", weight: 20 },
    { itemId: "vitalityCharm", weight: 10 },
    { itemId: "gold", weight: 20, quantityRange: [50, 100] },
    // PAS d'objet de quete (ancientRelic) ici - contrairement au reste
    // de cette table (tirage aleatoire), un objet de quete ne doit
    // JAMAIS tomber sans quete active, et doit tomber a coup SUR (pas
    // juste une chance) quand une quete active le cible - ni l'un ni
    // l'autre ne se preterait a un poids fixe dans un tirage aleatoire.
    // Cf. MainScene.damageEnemy (client) pour la vraie logique
    // d'attribution, conditionnee a l'etat des quetes du joueur.
  ],

  // recompense de quete : l'XP reste la recompense principale (deja geree
  // par questTypes.js), cette table n'ajoute qu'une CHANCE de bonus en
  // objet - poids "rien" tres majoritaire, pour ne pas transformer
  // chaque quete en garantie d'equipement gratuit
  questReward: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 20, quantityRange: [10, 30] },
    { itemId: "healthPotion", weight: 10 },
    { itemId: "manaPotion", weight: 10 },
    { itemId: "ironSword", weight: 4 },
    { itemId: "huntingBow", weight: 4 },
    { itemId: "crossbow", weight: 4 },
    { itemId: "leatherArmor", weight: 2 },
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
        ? entry.quantityRange[0] +
          Math.floor(
            rng() * (entry.quantityRange[1] - entry.quantityRange[0] + 1),
          )
        : 1;
      return { itemId: entry.itemId, quantity };
    }
    roll -= entry.weight;
  }

  return null; // filet de securite (ne devrait jamais arriver si les poids sont corrects)
}

/**
 * Comme rollLoot, mais tire PLUSIEURS fois independamment (chaque tirage
 * peut individuellement ne rien donner) et renvoie la liste des resultats
 * NON-nuls uniquement - jamais d'entree `null` dans le tableau renvoye.
 * Sert au coffre de butin d'ennemi (cf. MainScene.js), qui peut contenir
 * plusieurs objets a la fois (or, fleche, potion...) plutot qu'un seul
 * objet ramasse instantanement comme avant.
 *
 * N'accepte JAMAIS deux fois le meme itemId dans un seul coffre (ex:
 * plusieurs objets a la fois (or, fleche, potion...) plutot qu'un seul
 * objet ramasse instantanement comme avant.
 *
 * N'accepte JAMAIS deux fois le meme itemId dans un seul coffre (ex:
 * "Or x2" et "Or x4" comme deux lignes separees, jamais fusionnees en
 * "Or x6") - si un tirage tombe sur un itemId deja obtenu dans ce meme
 * lot, une SEULE nouvelle tentative est faite ; si elle est encore en
 * double, ce tirage est simplement abandonne (devient "rien") plutot que
 * de boucler indefiniment sur une petite table.
 *
 * @param {string} tableName
 * @param {Function} rng
 * @param {number} rolls nombre de tirages independants
 * @returns {{itemId:string, quantity:number}[]} peut etre vide (tous les
 *   tirages ont donne "rien" ou un doublon), jamais null
 */
function rollMultipleLoot(tableName, rng, rolls) {
  const results = [];
  const usedItemIds = new Set();
  for (let i = 0; i < rolls; i++) {
    let result = rollLoot(tableName, rng);
    if (result && usedItemIds.has(result.itemId)) {
      result = rollLoot(tableName, rng); // une seule nouvelle tentative
      if (result && usedItemIds.has(result.itemId)) result = null; // encore en double -> abandonne ce tirage
    }
    if (result) {
      usedItemIds.add(result.itemId);
      results.push(result);
    }
  }
  return results;
}

/**
 * Liste des clés d'objets vendables en boutique - tout objet ayant un
 * `price` defini (equipement/consommables ci-dessus) - l'or et les
 * objets de quete n'en ont volontairement pas, donc jamais achetables.
 */
function getPurchasableItemIds() {
  return Object.values(ITEM_TYPES)
    .filter((item) => typeof item.price === "number")
    .map((item) => item.id);
}

/**
 * Liste des clés d'objets utilisables comme cible d'une quete "recuperer
 * tel objet" (cf. questTypes.generateObtainItemQuest) - uniquement la
 * categorie 'questItem' : jamais une piece d'equipement reelle, jamais
 * un consommable. C'est ce qui garantit qu'un objet de quete n'est
 * JAMAIS equipable ("le marteau du grand-pere, pas une vraie arme") -
 * pas une verification a faire cote quete, une propriete garantie par
 * la SOURCE du pool lui-meme.
 */
function getQuestItemIds() {
  return Object.values(ITEM_TYPES)
    .filter((item) => item.category === "questItem")
    .map((item) => item.id);
}

module.exports = {
  ITEM_TYPES,
  LOOT_TABLES,
  rollLoot,
  rollMultipleLoot,
  getPurchasableItemIds,
  getQuestItemIds,
};
