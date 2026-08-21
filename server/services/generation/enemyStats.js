/**
 * Table des archétypes d'ennemis - un seul fichier à modifier pour
 * ajouter un nouveau type de combat (un gobelin rapide et fragile, un
 * squelette lent et résistant...) sans toucher au reste du système.
 *
 * Chaque archétype suit la MÊME formule de mise à l'échelle par
 * profondeur (croissance exponentielle sur hp/dégâts/xp, additive et
 * plafonnée sur vitesse/défense - cf. le détail dans getEnemyStatsForDepth)
 * mais avec ses PROPRES constantes de base et de croissance. La courbe
 * elle-même (le "pourquoi" de cette forme) est expliquée une seule fois
 * ici plutôt que répétée par archétype.
 *
 * Volontairement calculé côté serveur : les stats déterminent l'issue des
 * combats, donc c'est la même logique de confiance que la génération de
 * niveau - le client ne doit jamais pouvoir se donner ses propres stats.
 * Pour la même raison, c'est aussi le serveur qui CHOISIT quel archétype
 * un ennemi donné utilise (cf. ArpgController.getLevel) - le client se
 * contente d'afficher le sprite correspondant au type reçu, il ne tire
 * jamais ce choix de son côté (ça désynchroniserait visuel et stats).
 */

const ENEMY_TYPES = {
  enemyDefault: {
    base: { hp: 20, damage: 4, xpReward: 10 },
    // >1 = croissance exponentielle. Volontairement différencié par stat :
    // les PV grimpent un peu plus vite que les dégâts, pour que les
    // combats s'allongent en profondeur plutôt que de devenir
    // immédiatement mortels des deux côtés à la fois.
    growthRate: { hp: 1.18, damage: 1.15, xpReward: 1.12 },
    // vitesse et défense évoluent à part, en additif et plafonné - une
    // croissance exponentielle sur ces deux stats rendrait les ennemis
    // injouables (intouchables ou infuyables) bien avant que PV/dégâts
    // n'atteignent des niveaux critiques
    speedBase: 90,
    speedMax: 140,
    speedGrowthPerDepth: 2,
    defenseGrowthEveryNDepths: 3, // +1 defense tous les 3 etages
  },
  goblin: {
    base: { hp: 10, damage: 3, xpReward: 8 },
    growthRate: { hp: 1.15, damage: 1.12, xpReward: 1.1 },
    speedBase: 100,
    speedMax: 160,
    speedGrowthPerDepth: 3,
    defenseGrowthEveryNDepths: 4,
  },
  goblin2: {
    base: { hp: 12, damage: 2, xpReward: 9 },
    growthRate: { hp: 1.14, damage: 1.11, xpReward: 1.09 },
    speedBase: 110,
    speedMax: 170,
    speedGrowthPerDepth: 3,
    defenseGrowthEveryNDepths: 4,
  },
  enemy1: {
    base: { hp: 30, damage: 5, xpReward: 12 },
    growthRate: { hp: 1.2, damage: 1.18, xpReward: 1.15 },
    speedBase: 80,
    speedMax: 130,
    speedGrowthPerDepth: 2,
    defenseGrowthEveryNDepths: 3,
  },
  bat1: {
    base: { hp: 8, damage: 2, xpReward: 7 },
    growthRate: { hp: 1.13, damage: 1.1, xpReward: 1.08 },
    speedBase: 120,
    speedMax: 180,
    speedGrowthPerDepth: 4,
    defenseGrowthEveryNDepths: 5,
  },
  // Boss du premier donjon (depth=5) - cf. biomeConfig.js pour le contexte
  // premier boss (etage 5 pour l'instant, cf. biomeConfig.js/ArpgController.js).
  // Meme courbe de croissance que enemyDefault (coherence si un boss
  // apparait un jour plus profond), mais base bien plus haute - a
  // depth=5, ca donne environ 291 PV / 21 degats / 157 xp contre 39/7/16
  // pour un ennemi normal (~7.5x plus de PV, 3x plus de degats, gros
  // bonus d'XP a la mort). Plus lent (ne patrouille jamais, cf.
  // enemyBehavior.js - toujours en garde), defense qui monte plus vite
  // (tous les 2 etages au lieu de 3).
  boss1: {
    base: { hp: 150, damage: 12, xpReward: 100 },
    growthRate: { hp: 1.18, damage: 1.15, xpReward: 1.12 },
    speedBase: 60,
    speedMax: 100,
    speedGrowthPerDepth: 2,
    defenseGrowthEveryNDepths: 2,
  },
};

/**
 * @param {number} depth profondeur (1 = premier étage)
 * @param {string} [typeKey='enemyDefault'] clé d'archétype (cf. ENEMY_TYPES)
 * @returns {{hp:number, damage:number, defense:number, speed:number, xpReward:number}}
 */
function getEnemyStatsForDepth(depth, typeKey = "enemyDefault") {
  if (depth < 1) {
    throw new Error("getEnemyStatsForDepth: depth doit être >= 1");
  }

  const type = ENEMY_TYPES[typeKey] || ENEMY_TYPES.enemyDefault;
  const n = depth - 1; // pas de croissance au premier etage (stats de base pures)

  return {
    hp: Math.round(type.base.hp * Math.pow(type.growthRate.hp, n)),
    damage: Math.round(type.base.damage * Math.pow(type.growthRate.damage, n)),
    xpReward: Math.round(
      type.base.xpReward * Math.pow(type.growthRate.xpReward, n),
    ),
    defense: Math.floor(n / type.defenseGrowthEveryNDepths),
    speed: Math.min(
      type.speedMax,
      type.speedBase + n * type.speedGrowthPerDepth,
    ),
  };
}

module.exports = { getEnemyStatsForDepth, ENEMY_TYPES };
