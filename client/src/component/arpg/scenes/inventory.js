import { resolveItemDef } from "../itemDefs";
import { resolveAbilityDef } from "../abilityDefs";
import { resolveCraftingRecipe } from "../craftingRecipes";
import { resolveHeroStatsOverride } from "../spriteRegistry";
import { applyStatusEffect } from "./statusEffects";
import {
  findEquipmentInstance,
  generateInstanceId,
  rollGemSlotCount,
} from "../gemSockets";
import {
  performAoeAbility,
  performAoeStunAbility,
  performProjectileAoeAbility,
  performSelfBuffAbility,
  performAoeDebuffAbility,
  performPierceAbility,
  performZoneAbility,
  performConeAbility,
  performAbility,
} from "./abilities";

// CONSUMABLE_COOLDOWN_MS duplique volontairement (identique a celui de
// MainScene.js) - meme constante numerique des deux cotes, meme logique
// que dans floorRenderer.js/floorEntities.js/abilities.js/summons.js/
// quests.js/exploration.js/ai.js.
const CONSUMABLE_COOLDOWN_MS = 2000; // ajustable - meme delai pour toutes les potions pour l'instant

/**
 * Garantit qu'un exemplaire d'equipement a bien un instanceId/gemSlots/
 * sockets - filet de securite pour les objets deja presents en
 * inventaire AVANT l'introduction du systeme de sockets (tout NOUVEL
 * objet les recoit directement a la creation, cf.
 * MainScene.addItemToInventory).
 */
function ensureInstanceFields(item) {
  if (!item.instanceId) {
    item.instanceId = generateInstanceId();
    if (item.gemSlots === undefined) item.gemSlots = rollGemSlotCount(item.itemId);
    if (!item.sockets) item.sockets = [];
  }
}

export function giveStartingKit(scene) {
  const profile = resolveHeroStatsOverride(scene.heroSpriteKey);
  if (!profile) return;

  for (const entry of profile.startingItems || []) {
    const itemId = typeof entry === "string" ? entry : entry.itemId;
    const quantity = typeof entry === "string" ? 1 : entry.quantity || 1;
    scene.addItemToInventory(itemId, quantity);
    const newIndex = scene.inventory.length - 1;
    equipItem(scene, newIndex);
  }

  if (profile.startingAmmo) {
    scene.addItemToInventory(
      profile.startingAmmo.itemId,
      profile.startingAmmo.quantity,
    );
    scene.equipped.quiver = profile.startingAmmo.itemId;
    scene.recalculatePlayerStats();
    scene.events.emit("equipment-updated", { ...scene.equipped });
  }
  if (profile.startingAbilities) {
    for (const abilityId of profile.startingAbilities) {
      scene.unlockedAbilities.push(abilityId);
    }
    scene.events.emit("abilities-updated", [...scene.unlockedAbilities]);
  }
  if (profile.startingRecipes) {
    for (const recipeId of profile.startingRecipes) {
      if (!scene.unlockedRecipes.includes(recipeId)) {
        scene.unlockedRecipes.push(recipeId);
      }
    }
    scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
  }
  scene.unlockAvailableAbilitiesAndRecipes();
}

export function equipItem(scene, index) {
  const item = scene.inventory[index];
  if (!item) return;
  const def = resolveItemDef(item.itemId);
  if (def.archetypes && def.archetypes.length > 0) {
    const heroArchetype = resolveHeroStatsOverride(
      scene.heroSpriteKey,
    )?.archetype;
    if (!heroArchetype || !def.archetypes.includes(heroArchetype)) {
      scene.showLootToast("Cet objet ne convient pas à ton archétype");
      return;
    }
  }
  if (def.unlockLevel && scene.playerLevel < def.unlockLevel) {
    scene.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
    return;
  }
  if (def.category === "ammo") {
    scene.equipped[def.slot] = item.itemId;
    const oldMaxHp = scene.playerMaxHp;
    scene.recalculatePlayerStats();
    scene.adjustHpAfterMaxHpChange(oldMaxHp);
    scene.events.emit("equipment-updated", { ...scene.equipped });
    scene.persistProgress();
    return;
  }

  if (def.category !== "equipment" || !def.slot) return;

  ensureInstanceFields(item);

  let targetSlot = def.slot;

  if (targetSlot === "ring") {
    targetSlot = !scene.equipped.ring1
      ? "ring1"
      : !scene.equipped.ring2
        ? "ring2"
        : "ring1";
  }

  if (targetSlot === "mainHand" && !def.twoHanded) {
    const mainOccupantInstance = scene.equipped.mainHand
      ? findEquipmentInstance(scene, scene.equipped.mainHand)
      : null;
    const mainOccupantDef = mainOccupantInstance
      ? resolveItemDef(mainOccupantInstance.itemId)
      : null;
    const mainHandHoldsCompatibleWeapon =
      mainOccupantDef && !mainOccupantDef.twoHanded;
    if (mainHandHoldsCompatibleWeapon && !scene.equipped.offHand) {
      targetSlot = "offHand";
    }
  }

  // contrairement a l'ancien systeme (itemId generique), un exemplaire
  // d'equipement ne quitte plus JAMAIS this.inventory - ni au moment ou
  // il est equipe, ni quand un autre objet prend sa place dans le meme
  // emplacement. scene.equipped[slot] n'est plus qu'une reference vers
  // son instanceId, exactement comme le carquois le fait deja pour les
  // munitions (cf. InventoryScreen : groupInventory filtre deja
  // equipped.quiver). Necessaire pour retrouver les sockets de l'objet
  // une fois equipe via gemSockets.findEquipmentInstance - il n'y a donc
  // plus rien a "repousser" en inventaire lors d'un swap : l'ancien
  // objet y est deja toujours present, juste plus reference.
  if (def.twoHanded && targetSlot === "mainHand") {
    scene.equipped.offHand = null;
  }

  if (targetSlot === "offHand") {
    const mainHandInstance = scene.equipped.mainHand
      ? findEquipmentInstance(scene, scene.equipped.mainHand)
      : null;
    if (mainHandInstance) {
      const mainHandDef = resolveItemDef(mainHandInstance.itemId);
      if (mainHandDef.twoHanded) {
        scene.equipped.mainHand = null;
      }
    }
  }

  scene.equipped[targetSlot] = item.instanceId;

  const oldMaxHp = scene.playerMaxHp;
  scene.recalculatePlayerStats();
  scene.adjustHpAfterMaxHpChange(oldMaxHp);

  scene.events.emit("equipment-updated", { ...scene.equipped });
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.persistProgress();
}

export function unequipItem(scene, slot) {
  const equippedRef = scene.equipped[slot];
  if (!equippedRef) return;
  scene.equipped[slot] = null;

  // ni les munitions (deja le cas avant ce systeme) ni les objets
  // d'equipement (desormais identifies par instanceId, cf. equipItem) ne
  // quittent jamais reellement this.inventory pendant qu'ils sont
  // equipes - rien a repousser ici.

  const oldMaxHp = scene.playerMaxHp;
  scene.recalculatePlayerStats();
  scene.adjustHpAfterMaxHpChange(oldMaxHp);

  scene.events.emit("equipment-updated", { ...scene.equipped });
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.persistProgress();
}

export function consumeItem(scene, index) {
  const item = scene.inventory[index];
  if (!item) return;
  const def = resolveItemDef(item.itemId);

  if (def.category === "abilityScroll") {
    const abilityDef = resolveAbilityDef(def.grantsAbility);
    const heroArchetype = resolveHeroStatsOverride(
      scene.heroSpriteKey,
    )?.archetype;
    if (
      abilityDef.archetypes &&
      abilityDef.archetypes.length > 0 &&
      !abilityDef.archetypes.includes(heroArchetype)
    ) {
      scene.showLootToast("Ce parchemin ne convient pas à ton archétype");
      return;
    }
    if (def.unlockLevel && scene.playerLevel < def.unlockLevel) {
      scene.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
      return;
    }
    if (abilityDef.staminaCost && scene.playerMaxStamina <= 0) {
      scene.showLootToast(
        "Tu n'as pas de stamina à dépenser pour cette compétence",
      );
      return;
    }
    if (abilityDef.manaCost && scene.playerMaxMana <= 0) {
      scene.showLootToast(
        "Tu n'as pas de mana à dépenser pour cette compétence",
      );
      return;
    }
    if (scene.unlockedAbilities.includes(def.grantsAbility)) {
      scene.showLootToast(`Tu connais déjà ${abilityDef.name}`);
      return;
    }

    scene.unlockedAbilities.push(def.grantsAbility);
    scene.events.emit("abilities-updated", [...scene.unlockedAbilities]);
    scene.showLootToast(`Compétence apprise : ${abilityDef.name} !`);

    item.quantity -= 1;
    if (item.quantity <= 0) scene.inventory.splice(index, 1);

    scene.events.emit("inventory-updated", [...scene.inventory]);
    scene.persistProgress();
    return;
  }

  if (def.category === "recipeScroll") {
    const recipe = resolveCraftingRecipe(def.grantsRecipe);
    if (!recipe) return;
    if (scene.unlockedRecipes.includes(recipe.id)) {
      scene.showLootToast(`Tu connais déjà la recette : ${recipe.name}`);
      return;
    }

    scene.unlockedRecipes.push(recipe.id);
    scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
    scene.showLootToast(`Recette apprise : ${recipe.name} !`);

    item.quantity -= 1;
    if (item.quantity <= 0) scene.inventory.splice(index, 1);

    scene.events.emit("inventory-updated", [...scene.inventory]);
    scene.persistProgress();
    return;
  }

  if (def.category !== "consumable" || !def.effect) return;
  if (def.unlockLevel && scene.playerLevel < def.unlockLevel) {
    scene.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
    return;
  }

  const now = scene.time.now;
  const cooldownKey = `item:${item.itemId}`;
  const readyAt = scene.itemCooldowns[cooldownKey] || 0;
  if (now < readyAt) {
    scene.showLootToast("Objet en recharge");
    return;
  }
  scene.itemCooldowns[cooldownKey] = now + CONSUMABLE_COOLDOWN_MS;
  scene.events.emit("hotbar-cooldown-started", {
    key: cooldownKey,
    cooldownMs: CONSUMABLE_COOLDOWN_MS,
    startedAt: Date.now(),
  });

  if (def.effect.heal) {
    scene.playerHp = Math.min(
      scene.playerMaxHp,
      scene.playerHp + def.effect.heal,
    );
    scene.events.emit("player-hp-changed", {
      hp: scene.playerHp,
      maxHp: scene.playerMaxHp,
    });
    scene.showDamageNumber(scene.hero, def.effect.heal, "#44ff44", "+");
  }

  if (def.effect.mana) {
    scene.playerMana = Math.min(
      scene.playerMaxMana,
      scene.playerMana + def.effect.mana,
    );
    scene.events.emit("player-mana-changed", {
      mana: scene.playerMana,
      maxMana: scene.playerMaxMana,
    });
  }

  if (def.effect.stamina) {
    scene.playerStamina = Math.min(
      scene.playerMaxStamina,
      scene.playerStamina + def.effect.stamina,
    );
    scene.events.emit("player-stamina-changed", {
      stamina: scene.playerStamina,
      maxStamina: scene.playerMaxStamina,
    });
  }

  if (def.effect.buff) {
    applyStatusEffect(scene, scene.playerStatusEffects, {
      type: `potion-${def.id}`,
      kind: "modifier",
      statModifiers: def.effect.buff.statModifiers,
      durationMs: def.effect.buff.durationMs,
    });
  }

  if (def.effect.combat) {
    const combatDef = def.effect.combat;
    if (combatDef.effectType === "aoe") performAoeAbility(scene, combatDef);
    else if (combatDef.effectType === "aoeStun")
      performAoeStunAbility(scene, combatDef);
    else if (combatDef.effectType === "aoeDebuff")
      performAoeDebuffAbility(scene, combatDef);
    else if (combatDef.effectType === "zone")
      performZoneAbility(scene, combatDef);
    else if (combatDef.effectType === "cone")
      performConeAbility(scene, combatDef);
  }

  item.quantity -= 1;
  if (item.quantity <= 0) scene.inventory.splice(index, 1);

  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.persistProgress();
}

export function triggerHotbarSlot(scene, slotIndex) {
  if (scene.gamePaused) return; // jamais utilisable pendant qu'un ecran (inventaire, quetes, craft...) ou un dialogue est ouvert
  const slot = scene.hotbarSlots[slotIndex];
  if (!slot) return;

  if (slot.type === "item") {
    const def = resolveItemDef(slot.itemId);

    if (def.category === "abilityScroll") {
      triggerScrollFromHotbar(scene, slot.itemId);
      return;
    }

    const invIndex = scene.inventory.findIndex(
      (i) => i.itemId === slot.itemId,
    );
    if (invIndex === -1) {
      scene.showLootToast("Objet épuisé");
      return;
    }
    consumeItem(scene, invIndex);
    return;
  }

  performAbility(scene, slot.id);
}

export function triggerScrollFromHotbar(scene, itemId) {
  const invIndex = scene.inventory.findIndex((i) => i.itemId === itemId);
  if (invIndex === -1) {
    scene.showLootToast("Parchemin épuisé");
    return;
  }

  const def = resolveItemDef(itemId);
  if (def.unlockLevel && scene.playerLevel < def.unlockLevel) {
    scene.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
    return;
  }
  const abilityDef = resolveAbilityDef(def.grantsAbility);
  const heroArchetype = resolveHeroStatsOverride(
    scene.heroSpriteKey,
  )?.archetype;

  const archetypeMatches =
    !abilityDef.archetypes ||
    abilityDef.archetypes.length === 0 ||
    abilityDef.archetypes.includes(heroArchetype);
  const resourceAvailable =
    (!abilityDef.staminaCost || scene.playerMaxStamina > 0) &&
    (!abilityDef.manaCost || scene.playerMaxMana > 0);

  if (archetypeMatches && resourceAvailable) {
    consumeItem(scene, invIndex);
    return;
  }

  if (
    abilityDef.disabledBiomes &&
    abilityDef.disabledBiomes.includes(scene.currentBiomeId)
  ) {
    scene.showLootToast(
      `${abilityDef.name} est désactivée sur ce type de niveau`,
    );
    return;
  }

  const now = scene.time.now;
  const cooldownKey = `item:${itemId}`;
  const readyAt = scene.itemCooldowns[cooldownKey] || 0;
  if (now < readyAt) {
    scene.showLootToast("Parchemin en recharge");
    return;
  }

  if (abilityDef.effectType === "aoe") {
    performAoeAbility(scene, abilityDef);
  } else if (abilityDef.effectType === "projectileAoe") {
    performProjectileAoeAbility(scene, abilityDef);
  } else if (abilityDef.effectType === "selfBuff") {
    performSelfBuffAbility(scene, abilityDef);
  } else if (abilityDef.effectType === "aoeDebuff") {
    performAoeDebuffAbility(scene, abilityDef);
  } else if (abilityDef.effectType === "pierce") {
    performPierceAbility(scene, abilityDef);
  } else {
    scene.showLootToast(`${abilityDef.name} : effet pas encore implémenté`);
    return;
  }

  scene.itemCooldowns[cooldownKey] = now + CONSUMABLE_COOLDOWN_MS;
  scene.events.emit("hotbar-cooldown-started", {
    key: cooldownKey,
    cooldownMs: CONSUMABLE_COOLDOWN_MS,
    startedAt: Date.now(),
  });

  const item = scene.inventory[invIndex];
  item.quantity -= 1;
  if (item.quantity <= 0) scene.inventory.splice(invIndex, 1);
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.showLootToast(`${abilityDef.name} utilisé (usage unique) !`);
  scene.persistProgress();
}

export function assignHotbarSlot(scene, slotIndex, payload) {
  if (slotIndex < 0 || slotIndex > 8) return;

  if (payload) {
    for (let i = 0; i < scene.hotbarSlots.length; i++) {
      if (i === slotIndex) continue;
      const existing = scene.hotbarSlots[i];
      if (!existing) continue;
      const sameAbility =
        payload.type === "ability" &&
        existing.type === "ability" &&
        existing.id === payload.id;
      const sameItem =
        payload.type === "item" &&
        existing.type === "item" &&
        existing.itemId === payload.itemId;
      if (sameAbility || sameItem) {
        scene.hotbarSlots[i] = null;
        scene.showLootToast(`Déplacé depuis l'emplacement ${i + 1}`);
      }
    }
  }

  scene.hotbarSlots[slotIndex] = payload;
  scene.events.emit("hotbar-updated", [...scene.hotbarSlots]);
}
