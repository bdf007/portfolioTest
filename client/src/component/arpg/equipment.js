import { resolveItemDef } from "./itemDefs";
import { computeInstanceGemBonuses } from "./gemSockets";

/**
 * Resout un slot equipe vers {itemId, gemBonuses} - le carquois reste
 * une exception (equipped.quiver stocke un itemId directement, les
 * munitions ne sont pas instanciees), tous les autres slots stockent
 * desormais un instanceId qu'il faut retrouver dans l'inventaire pour
 * connaitre a la fois l'itemId de base ET les bonus de ses gemmes
 * socketees (cf. gemSockets.js).
 */
function resolveEquippedSlot(slot, ref, inventory) {
  if (!ref) return null;
  if (slot === "quiver") {
    return { itemId: ref, gemBonuses: {} };
  }
  const instance = inventory.find((entry) => entry.instanceId === ref);
  if (!instance) return null;
  return { itemId: instance.itemId, gemBonuses: computeInstanceGemBonuses(instance) };
}

/**
 * Calcule la somme des bonus de stats de tout l'équipement actuellement
 * porté (bonus de base de l'objet + bonus permanents des gemmes
 * socketées, cf. gemSockets.js) - fonction pure, testable sans Phaser.
 * Reste volontairement séparée de leveling.js : le niveau et
 * l'équipement sont deux sources de progression distinctes, pas la
 * peine de les mélanger dans la même fonction (leveling.js reste pur
 * "niveau -> stats de base").
 *
 * @param {{mainHand: string|null, offHand: string|null, armor: string|null, helmet: string|null, pants: string|null, boots: string|null, belt: string|null, ring1: string|null, ring2: string|null, necklace: string|null, quiver: string|null}} equipped
 * @param {Array} inventory - this.inventory, necessaire pour retrouver l'exemplaire (instanceId) et ses sockets derriere chaque slot equipe
 * @returns {{meleeDamage:number, rangedDamage:number, defense:number, maxHp:number, meleeRange:number, rangedRange:number, visionRadius:number, moveSpeed:number, mana:number}}
 */
export function computeEquipmentBonuses(equipped, inventory) {
  const bonuses = {
    meleeDamage: 0,
    rangedDamage: 0,
    defense: 0,
    maxHp: 0,
    hpRegen: 0,
    meleeRange: 0,
    rangedRange: 0,
    visionRadius: 0,
    moveSpeed: 0,
    mana: 0,
    manaRegen: 0,
    stamina: 0,
    staminaRegen: 0,
  };

  for (const [slot, ref] of Object.entries(equipped || {})) {
    const resolved = resolveEquippedSlot(slot, ref, inventory);
    if (!resolved) continue;
    const def = resolveItemDef(resolved.itemId);
    for (const key of Object.keys(bonuses)) {
      if (def.statBonus?.[key]) bonuses[key] += def.statBonus[key];
      if (resolved.gemBonuses[key]) bonuses[key] += resolved.gemBonuses[key];
    }
  }

  return bonuses;
}

/**
 * Additionne les resistances elementaires de TOUT l'equipement porte -
 * meme principe que computeEquipmentBonuses, mais pour un objet
 * {fire: X, cold: Y, ...} plutot que des stats plates. Un objet sans
 * `resistances` du tout n'apporte rien (repli implicite sur 0 partout).
 */
export function computeEquipmentResistances(equipped, inventory) {
  const total = {};
  for (const [slot, ref] of Object.entries(equipped || {})) {
    const resolved = resolveEquippedSlot(slot, ref, inventory);
    if (!resolved) continue;
    const def = resolveItemDef(resolved.itemId);
    if (!def.resistances) continue;
    for (const [type, value] of Object.entries(def.resistances)) {
      total[type] = (total[type] || 0) + value;
    }
  }
  return total;
}
