const { createRng } = require("./rng");
const { rollLoot, ITEM_TYPES } = require("./itemTypes");

/**
 * Table des types de quêtes proposées par les PNJ - même esprit que
 * enemyStats.js/biomeConfig.js : un seul type aujourd'hui (tuer N
 * ennemis d'un type precis), mais une table plutôt qu'une valeur en dur
 * pour en ajouter facilement plus tard (une quête de collecte, d'escorte...).
 *
 * Chaque type doit fournir :
 * - targetRange: [min, max] - le nombre d'ennemis (ou autre objectif)
 *   est tiré aléatoirement dans cette fourchette, seedé (reproductible)
 * - xpReward: récompense à la complétion
 * - buildDialogText(target, progress, enemyTypeLabel): texte affiché
 *   selon l'état
 */
const QUEST_TYPES = {
  killEnemies: {
    id: "killEnemies",
    targetRange: [3, 8],
    xpReward: 20,
    buildDialogText(target, progress, enemyTypeLabel) {
      if (progress.completed)
        return `Merci d'avoir tué ces ${enemyTypeLabel} pour moi !`;
      if (progress.accepted)
        return `Progression : ${progress.killCount} / ${target} ${enemyTypeLabel} tués. Reviens me voir une fois terminé !`;
      return `Peux-tu tuer ${target} ${enemyTypeLabel} pour moi ?`;
    },
  },
};

/**
 * Quête "récupérer tel objet" - VOLONTAIREMENT séparée de QUEST_TYPES :
 * generateQuestForNpc pioche au hasard parmi TOUTES les clés de
 * QUEST_TYPES, donc y ajouter ce type le ferait apparaître n'importe où,
 * y compris dans une ville située avant tout boss vaincu (non-sens
 * narratif - rien à "récupérer" sur un boss jamais rencontré). C'est
 * ArpgController.js qui décide explicitement de l'éligibilité (profondeur
 * de ville > profondeur du boss le plus proche) avant d'appeler
 * generateObtainItemQuest, jamais un tirage générique.
 *
 * Vraie livraison : l'objet appartient au PNJ, pas au joueur - il faut le
 * RENDRE (retiré de l'inventaire) pour toucher la récompense (or ET XP),
 * pas juste l'avoir en poche. Cf. MainScene.turnInQuest().
 */
const OBTAIN_ITEM_XP_REWARD = 40; // plus genereux que killEnemies (20) - implique de redescendre et re-vaincre un boss, pas juste tuer des ennemis de passage
const OBTAIN_ITEM_GOLD_REWARD_RANGE = [20, 50];

/**
 * Choisit un objet cible (seedé) pour une quête "récupérer tel objet",
 * typiquement parmi le butin possible d'un boss déjà vaincu.
 *
 * @param {string} seed seed DEJA distincte par PNJ (meme convention que generateQuestForNpc)
 * @param {string[]} itemPool objets parmi lesquels choisir la cible
 * @returns {{questId:string, targetItemId:string, xpReward:number, goldReward:number, itemReward:null}}
 */
/**
 * @param {string} seed seed DEJA distincte par PNJ (meme convention que generateQuestForNpc)
 * @param {string[]} itemPool objets parmi lesquels choisir la cible
 * @param {number[]} [bossDepths] etage(s) ou un boss peut donner cet
 *   objet (cf. ArpgController.BOSS_DEPTHS) - sert uniquement a
 *   construire un indice explicite dans le texte du dialogue ("l'etage
 *   5"), pour que le joueur sache ou chercher sans avoir a deviner (bug
 *   remonte : quete recue sans aucune indication de lieu)
 * @returns {{questId:string, targetItemId:string, xpReward:number, goldReward:number, itemReward:null, dialogText:Object}}
 */
function generateObtainItemQuest(seed, itemPool, bossDepths = []) {
  const rng = createRng(String(seed) + "-obtain-item");
  const pool = itemPool && itemPool.length > 0 ? itemPool : ["healthPotion"];
  const targetItemId = pool[Math.floor(rng() * pool.length)];
  const [minGold, maxGold] = OBTAIN_ITEM_GOLD_REWARD_RANGE;
  const goldReward = minGold + Math.floor(rng() * (maxGold - minGold + 1));

  const itemDef = ITEM_TYPES[targetItemId];
  const itemName = itemDef ? itemDef.name : targetItemId;
  const depthHint =
    bossDepths.length > 0
      ? ` Un boss redoutable rôde à l'étage ${bossDepths.join(" ou ")} - c'est lui qui le détient.`
      : "";

  // uniquement le texte de PROPOSITION (avec l'indice de lieu) - PAS de
  // "progress"/"complete" personnalises ici : cote client, le champ
  // "progress" sert a DEUX etats distincts de la quete (objet pas
  // encore trouve / objet en poche pret a rendre), avec un seul texte
  // fixe on risquerait d'afficher le mauvais message dans l'un des deux
  // cas. Laisser ces deux-la a la charge des replis generiques cote
  // client, deja corrects pour chaque etat.
  return {
    questId: "obtainItem",
    targetItemId,
    xpReward: OBTAIN_ITEM_XP_REWARD,
    goldReward,
    itemReward: null,
    dialogText: {
      offer: `Peux-tu me rapporter ${itemName} ?${depthHint}`,
    },
  };
}

/**
 * Quêtes écrites à la main, pour des moments précis - indexées par
 * profondeur, en TABLEAU (un élément par PNJ à cet étage, dans l'ordre
 * où ils sont générés - cf. ArpgController.getLevel). Un élément `null`
 * dans le tableau laisse CE PNJ précis retomber sur le tirage aléatoire,
 * tandis que les autres PNJ du même étage peuvent avoir leur propre
 * quête fixe - utile pour n'en scripter qu'un seul parmi plusieurs.
 *
 * `dialogText` est optionnel - à fournir uniquement si tu veux un texte
 * narratif personnalisé plutôt que le texte générique du type de quête
 * (cf. QUEST_TYPES.killEnemies.buildDialogText). Les trois états sont
 * indépendants : tu peux en personnaliser un seul et laisser les autres
 * vides, ils retomberont sur le texte générique.
 *
 * Exemple (deux PNJ à l'étage 30, le premier scripté, le second aléatoire) :
 * const FIXED_QUESTS = {
 *   30: [
 *     {
 *       questId: 'killEnemies',
 *       target: 10,
 *       xpReward: 100,
 *       targetEnemyType: 'skeleton',
 *       dialogText: {
 *         offer: "Le seigneur des ombres a envoye ses sbires piller notre reserve. Peux-tu nous debarrasser de 10 squelettes ?",
 *         complete: "Tu nous as sauves ! Prends cette recompense.",
 *       },
 *     },
 *     null, // le deuxieme PNJ de cet etage reste aleatoire
 *   ],
 * };
 */
const FIXED_QUESTS = {};

/**
 * Choisit un type de quête, son objectif ET le type d'ennemi cible
 * (seedé, reproductible) pour un PNJ donné.
 *
 * @param {string} seed seed DEJA distincte par PNJ (cf. ArpgController -
 *   inclut l'index du PNJ, pour que plusieurs PNJ du meme etage n'aient
 *   jamais la meme quete par coincidence)
 * @param {string[]} enemyTypePool types d'ennemis parmi lesquels choisir
 *   la cible - a fournir par l'appelant (typiquement les types du biome
 *   qui suit la ville, cf. ArpgController.getLevel) plutot que TOUS les
 *   types du jeu : demander un monstre qu'on ne croise que 80 etages
 *   plus loin n'aurait aucun sens pour le joueur.
 * @returns {{questId:string, target:number, xpReward:number, targetEnemyType:string, itemReward:{itemId:string,quantity:number}|null}}
 */
function generateQuestForNpc(seed, enemyTypePool) {
  const rng = createRng(String(seed) + "-quest");
  const typeKeys = Object.keys(QUEST_TYPES);
  const typeKey = typeKeys[Math.floor(rng() * typeKeys.length)];
  const type = QUEST_TYPES[typeKey];

  const [min, max] = type.targetRange;
  const target = min + Math.floor(rng() * (max - min + 1));

  const pool =
    enemyTypePool && enemyTypePool.length > 0
      ? enemyTypePool
      : ["enemyDefault"];
  const targetEnemyType = pool[Math.floor(rng() * pool.length)];

  // seed distincte pour la recompense en objet, pour ne jamais coupler
  // ce tirage a celui de l'objectif/du type cible
  const itemReward = rollLoot(
    "questReward",
    createRng(String(seed) + "-quest-reward"),
  );

  return {
    questId: type.id,
    target,
    xpReward: type.xpReward,
    targetEnemyType,
    itemReward,
  };
}

/**
 * Renvoie la quete fixe pour un PNJ precis (par index, dans l'ordre de
 * generation) a cette profondeur, si elle existe.
 * @param {number} depth
 * @param {number} npcIndex
 * @returns {object|null}
 */
function getFixedQuest(depth, npcIndex) {
  const forDepth = FIXED_QUESTS[depth];
  if (!Array.isArray(forDepth)) return null;
  return forDepth[npcIndex] || null;
}

const OBTAIN_ENEMY_LOOT_XP_REWARD = 30; // entre killEnemies (20) et obtainItem/boss (40)
const OBTAIN_ENEMY_LOOT_GOLD_REWARD_RANGE = [15, 35];
const OBTAIN_ENEMY_LOOT_QUANTITY_RANGE = [1, 3]; // nombre d'exemplaires a rapporter, tire aleatoirement

/**
 * Quête "récupérer tel objet sur tel type d'ennemi NORMAL" - variante de
 * generateObtainItemQuest (qui cible un boss) : chaque type d'ennemi
 * peut declarer un questLoot (cf. enemyStats.js) qui ne tombe QUE si une
 * quete active le cible (cf. MainScene.damageEnemy).
 *
 * Reutilise le MEME questId ('obtainItem') que la variante boss -
 * MainScene.js (openQuestDialog/turnInQuest) traite deja ce type
 * generiquement, aucun changement necessaire la-bas tant que
 * dialogText.offer est fourni (ce qui est le cas ici).
 *
 * @param {string} seed seed DEJA distincte par PNJ
 * @param {{itemId:string, enemyType:string}[]} lootPool paires eligibles
 * @returns {object|null} null si lootPool est vide - l'appelant doit
 *   alors retomber sur un autre type de quete
 */
function generateObtainEnemyLootQuest(seed, lootPool) {
  if (!lootPool || lootPool.length === 0) return null;

  const rng = createRng(String(seed) + "-obtain-enemy-loot");
  const choice = lootPool[Math.floor(rng() * lootPool.length)];
  const [minGold, maxGold] = OBTAIN_ENEMY_LOOT_GOLD_REWARD_RANGE;
  const goldReward = minGold + Math.floor(rng() * (maxGold - minGold + 1));
  const [minQty, maxQty] = OBTAIN_ENEMY_LOOT_QUANTITY_RANGE;
  const targetQuantity = minQty + Math.floor(rng() * (maxQty - minQty + 1));
  const itemDef = ITEM_TYPES[choice.itemId];
  const itemName = itemDef ? itemDef.name : choice.itemId;

  return {
    questId: "obtainItem",
    targetItemId: choice.itemId,
    targetQuantity,
    xpReward: OBTAIN_ENEMY_LOOT_XP_REWARD,
    goldReward,
    itemReward: null,
    dialogText: {
      offer: `Peux-tu me rapporter ${targetQuantity} ${itemName} ? On en trouve parfois sur ${choice.enemyType}.`,
    },
  };
}

module.exports = {
  QUEST_TYPES,
  FIXED_QUESTS,
  generateQuestForNpc,
  generateObtainItemQuest,
  getFixedQuest,
  generateObtainEnemyLootQuest,
};
