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

export { computeDamage, applyDamage, createCooldown };
