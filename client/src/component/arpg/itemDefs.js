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
