import { resolveItemDef } from './itemDefs';

/**
 * Calcule la somme des bonus de stats de tout l'équipement actuellement
 * porté - fonction pure, testable sans Phaser. Reste volontairement
 * séparée de leveling.js : le niveau et l'équipement sont deux sources
 * de progression distinctes, pas la peine de les mélanger dans la même
 * fonction (leveling.js reste pur "niveau -> stats de base").
 *
 * @param {{weapon: string|null, armor: string|null, accessory: string|null}} equipped
 * @returns {{meleeDamage:number, rangedDamage:number, defense:number, maxHp:number}}
 */
export function computeEquipmentBonuses(equipped) {
  const bonuses = { meleeDamage: 0, rangedDamage: 0, defense: 0, maxHp: 0 };

  for (const itemId of Object.values(equipped || {})) {
    if (!itemId) continue;
    const def = resolveItemDef(itemId);
    if (!def.statBonus) continue;
    for (const key of Object.keys(bonuses)) {
      if (def.statBonus[key]) bonuses[key] += def.statBonus[key];
    }
  }

  return bonuses;
}
