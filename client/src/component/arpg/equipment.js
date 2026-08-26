import { resolveItemDef } from "./itemDefs";

/**
 * Calcule la somme des bonus de stats de tout l'équipement actuellement
 * porté - fonction pure, testable sans Phaser. Reste volontairement
 * séparée de leveling.js : le niveau et l'équipement sont deux sources
 * de progression distinctes, pas la peine de les mélanger dans la même
 * fonction (leveling.js reste pur "niveau -> stats de base").
 *, move
 * @param {{mainHand: string|null, offHand: string|null, armor: string|null, helmet: string|null, pants: string|null, boots: string|null, belt: string|null, ring1: string|null, ring2: string|null, necklace: string|null, quiver: string|null}} equipped
 * @returns {{meleeDamage:number, rangedDamage:number, defense:number, maxHp:number, meleeRange:number, rangedRange:number, visionRadius:number, moveSpeed:number}}
 */
export function computeEquipmentBonuses(equipped) {
  const bonuses = { meleeDamage: 0, rangedDamage: 0, defense: 0, maxHp: 0, meleeRange: 0, rangedRange: 0, visionRadius: 0, moveSpeed: 0};

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
