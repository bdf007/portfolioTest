const { createRng } = require('./rng');
const { rollLoot } = require('./itemTypes');

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
    id: 'killEnemies',
    targetRange: [3, 8],
    xpReward: 20,
    buildDialogText(target, progress, enemyTypeLabel) {
      if (progress.completed) return `Merci d'avoir tué ces ${enemyTypeLabel} pour moi !`;
      if (progress.accepted) return `Progression : ${progress.killCount} / ${target} ${enemyTypeLabel} tués. Reviens me voir une fois terminé !`;
      return `Peux-tu tuer ${target} ${enemyTypeLabel} pour moi ?`;
    },
  },
};

/**
 * Quêtes écrites à la main, pour des moments précis - indexées par
 * profondeur. Si une entrée existe pour l'étage où se trouve une ville,
 * elle est utilisée TELLE QUELLE (aucun tirage aléatoire) - cf.
 * ArpgController.getLevel. Une ville sans entrée ici retombe sur le
 * générateur aléatoire habituel (generateQuestForNpc).
 *
 * `dialogText` est optionnel - à fournir uniquement si tu veux un texte
 * narratif personnalisé plutôt que le texte générique du type de quête
 * (cf. QUEST_TYPES.killEnemies.buildDialogText). Les trois états sont
 * indépendants : tu peux en personnaliser un seul et laisser les autres
 * vides, ils retomberont sur le texte générique.
 *
 * Exemple :
 * const FIXED_QUESTS = {
 *   30: {
 *     questId: 'killEnemies',
 *     target: 10,
 *     xpReward: 100,
 *     targetEnemyType: 'skeleton',
 *     dialogText: {
 *       offer: "Le seigneur des ombres a envoye ses sbires piller notre reserve. Peux-tu nous debarrasser de 10 squelettes ?",
 *       complete: "Tu nous as sauves ! Prends cette recompense.",
 *     },
 *   },
 * };
 */
const FIXED_QUESTS = {};

/**
 * Choisit un type de quête, son objectif ET le type d'ennemi cible
 * (seedé, reproductible) pour un PNJ donné.
 *
 * @param {string} seed seed du niveau (derive sa propre seed de quete)
 * @param {string[]} enemyTypePool types d'ennemis parmi lesquels choisir
 *   la cible - a fournir par l'appelant (typiquement les types du biome
 *   qui suit la ville, cf. ArpgController.getLevel) plutot que TOUS les
 *   types du jeu : demander un monstre qu'on ne croise que 80 etages
 *   plus loin n'aurait aucun sens pour le joueur.
 * @returns {{questId:string, target:number, xpReward:number, targetEnemyType:string, itemReward:{itemId:string,quantity:number}|null}}
 */
function generateQuestForNpc(seed, enemyTypePool) {
  const rng = createRng(String(seed) + '-quest');
  const typeKeys = Object.keys(QUEST_TYPES);
  const typeKey = typeKeys[Math.floor(rng() * typeKeys.length)];
  const type = QUEST_TYPES[typeKey];

  const [min, max] = type.targetRange;
  const target = min + Math.floor(rng() * (max - min + 1));

  const pool = enemyTypePool && enemyTypePool.length > 0 ? enemyTypePool : ['enemyDefault'];
  const targetEnemyType = pool[Math.floor(rng() * pool.length)];

  // seed distincte pour la recompense en objet, pour ne jamais coupler
  // ce tirage a celui de l'objectif/du type cible
  const itemReward = rollLoot('questReward', createRng(String(seed) + '-quest-reward'));

  return { questId: type.id, target, xpReward: type.xpReward, targetEnemyType, itemReward };
}

/**
 * Renvoie la quete fixe pour cette profondeur, si elle existe.
 * @param {number} depth
 * @returns {object|null}
 */
function getFixedQuest(depth) {
  return FIXED_QUESTS[depth] || null;
}

module.exports = { QUEST_TYPES, FIXED_QUESTS, generateQuestForNpc, getFixedQuest };
