/**
 * Miroir CLIENT des définitions d'objets - cf. server/services/generation/itemTypes.js,
 * la vraie source de vérité pour ce qui TOMBE (quel objet, où, à quelle
 * fréquence). `statBonus`/`effect`/`price` sont recopiés ici aussi
 * désormais (utilisés par equipment.js pour les bonus de stats, par
 * l'utilisation des consommables, et par la vente en boutique - cf.
 * MainScene.sellItem) - le serveur reste seul décideur de ce qui tombe,
 * mais une fois l'objet en inventaire, appliquer son effet ou calculer
 * son prix de revente est une opération purement locale, pas besoin
 * d'aller-retour serveur.
 *
 * Les deux fichiers doivent rester synchronisés à la main (mêmes clés,
 * mêmes statBonus/effect) - exactement la même discipline que
 * spriteRegistry.js (clés client) vs enemyStats.js/biomeConfig.js (clés
 * serveur) déjà en place ailleurs dans le projet.
 */
export const ITEM_DEFS = {
  healthPotion: {
    id: "healthPotion",
    category: "consumable",
    name: "Potion de soin",
    description: "Restaure 30 PV à l'usage.",
    effect: { heal: 30 },
    stackable: true,
    price: 15,
  },
  manaPotion: {
    id: "manaPotion",
    category: "consumable",
    name: "Potion de mana",
    description: "Restaure 10 PM à l'usage.",
    effect: { mana: 10 },
    stackable: true,
    price: 15,
  },
  ironSword: {
    id: "ironSword",
    category: "equipment",
    slot: "mainHand", // une main - peut cohabiter avec un bouclier (offHand) ou une seconde arme (double armement automatique si offHand est libre, cf. MainScene.equipItem)
    twoHanded: false,
    grantsRanged: false, // explicite plutot qu'absent - purement melee, ne debloque jamais l'attaque a distance seule (cf. MainScene.canUseRangedAttack)
    name: "Épée de fer",
    description: "+5 dégâts au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
    price: 60,
  },
  huntingBow: {
    id: "huntingBow",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true, // occupe les DEUX mains - equiper libere mainHand ET offHand (cf. MainScene.equipItem)
    grantsRanged: true, // sans arme marquee ainsi equipee (ici ou en offHand), l'attaque a distance est indisponible - cf. MainScene.canUseRangedAttack
    requiresAmmo: "woodenArrow", // itemId EXACT requis (pas juste un booleen) - un carreau ne peut pas alimenter un arc, cf. MainScene.performRangedAttack
    name: "Arc de chasse",
    description: "+4 dégâts à distance.",
    statBonus: { rangedDamage: 4 },
    stackable: false,
    price: 55,
  },
  crossbow: {
    id: "crossbow",
    category: "equipment",
    slot: "mainHand", // une main - peut cohabiter avec une epee (double armement automatique si l'autre main est libre, cf. MainScene.equipItem) ou un bouclier
    twoHanded: false,
    grantsRanged: true,
    requiresAmmo: "crossbowBolt", // munition DISTINCTE des fleches - un carreau ne peut alimenter que l'arbalete, jamais un arc
    name: "Arbalète",
    description: "+3 dégâts à distance. Se manie a une main.",
    statBonus: { rangedDamage: 3 },
    stackable: false,
    price: 50,
  },
  leatherArmor: {
    id: "leatherArmor",
    category: "equipment",
    slot: "armor",
    name: "Armure de cuir",
    description: "+3 défense.",
    statBonus: { defense: 3 },
    stackable: false,
    price: 45,
  },
  vitalityCharm: {
    id: "vitalityCharm",
    category: "equipment",
    slot: "necklace", // un charme se porte au cou - emplacement distinct des bagues (ring1/ring2) et de la ceinture (belt), plus de fourre-tout "accessory" generique
    name: "Charme de vitalité",
    description: "+20 PV maximum.",
    statBonus: { maxHp: 20 },
    stackable: false,
    price: 70,
  },
  gold: {
    id: "gold",
    category: "currency",
    name: "Or",
    description: "Monnaie du jeu.",
    stackable: true,
  },
  ancientRelic: {
    id: "ancientRelic",
    category: "questItem",
    name: "Relique ancienne",
    description: "Un artefact qui semble important.",
    stackable: false,
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
    // pas de price -> jamais achetable ni vendable (cf. sellItem, qui
    // exige def.price) - objet de depart uniquement (cf. HERO_STATS_PROFILES
    // dans spriteRegistry.js), et jamais dans une table de butin non plus
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
    stackable: false,
  },
  woodenBow: {
    id: "woodenBow",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: true,
    requiresAmmo: "woodenArrow", // itemId EXACT requis (pas juste un booleen)
    name: "Arc en bois",
    description:
      "+1 dégât à distance. Nécessite des flèches. Arme d'entraînement de départ.",
    statBonus: { rangedDamage: 1 },
    stackable: false,
  },
  woodenDagger: {
    id: "woodenDagger",
    category: "equipment",
    slot: "mainHand",
    twoHanded: false,
    grantsRanged: false,
    name: "Dague en bois",
    description: "+1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1 },
    stackable: false,
  },
  woodenStaff: {
    id: "woodenStaff",
    category: "equipment",
    slot: "mainHand",
    twoHanded: true,
    grantsRanged: true,
    requiresAmmo: false, // la magie ne consomme pas de flèches, contrairement a l'arc
    manaCost: 1, // coute du mana au lieu de munitions physiques - cf. MainScene.performRangedAttack. A sec, retombe naturellement en melee pur (le baton n'a aucun bonus de meleeDamage)
    name: "Bâton en bois",
    description:
      "+1 dégât à distance. Canalise la magie (1 mana par tir). +1 dégât au corps à corps. Arme d'entraînement de départ.",
    statBonus: { meleeDamage: 1, rangedDamage: 1 },
    stackable: false,
  },
  woodenArrow: {
    id: "woodenArrow",
    category: "ammo", // pas 'equipment' - regles d'equipement dediees (cf. MainScene.equipItem/unequipItem), jamais retire de l'inventaire en s'equipant, contrairement a un objet 'equipment' classique
    slot: "quiver",
    name: "Flèche en bois",
    description:
      "+1 dégât à distance tant que des flèches sont encochées. Récupérables sur les ennemis, ou achetables en boutique.",
    statBonus: { rangedDamage: 1 },
    stackable: true,
    price: 2, // seul objet "en bois" achetable ET lootable - cf. LOOT_TABLES.enemyDrop cote serveur
  },
  crossbowBolt: {
    id: "crossbowBolt",
    category: "ammo",
    slot: "quiver", // meme emplacement que les fleches (un seul type de munition encochee a la fois) - cf. MainScene.performRangedAttack, qui verifie que le carquois contient PRECISEMENT le type requis par l'arme equipee (requiresAmmo), jamais juste "des munitions" au sens large
    name: "Carreau",
    description:
      "+1 dégât à distance tant que des carreaux sont encochés. Munition de l'arbalète - jamais compatible avec un arc.",
    statBonus: { rangedDamage: 1 },
    stackable: true,
    price: 3,
  },
  sealedPackage: {
    id: "sealedPackage",
    category: "questItem", // pas de price -> jamais vendable, meme garantie que ancientRelic
    name: "Colis scellé",
    description: "À livrer à son destinataire, sans l'ouvrir.",
    stackable: false,
  },
};

/**
 * Résout la définition d'un objet, avec repli propre si le client ne
 * connaît pas encore une clé envoyée par le serveur (ex: nouvel objet
 * ajouté côté serveur avant que ce fichier soit mis à jour) - n'empêche
 * jamais l'objet d'exister dans l'inventaire, juste son affichage et ses
 * effets (repli sans statBonus/effect : l'objet ne fait juste rien de
 * spécial tant qu'il n'est pas correctement défini ici).
 */
export function resolveItemDef(itemId) {
  return (
    ITEM_DEFS[itemId] || {
      id: itemId,
      category: "unknown",
      name: itemId,
      description: "",
      stackable: true,
    }
  );
}
