/**
 * Progression du joueur : montee de niveau (XP -> palier suivant,
 * deblocage de competences/recettes) et repartition des points
 * d'attributs (brouillon modifiable avant confirmation).
 */
import { computeLevelFromXp } from "../leveling";
import { resolveHeroStatsOverride, SPRITE_REGISTRY } from "../spriteRegistry";
import { ABILITY_DEFS } from "../abilityDefs";
import { CRAFTING_RECIPES } from "../craftingRecipes";
import { computeFamiliarGrowthScale } from "./summons";

const ATTRIBUTE_POINTS_PER_LEVEL = 5;

export function checkLevelUp(scene) {
  const { level } = computeLevelFromXp(scene.xp);
  if (level <= scene.playerLevel) return;
  scene.events.emit("levelup-available", { available: true });
}

export function openLevelUpScreen(scene) {
  const inCombat = scene.enemies.some((e) => e.state === "chase");
  if (inCombat) {
    scene.showLootToast("Impossible en plein combat");
    return;
  }

  const { level } = computeLevelFromXp(scene.xp);
  if (level > scene.playerLevel) {
    applyPendingLevelUp(scene, level);
  }

  scene.draftAttributes = { ...scene.playerAttributes };
  scene.draftUnspentPoints = scene.unspentAttributePoints;

  scene.pauseGame("levelup");
  scene.events.emit("levelup-screen-open", {
    attributes: { ...scene.playerAttributes }, // confirme - le plancher pour le bouton "-"
    draftAttributes: { ...scene.draftAttributes },
    unspent: scene.draftUnspentPoints,
    level: scene.playerLevel,
  });
}

export function closeLevelUpScreen(scene) {
  scene.unpauseGame("levelup");
  scene.events.emit("levelup-screen-open", null);
}

export function applyPendingLevelUp(scene, level) {
  const levelsGained = level - scene.playerLevel;
  scene.playerLevel = level;
  scene.unspentAttributePoints += ATTRIBUTE_POINTS_PER_LEVEL * levelsGained;
  scene.recalculatePlayerStats();
  scene.playerHp = scene.playerMaxHp;
  scene.playerMana = scene.playerMaxMana;
  scene.playerStamina = scene.playerMaxStamina;

  let anyAbilityUnlocked = false;
  const heroArchetype = resolveHeroStatsOverride(
    scene.heroSpriteKey,
  )?.archetype;
  for (const def of Object.values(ABILITY_DEFS)) {
    if (
      def.archetypes &&
      def.archetypes.length > 0 &&
      !def.archetypes.includes(heroArchetype)
    )
      continue;
    if (def.unlockLevel == null || def.unlockLevel > level) continue;
    if (scene.unlockedAbilities.includes(def.id)) continue;
    if (def.staminaCost && scene.playerMaxStamina <= 0) continue;
    if (def.manaCost && scene.playerMaxMana <= 0) continue;
    scene.unlockedAbilities.push(def.id);
    anyAbilityUnlocked = true;
    scene.showLootToast(`Nouvelle compétence débloquée : ${def.name} !`);
  }
  if (anyAbilityUnlocked)
    scene.events.emit("abilities-updated", [...scene.unlockedAbilities]);
  let anyRecipeUnlocked = false;
  for (const recipe of Object.values(CRAFTING_RECIPES)) {
    if (recipe.unlockLevel == null || recipe.unlockLevel > level) continue;
    if (recipe.discoveryOnly) continue;
    if (scene.unlockedRecipes.includes(recipe.id)) continue;
    scene.unlockedRecipes.push(recipe.id);
    anyRecipeUnlocked = true;
    scene.showLootToast(`Nouvelle recette débloquée : ${recipe.name} !`);
  }
  if (anyRecipeUnlocked)
    scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);

  const stillLocked = scene.discoveredLockedRecipes.filter(
    (id) => !scene.unlockedRecipes.includes(id),
  );
  if (stillLocked.length !== scene.discoveredLockedRecipes.length) {
    scene.discoveredLockedRecipes = stillLocked;
    scene.events.emit("locked-recipes-updated", [
      ...scene.discoveredLockedRecipes,
    ]);
  }

  scene.events.emit("player-hp-changed", {
    hp: scene.playerHp,
    maxHp: scene.playerMaxHp,
  });
  scene.events.emit("player-mana-changed", {
    mana: scene.playerMana,
    maxMana: scene.playerMaxMana,
  });
  scene.events.emit("player-stamina-changed", {
    stamina: scene.playerStamina,
    maxStamina: scene.playerMaxStamina,
  });
  for (const summon of scene.summons) {
    if (summon.growthConfig) {
      const growthScale = computeFamiliarGrowthScale(scene, summon.growthConfig);
      const baseSpriteInfo = SPRITE_REGISTRY[summon.spriteKey];
      if (baseSpriteInfo)
        summon.sprite.setScale(baseSpriteInfo.scale * growthScale);
    }
  }

  scene.events.emit("level-up", { level });
  scene.events.emit("levelup-available", { available: false });
  scene.persistProgress();
}

/**
 * Debloque tout ce qui a unlockLevel <= niveau actuel - separee
 * d'applyPendingLevelUp car appelee aussi a la CREATION du personnage
 * (niveau 1), moment ou aucune vraie "montee de niveau" ne se produit
 * jamais (on demarre deja a ce niveau, on ne le "franchit" pas).
 */
export function unlockAvailableAbilitiesAndRecipes(scene) {
  const heroArchetype = resolveHeroStatsOverride(
    scene.heroSpriteKey,
  )?.archetype;
  for (const def of Object.values(ABILITY_DEFS)) {
    if (
      def.archetypes &&
      def.archetypes.length > 0 &&
      !def.archetypes.includes(heroArchetype)
    )
      continue;
    if (def.unlockLevel == null || def.unlockLevel > scene.playerLevel)
      continue;
    if (scene.unlockedAbilities.includes(def.id)) continue;
    if (def.staminaCost && scene.playerMaxStamina <= 0) continue;
    if (def.manaCost && scene.playerMaxMana <= 0) continue;
    scene.unlockedAbilities.push(def.id);
  }
  for (const recipe of Object.values(CRAFTING_RECIPES)) {
    if (recipe.unlockLevel == null || recipe.unlockLevel > scene.playerLevel)
      continue;
    if (recipe.discoveryOnly) continue; // <-- nouveau, meme garde qu'applyPendingLevelUp
    if (scene.unlockedRecipes.includes(recipe.id)) continue;
    scene.unlockedRecipes.push(recipe.id);
  }
}

export function allocateAttributePoint(scene, attribute) {
  if (scene.draftUnspentPoints <= 0) return;
  if (!(attribute in scene.draftAttributes)) return;
  const inCombat = scene.enemies.some((e) => e.state === "chase");
  if (inCombat) {
    scene.showLootToast("Impossible en plein combat");
    return;
  }

  scene.draftAttributes[attribute]++;
  scene.draftUnspentPoints--;

  scene.events.emit("levelup-draft-updated", {
    attributes: { ...scene.draftAttributes },
    unspent: scene.draftUnspentPoints,
  });
}

/**
 * Retire un point du brouillon - UNIQUEMENT si ce point a ete ajoute
 * CETTE session (jamais en dessous de scene.playerAttributes, deja
 * confirme lors d'une session precedente).
 */
export function deallocateAttributePoint(scene, attribute) {
  if (!(attribute in scene.draftAttributes)) return;
  if (scene.draftAttributes[attribute] <= scene.playerAttributes[attribute])
    return;

  scene.draftAttributes[attribute]--;
  scene.draftUnspentPoints++;

  scene.events.emit("levelup-draft-updated", {
    attributes: { ...scene.draftAttributes },
    unspent: scene.draftUnspentPoints,
  });
}

/**
 * Applique reellement le brouillon - stats recalculees (proportions de
 * ressources preservees, meme principe qu'avant), sauvegarde. Tant que
 * cette methode n'est pas appelee, rien n'est definitif - fermer l'ecran
 * sans valider abandonne silencieusement le brouillon (scene.playerAttributes
 * n'a jamais ete touche entre-temps).
 */
export function confirmAttributeAllocation(scene) {
  scene.playerAttributes = { ...scene.draftAttributes };
  scene.unspentAttributePoints = scene.draftUnspentPoints;

  const previousHpRatio = scene.playerHp / scene.playerMaxHp;
  const previousManaRatio =
    scene.playerMaxMana > 0 ? scene.playerMana / scene.playerMaxMana : 1;
  const previousStaminaRatio =
    scene.playerMaxStamina > 0
      ? scene.playerStamina / scene.playerMaxStamina
      : 1;

  scene.recalculatePlayerStats();

  scene.playerHp = Math.round(scene.playerMaxHp * previousHpRatio);
  scene.playerMana = Math.round(scene.playerMaxMana * previousManaRatio);
  scene.playerStamina = Math.round(
    scene.playerMaxStamina * previousStaminaRatio,
  );

  scene.events.emit("player-hp-changed", {
    hp: scene.playerHp,
    maxHp: scene.playerMaxHp,
  });
  scene.events.emit("player-mana-changed", {
    mana: scene.playerMana,
    maxMana: scene.playerMaxMana,
  });
  scene.events.emit("player-stamina-changed", {
    stamina: scene.playerStamina,
    maxStamina: scene.playerMaxStamina,
  });
  scene.events.emit("attributes-updated", {
    attributes: { ...scene.playerAttributes },
    unspent: scene.unspentAttributePoints,
  });
  scene.showLootToast("Attributs confirmés !");
  scene.persistProgress();
}
