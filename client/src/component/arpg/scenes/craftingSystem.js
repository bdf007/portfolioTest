import { resolveItemDef } from "../itemDefs";
import { resolveCraftingRecipe, CRAFTING_RECIPES } from "../craftingRecipes";

const DECRAFT_RATIO = 0.5; // proportion des ingredients rendus au decraft - reglable independamment de SELL_PRICE_RATIO (shopTravel.js)

/**
 * Fonction pure, ne touche jamais a `scene` - pas de wrapper conserve dans
 * MainScene.js (uniquement utilisee en interne par findMatchingRecipeIgnoringLevel).
 */
function recipeMatchesSelection(recipe, selectedMap) {
  const allAcceptedIds = new Set();
  for (const ing of recipe.ingredients) {
    if (ing.itemId === "gold") return false;
    const ids = ing.acceptedItemIds || [ing.itemId];
    for (const id of ids) allAcceptedIds.add(id);
  }

  for (const itemId of selectedMap.keys()) {
    if (!allAcceptedIds.has(itemId)) return false;
  }

  for (const ing of recipe.ingredients) {
    const ids = ing.acceptedItemIds || [ing.itemId];
    const totalSelected = ids.reduce(
      (sum, id) => sum + (selectedMap.get(id) || 0),
      0,
    );
    if (totalSelected !== ing.quantity) return false;
  }

  return true;
}

/**
 * Fonction pure elle aussi (recipeMatchesSelection ne touche pas a
 * `scene`) - pas appelee depuis l'exterieur de MainScene.js, pas de
 * wrapper conserve pour celle-ci.
 */
export function findMatchingRecipeIgnoringLevel(selectedItems) {
  const selectedMap = new Map();
  for (const s of selectedItems) {
    if (!s.itemId || s.quantity <= 0) continue;
    selectedMap.set(s.itemId, (selectedMap.get(s.itemId) || 0) + s.quantity);
  }

  for (const recipe of Object.values(CRAFTING_RECIPES)) {
    if (recipeMatchesSelection(recipe, selectedMap)) return recipe;
  }
  return null;
}

export function attemptFreeCraft(scene, selectedItems) {
  const matchedRecipe = findMatchingRecipeIgnoringLevel(selectedItems);
  if (!matchedRecipe) {
    scene.showLootToast("Cette combinaison ne donne rien de connu");
    return { success: false };
  }

  const levelLocked =
    matchedRecipe.unlockLevel && scene.playerLevel < matchedRecipe.unlockLevel;
  if (levelLocked) {
    if (
      !scene.discoveredLockedRecipes.includes(matchedRecipe.id) &&
      !scene.unlockedRecipes.includes(matchedRecipe.id)
    ) {
      scene.discoveredLockedRecipes.push(matchedRecipe.id);
      scene.events.emit("locked-recipes-updated", [
        ...scene.discoveredLockedRecipes,
      ]);
      scene.persistProgress();
    }
    scene.showLootToast(
      `Recette découverte : ${matchedRecipe.name} - nécessite le niveau ${matchedRecipe.unlockLevel} !`,
    );
    return { success: false };
  }

  // verification de stock AVANT toute consommation, basee sur la
  // selection reelle du joueur (selectedItems) plutot que sur
  // ing.itemId - un ingredient flexible (acceptedItemIds) n'a pas de
  // itemId propre, donc verifier/consommer via matchedRecipe.ingredients
  // directement echoue silencieusement pour ce cas. recipeMatchesSelection
  // garantit deja que selectedItems correspond exactement a la recette
  // (bons items, bonnes quantites au total par groupe accepte), donc
  // consommer tel quel selectedItems est a la fois correct et plus
  // simple.
  for (const { itemId, quantity } of selectedItems) {
    const have = scene.inventory
      .filter((x) => x.itemId === itemId)
      .reduce((s, x) => s + x.quantity, 0);
    if (have < quantity) {
      scene.showLootToast("Il manque des ingrédients pour cette combinaison");
      return { success: false };
    }
  }

  for (const { itemId, quantity } of selectedItems) {
    let remaining = quantity;
    for (let i = scene.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const entry = scene.inventory[i];
      if (entry.itemId !== itemId) continue;
      const take = Math.min(entry.quantity, remaining);
      entry.quantity -= take;
      remaining -= take;
      if (entry.quantity <= 0) scene.inventory.splice(i, 1);
    }
  }

  scene.addItemToInventory(
    matchedRecipe.resultItemId,
    matchedRecipe.resultQuantity,
  );

  const wasAlreadyKnown = scene.unlockedRecipes.includes(matchedRecipe.id);
  if (!wasAlreadyKnown) {
    scene.unlockedRecipes.push(matchedRecipe.id);
    scene.discoveredLockedRecipes = scene.discoveredLockedRecipes.filter(
      (id) => id !== matchedRecipe.id,
    );
    scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
    scene.events.emit("locked-recipes-updated", [
      ...scene.discoveredLockedRecipes,
    ]);
    scene.showLootToast(`Nouvelle recette découverte : ${matchedRecipe.name} !`);
  } else {
    scene.showLootToast(`${matchedRecipe.name} fabriquée !`);
  }

  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.persistProgress();
  return { success: true, recipe: matchedRecipe };
}

export function decraftItem(scene, inventoryIndex) {
  const item = scene.inventory[inventoryIndex];
  if (!item) return;

  const recipe = Object.values(CRAFTING_RECIPES).find(
    (r) =>
      r.resultItemId === item.itemId && scene.unlockedRecipes.includes(r.id),
  );
  if (!recipe) {
    scene.showLootToast("Impossible de décrafter cet objet");
    return;
  }
  if (recipe.ingredients.some((ing) => ing.acceptedItemIds)) {
    scene.showLootToast(
      "Cet objet ne peut pas être décrafté (ingrédients flexibles)",
    );
    return;
  }

  const haveQty = scene.inventory
    .filter((i) => i.itemId === item.itemId)
    .reduce((s, i) => s + i.quantity, 0);
  if (haveQty < recipe.resultQuantity) {
    scene.showLootToast("Pas assez d'exemplaires pour décrafter");
    return;
  }

  let remaining = recipe.resultQuantity;
  for (let i = scene.inventory.length - 1; i >= 0 && remaining > 0; i--) {
    const entry = scene.inventory[i];
    if (entry.itemId !== item.itemId) continue;
    const take = Math.min(entry.quantity, remaining);
    entry.quantity -= take;
    remaining -= take;
    if (entry.quantity <= 0) scene.inventory.splice(i, 1);
  }

  for (const ing of recipe.ingredients) {
    const returned = Math.floor(ing.quantity * DECRAFT_RATIO);
    if (returned > 0) scene.addItemToInventory(ing.itemId, returned);
  }

  scene.showLootToast(`${resolveItemDef(item.itemId).name} décrafté !`);
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.persistProgress();
}

export function craftItem(scene, recipeId, flexAllocations = {}) {
  // flexAllocations: { indexIngredient: { itemId: quantite } } - la
  // repartition choisie par le joueur pour chaque ingredient FLEXIBLE
  // (acceptedItemIds) - ignoree pour les ingredients simples
  if (!scene.unlockedRecipes.includes(recipeId)) return;
  const recipe = resolveCraftingRecipe(recipeId);
  if (!recipe) return;

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    if (ing.acceptedItemIds) {
      const allocation = flexAllocations[i] || {};
      const total = Object.values(allocation).reduce((s, q) => s + q, 0);
      if (total < ing.quantity) {
        scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
        return;
      }
      for (const [itemId, qty] of Object.entries(allocation)) {
        const have = scene.inventory
          .filter((x) => x.itemId === itemId)
          .reduce((s, x) => s + x.quantity, 0);
        if (have < qty) {
          scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
          return;
        }
      }
    } else {
      const have = scene.inventory
        .filter((x) => x.itemId === ing.itemId)
        .reduce((s, x) => s + x.quantity, 0);
      if (have < ing.quantity) {
        scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
        return;
      }
    }
  }

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    const toConsume = ing.acceptedItemIds
      ? Object.entries(flexAllocations[i] || {})
      : [[ing.itemId, ing.quantity]];

    for (const [itemId, qty] of toConsume) {
      let remaining = qty;
      for (let j = scene.inventory.length - 1; j >= 0 && remaining > 0; j--) {
        const entry = scene.inventory[j];
        if (entry.itemId !== itemId) continue;
        const take = Math.min(entry.quantity, remaining);
        entry.quantity -= take;
        remaining -= take;
        if (entry.quantity <= 0) scene.inventory.splice(j, 1);
      }
    }
  }

  scene.addItemToInventory(recipe.resultItemId, recipe.resultQuantity);
  scene.showLootToast(`${recipe.name} fabriquée !`);
}
