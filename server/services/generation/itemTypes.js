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
 * Seuls les objets dans ce fichier peuvent étre acheter ou looter
 *
 */
const ITEM_TYPES = {
  woodenDagger: {
    id: "woodenDagger",
    category: "equipment",
    slot: "mainHand", // une main - peut cohabiter avec un bouclier (offHand) ou une seconde arme (double armement automatique si offHand est libre, cf. MainScene.equipItem)
    twoHanded: false,
    grantsRanged: false, // explicite plutot qu'absent - purement melee, ne debloque jamais l'attaque a distance seule (cf. MainScene.canUseRangedAttack)
    name: "Dague en bois",
    description:
      "+1 dégât au corps à corps et -2 à la distance d'attaque. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: -2 },
    stackable: false,
    // unique: true,
    archetypes: ["voleur"],
  },
  woodenSword: {
    id: "woodenSword",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Épée en bois",
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    archetypes: ["guerrier"],
    // damageType: "cold",
    price: 2,
    // inflictsEffect: {
    //   type: "bleed",
    //   chance: 0.9,
    //   damagePerTick: 1,
    //   tickIntervalMs: 1000,
    //   ticks: 3,
    // },
  },

  woodenBow: {
    id: "woodenBow",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true, // occupe les DEUX mains - equiper libere mainHand ET offHand (cf. MainScene.equipItem)
    grantsRanged: true, // sans arme marquee ainsi equipee (ici ou en offHand), l'attaque a distance est indisponible - cf. MainScene.canUseRangedAttack
    requiresAmmo: ["woodenArrow", "bigWoodenArrow"], // itemId EXACT requis (pas juste un booleen) - un carreau ne peut pas alimenter un arc, cf. MainScene.performRangedAttack
    name: "Arc en bois",
    description:
      "+1 dégât à distance. Nécessite des flèches. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1 },
    stackable: false,
    archetypes: ["archer"],
    price: 2,
  },
  woodenCrossbow: {
    id: "woodenCrossbow",
    category: "equipment",
    slot: "offHand",
    twoHanded: false,
    grantsRanged: true,
    requiresAmmo: ["woodenCrossbowBolt"],
    name: "Arbalète en bois",
    description:
      "+1 dégât à distance, Nécessite des carreaux. +1 de distance d'attaque. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1, rangedRange: 1 },
    archetypes: ["archer", "voleur"],
    stackable: false,
    price: 2,
  },
  woodenSpear: {
    id: "woodenSpear",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Lance en bois",
    description:
      "+1 dégât au corps à corps. +2 de distance d'attaque. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: 2 },
    stackable: false,
    archetypes: ["guerrier", "voleur"],
    price: 2,
  },

  woodenMallet: {
    id: "woodenMallet",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Masse en bois",
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    archetypes: ["guerrier"],
    price: 2,
  },
  woodenShovel: {
    id: "woodenShovel",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Pelle en bois",
    description:
      "+1 dégât au corps à corps. +1 de distance d'attaque. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: 1 },
    stackable: false,
    archetypes: ["guerrier", "voleur"],
    price: 2,
  },

  woodenHammer: {
    id: "woodenHammer",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Marteau de guerre en bois",
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
    archetypes: ["guerrier", "voleur"],
    price: 2,
  },
  woodenSickle: {
    id: "woodenSickle",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Faucille en bois",
    description:
      "+1 dégât au corps à corps. +1 de distance d'attaque  Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, meleeRange: 1 },
    stackable: false,
    archetypes: ["guerrier", "voleur"],
    price: 2,
  },

  woodenShield: {
    id: "woodenShield",
    category: "equipment",
    slot: "offHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Bouclier en bois",
    description: "+1 défense. Équipement d'entraînement de départ.",
    statBonus: { defense: 1 },
    archetypes: ["guerrier"],
    stackable: false,
    price: 2,
  },

  woodenStaff: {
    id: "woodenStaff",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: true,
    requiresAmmo: false,
    manaCost: 1,
    name: "Bâton en bois",
    description:
      "+1 dégât à distance. Canalise la magie (1 mana par tir), sans munitions. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1 },
    stackable: false,
    archetypes: ["mage"],
    // inflictsEffect: {
    //   type: "slow",
    //   kind: "modifier", // <-- le champ qui manquait, decide TOUT le comportement
    //   chance: 1,
    //   statModifiers: { moveSpeedPercent: -0.4 }, // -40% de vitesse
    //   durationMs: 2500, // duree en ms, PAS ticks/tickIntervalMs/damagePerTick (ca c'est la forme DOT)
    // },
    price: 2,
  },
  ironDagger: {
    id: "ironDagger",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Dague en fer",
    description: "+4 dégâts au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
    archetypes: ["voleur", "guerrier", "archer", "mage"],
    unlockLevel: 2,
    // price: 40,
  },
  sharpIronDagger: {
    id: "sharpIronDagger",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Dague en fer aiguisée. Inflige un saignement à l'ennemi.",
    description: "+5 dégâts au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
    archetypes: ["voleur", "guerrier", "archer", "mage"],
    inflictsEffect: {
      type: "bleed",
      kind: "dot", // damage over time
      chance: 1,
      damagePerTick: 1,
      tickIntervalMs: 1000,
      durationMs: 5000,
    },
    unlockLevel: 3,
    // price: 60,
  },
  ironSword: {
    id: "ironSword",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Épée de fer",
    description: "+5 dégâts au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 60,
  },
  sharpIronSword: {
    id: "sharpIronSword",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Épée en fer aiguisée",
    description:
      "+6 dégâts au corps à corps. Inflige un saignement à l'ennemi.",
    statBonus: { meleeDamage: 6 },
    stackable: false,
    archetypes: ["guerrier"],
    inflictsEffect: {
      type: "bleed",
      kind: "dot", // damage over time
      chance: 1,
      damagePerTick: 1,
      tickIntervalMs: 1000,
      durationMs: 5000,
    },
    unlockLevel: 3,
    // price: 80,
  },
  crossbow: {
    id: "crossbow",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: true,
    requiresAmmo: ["woodenCrossbowBolt", "ironCrossbowBolt"],
    name: "Arbalète",
    description: "+3 dégâts à distance. Se manie a une main.",
    statBonus: { rangedDamage: 3, rangedRange: 5 },
    stackable: false,
    archetypes: ["archer", "voleur"],
    unlockLevel: 2,
  },
  ironSpear: {
    id: "ironSpear",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Lance en fer",
    description: "+4 dégât au corps à corps. +3 de distance d'attaque.",
    statBonus: { meleeDamage: 4, meleeRange: 3 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 55,
  },
  ironAxe: {
    id: "ironAxe",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Hache de guerre en fer",
    description: "+6 dégât au corps à corps.",
    statBonus: { meleeDamage: 6 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 65,
  },
  ironMallet: {
    id: "ironMallet",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Masse en fer",
    description: "+5 dégât au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 60,
  },
  ironShovel: {
    id: "ironShovel",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Pelle en fer",
    description: "+4 dégât au corps à corps. +1 de distance d'attaque.",
    statBonus: { meleeDamage: 4, meleeRange: +1 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 55,
  },

  ironHammer: {
    id: "ironHammer",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Marteau de guerre en fer",
    description: "+4 dégât au corps à corps.",
    statBonus: { meleeDamage: 4 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 50,
  },
  ironSickle: {
    id: "ironSickle",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: false,
    name: "Faucille en fer",
    description: "+5 dégât au corps à corps. +2 de distance d'attaque.",
    statBonus: { meleeDamage: 5, meleeRange: 2 },
    stackable: false,
    archetypes: ["guerrier"],
    unlockLevel: 2,
    // price: 60,
  },
  woodenArrow: {
    id: "woodenArrow",
    category: "ammo",
    slot: "quiver",
    name: "Flèche en bois",
    description: "+1 dégât à distance tant que des flèches sont encochées.",
    statBonus: { rangedDamage: 1 },
    stackable: true,
    archetypes: ["archer"],
    unlockLevel: 1,
    price: 1,
    inflictsEffect: {
      type: "slow",
      kind: "modifier", // <-- le champ qui manquait, decide TOUT le comportement
      chance: 1,
      statModifiers: { moveSpeedPercent: -0.4 }, // -40% de vitesse
      durationMs: 2500, // duree en ms, PAS ticks/tickIntervalMs/damagePerTick (ca c'est la forme DOT)
    },
  },
  bigWoodenArrow: {
    id: "bigWoodenArrow",
    category: "ammo",
    slot: "quiver",
    name: "Flèche en bois géante",
    description: "+5 dégât à distance tant que des flèches sont encochées.",
    statBonus: { rangedDamage: 5 },
    stackable: true,
    archetypes: ["archer"],
    unlockLevel: 1,
    // price: 15,
    // inflictsEffect: {
    //   type: "slow",
    //   kind: "modifier", // <-- le champ qui manquait, decide TOUT le comportement
    //   chance: 1,
    //   statModifiers: { moveSpeedPercent: -0.4 }, // -40% de vitesse
    //   durationMs: 2500, // duree en ms, PAS ticks/tickIntervalMs/damagePerTick (ca c'est la forme DOT)
    // },
  },
  woodenCrossbowBolt: {
    id: "woodenCrossbowBolt",
    category: "ammo",
    slot: "quiver",
    name: "Carreau en bois",
    description:
      "+1 dégât à distance tant que des carreaux sont disponibles. Munition de l'arbalète uniquement.",
    statBonus: { rangedDamage: 1 },
    stackable: true,
    archetypes: ["archer", "voleur"],
    unlockLevel: 1,
    price: 1,
  },
  ironArrow: {
    id: "ironArrow",
    category: "ammo",
    slot: "quiver",
    name: "Flèche en fer",
    description: "+7 dégât à distance tant que des flèches sont encochées.",
    statBonus: { rangedDamage: 7 },
    stackable: true,
    archetypes: ["archer"],
    unlockLevel: 3,
    // price: 12,
  },
  ironCrossbowBolt: {
    id: "ironCrossbowBolt",
    category: "ammo",
    slot: "quiver",
    name: "Carreau de fer",
    description:
      "+5 dégât à distance tant que des carreaux sont encochés. Munition de l'arbalète uniquement.",
    statBonus: { rangedDamage: 5 },
    stackable: true,
    archetypes: ["archer", "voleur"],
    unlockLevel: 3,
    // price: 10,
  },

  acidArrow: {
    id: "acidArrow",
    category: "ammo",
    slot: "quiver",
    name: "Flèche d'acide",
    description: "+15 dégât à distance tant que des flèches sont encochées.",
    statBonus: { rangedDamage: 15 },
    stackable: true,
    archetypes: ["archer"],
    inflictsEffect: {
      // chance d'infliger un effet par coup - PAS de cooldown ici
      type: "acid",
      kind: "dot",
      chance: 0.3,
      damagePerTick: 3,
      tickIntervalMs: 1000,
      ticks: 3,
    },
    unlockLevel: 5,
    // price: 45,
  },
  acidCrossbowBolt: {
    id: "acidCrossbowBolt",
    category: "ammo",
    slot: "quiver",
    name: "Carreau d'acide",
    description:
      "+12 dégât à distance et +2 de distance d'attaque tant que des carreaux sont encochés. Munition de l'arbalète uniquement.",
    statBonus: { rangedDamage: 12, rangedRange: 2 },
    stackable: true,
    archetypes: ["archer", "voleur"],
    unlockLevel: 5,
    // price: 43,
  },

  /** Tools **/
  /** Tools **/

  woodenPickaxe: {
    id: "woodenPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en bois",
    description: "Outil de minage basique. Niveau 1.",
    toolTier: 1,
    stackable: false,
    price: 20,
  },
  copperPickaxe: {
    id: "copperPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en cuivre",
    description: "Outil de minage intermédiaire. Niveau 2.",
    toolTier: 2,
    stackable: false,
    // price: 40,
  },
  ironPickaxe: {
    id: "ironPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en fer",
    description: "Outil de minage robuste. Niveau 3.",
    toolTier: 3,
    stackable: false,
    // price: 60,
  },
  silverPickaxe: {
    id: "silverPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en argent",
    description: "Outil de minage avancé. Niveau 4.",
    toolTier: 4,
    stackable: false,
    // price: 80,
  },
  steelPickaxe: {
    id: "steelPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en acier",
    description: "Outil de minage solide. Niveau 5.",
    toolTier: 5,
    stackable: false,
    // price: 90,
  },
  goldPickaxe: {
    id: "goldPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en or",
    description: "Outil de minage expert. Niveau 6.",
    toolTier: 6,
    stackable: false,
    // price: 100,
  },
  platiniumPickaxe: {
    id: "platiniumPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en platine",
    description: "Outil de minage maître. Niveau 7.",
    toolTier: 7,
    stackable: false,
    // price: 120,
  },
  cobaltPickaxe: {
    id: "cobaltPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en cobalt",
    description: "Outil de minage légendaire. Niveau 8.",
    toolTier: 8,
    stackable: false,
    // price: 150,
  },
  adamantinePickaxe: {
    id: "adamantinePickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en adamantine",
    description: "Outil de minage mythique. Niveau 9.",
    toolTier: 9,
    stackable: false,
    // price: 200,
  },
  crimsonPickaxe: {
    id: "crimsonPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche en cramoisi",
    description: "Outil de minage ultime. Niveau 10.",
    toolTier: 10,
    stackable: false,
    // price: 250,
  },
  angelicPickaxe: {
    id: "angelicPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche angélique",
    description: "Outil de minage divin. Niveau 11.",
    toolTier: 11,
    stackable: false,
    // price: 300,
  },
  fatefulPickaxe: {
    id: "fatefulPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche fatale",
    description: "Outil de minage du destin. Niveau 12.",
    toolTier: 12,
    stackable: false,
    // price: 400,
  },
  novaPickaxe: {
    id: "novaPickaxe",
    category: "equipment",
    slot: "tool",
    name: "Pioche nova",
    description: "Outil de minage cosmique. Niveau 13.",
    toolTier: 13,
    stackable: false,
    // price: 500,
  },

  woodenAxe: {
    id: "woodenAxe",
    category: "equipment",
    slot: "tool",
    name: "Hache en bois",
    description: "Outil de coupe basique. Niveau 1.",
    toolType: "axe",
    toolTier: 1,
    stackable: false,
    price: 10,
  },
  novaAxe: {
    id: "novaAxe",
    category: "equipment",
    slot: "tool",
    name: "Hache nova",
    description: "Outil de coupe cosmique. Niveau 13.",
    toolType: "axe",
    toolTier: 13,
    stackable: false,
    // price: 500,
  },

  /** Potions **/
  healthPotion: {
    id: "healthPotion",
    category: "consumable",
    name: "Petite potion de soin",
    description: "Restaure 30 PV à l'usage.",
    effect: { heal: 30 },
    stackable: true,
    unlockLevel: 1,
    price: 15, // vendable en boutique - cf. shopGenerator.js. Absent = jamais en vente (or, objets de quete)
  },
  mediumHealthPotion: {
    id: "mediumHealthPotion",
    category: "consumable",
    name: "Moyenne potion de soin",
    description: "Restaure 60 PV à l'usage.",
    effect: { heal: 60 },
    stackable: true,
    unlockLevel: 3,
    price: 50,
  },
  largeHealthPotion: {
    id: "largeHealthPotion",
    category: "consumable",
    name: "Grande potion de soin",
    description: "Restaure 120 PV à l'usage.",
    effect: { heal: 120 },
    stackable: true,
    unlockLevel: 5,
    price: 200,
  },
  manaPotion: {
    id: "manaPotion",
    category: "consumable",
    name: "Petite potion de mana",
    description: "Restaure 20 PM à l'usage.",
    effect: { mana: 20 },
    stackable: true,
    archetypes: ["mage"],
    unlockLevel: 1,
    price: 12,
  },
  mediumManaPotion: {
    id: "mediumManaPotion",
    category: "consumable",
    name: "Moyenne potion de mana",
    description: "Restaure 40 PM à l'usage.",
    effect: { mana: 40 },
    stackable: true,
    archetypes: ["mage"],
    unlockLevel: 3,
    price: 45,
  },
  largeManaPotion: {
    id: "largeManaPotion",
    category: "consumable",
    name: "Grande potion de mana",
    description: "Restaure 80 PM à l'usage.",
    effect: { mana: 80 },
    stackable: true,
    archetypes: ["mage"],
    unlockLevel: 5,
    price: 150,
  },

  leatherArmor: {
    id: "leatherArmor",
    category: "equipment",
    slot: "armor",
    name: "Armure de cuir",
    description: "+3 défense.",
    statBonus: { defense: 3 },
    stackable: false,
    unlockLevel: 1,
    // price: 45,
  },

  gold: {
    id: "gold",
    category: "currency",
    name: "Or",
    description: "Monnaie du jeu.",
    stackable: true,
  },

  //enchanted weapons with scroll
  reinforcedSword: {
    id: "reinforcedSword",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Épée renforcée",
    description: "+2 dégât au corps à corps. Arme d'entraînement avancée.",
    statBonus: { meleeDamage: 2 },
    stackable: false,
    archetypes: ["guerrier"],
    // price: 5,
    inflictsEffect: {
      type: "bleed",
      chance: 0.9,
      damagePerTick: 1,
      tickIntervalMs: 1000,
      ticks: 3,
    },
  },
  flamingSword: {
    id: "flamingSword",
    category: "equipment",
    slot: "mainHand",
    name: "Épée enflammée",
    description: "Une épée forgée dans les flammes.",
    statBonus: { meleeDamage: 5 }, // bonus de stat classique, deja utilise partout
    damageType: "fire", // type de degats (resistances elementaires)
    varianceDice: "1d6", // variance aleatoire sur les degats
    inflictsEffect: {
      // chance d'infliger un effet par coup - PAS de cooldown ici
      type: "burn",
      kind: "dot",
      chance: 0.3,
      damagePerTick: 3,
      tickIntervalMs: 1000,
      ticks: 3,
    },
    stackable: false,
  },

  //scroll
  blanckScroll: {
    id: "blankScroll",
    category: "craftingMaterial",
    name: "Parchemin vierge",
    description:
      "Un parchemin vierge, utilisé pour créer de nouveaux sorts. Il peut également permettre de créer des grimoires.",
    stackable: true,
    price: 10,
  },

  grimoire: {
    id: "grimoire",
    category: "craftingMaterial",
    name: "Grimoire",
    description:
      "Un grimoire vierge, utilisé pour créer de nouvelles compétences.",
    stackable: true,
  },

  fireballScroll: {
    id: "fireballScroll",
    category: "abilityScroll",
    name: "Parchemin : Boule de feu",
    description: "Apprend la compétence Boule de feu (consomme du mana).",
    grantsAbility: "fireball",
    stackable: true,
    unlockLevel: 1,
    // price: 80,
  },
  whirlwindScroll: {
    id: "whirlwindScroll",
    category: "abilityScroll",
    name: "Parchemin : Tourbillon",
    description: "Apprend la compétence Tourbillon (consomme de la stamina).",
    grantsAbility: "whirlwind",
    stackable: true,
    unlockLevel: 1,
    // price: 90,
  },
  hasteScroll: {
    id: "hasteScroll",
    category: "abilityScroll",
    name: "Parchemin : Hâte",
    description: "Apprend la compétence Hâte (consomme de la stamina).",
    grantsAbility: "haste",
    stackable: true,
    unlockLevel: 1,
    // price: 85,
  },
  slowScroll: {
    id: "slowScroll",
    category: "abilityScroll",
    name: "Parchemin : Lenteur",
    description: "Apprend la compétence Lenteur (consomme du mana).",
    grantsAbility: "slow",
    stackable: true,
    unlockLevel: 1,
    // price: 75,
  },
  flameWeaponScroll: {
    id: "flameWeaponScroll",
    category: "abilityScroll",
    name: "Parchemin : Lame enflammée",
    description:
      "Apprend la compétence Lame enflammée (consomme de la stamina).",
    grantsAbility: "flameWeapon",
    stackable: true,
    unlockLevel: 5,
    // price: 95,
  },
  flameWallScroll: {
    id: "flameWallScroll",
    category: "abilityScroll",
    name: "Parchemin : Mur de flammes",
    description:
      "Apprend la compétence Mur de flammes (consomme de la stamina).",
    grantsAbility: "flameWall",
    stackable: true,
    unlockLevel: 5,
    // price: 100,
  },

  // recipes
  flamingSwordRecipe: {
    id: "flamingSwordRecipe",
    category: "recipeScroll",
    name: "Plan : Épée enflammée",
    description: "Apprend la recette de l'épée enflammée.",
    grantsRecipe: "flamingSword",
    stackable: true,
    // price: 70,
  },
  woodenArrowRecipe: {
    id: "woodenArrowRecipe",
    category: "recipeScroll",
    name: "Plan : Flèche en bois",
    description: "Apprend la recette de la flèche en bois.",
    grantsRecipe: "woodenArrow",
    stackable: true,
    // price: 40,
  },

  healthPotionRecipe: {
    id: "healthPotionRecipe",
    category: "recipeScroll",
    name: "Plan : Potion de soin",
    description: "Apprend la recette de la potion de soin.",
    grantsRecipe: "healthPotionRecipe",
    stackable: true,
    // price: 50,
  },

  summonAngryBrownMushroomScroll: {
    id: "summonAngryBrownMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Champignon brun en colère",
    description:
      "Apprend la compétence Invocation : Champignon brun en colère.",
    grantsAbility: "summonAngryBrownMushroom",
    stackable: false,
  },
  summonGnomeScroll: {
    id: "summonGnomeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Gnome",
    description: "Apprend la compétence Invocation : Gnome.",
    grantsAbility: "summonGnome",
    stackable: false,
  },

  summonAngryTrentScroll: {
    id: "summonAngryTrentScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Trent en colère",
    description: "Apprend la compétence Invocation : Trent en colère.",
    grantsAbility: "summonAngryTrent",
    stackable: false,
  },

  summonKnifedBatScroll: {
    id: "summonKnifedBatScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chauve-souris poignardée",
    description: "Apprend la compétence Invocation : Chauve-souris poignardée.",
    grantsAbility: "summonKnifedBat",
    stackable: false,
  },
  summonDeer1Scroll: {
    id: "summonDeer1Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Cerf",
    description: "Apprend la compétence Invocation : Cerf.",
    grantsAbility: "summonDeer1",
    stackable: false,
  },

  // craft material
  deerAntler: {
    id: "deerAntler",
    category: "craftingMaterial",
    name: "Bois de cerf",
    description: "Un bois de cerf robuste, utilisé en artisanat.",
    stackable: true,
    // price: 8,
  },
  mushroom: {
    id: "mushroom",
    category: "craftingMaterial",
    name: "Champignon",
    description: "Un champignon commun, utilisé en artisanat.",
    stackable: true,
    // price: 5,
  },
  branch: {
    id: "branch",
    category: "craftingMaterial",
    name: "Branche",
    description: "Une branche solide, utilisée en artisanat.",
    stackable: true,
    // price: 5,
  },
  berries: {
    id: "berries",
    category: "craftingMaterial",
    name: "Baies",
    description: "Des baies sauvages, utilisées en artisanat.",
    stackable: true,
    // price: 5,
  },
  honeycomb: {
    id: "honeycomb",
    category: "craftingMaterial",
    name: "Rayon de miel",
    description: "Un rayon de miel, utilisé en artisanat.",
    stackable: true,
    // price: 10,
  },
  vegetalFiber: {
    id: "vegetalFiber",
    category: "craftingMaterial",
    name: "Fibre végétale",
    description: "Une fibre végétale, utilisée en artisanat.",
    stackable: true,
    price: 5,
  },
  // unique monster cores
  angryBrownMushroomCore: {
    id: "angryBrownMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de champignon brun en colère",
    description:
      "Le cœur d'un champignon brun en colère, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  gnomeCore: {
    id: "gnomeCore",
    category: "craftingMaterial",
    name: "Noyau de gnome",
    description: "Le cœur d'un gnome, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  gnomeClaw: {
    id: "gnomeClaw",
    category: "craftingMaterial",
    name: "Griffe de gnome",
    description: "Une griffe provenant d'un gnome, utilisée pour l'artisanat.",
    stackable: true,
  },
  gnomeFurTuft: {
    id: "gnomeFurTuft",
    category: "craftingMaterial",
    name: "Touffe de cheveux de gnome",
    description:
      "Une petite touffe de cheveux provenant d'un gnome, utilisée pour l'artisanat.",
    stackable: true,
  },

  angryTrentCore: {
    id: "angryTrentCore",
    category: "craftingMaterial",
    name: "Noyau de Trent en colère",
    description: "Le cœur d'un Trent en colère, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  woodAngryTrent: {
    id: "woodAngryTrent",
    category: "craftingMaterial",
    name: "Bois de Trent en colère",
    description:
      "Du bois provenant d'un Trent en colère, utilisé pour l'artisanat.",
    stackable: true,
  },
  knifedBatCore: {
    id: "knifedBatCore",
    category: "craftingMaterial",
    name: "Noyau de chauve-souris poignardée",
    description:
      "Le cœur d'une chauve-souris poignardée, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  batWing: {
    id: "batWings",
    category: "craftingMaterial",
    name: "Aile de chauve-souris",
    description:
      "Une aile provenant d'une chauve-souris, utilisée pour l'artisanat.",
    stackable: true,
  },
  batFur: {
    id: "batFur",
    category: "craftingMaterial",
    name: "Fourrure de chauve-souris",
    description:
      "De la fourrure provenant d'une chauve-souris, utilisée pour l'artisanat.",
    stackable: true,
  },
  batEye: {
    id: "batEye",
    category: "craftingMaterial",
    name: "Œil de chauve-souris",
    description:
      "Un œil provenant d'une chauve-souris, utilisé pour l'artisanat.",
    stackable: true,
  },

  deerHoof: {
    id: "deerHoof",
    category: "craftingMaterial",
    name: "Patte de cerf",
    description: "Une patte provenant d'un cerf, utilisée pour l'artisanat.",
    stackable: true,
  },
  deerMeat: {
    id: "deerMeat",
    category: "craftingMaterial",
    name: "Viande de cerf",
    description: "De la viande provenant d'un cerf, utilisée pour l'artisanat.",
    stackable: true,
  },
  deerBone: {
    id: "deerBone",
    category: "craftingMaterial",
    name: "Os de cerf",
    description: "Un os provenant d'un cerf, utilisé pour l'artisanat.",
    stackable: true,
  },
  deer1Core: {
    id: "deer1Core",
    category: "craftingMaterial",
    name: "Noyau de cerf",
    description: "Le cœur d'un cerf, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },

  // exemple d'objet de quete - existe dans le monde, mais aucune quete
  // de type "en rapporter N" ne sait encore l'exploiter (cf. commentaire
  // en tete de fichier)
  ancientRelic: {
    id: "ancientRelic",
    category: "questItem",
    name: "Relique ancienne",
    description: "Un artefact qui semble important.",
    stackable: false,
  },
  redChest: {
    id: "redChest",
    category: "questItem",
    name: "Coffre rouge",
    description: "Un coffre verrouillé.",
    stackable: false,
  },
  greenApple: {
    id: "greenApple",
    category: "questItem",
    name: "Pomme verte",
    description: "Une pomme fraîche et juteuse.",
    stackable: true,
  },
  sealedPackage: {
    id: "sealedPackage",
    category: "questItem",
    name: "Colis scellé",
    description: "À livrer à son destinataire, sans l'ouvrir.",
    stackable: false,
  },
  orangeMushroom: {
    id: "orangeMushroom",
    category: "questItem",
    name: "Champignon orange",
    description: "Un champignon rare.",
    stackable: true,
    // price: 5,
  },
  mudGolemCore: {
    id: "mudGolemCore",
    category: "craftingMaterial",
    name: "Noyau de golem de boue",
    description: "Le cœur d'un golem de boue, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMudGolemScroll: {
    id: "summonMudGolemScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem de boue",
    description: "Apprend la compétence Invocation : Golem de boue.",
    grantsAbility: "summonMudGolem",
    stackable: false,
  },
  redBeetleCore: {
    id: "redBeetleCore",
    category: "craftingMaterial",
    name: "Noyau de insecte Rouge",
    description: "Le cœur d'un insecte rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRedBeetleScroll: {
    id: "summonRedBeetleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Insecte Rouge",
    description: "Apprend la compétence Invocation : Insecte Rouge.",
    grantsAbility: "summonRedBeetle",
    stackable: false,
  },
  pinkOgreCore: {
    id: "pinkOgreCore",
    category: "craftingMaterial",
    name: "Noyau de ogre rose",
    description: "Le cœur d'un ogre rose, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonPinkOgreScroll: {
    id: "summonPinkOgreScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Ogre rose",
    description: "Apprend la compétence Invocation : Ogre rose.",
    grantsAbility: "summonPinkOgre",
    stackable: false,
  },
  alien1Core: {
    id: "alien1Core",
    category: "craftingMaterial",
    name: "Noyau de alien 1",
    description: "Le cœur d'un alien 1, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien1Scroll: {
    id: "summonAlien1Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 1",
    description: "Apprend la compétence Invocation : Alien 1.",
    grantsAbility: "summonAlien1",
    stackable: false,
  },
  alien2Core: {
    id: "alien2Core",
    category: "craftingMaterial",
    name: "Noyau de alien 2",
    description: "Le cœur d'un alien 2, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien2Scroll: {
    id: "summonAlien2Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 2",
    description: "Apprend la compétence Invocation : Alien 2.",
    grantsAbility: "summonAlien2",
    stackable: false,
  },
  alien3Core: {
    id: "alien3Core",
    category: "craftingMaterial",
    name: "Noyau de alien 3",
    description: "Le cœur d'un alien 3, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien3Scroll: {
    id: "summonAlien3Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 3",
    description: "Apprend la compétence Invocation : Alien 3.",
    grantsAbility: "summonAlien3",
    stackable: false,
  },
  alien4Core: {
    id: "alien4Core",
    category: "craftingMaterial",
    name: "Noyau de alien 4",
    description: "Le cœur d'un alien 4, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien4Scroll: {
    id: "summonAlien4Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 4",
    description: "Apprend la compétence Invocation : Alien 4.",
    grantsAbility: "summonAlien4",
    stackable: false,
  },
  alien5Core: {
    id: "alien5Core",
    category: "craftingMaterial",
    name: "Noyau de alien 5",
    description: "Le cœur d'un alien 5, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien5Scroll: {
    id: "summonAlien5Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 5",
    description: "Apprend la compétence Invocation : Alien 5.",
    grantsAbility: "summonAlien5",
    stackable: false,
  },
  alien6Core: {
    id: "alien6Core",
    category: "craftingMaterial",
    name: "Noyau de alien 6",
    description: "Le cœur d'un alien 6, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien6Scroll: {
    id: "summonAlien6Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 6",
    description: "Apprend la compétence Invocation : Alien 6.",
    grantsAbility: "summonAlien6",
    stackable: false,
  },
  alien7Core: {
    id: "alien7Core",
    category: "craftingMaterial",
    name: "Noyau de alien 7",
    description: "Le cœur d'un alien 7, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien7Scroll: {
    id: "summonAlien7Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 7",
    description: "Apprend la compétence Invocation : Alien 7.",
    grantsAbility: "summonAlien7",
    stackable: false,
  },
  alien8Core: {
    id: "alien8Core",
    category: "craftingMaterial",
    name: "Noyau de alien 8",
    description: "Le cœur d'un alien 8, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien8Scroll: {
    id: "summonAlien8Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 8",
    description: "Apprend la compétence Invocation : Alien 8.",
    grantsAbility: "summonAlien8",
    stackable: false,
  },
  alien9Core: {
    id: "alien9Core",
    category: "craftingMaterial",
    name: "Noyau de alien 9",
    description: "Le cœur d'un alien 9, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien9Scroll: {
    id: "summonAlien9Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 9",
    description: "Apprend la compétence Invocation : Alien 9.",
    grantsAbility: "summonAlien9",
    stackable: false,
  },
  alien10Core: {
    id: "alien10Core",
    category: "craftingMaterial",
    name: "Noyau de alien 10",
    description: "Le cœur d'un alien 10, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonAlien10Scroll: {
    id: "summonAlien10Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Alien 10",
    description: "Apprend la compétence Invocation : Alien 10.",
    grantsAbility: "summonAlien10",
    stackable: false,
  },
  batCore: {
    id: "batCore",
    category: "craftingMaterial",
    name: "Noyau de chauve-souris",
    description: "Le cœur d'une chauve-souris, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBatScroll: {
    id: "summonBatScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chauve-souris",
    description: "Apprend la compétence Invocation : Chauve-souris.",
    grantsAbility: "summonBat",
    stackable: false,
  },
  brownBearCore: {
    id: "brownBearCore",
    category: "craftingMaterial",
    name: "Noyau de ours brun",
    description: "Le cœur d'un ours brun, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBrownBearScroll: {
    id: "summonBrownBearScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Ours brun",
    description: "Apprend la compétence Invocation : Ours brun.",
    grantsAbility: "summonBrownBear",
    stackable: false,
  },
  beeCore: {
    id: "beeCore",
    category: "craftingMaterial",
    name: "Noyau de abeille",
    description: "Le cœur d'une abeille, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBeeScroll: {
    id: "summonBeeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Abeille",
    description: "Apprend la compétence Invocation : Abeille.",
    grantsAbility: "summonBee",
    stackable: false,
  },
  bigtickCore: {
    id: "bigtickCore",
    category: "craftingMaterial",
    name: "Noyau de gros tique",
    description: "Le cœur d'un gros tique, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBigtickScroll: {
    id: "summonBigtickScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Gros tique",
    description: "Apprend la compétence Invocation : Gros tique.",
    grantsAbility: "summonBigtick",
    stackable: false,
  },
  blackdragonCore: {
    id: "blackdragonCore",
    category: "craftingMaterial",
    name: "Noyau de dragon noir",
    description: "Le cœur d'un dragon noir, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBlackdragonScroll: {
    id: "summonBlackdragonScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Dragon noir",
    description: "Apprend la compétence Invocation : Dragon noir.",
    grantsAbility: "summonBlackdragon",
    stackable: false,
  },
  darkelfCore: {
    id: "darkelfCore",
    category: "craftingMaterial",
    name: "Noyau de elfe noir",
    description: "Le cœur d'un elfe noir, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonDarkelfScroll: {
    id: "summonDarkelfScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Elfe noir",
    description: "Apprend la compétence Invocation : Elfe noir.",
    grantsAbility: "summonDarkelf",
    stackable: false,
  },
  demonDragonCore: {
    id: "demonDragonCore",
    category: "craftingMaterial",
    name: "Noyau de dragon démon",
    description: "Le cœur d'un dragon démon, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonDemonDragonScroll: {
    id: "summonDemonDragonScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Dragon démon",
    description: "Apprend la compétence Invocation : Dragon démon.",
    grantsAbility: "summonDemonDragon",
    stackable: false,
  },
  dwarfCore: {
    id: "dwarfCore",
    category: "craftingMaterial",
    name: "Noyau de nain",
    description: "Le cœur d'un nain, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonDwarfScroll: {
    id: "summonDwarfScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Nain",
    description: "Apprend la compétence Invocation : Nain.",
    grantsAbility: "summonDwarf",
    stackable: false,
  },
  fantasy1Core: {
    id: "fantasy1Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 1",
    description: "Le cœur d'un fantasy 1, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy1Scroll: {
    id: "summonFantasy1Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 1",
    description: "Apprend la compétence Invocation : Fantasy 1.",
    grantsAbility: "summonFantasy1",
    stackable: false,
  },
  fantasy2Core: {
    id: "fantasy2Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 2",
    description: "Le cœur d'un fantasy 2, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy2Scroll: {
    id: "summonFantasy2Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 2",
    description: "Apprend la compétence Invocation : Fantasy 2.",
    grantsAbility: "summonFantasy2",
    stackable: false,
  },
  fantasy3Core: {
    id: "fantasy3Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 3",
    description: "Le cœur d'un fantasy 3, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy3Scroll: {
    id: "summonFantasy3Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 3",
    description: "Apprend la compétence Invocation : Fantasy 3.",
    grantsAbility: "summonFantasy3",
    stackable: false,
  },
  fantasy4Core: {
    id: "fantasy4Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 4",
    description: "Le cœur d'un fantasy 4, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy4Scroll: {
    id: "summonFantasy4Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 4",
    description: "Apprend la compétence Invocation : Fantasy 4.",
    grantsAbility: "summonFantasy4",
    stackable: false,
  },
  orqueGreenCore: {
    id: "orqueGreenCore",
    category: "craftingMaterial",
    name: "Noyau d'orque verte",
    description: "Le cœur d'une orque verte, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrqueGreenScroll: {
    id: "summonOrqueGreenScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque Verte",
    description: "Apprend la compétence Invocation : Orque Verte.",
    grantsAbility: "summonOrqueGreen",
    stackable: false,
  },
  redWarriorMushroomCore: {
    id: "redWarriorMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de guerrier champignon rouge",
    description:
      "Le cœur d'un guerrier champignon rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonredWarriorMushroomScroll: {
    id: "summonredWarriorMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Guerrier Champignon Rouge",
    description:
      "Apprend la compétence Invocation : Guerrier Champignon Rouge.",
    grantsAbility: "summonredWarriorMushroom",
    stackable: false,
  },
  fantasy7Core: {
    id: "fantasy7Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 7",
    description: "Le cœur d'un fantasy 7, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy7Scroll: {
    id: "summonFantasy7Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 7",
    description: "Apprend la compétence Invocation : Fantasy 7.",
    grantsAbility: "summonFantasy7",
    stackable: false,
  },
  massecailleBlueCore: {
    id: "massecailleBlueCore",
    category: "craftingMaterial",
    name: "Noyau de Massecaille Bleu",
    description: "Le cœur d'un Massecaille Bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMassecailleBlueScroll: {
    id: "summonMassecailleBlueScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Massecaille Bleu",
    description: "Apprend la compétence Invocation : Massecaille Bleu.",
    grantsAbility: "summonMassecailleBlue",
    stackable: false,
  },
  fantasy9Core: {
    id: "fantasy9Core",
    category: "craftingMaterial",
    name: "Noyau de fantasy 9",
    description: "Le cœur d'un fantasy 9, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonFantasy9Scroll: {
    id: "summonFantasy9Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantasy 9",
    description: "Apprend la compétence Invocation : Fantasy 9.",
    grantsAbility: "summonFantasy9",
    stackable: false,
  },
  knightJauneRougeCore: {
    id: "knightJauneRougeCore",
    category: "craftingMaterial",
    name: "Noyau de knight Jaune Rouge",
    description: "Le cœur d'un knight Jaune Rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonKnightJauneRougeScroll: {
    id: "summonKnightJauneRougeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Knight Jaune Rouge",
    description: "Apprend la compétence Invocation : Knight Jaune Rouge.",
    grantsAbility: "summonKnightJauneRouge",
    stackable: false,
  },
  gargoyleCore: {
    id: "gargoyleCore",
    category: "craftingMaterial",
    name: "Noyau de gargouille",
    description: "Le cœur d'une gargouille, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGargoyleScroll: {
    id: "summonGargoyleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Gargouille",
    description: "Apprend la compétence Invocation : Gargouille.",
    grantsAbility: "summonGargoyle",
    stackable: false,
  },
  ghostCore: {
    id: "ghostCore",
    category: "craftingMaterial",
    name: "Noyau de fantome",
    description: "Le cœur d'un fantome, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGhostScroll: {
    id: "summonGhostScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Fantome",
    description: "Apprend la compétence Invocation : Fantome.",
    grantsAbility: "summonGhost",
    stackable: false,
  },
  gnomeFouCore: {
    id: "gnomeFouCore",
    category: "craftingMaterial",
    name: "Noyau de gnome fou",
    description: "Le cœur d'un gnome fou, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGnomeFouScroll: {
    id: "summonGnomeFouScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Gnome fou",
    description: "Apprend la compétence Invocation : Gnome fou.",
    grantsAbility: "summonGnomeFou",
    stackable: false,
  },
  golemCore: {
    id: "golemCore",
    category: "craftingMaterial",
    name: "Noyau de golem",
    description: "Le cœur d'un golem, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemScroll: {
    id: "summonGolemScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem",
    description: "Apprend la compétence Invocation : Golem.",
    grantsAbility: "summonGolem",
    stackable: false,
  },
  gorillaCore: {
    id: "gorillaCore",
    category: "craftingMaterial",
    name: "Noyau de gorille",
    description: "Le cœur d'un gorille, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGorillaScroll: {
    id: "summonGorillaScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Gorille",
    description: "Apprend la compétence Invocation : Gorille.",
    grantsAbility: "summonGorilla",
    stackable: false,
  },
  greendragonCore: {
    id: "greendragonCore",
    category: "craftingMaterial",
    name: "Noyau de dragon vert",
    description: "Le cœur d'un dragon vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGreendragonScroll: {
    id: "summonGreendragonScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Dragon vert",
    description: "Apprend la compétence Invocation : Dragon vert.",
    grantsAbility: "summonGreendragon",
    stackable: false,
  },
  ogreCore: {
    id: "ogreCore",
    category: "craftingMaterial",
    name: "Noyau de ogre",
    description: "Le cœur d'un ogre, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOgreScroll: {
    id: "summonOgreScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Ogre",
    description: "Apprend la compétence Invocation : Ogre.",
    grantsAbility: "summonOgre",
    stackable: false,
  },
  redbeetleCore: {
    id: "redbeetleCore",
    category: "craftingMaterial",
    name: "Noyau de insecte rouge",
    description: "Le cœur d'un insecte rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRedbeetleScroll: {
    id: "summonRedbeetleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Insecte rouge",
    description: "Apprend la compétence Invocation : Insecte rouge.",
    grantsAbility: "summonRedbeetle",
    stackable: false,
  },
  robot1Core: {
    id: "robot1Core",
    category: "craftingMaterial",
    name: "Noyau de robot1",
    description: "Le cœur d'un robot1, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot1Scroll: {
    id: "summonRobot1Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot1",
    description: "Apprend la compétence Invocation : Robot1.",
    grantsAbility: "summonRobot1",
    stackable: false,
  },
  robot2Core: {
    id: "robot2Core",
    category: "craftingMaterial",
    name: "Noyau de robot2",
    description: "Le cœur d'un robot2, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot2Scroll: {
    id: "summonRobot2Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot2",
    description: "Apprend la compétence Invocation : Robot2.",
    grantsAbility: "summonRobot2",
    stackable: false,
  },
  robot3Core: {
    id: "robot3Core",
    category: "craftingMaterial",
    name: "Noyau de robot3",
    description: "Le cœur d'un robot3, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot3Scroll: {
    id: "summonRobot3Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot3",
    description: "Apprend la compétence Invocation : Robot3.",
    grantsAbility: "summonRobot3",
    stackable: false,
  },
  robot4Core: {
    id: "robot4Core",
    category: "craftingMaterial",
    name: "Noyau de robot4",
    description: "Le cœur d'un robot4, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot4Scroll: {
    id: "summonRobot4Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot4",
    description: "Apprend la compétence Invocation : Robot4.",
    grantsAbility: "summonRobot4",
    stackable: false,
  },
  robot5Core: {
    id: "robot5Core",
    category: "craftingMaterial",
    name: "Noyau de robot5",
    description: "Le cœur d'un robot5, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot5Scroll: {
    id: "summonRobot5Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot5",
    description: "Apprend la compétence Invocation : Robot5.",
    grantsAbility: "summonRobot5",
    stackable: false,
  },
  robot6Core: {
    id: "robot6Core",
    category: "craftingMaterial",
    name: "Noyau de robot6",
    description: "Le cœur d'un robot6, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot6Scroll: {
    id: "summonRobot6Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot6",
    description: "Apprend la compétence Invocation : Robot6.",
    grantsAbility: "summonRobot6",
    stackable: false,
  },
  robot7Core: {
    id: "robot7Core",
    category: "craftingMaterial",
    name: "Noyau de robot7",
    description: "Le cœur d'un robot7, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot7Scroll: {
    id: "summonRobot7Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot7",
    description: "Apprend la compétence Invocation : Robot7.",
    grantsAbility: "summonRobot7",
    stackable: false,
  },
  robot8Core: {
    id: "robot8Core",
    category: "craftingMaterial",
    name: "Noyau de robot8",
    description: "Le cœur d'un robot8, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot8Scroll: {
    id: "summonRobot8Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot8",
    description: "Apprend la compétence Invocation : Robot8.",
    grantsAbility: "summonRobot8",
    stackable: false,
  },
  robot9Core: {
    id: "robot9Core",
    category: "craftingMaterial",
    name: "Noyau de robot9",
    description: "Le cœur d'un robot9, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot9Scroll: {
    id: "summonRobot9Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot9",
    description: "Apprend la compétence Invocation : Robot9.",
    grantsAbility: "summonRobot9",
    stackable: false,
  },
  robot10Core: {
    id: "robot10Core",
    category: "craftingMaterial",
    name: "Noyau de robot10",
    description: "Le cœur d'un robot10, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonRobot10Scroll: {
    id: "summonRobot10Scroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Robot10",
    description: "Apprend la compétence Invocation : Robot10.",
    grantsAbility: "summonRobot10",
    stackable: false,
  },
  skeletonCore: {
    id: "skeletonCore",
    category: "craftingMaterial",
    name: "Noyau de squelette",
    description: "Le cœur d'un squelette, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonSkeletonScroll: {
    id: "summonSkeletonScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Squelette",
    description: "Apprend la compétence Invocation : Squelette.",
    grantsAbility: "summonSkeleton",
    stackable: false,
  },
  skeletonkingCore: {
    id: "skeletonkingCore",
    category: "craftingMaterial",
    name: "Noyau de roi Squelette",
    description: "Le cœur d'un roi squelette, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonSkeletonkingScroll: {
    id: "summonSkeletonkingScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Roi Squelette",
    description: "Apprend la compétence Invocation : Roi Squelette.",
    grantsAbility: "summonSkeletonking",
    stackable: false,
  },
  greenSlimeCore: {
    id: "greenSlimeCore",
    category: "craftingMaterial",
    name: "Noyau de blob vert",
    description: "Le cœur d'un blob vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGreenSlimeScroll: {
    id: "summonGreenSlimeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Blob vert",
    description: "Apprend la compétence Invocation : Blob vert.",
    grantsAbility: "summonGreenSlime",
    stackable: false,
  },
  spiderCore: {
    id: "spiderCore",
    category: "craftingMaterial",
    name: "Noyau de araignée",
    description: "Le cœur d'une araignée, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonSpiderScroll: {
    id: "summonSpiderScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Araignée",
    description: "Apprend la compétence Invocation : Araignée.",
    grantsAbility: "summonSpider",
    stackable: false,
  },
  yellowSlimeCore: {
    id: "yellowSlimeCore",
    category: "craftingMaterial",
    name: "Noyau de blob jaune",
    description: "Le cœur d'un blob jaune, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonYellowSlimeScroll: {
    id: "summonYellowSlimeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Blob jaune",
    description: "Apprend la compétence Invocation : Blob jaune.",
    grantsAbility: "summonYellowSlime",
    stackable: false,
  },
  blueSlimeCore: {
    id: "blueSlimeCore",
    category: "craftingMaterial",
    name: "Noyau de blob bleu",
    description: "Le cœur d'un blob bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBlueSlimeScroll: {
    id: "summonBlueSlimeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Blob bleu",
    description: "Apprend la compétence Invocation : Blob bleu.",
    grantsAbility: "summonBlueSlime",
    stackable: false,
  },
  purpleSlimeCore: {
    id: "purpleSlimeCore",
    category: "craftingMaterial",
    name: "Noyau de blob violet",
    description: "Le cœur d'un blob violet, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonPurpleSlimeScroll: {
    id: "summonPurpleSlimeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Blob violet",
    description: "Apprend la compétence Invocation : Blob violet.",
    grantsAbility: "summonPurpleSlime",
    stackable: false,
  },
  yellowWarriorMushroomCore: {
    id: "yellowWarriorMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de guerrier Champignon Jaune",
    description:
      "Le cœur d'un guerrier champignon jaune, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonYellowWarriorMushroomScroll: {
    id: "summonYellowWarriorMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Guerrier Champignon Jaune",
    description:
      "Apprend la compétence Invocation : Guerrier Champignon Jaune.",
    grantsAbility: "summonYellowWarriorMushroom",
    stackable: false,
  },
  blueWarriorMushroomCore: {
    id: "blueWarriorMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de guerrier Champignon Bleu",
    description:
      "Le cœur d'un guerrier chamignon bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBlueWarriorMushroomScroll: {
    id: "summonBlueWarriorMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Guerrier Champignon Bleu",
    description: "Apprend la compétence Invocation : Guerrier Champignon Bleu.",
    grantsAbility: "summonBlueWarriorMushroom",
    stackable: false,
  },
  greenWarriorMushroomCore: {
    id: "greenWarriorMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de guerrier Champignon Vert",
    description:
      "Le cœur d'un guerrier champignon vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGreenWarriorMushroomScroll: {
    id: "summonGreenWarriorMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Guerrier Champignon Vert",
    description: "Apprend la compétence Invocation : Guerrier Champignon Vert.",
    grantsAbility: "summonGreenWarriorMushroom",
    stackable: false,
  },
  purpleWarriorMushroomCore: {
    id: "purpleWarriorMushroomCore",
    category: "craftingMaterial",
    name: "Noyau de guerrier Champignon Violet",
    description:
      "Le cœur d'un guerrier champignon violet, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonPurpleWarriorMushroomScroll: {
    id: "summonPurpleWarriorMushroomScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Guerrier Champignon Violet",
    description:
      "Apprend la compétence Invocation : Guerrier Champignon Violet.",
    grantsAbility: "summonPurpleWarriorMushroom",
    stackable: false,
  },
  blackBearCore: {
    id: "blackBearCore",
    category: "craftingMaterial",
    name: "Noyau de ours noir",
    description: "Le cœur d'un ours noir, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  blackBearFurTuft: {
    id: "blackBearFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure d'ours noir",
    description:
      "Une touffe de fourrure d'ours noir, utilisée pour l'artisanat.",
    stackable: true,
  },
  blackBearPelt: {
    id: "blackBearPelt",
    category: "craftingMaterial",
    name: "Peau d'ours noir",
    description: "La peau d'un ours noir, utilisée pour l'artisanat.",
    stackable: true,
    unique: false,
  },
  summonBlackBearScroll: {
    id: "summonBlackBearScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Ours noir",
    description: "Apprend la compétence Invocation : Ours noir.",
    grantsAbility: "summonBlackBear",
    stackable: false,
  },
  whiteBearCore: {
    id: "whiteBearCore",
    category: "craftingMaterial",
    name: "Noyau de ours Blanc",
    description: "Le cœur d'un ours blanc, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWhiteBearScroll: {
    id: "summonWhiteBearScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Ours Blanc",
    description: "Apprend la compétence Invocation : Ours Blanc.",
    grantsAbility: "summonWhiteBear",
    stackable: false,
  },
  knightBleuArgentCore: {
    id: "knightBleuArgentCore",
    category: "craftingMaterial",
    name: "Noyau de chevalier Bleu Argent",
    description:
      "Le cœur d'un chevalier bleu argent, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonKnightBleuArgentScroll: {
    id: "summonKnightBleuArgentScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chevalier Bleu Argent",
    description: "Apprend la compétence Invocation : Chevalier Bleu Argent.",
    grantsAbility: "summonKnightBleuArgent",
    stackable: false,
  },
  knightNoirCramoisiCore: {
    id: "knightNoirCramoisiCore",
    category: "craftingMaterial",
    name: "Noyau de chevalier Noir Cramoisi",
    description:
      "Le cœur d'un chevalier noir cramoisi, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonKnightNoirCramoisiScroll: {
    id: "summonKnightNoirCramoisiScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chevalier Noir Cramoisi",
    description: "Apprend la compétence Invocation : Chevalier Noir Cramoisi.",
    grantsAbility: "summonKnightNoirCramoisi",
    stackable: false,
  },
  knightVertOrCore: {
    id: "knightVertOrCore",
    category: "craftingMaterial",
    name: "Noyau de chevalier Vert or",
    description: "Le cœur d'un chevalier vert or, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonKnightVertOrScroll: {
    id: "summonKnightVertOrScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chevalier Vert or",
    description: "Apprend la compétence Invocation : Chevalier Vert or.",
    grantsAbility: "summonKnightVertOr",
    stackable: false,
  },
  knightVioletArgentCore: {
    id: "knightVioletArgentCore",
    category: "craftingMaterial",
    name: "Noyau de chevalier Violet Argent",
    description:
      "Le cœur d'un chevalier violet argent, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonKnightVioletArgentScroll: {
    id: "summonKnightVioletArgentScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Chevalier Violet Argent",
    description: "Apprend la compétence Invocation : Chevalier Violet Argent.",
    grantsAbility: "summonKnightVioletArgent",
    stackable: false,
  },
  massecaillePurpleCore: {
    id: "massecaillePurpleCore",
    category: "craftingMaterial",
    name: "Noyau de massecaille Violet",
    description: "Le cœur d'un massecaille violet, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMassecaillePurpleScroll: {
    id: "summonMassecaillePurpleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Massecaille Violet",
    description: "Apprend la compétence Invocation : Massecaille Violet.",
    grantsAbility: "summonMassecaillePurple",
    stackable: false,
  },
  massecailleGreenCore: {
    id: "massecailleGreenCore",
    category: "craftingMaterial",
    name: "Noyau de massecaille Vert",
    description: "Le cœur d'un massecaille vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMassecailleGreenScroll: {
    id: "summonMassecailleGreenScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Massecaille Vert",
    description: "Apprend la compétence Invocation : Massecaille Vert.",
    grantsAbility: "summonMassecailleGreen",
    stackable: false,
  },
  massecailleRedCore: {
    id: "massecailleRedCore",
    category: "craftingMaterial",
    name: "Noyau de massecaille Rouge",
    description: "Le cœur d'un massecaille rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMassecailleRedScroll: {
    id: "summonMassecailleRedScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Massecaille Rouge",
    description: "Apprend la compétence Invocation : Massecaille Rouge.",
    grantsAbility: "summonMassecailleRed",
    stackable: false,
  },
  massecailleYellowCore: {
    id: "massecailleYellowCore",
    category: "craftingMaterial",
    name: "Noyau de massecaille Jaune",
    description: "Le cœur d'un massecaille jaune, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonMassecailleYellowScroll: {
    id: "summonMassecailleYellowScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Massecaille Jaune",
    description: "Apprend la compétence Invocation : Massecaille Jaune.",
    grantsAbility: "summonMassecailleYellow",
    stackable: false,
  },
  orqueBlackCore: {
    id: "orqueBlackCore",
    category: "craftingMaterial",
    name: "Noyau de orque en noir",
    description: "Le cœur d'une orque en noir, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrqueBlackScroll: {
    id: "summonOrqueBlackScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en noir",
    description: "Apprend la compétence Invocation : Orque en noir.",
    grantsAbility: "summonOrqueBlack",
    stackable: false,
  },
  orqueYellowCore: {
    id: "orqueYellowCore",
    category: "craftingMaterial",
    name: "Noyau de orque en jaune",
    description: "Le cœur d'une orque en jaune, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrqueYellowScroll: {
    id: "summonOrqueYellowScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en jaune",
    description: "Apprend la compétence Invocation : Orque en jaune.",
    grantsAbility: "summonOrqueYellow",
    stackable: false,
  },
  orqueBlueCore: {
    id: "orqueBlueCore",
    category: "craftingMaterial",
    name: "Noyau de orque en bleu",
    description: "Le cœur d'une orque en bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrqueBlueScroll: {
    id: "summonOrqueBlueScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en bleu",
    description: "Apprend la compétence Invocation : Orque en bleu.",
    grantsAbility: "summonOrqueBlue",
    stackable: false,
  },
  orqueRedCore: {
    id: "orqueRedCore",
    category: "craftingMaterial",
    name: "Noyau de orque en rouge",
    description: "Le cœur d'une orque en rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrqueRedScroll: {
    id: "summonOrqueRedScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en rouge",
    description: "Apprend la compétence Invocation : Orque en rouge.",
    grantsAbility: "summonOrqueRed",
    stackable: false,
  },
  orquePurpleCore: {
    id: "orquePurpleCore",
    category: "craftingMaterial",
    name: "Noyau de orque en violet",
    description: "Le cœur d'une orque en violet, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonOrquePurpleScroll: {
    id: "summonOrquePurpleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en violet",
    description: "Apprend la compétence Invocation : Orque en violet.",
    grantsAbility: "summonOrquePurple",
    stackable: false,
  },
  orqueGreyCore: {
    id: "orqueGreyCore",
    category: "craftingMaterial",
    name: "Noyau de orque en gris",
    description: "Le cœur d'une orque en gris, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  orqueGreyFurTuft: {
    id: "orqueGreyFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure d'orque gris",
    description:
      "Une touffe de fourrure d'orque gris, utilisée pour l'artisanat.",
    stackable: false,
  },
  summonOrqueGreyScroll: {
    id: "summonOrqueGreyScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Orque en gris",
    description: "Apprend la compétence Invocation : Orque en gris.",
    grantsAbility: "summonOrqueGrey",
    stackable: false,
  },
  trollBlueCore: {
    id: "trollBlueCore",
    category: "craftingMaterial",
    name: "Noyau de troll Bleu",
    description: "Le cœur d'un troll bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollBlueFurTuft: {
    id: "trollBlueFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll bleu",
    description:
      "Une touffe de fourrure de troll bleu, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollBlueScroll: {
    id: "summonTrollBlueScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll Bleu",
    description: "Apprend la compétence Invocation : Troll Bleu.",
    grantsAbility: "summonTrollBlue",
    stackable: false,
  },
  trollGrisCore: {
    id: "trollGrisCore",
    category: "craftingMaterial",
    name: "Noyau de troll Gris",
    description: "Le cœur d'un troll gris, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollGrisFurTuft: {
    id: "trollGrisFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll gris",
    description:
      "Une touffe de fourrure de troll gris, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollGrisScroll: {
    id: "summonTrollGrisScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll Gris",
    description: "Apprend la compétence Invocation : Troll Gris.",
    grantsAbility: "summonTrollGris",
    stackable: false,
  },
  trollRoseCore: {
    id: "trollRoseCore",
    category: "craftingMaterial",
    name: "Noyau de troll rose",
    description: "Le cœur d'une troll rose, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollRoseFurTuft: {
    id: "trollRoseFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll rose",
    description:
      "Une touffe de fourrure de troll rose, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollRoseScroll: {
    id: "summonTrollRoseScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll rose",
    description: "Apprend la compétence Invocation : Troll rose.",
    grantsAbility: "summonTrollRose",
    stackable: false,
  },
  trollRougeCore: {
    id: "trollRougeCore",
    category: "craftingMaterial",
    name: "Noyau de troll Rouge",
    description: "Le cœur d'un troll rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollRougeFurTuft: {
    id: "trollRougeFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll rouge",
    description:
      "Une touffe de fourrure de troll rouge, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollRougeScroll: {
    id: "summonTrollRougeScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll Rouge",
    description: "Apprend la compétence Invocation : Troll Rouge.",
    grantsAbility: "summonTrollRouge",
    stackable: false,
  },
  trollVertCore: {
    id: "trollVertCore",
    category: "craftingMaterial",
    name: "Noyau de troll vert",
    description: "Le cœur d'un troll vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollVertFurTuft: {
    id: "trollVertFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll vert",
    description:
      "Une touffe de fourrure de troll vert, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollVertScroll: {
    id: "summonTrollVertScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll vert",
    description: "Apprend la compétence Invocation : Troll vert.",
    grantsAbility: "summonTrollVert",
    stackable: false,
  },
  trollVioletCore: {
    id: "trollVioletCore",
    category: "craftingMaterial",
    name: "Noyau de troll Violet",
    description: "Le cœur d'une troll  violette, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  trollVioletFurTuft: {
    id: "trollVioletFurTuft",
    category: "craftingMaterial",
    name: "Touffe de fourrure de troll violet",
    description:
      "Une touffe de fourrure de troll violet, utilisée pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonTrollVioletScroll: {
    id: "summonTrollVioletScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Troll Violet",
    description: "Apprend la compétence Invocation : Troll Violet.",
    grantsAbility: "summonTrollViolet",
    stackable: false,
  },
  warlockRedCore: {
    id: "warlockRedCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Rouge",
    description: "Le cœur d'un sorcier rouge, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockRedScroll: {
    id: "summonWarlockRedScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Rouge",
    description: "Apprend la compétence Invocation : Sorcier Rouge.",
    grantsAbility: "summonWarlockRed",
    stackable: false,
  },
  warlockWhiteCore: {
    id: "warlockWhiteCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Blanc",
    description: "Le cœur d'un sorcier blanc, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockWhiteScroll: {
    id: "summonWarlockWhiteScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Blanc",
    description: "Apprend la compétence Invocation : Sorcier Blanc.",
    grantsAbility: "summonWarlockWhite",
    stackable: false,
  },
  warlockGreenCore: {
    id: "warlockGreenCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Vert",
    description: "Le cœur d'un sorcier vert, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockGreenScroll: {
    id: "summonWarlockGreenScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Vert",
    description: "Apprend la compétence Invocation : Sorcier Vert.",
    grantsAbility: "summonWarlockGreen",
    stackable: false,
  },
  warlockBlueCore: {
    id: "warlockBlueCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Bleu",
    description: "Le cœur d'un sorcier bleu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockBlueScroll: {
    id: "summonWarlockBlueScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Bleu",
    description: "Apprend la compétence Invocation : Sorcier Bleu.",
    grantsAbility: "summonWarlockBlue",
    stackable: false,
  },
  warlockBlackCore: {
    id: "warlockBlackCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Noir",
    description: "Le cœur d'un sorcier noir, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockBlackScroll: {
    id: "summonWarlockBlackScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Noir",
    description: "Apprend la compétence Invocation : Sorcier Noir.",
    grantsAbility: "summonWarlockBlack",
    stackable: false,
  },
  warlockPurpleCore: {
    id: "warlockPurpleCore",
    category: "craftingMaterial",
    name: "Noyau de sorcier Violet",
    description: "Le cœur d'un sorcier violet, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonWarlockPurpleScroll: {
    id: "summonWarlockPurpleScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Sorcier Violet",
    description: "Apprend la compétence Invocation : Sorcier Violet.",
    grantsAbility: "summonWarlockPurple",
    stackable: false,
  },
  golemCore: {
    id: "golemCore",
    category: "craftingMaterial",
    name: "Noyau de golem",
    description: "Le cœur d'un golem, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemScroll: {
    id: "summonGolemScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem",
    description: "Apprend la compétence Invocation : Golem.",
    grantsAbility: "summonGolem",
    stackable: false,
  },
  golemEauCore: {
    id: "golemEauCore",
    category: "craftingMaterial",
    name: "Noyau de golem d'eau",
    description: "Le cœur d'un golem d'eau, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemEauScroll: {
    id: "summonGolemEauScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem d'eau",
    description: "Apprend la compétence Invocation : Golem d'eau.",
    grantsAbility: "summonGolemEau",
    stackable: false,
  },
  golemFeuCore: {
    id: "golemFeuCore",
    category: "craftingMaterial",
    name: "Noyau de golem de feu",
    description: "Le cœur d'un golem de feu, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemFeuScroll: {
    id: "summonGolemFeuScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem de feu",
    description: "Apprend la compétence Invocation : Golem de feu.",
    grantsAbility: "summonGolemFeu",
    stackable: false,
  },
  golemFoudreCore: {
    id: "golemFoudreCore",
    category: "craftingMaterial",
    name: "Noyau de golem de foudre",
    description: "Le cœur d'un golem de foudre, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemFoudreScroll: {
    id: "summonGolemFoudreScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem de foudre",
    description: "Apprend la compétence Invocation : Golem de foudre.",
    grantsAbility: "summonGolemFoudre",
    stackable: false,
  },
  golemGlaceCore: {
    id: "golemGlaceCore",
    category: "craftingMaterial",
    name: "Noyau de golem de glace",
    description: "Le cœur d'un golem de glace, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemGlaceScroll: {
    id: "summonGolemGlaceScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem de glace",
    description: "Apprend la compétence Invocation : Golem de glace.",
    grantsAbility: "summonGolemGlace",
    stackable: false,
  },
  golemOmbreCore: {
    id: "golemOmbreCore",
    category: "craftingMaterial",
    name: "Noyau de golem d'ombre",
    description: "Le cœur d'un golem d'ombre, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonGolemOmbreScroll: {
    id: "summonGolemOmbreScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Golem d'ombre",
    description: "Apprend la compétence Invocation : Golem d'ombre.",
    grantsAbility: "summonGolemOmbre",
    stackable: false,
  },
  zombiequeenBossCore: {
    id: "zombiequeenBossCore",
    category: "craftingMaterial",
    name: "Noyau de reine Zombie",
    description: "Le cœur d'une reine zombie, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonZombiequeenBossScroll: {
    id: "summonZombiequeenBossScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Reine Zombie",
    description: "Apprend la compétence Invocation : Reine Zombie.",
    grantsAbility: "summonZombiequeenBoss",
    stackable: false,
  },
  zombiequeenCore: {
    id: "zombiequeenCore",
    category: "craftingMaterial",
    name: "Noyau de reine Zombie",
    description: "Le cœur d'une reine zombie, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonZombiequeenScroll: {
    id: "summonZombiequeenScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Reine Zombie",
    description: "Apprend la compétence Invocation : Reine Zombie.",
    grantsAbility: "summonZombiequeen",
    stackable: false,
  },
  beequeenBossCore: {
    id: "beequeenBossCore",
    category: "craftingMaterial",
    name: "Noyau de reine des abeilles",
    description: "Le cœur d'une reine des abeilles, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBeequeenBossScroll: {
    id: "summonBeequeenBossScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Reine des abeilles",
    description: "Apprend la compétence Invocation : Reine des abeilles.",
    grantsAbility: "summonBeequeenBoss",
    stackable: false,
  },
  beequeenCore: {
    id: "beequeenCore",
    category: "craftingMaterial",
    name: "Noyau de abeille Royale",
    description: "Le cœur d'une abeille royale, utilisé pour l'artisanat.",
    stackable: false,
    unique: true,
  },
  summonBeequeenScroll: {
    id: "summonBeequeenScroll",
    category: "abilityScroll",
    name: "Parchemin : Invocation : Abeille Royale",
    description: "Apprend la compétence Invocation : Abeille Royale.",
    grantsAbility: "summonBeequeen",
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
    { itemId: "healthPotion", weight: 35 },
    { itemId: "manaPotion", weight: 35 },
    { itemId: "gold", weight: 40, quantityRange: [2, 10] },
  ],
  crateStandard: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 30, quantityRange: [1, 2] },
  ],

  enemyDrop: [
    { itemId: null, weight: 50 }, // la plupart des ennemis ne laissent rien
    { itemId: "gold", weight: 28, quantityRange: [1, 5] },
    { itemId: "healthPotion", weight: 10 },
    { itemId: "manaPotion", weight: 10 },
    { itemId: "woodenArrow", weight: 13, quantityRange: [1, 4] },
    { itemId: "woodenCrossbowBolt", weight: 13, quantityRange: [1, 4] },
  ],
  deer1Drop: [
    { itemId: null, weight: 50 }, // la plupart des cerfs ne laissent rien
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fireballScroll", weight: 2 },
    { itemId: "deerAntler", weight: 40 },
    { itemId: "deerHoof", weight: 30 },
    { itemId: "deerMeat", weight: 20 },
    { itemId: "deerBone", weight: 10 },
    { itemId: "deer1Core", weight: 5 },
  ],
  angryBrownMushroomDrop: [
    { itemId: null, weight: 50 }, // la plupart des champignons bruns en colère ne laissent rien
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "mushroom", weight: 20 },
    { itemId: "healthPotionRecipe", weight: 2 },
    { itemId: "angryBrownMushroomCore", weight: 50 },
    { itemId: "vegetalFiber", weight: 50, quantityRange: [3, 5] },
  ],
  gnomeDrop: [
    { itemId: null, weight: 50 }, // la plupart des gnomes ne laissent rien
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "gnomeCore", weight: 50 },
    { itemId: "gnomeClaw", weight: 10 },
    { itemId: "gnomeFurTuft", weight: 50, quantityRange: [1, 3] },
  ],
  angryTrentDrop: [
    { itemId: null, weight: 50 }, // la plupart des trents en colère ne laissent rien
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "angryTrentCore", weight: 100 },
    { itemId: "wood", weight: 50, quantityRange: [1, 3] },
    { itemId: "vegetalFiber", weight: 50, quantityRange: [3, 5] },
  ],
  knifedBatDrop: [
    { itemId: null, weight: 50 }, // la plupart des chauves-souris poignardées ne laissent rien
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "batWings", weight: 10, quantityRange: [1, 2] },
    { itemId: "batFur", weight: 10, quantityRange: [1, 2] },
    { itemId: "batEye", weight: 10, quantityRange: [1, 2] },
    { itemId: "knifedBatCore", weight: 1 },
  ],

  bossDrop: [
    { itemId: "gold", weight: 20, quantityRange: [50, 100] },
    // PAS d'objet de quete (ancientRelic) ici - contrairement au reste
    // de cette table (tirage aleatoire), un objet de quete ne doit
    // JAMAIS tomber sans quete active, et doit tomber a coup SUR (pas
    // juste une chance) quand une quete active le cible - ni l'un ni
    // l'autre ne se preterait a un poids fixe dans un tirage aleatoire.
    // Cf. MainScene.damageEnemy (client) pour la vraie logique
    // d'attribution, conditionnee a l'etat des quetes du joueur.
  ],

  bossDropMaxibee: [
    { itemId: "honeycomb", weight: 15 },
    { itemId: "gold", weight: 20, quantityRange: [40, 80] },
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
  ],
  mudGolemDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "mudGolemCore", weight: 50 },
  ],
  redBeetleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "redBeetleCore", weight: 50 },
  ],
  pinkOgreDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "pinkOgreCore", weight: 50 },
  ],
  alien1Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien1Core", weight: 50 },
  ],
  alien2Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien2Core", weight: 50 },
  ],
  alien3Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien3Core", weight: 50 },
  ],
  alien4Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien4Core", weight: 50 },
  ],
  alien5Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien5Core", weight: 50 },
  ],
  alien6Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien6Core", weight: 50 },
  ],
  alien7Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien7Core", weight: 50 },
  ],
  alien8Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien8Core", weight: 50 },
  ],
  alien9Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien9Core", weight: 50 },
  ],
  alien10Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "alien10Core", weight: 50 },
  ],
  batDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "batCore", weight: 50 },
  ],
  brownBearDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "brownBearCore", weight: 50 },
  ],
  beeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "beeCore", weight: 50 },
  ],
  bigtickDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "bigtickCore", weight: 50 },
  ],
  blackdragonDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "blackdragonCore", weight: 50 },
  ],
  darkelfDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "darkelfCore", weight: 50 },
  ],
  demonDragonDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "demonDragonCore", weight: 50 },
  ],
  dwarfDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "dwarfCore", weight: 50 },
  ],
  fantasy1Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy1Core", weight: 50 },
  ],
  fantasy2Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy2Core", weight: 50 },
  ],
  fantasy3Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy3Core", weight: 50 },
  ],
  fantasy4Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy4Core", weight: 50 },
  ],
  orqueGreenDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueGreenCore", weight: 50 },
  ],
  redWarriorMushroomDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "redWarriorMushroomCore", weight: 50 },
  ],
  fantasy7Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy7Core", weight: 50 },
  ],
  massecailleBlueDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "massecailleBlueCore", weight: 50 },
  ],
  fantasy9Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "fantasy9Core", weight: 50 },
  ],
  knightJauneRougeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "knightJauneRougeCore", weight: 50 },
  ],
  gargoyleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "gargoyleCore", weight: 50 },
  ],
  ghostDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "ghostCore", weight: 50 },
  ],
  gnomeFouDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "gnomeFouCore", weight: 50 },
  ],
  golemDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemCore", weight: 50 },
  ],
  gorillaDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "gorillaCore", weight: 50 },
  ],
  greendragonDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "greendragonCore", weight: 50 },
  ],
  ogreDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "ogreCore", weight: 50 },
  ],
  redbeetleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "redbeetleCore", weight: 50 },
  ],
  robot1Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot1Core", weight: 50 },
  ],
  robot2Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot2Core", weight: 50 },
  ],
  robot3Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot3Core", weight: 50 },
  ],
  robot4Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot4Core", weight: 50 },
  ],
  robot5Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot5Core", weight: 50 },
  ],
  robot6Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot6Core", weight: 50 },
  ],
  robot7Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot7Core", weight: 50 },
  ],
  robot8Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot8Core", weight: 50 },
  ],
  robot9Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot9Core", weight: 50 },
  ],
  robot10Drop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "robot10Core", weight: 50 },
  ],
  skeletonDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "skeletonCore", weight: 50 },
  ],
  skeletonkingDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "skeletonkingCore", weight: 50 },
  ],
  greenSlimeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "greenSlimeCore", weight: 50 },
  ],
  spiderDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "spiderCore", weight: 50 },
  ],
  yellowSlimeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "yellowSlimeCore", weight: 50 },
  ],
  blueSlimeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "blueSlimeCore", weight: 50 },
  ],
  purpleSlimeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "purpleSlimeCore", weight: 50 },
  ],
  yellowWarriorMushroomDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "yellowWarriorMushroomCore", weight: 50 },
  ],
  blueWarriorMushroomDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "blueWarriorMushroomCore", weight: 50 },
  ],
  greenWarriorMushroomDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "greenWarriorMushroomCore", weight: 50 },
  ],
  purpleWarriorMushroomDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "purpleWarriorMushroomCore", weight: 50 },
  ],
  blackBearDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "blackBearCore", weight: 50 },
    { itemId: "blackBearPelt", weight: 50 },
    { itemId: "blackBearFurTuft", weight: 50 },
  ],
  whiteBearDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "whiteBearCore", weight: 50 },
  ],
  knightBleuArgentDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "knightBleuArgentCore", weight: 50 },
  ],
  knightNoirCramoisiDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "knightNoirCramoisiCore", weight: 50 },
  ],
  knightVertOrDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "knightVertOrCore", weight: 50 },
  ],
  knightVioletArgentDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "knightVioletArgentCore", weight: 50 },
  ],
  massecaillePurpleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "massecaillePurpleCore", weight: 50 },
  ],
  massecailleGreenDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "massecailleGreenCore", weight: 50 },
  ],
  massecailleRedDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "massecailleRedCore", weight: 50 },
  ],
  massecailleYellowDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "massecailleYellowCore", weight: 50 },
  ],
  orqueBlackDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueBlackCore", weight: 50 },
  ],
  orqueYellowDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueYellowCore", weight: 50 },
  ],
  orqueBlueDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueBlueCore", weight: 50 },
  ],
  orqueRedDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueRedCore", weight: 50 },
  ],
  orquePurpleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orquePurpleCore", weight: 50 },
  ],
  orqueGreyDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "orqueGreyCore", weight: 50 },
    { itemId: "orqueGreyFurTuft", weight: 50 },
  ],
  trollBlueDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollBlueCore", weight: 50 },
    { itemId: "trollBlueFurTuft", weight: 50 },
  ],
  trollGrisDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollGrisCore", weight: 50 },
    { itemId: "trollGrisFurTuft", weight: 50 },
  ],
  trollRoseDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollRoseCore", weight: 50 },
    { itemId: "trollRoseFurTuft", weight: 50 },
  ],
  trollRougeDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollRougeCore", weight: 50 },
    { itemId: "trollRougeFurTuft", weight: 50 },
  ],
  trollVertDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollVertCore", weight: 50 },
    { itemId: "trollVertFurTuft", weight: 50 },
  ],
  trollVioletDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "trollVioletCore", weight: 50 },
    { itemId: "trollVioletFurTuft", weight: 50 },
  ],
  warlockRedDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockRedCore", weight: 50 },
  ],
  warlockWhiteDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockWhiteCore", weight: 50 },
  ],
  warlockGreenDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockGreenCore", weight: 50 },
  ],
  warlockBlueDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockBlueCore", weight: 50 },
  ],
  warlockBlackDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockBlackCore", weight: 50 },
  ],
  warlockPurpleDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "warlockPurpleCore", weight: 50 },
  ],
  golemDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemCore", weight: 50 },
  ],
  golemEauDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemEauCore", weight: 50 },
  ],
  golemFeuDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemFeuCore", weight: 50 },
  ],
  golemFoudreDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemFoudreCore", weight: 50 },
  ],
  golemGlaceDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemGlaceCore", weight: 50 },
  ],
  golemOmbreDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "golemOmbreCore", weight: 50 },
  ],
  zombiequeenBossDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "zombiequeenBossCore", weight: 50 },
  ],
  zombiequeenDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "zombiequeenCore", weight: 50 },
  ],
  beequeenBossDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "beequeenBossCore", weight: 50 },
  ],
  beequeenDrop: [
    { itemId: null, weight: 50 },
    { itemId: "gold", weight: 50, quantityRange: [1, 3] },
    { itemId: "beequeenCore", weight: 50 },
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
function rollLoot(tableName, rng, depth = Infinity, excludeItemIds = null) {
  const table = LOOT_TABLES[tableName];
  if (!table) return null;

  // filtre les entrees pas encore accessibles a cette profondeur AVANT
  // le tirage pondere - sinon une entree trop profonde "gaspillerait"
  // une part du tirage en tombant sur rien, faussant les probabilites
  // relatives des objets REELLEMENT disponibles a cet etage. minDepth
  // absent = disponible des le debut (comportement inchange pour toute
  // entree qui ne definit pas ce champ).
  const eligibleTable = table.filter(
    (entry) =>
      (!entry.minDepth || depth >= entry.minDepth) &&
      (!excludeItemIds ||
        !entry.itemId ||
        !excludeItemIds.includes(entry.itemId)),
  );
  if (eligibleTable.length === 0) return null;

  const totalWeight = eligibleTable.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );
  let roll = rng() * totalWeight;

  for (const entry of eligibleTable) {
    if (roll < entry.weight) {
      if (!entry.itemId) return null;
      const quantity = entry.quantityRange
        ? entry.quantityRange[0] +
          Math.floor(
            rng() * (entry.quantityRange[1] - entry.quantityRange[0] + 1),
          )
        : 1;

      // objet unique tire - l'ajoute IMMEDIATEMENT a la liste d'exclusion
      // partagee, pour empecher un DEUXIEME tirage du meme objet plus
      // tard dans CETTE MEME generation (un autre coffre, un autre
      // ennemi...) - pas seulement lors d'une visite future
      const itemDef = ITEM_TYPES[entry.itemId];
      if (
        itemDef?.unique &&
        excludeItemIds &&
        !excludeItemIds.includes(entry.itemId)
      ) {
        excludeItemIds.push(entry.itemId);
      }

      return { itemId: entry.itemId, quantity };
    }
    roll -= entry.weight;
  }

  return null;
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
function rollMultipleLoot(
  tableName,
  rng,
  rolls,
  depth = Infinity,
  excludeItemIds = null,
) {
  const results = [];
  const usedItemIds = new Set();
  for (let i = 0; i < rolls; i++) {
    let result = rollLoot(tableName, rng, depth, excludeItemIds);
    if (result && usedItemIds.has(result.itemId)) {
      result = rollLoot(tableName, rng, depth, excludeItemIds);
      if (result && usedItemIds.has(result.itemId)) result = null;
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
