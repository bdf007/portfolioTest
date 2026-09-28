/**
 * Constantes et petits helpers partagés entre MainScene.js et les
 * modules "mixin" qui en ont été extraits (évite d'avoir plusieurs
 * copies de la même valeur/fonction disséminées dans plusieurs
 * fichiers, avec le risque de divergence que ça implique).
 */
export const TILE_SIZE = 32;
export const ENEMY_ATTACK_COOLDOWN = 900;
export const ATTACK_ANIM_DURATION_MS = 400;
export const PROJECTILE_RADIUS = 5;
export const FURY_KILLS_REQUIRED = 10; // ajustable
export const MAX_SUMMONS = 3;
export const ENEMY_SPEED = 90;
export const ENEMY_RANGED_STOP_DISTANCE = 180;
export const ENEMY_RANGED_ATTACK_RANGE = 260;
export const ENEMY_PROJECTILE_SPEED = 220;
export const ENEMY_PROJECTILE_MAX_DISTANCE = 300;

export const DEFAULT_ATTRIBUTES = {
  force: 0,
  dexterite: 0,
  intelligence: 0,
  vitalite: 0,
  constitution: 0,
  endurance: 0,
  chance: 0,
};

export const INFLICTS_TO_VISUAL_EFFECT = {
  burn: "fire",
  acid: "gas",
  slow: "ice",
};

export function resolveVisualEffect(enemyData) {
  if (enemyData.visualEffect) return enemyData.visualEffect;
  const inflictsType = enemyData.inflictsEffect?.type;
  return INFLICTS_TO_VISUAL_EFFECT[inflictsType] || null;
}
