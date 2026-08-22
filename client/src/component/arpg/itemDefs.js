/**
 * Miroir CLIENT des définitions d'objets - cf. server/services/generation/itemTypes.js,
 * la vraie source de vérité pour ce qui TOMBE (quel objet, où, à quelle
 * fréquence). `statBonus`/`effect` sont recopiés ici aussi désormais
 * (utilisés par equipment.js pour calculer les bonus de stats et par
 * l'utilisation des consommables) - le serveur reste seul décideur de ce
 * qui tombe, mais une fois l'objet en inventaire, appliquer son effet
 * est une opération purement locale, pas besoin d'aller-retour serveur.
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
  },
  ironSword: {
    id: "ironSword",
    category: "equipment",
    slot: "weapon",
    name: "Épée de fer",
    description: "+5 dégâts au corps à corps.",
    statBonus: { meleeDamage: 5 },
    stackable: false,
  },
  huntingBow: {
    id: "huntingBow",
    category: "equipment",
    slot: "weapon",
    name: "Arc de chasse",
    description: "+4 dégâts à distance.",
    statBonus: { rangedDamage: 4 },
    stackable: false,
  },
  leatherArmor: {
    id: "leatherArmor",
    category: "equipment",
    slot: "armor",
    name: "Armure de cuir",
    description: "+3 défense.",
    statBonus: { defense: 3 },
    stackable: false,
  },
  vitalityCharm: {
    id: "vitalityCharm",
    category: "equipment",
    slot: "accessory",
    name: "Charme de vitalité",
    description: "+20 PV maximum.",
    statBonus: { maxHp: 20 },
    stackable: false,
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
