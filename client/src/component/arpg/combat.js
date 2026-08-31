/**
 * Logique de combat, volontairement pure et sans dependance a Phaser -
 * facile a tester sans simuler une scene entiere.
 *
 * Note d'architecture : ce calcul vit cote client pour l'instant, comme
 * le pathfinding et le brouillard de guerre - la reactivite temps reel
 * du corps-a-corps/tir a distance a besoin d'etre instantanee, pas
 * aller-retour serveur. Le jour ou du multi/anti-triche sera necessaire,
 * la resolution des degats devra etre confirmee cote serveur (le client
 * ne fait alors plus qu'une prediction locale) - contrairement aux stats
 * de base des ennemis (enemyStats.js) qui, elles, sont deja calculees
 * cote serveur des maintenant car elles ne changent pas en temps reel.
 */

/**
 * Degats effectifs apres reduction par la defense. Toujours au moins 1 -
 * une defense superieure aux degats ne doit jamais rendre une attaque
 * totalement inoffensive, sinon certains combats deviennent infinis.
 */
function computeDamage(attackerDamage, defenderDefense) {
  return Math.max(1, Math.round(attackerDamage - defenderDefense));
}

const CRIT_CHANCE = 0.15; // 15% par defaut, contre un ennemi qui a deja repere le joueur (etat 'chase')
const CRIT_MULTIPLIER = 2; // degats du joueur doubles sur un coup critique

/**
 * Determine si UNE attaque du joueur est un coup critique. `guaranteed`
 * (vrai quand l'ennemi n'a PAS encore repere le joueur, cf.
 * enemy.state !== 'chase' cote MainScene) force toujours un critique,
 * sans tirage - une attaque furtive touche toujours fort. Sinon, simple
 * tirage a CRIT_CHANCE. `rng` injectable (Math.random par defaut) pour
 * rester testable de facon deterministe.
 *
 * Reserve aux attaques du JOUEUR - jamais applique aux attaques
 * ennemies (cf. MainScene.updateEnemyAttacks/updateEnemyProjectiles, qui
 * n'appellent jamais cette fonction).
 */
function rollCritical(guaranteed, rng = Math.random) {
  if (guaranteed) return true;
  return rng() < CRIT_CHANCE;
}

/**
 * Applique des degats a une entite (joueur ou ennemi) possedant hp/maxHp.
 * Ne mute pas l'entite - renvoie le nouvel etat, a l'appelant de l'appliquer.
 */
function applyDamage(entity, amount) {
  const hp = Math.max(0, entity.hp - amount);
  return { hp, died: hp <= 0 };
}

/**
 * Minuteur de cooldown simple, base sur un timestamp plutot que sur un
 * compteur de frames - insensible aux variations de framerate.
 */
function createCooldown(durationMs) {
  let readyAt = 0;
  return {
    isReady(now) {
      return now >= readyAt;
    },
    trigger(now) {
      readyAt = now + durationMs;
    },
    remaining(now) {
      return Math.max(0, readyAt - now);
    },
  };
}

/**
 * Tire un ou plusieurs des, notation classique "XdY" (ex: "2d6" = 2
 * des a 6 faces, somme). Fonction pure et independante - un simple
 * utilitaire, rien d'existant n'en depend.
 */
function rollDice(notation) {
  const match = /^(\d+)d(\d+)$/.exec(notation);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += 1 + Math.floor(Math.random() * sides);
  }
  return total;
}

/**
 * Applique une variance aleatoire CENTREE autour d'une valeur de base -
 * la moyenne du lancer (count*(sides+1)/2) est soustraite du resultat,
 * donc la moyenne GLOBALE des degats reste inchangee, seule la
 * variance change. `varianceDice` absent/invalide = renvoie baseDamage
 * tel quel, comportement STRICTEMENT identique a avant - c'est ce qui
 * rend cette fonctionnalite entierement optionnelle, partout.
 */
function applyDiceVariance(baseDamage, varianceDice) {
  if (!varianceDice) return baseDamage;
  const match = /^(\d+)d(\d+)$/.exec(varianceDice);
  if (!match) return baseDamage;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const roll = rollDice(varianceDice);
  const average = (count * (sides + 1)) / 2;
  return Math.max(1, Math.round(baseDamage + (roll - average)));
}

/**
 * Applique la resistance/faiblesse elementaire d'une cible a des degats
 * d'un TYPE donne, AVANT le calcul de defense classique (computeDamage) -
 * les deux systemes restent independants : la resistance module le
 * montant BRUT selon le type d'attaque, la defense reduit ensuite ce
 * montant de facon generique, peu importe le type. resistancePercent
 * positif = moins de degats (resistance), negatif = plus de degats
 * (faiblesse). Absence de damageType/resistances = aucun changement,
 * retrocompatible partout ou ce n'est pas branche.
 */
function applyElementalResistance(rawDamage, damageType, resistances) {
  if (!damageType || damageType === "physical" || !resistances)
    return rawDamage;
  const resistPercent = resistances[damageType] || 0;
  return Math.max(0, rawDamage * (1 - resistPercent));
}

export {
  computeDamage,
  applyDamage,
  createCooldown,
  rollCritical,
  CRIT_CHANCE,
  CRIT_MULTIPLIER,
  rollDice,
  applyDiceVariance,
  applyElementalResistance,
};
