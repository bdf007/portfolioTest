/**
 * Progression du joueur par niveaux automatiques : l'XP accumulée fait
 * monter le niveau, chaque niveau augmente les stats de combat d'un
 * palier fixe. Première brique d'un système qui, à terme, se combinera
 * avec des points à dépenser manuellement et de l'équipement trouvé en
 * jeu (cf. /areas/phaser-arpg.md) - mais pour tester le combat
 * maintenant, la progression automatique suffit et n'exclut aucune des
 * deux extensions futures (elles s'ajouteront par-dessus cette base,
 * pas à la place).
 *
 * Volontairement une progression linéaire (pas exponentielle comme les
 * ennemis) : simple à équilibrer à la main pour l'instant. Rien
 * n'empêche de durcir la courbe plus tard une fois l'équilibrage réel
 * du jeu affiné.
 */

const BASE_STATS = {
  maxHp: 100,
  meleeDamage: 8,
  rangedDamage: 5,
  defense: 0,
};

const GROWTH_PER_LEVEL = {
  maxHp: 20,
  meleeDamage: 2,
  rangedDamage: 1,
  defense: 1,
};

const XP_BASE = 40; // XP pour passer du niveau 1 au niveau 2
const XP_GROWTH = 1.3; // chaque niveau suivant demande 30% d'XP de plus que le precedent

/**
 * XP nécessaire pour passer de `level` à `level + 1`.
 */
function xpRequiredForLevel(level) {
  return Math.round(XP_BASE * Math.pow(XP_GROWTH, level - 1));
}

/**
 * Calcule le niveau atteint avec un total d'XP cumulé, ainsi que la
 * progression dans le niveau courant (utile pour une barre d'XP côté UI).
 *
 * @param {number} totalXp
 * @returns {{level:number, xpIntoLevel:number, xpForNextLevel:number}}
 */
function computeLevelFromXp(totalXp) {
  let level = 1;
  let remaining = totalXp;

  while (remaining >= xpRequiredForLevel(level)) {
    remaining -= xpRequiredForLevel(level);
    level += 1;
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel: xpRequiredForLevel(level),
  };
}

/**
 * Stats de combat du joueur pour un niveau donné - toujours calculées
 * depuis la base plutôt qu'accumulées pas à pas, pour éviter toute
 * dérive d'arrondi si jamais on recalcule plusieurs fois.
 *
 * @param {number} level
 * @param {{base:Object, growth:Object}|null} [statsOverride] - profil
 *   d'archétype du héros (cf. HERO_ROSTER dans spriteRegistry.js) -
 *   remplace BASE_STATS/GROWTH_PER_LEVEL si fourni. `null` = stats
 *   génériques (repli, ne devrait plus arriver une fois tous les héros
 *   du roster dotés d'un profil).
 */
function getPlayerStatsForLevel(level, statsOverride = null) {
  const base = (statsOverride && statsOverride.base) || BASE_STATS;
  const growth = (statsOverride && statsOverride.growth) || GROWTH_PER_LEVEL;
  const n = level - 1;
  return {
    // Math.round : les profils d'archetype (cf. HERO_ROSTER) utilisent
    // des taux de croissance fractionnaires (ex: 2.5 degats/niveau pour
    // l'archer) - sans arrondi, les stats affichees deviendraient non
    // entieres des le niveau 2 (les anciens taux etaient tous entiers,
    // l'arrondi n'avait jamais ete necessaire jusqu'ici)
    maxHp: Math.round(base.maxHp + growth.maxHp * n),
    meleeDamage: Math.round(base.meleeDamage + growth.meleeDamage * n),
    rangedDamage: Math.round(base.rangedDamage + growth.rangedDamage * n),
    defense: Math.round(base.defense + growth.defense * n),
  };
}

export {
  xpRequiredForLevel,
  computeLevelFromXp,
  getPlayerStatsForLevel,
  BASE_STATS,
  GROWTH_PER_LEVEL,
};
