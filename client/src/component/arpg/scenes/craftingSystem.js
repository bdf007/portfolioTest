import { resolveItemDef } from "../itemDefs";
import { resolveCraftingRecipe, CRAFTING_RECIPES } from "../craftingRecipes";

const DECRAFT_RATIO = 0.5; // proportion des ingredients rendus au decraft - reglable independamment de SELL_PRICE_RATIO (shopTravel.js)

/**
 * Vrai si cet ingredient de recette est l'"objet de base" d'une recette
 * d'evolution (armes/armures qui montent de palier, ex: copperDagger +
 * ironIngot -> ironDagger) - a distinguer des ingredients consommables
 * classiques (lingots, essences...). Seuls les ingredients SIMPLES (pas
 * de acceptedItemIds) de quantite 1 et de categorie "equipment" sont
 * concernes - c'est le seul cas observe dans craftingRecipes.js (une
 * seule arme/armure consommee par recette d'evolution).
 */
function isEquipmentBaseIngredient(ing) {
  if (!ing || ing.acceptedItemIds || ing.quantity !== 1) return false;
  return resolveItemDef(ing.itemId).category === "equipment";
}

/**
 * Vrai si cette entree d'inventaire est l'exemplaire actuellement equipe
 * (equipped[slot] n'est qu'une reference instanceId, l'exemplaire reste en
 * permanence dans scene.inventory - cf. gemSockets.js). Un objet equipe ne
 * doit jamais pouvoir servir d'ingredient de craft (recette connue OU
 * combinaison libre) : le joueur doit d'abord le retirer. Verification
 * faite ici cote logique (en plus du filtre deja applique cote UI dans
 * CraftingScreen.js) pour rester valable meme si craftItem/attemptFreeCraft
 * sont appeles autrement que depuis cet ecran.
 */
function isEquippedEntry(scene, entry) {
  return (
    !!entry.instanceId &&
    Object.values(scene.equipped).includes(entry.instanceId)
  );
}

/**
 * Choisit automatiquement l'exemplaire le MOINS avantage (le moins de
 * sockets remplis, puis le moins de gemSlots) parmi les instances
 * possedees d'un itemId - utilise uniquement par la combinaison libre
 * (attemptFreeCraft), qui ne permet pas au joueur de designer un
 * exemplaire precis (contrairement aux recettes connues, ou
 * CraftingScreen.js laisse le joueur choisir). Protege ainsi par defaut
 * le meilleur exemplaire du joueur d'une consommation accidentelle.
 */
function pickLeastAdvantagedInstance(scene, itemId) {
  const candidates = scene.inventory.filter(
    (e) => e.itemId === itemId && e.instanceId && !isEquippedEntry(scene, e),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => {
    const bestFilled = (best.sockets || []).filter(Boolean).length;
    const currentFilled = (current.sockets || []).filter(Boolean).length;
    if (currentFilled !== bestFilled) {
      return currentFilled < bestFilled ? current : best;
    }
    const bestSlots = best.gemSlots || 0;
    const currentSlots = current.gemSlots || 0;
    return currentSlots < bestSlots ? current : best;
  });
}

/**
 * Transforme EN PLACE l'exemplaire consomme comme base d'une recette
 * d'evolution : son itemId devient celui du resultat, tout le reste
 * (instanceId, gemSlots, sockets, nom personnalise) reste STRICTEMENT
 * inchange - le nombre de sockets ne varie JAMAIS a la montee de palier,
 * seul le parchemin de perforation (gemSockets.js) peut en ajouter.
 */
function transferInstanceToResult(instance, resultItemId) {
  instance.itemId = resultItemId;
}

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
      .filter((x) => x.itemId === itemId && !isEquippedEntry(scene, x))
      .reduce((s, x) => s + x.quantity, 0);
    if (have < quantity) {
      scene.showLootToast("Il manque des ingrédients pour cette combinaison");
      return { success: false };
    }
  }

  // repere l'ingredient "objet de base" AVANT toute consommation (s'il y
  // en a un) et choisit automatiquement l'exemplaire le moins avantage -
  // la combinaison libre ne permet pas de designer un exemplaire precis
  // (contrairement aux recettes connues, cf. CraftingScreen.js), donc on
  // protege ici par defaut le meilleur exemplaire du joueur.
  let transferInstance = null;
  for (const { itemId, quantity } of selectedItems) {
    if (isEquipmentBaseIngredient({ itemId, quantity })) {
      transferInstance = pickLeastAdvantagedInstance(scene, itemId);
      break; // une seule base par recette d'evolution, cf. isEquipmentBaseIngredient
    }
  }

  for (const { itemId, quantity } of selectedItems) {
    if (transferInstance && itemId === transferInstance.itemId) continue; // transforme en place plus bas, jamais consomme comme une ressource
    let remaining = quantity;
    for (let i = scene.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const entry = scene.inventory[i];
      if (entry.itemId !== itemId) continue;
      if (entry === transferInstance) continue;
      if (isEquippedEntry(scene, entry)) continue;
      const take = Math.min(entry.quantity, remaining);
      entry.quantity -= take;
      remaining -= take;
      if (entry.quantity <= 0) scene.inventory.splice(i, 1);
    }
  }

  if (transferInstance) {
    transferInstanceToResult(transferInstance, matchedRecipe.resultItemId);
    if (Object.values(scene.equipped).includes(transferInstance.instanceId)) {
      scene.recalculatePlayerStats();
      scene.events.emit("equipment-updated", { ...scene.equipped });
    }
  } else {
    scene.addItemToInventory(
      matchedRecipe.resultItemId,
      matchedRecipe.resultQuantity,
    );
  }

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
    scene.showLootToast(
      `Nouvelle recette découverte : ${matchedRecipe.name} !`,
    );
  } else {
    scene.showLootToast(
      transferInstance
        ? `${matchedRecipe.name} : objet évolué !`
        : `${matchedRecipe.name} fabriquée !`,
    );
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

  const baseIngredient = recipe.ingredients.find(isEquipmentBaseIngredient);

  if (baseIngredient && item.instanceId) {
    // objet issu d'une recette d'evolution (cf. craftItem/attemptFreeCraft
    // ci-dessous) : on inverse la transformation EN PLACE sur ce MEME
    // exemplaire (instanceId, gemSlots, sockets, nom personnalise
    // conserves) plutot que de le detruire - coherent avec le fait que le
    // craft ne l'avait pas recree non plus. Seuls les AUTRES ingredients
    // (materiaux) sont rendus, partiellement (DECRAFT_RATIO).
    item.itemId = baseIngredient.itemId;
    for (const ing of recipe.ingredients) {
      if (ing === baseIngredient) continue;
      const returned = Math.floor(ing.quantity * DECRAFT_RATIO);
      if (returned > 0) scene.addItemToInventory(ing.itemId, returned);
    }
    scene.showLootToast(
      `${resolveItemDef(baseIngredient.itemId).name} : évolution annulée !`,
    );
    if (Object.values(scene.equipped).includes(item.instanceId)) {
      scene.recalculatePlayerStats();
      scene.events.emit("equipment-updated", { ...scene.equipped });
    }
    scene.events.emit("inventory-updated", [...scene.inventory]);
    scene.persistProgress();
    return;
  }

  // recette simple (potions, parchemins...) - comportement inchange :
  // destruction de l'exemplaire + rendu partiel de TOUS les ingredients.
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

export function craftItem(
  scene,
  recipeId,
  flexAllocations = {},
  baseInstanceId = null,
) {
  // flexAllocations: { indexIngredient: { itemId: quantite } } - la
  // repartition choisie par le joueur pour chaque ingredient FLEXIBLE
  // (acceptedItemIds) - ignoree pour les ingredients simples.
  // baseInstanceId : instanceId explicitement choisi par le joueur cote
  // UI (CraftingScreen.js) quand la recette a un ingredient "objet de
  // base" (recette d'evolution, cf. isEquipmentBaseIngredient) ET que
  // plusieurs exemplaires en sont possedes - permet de faire evoluer
  // PRECISEMENT l'exemplaire souhaite (ex: sa meilleure arme socketee)
  // plutot qu'un choix automatique.
  if (!scene.unlockedRecipes.includes(recipeId)) return;
  const recipe = resolveCraftingRecipe(recipeId);
  if (!recipe) return;

  // repere l'eventuel ingredient "objet de base" et resout l'EXEMPLAIRE
  // precis a transformer - refuse la recette si le choix est ambigu et
  // non fourni, plutot que de deviner (protege le joueur d'une
  // transformation accidentelle du mauvais exemplaire).
  let transferInstance = null;
  const baseIngredient = recipe.ingredients.find(isEquipmentBaseIngredient);
  if (baseIngredient) {
    const candidates = scene.inventory.filter(
      (e) =>
        e.itemId === baseIngredient.itemId &&
        e.instanceId &&
        !isEquippedEntry(scene, e),
    );
    if (candidates.length === 0) {
      scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
      return;
    }
    if (baseInstanceId) {
      transferInstance =
        candidates.find((e) => e.instanceId === baseInstanceId) || null;
      if (!transferInstance) {
        scene.showLootToast("Exemplaire choisi introuvable");
        return;
      }
    } else if (candidates.length === 1) {
      transferInstance = candidates[0];
    } else {
      scene.showLootToast(
        `Choisis quel exemplaire faire évoluer pour ${recipe.name}`,
      );
      return;
    }
  }

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    if (ing === baseIngredient) continue; // deja verifie/resolu ci-dessus
    if (ing.acceptedItemIds) {
      const allocation = flexAllocations[i] || {};
      const total = Object.values(allocation).reduce((s, q) => s + q, 0);
      if (total < ing.quantity) {
        scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
        return;
      }
      for (const [itemId, qty] of Object.entries(allocation)) {
        const have = scene.inventory
          .filter((x) => x.itemId === itemId && !isEquippedEntry(scene, x))
          .reduce((s, x) => s + x.quantity, 0);
        if (have < qty) {
          scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
          return;
        }
      }
    } else {
      const have = scene.inventory
        .filter((x) => x.itemId === ing.itemId && !isEquippedEntry(scene, x))
        .reduce((s, x) => s + x.quantity, 0);
      if (have < ing.quantity) {
        scene.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
        return;
      }
    }
  }

  for (let i = 0; i < recipe.ingredients.length; i++) {
    const ing = recipe.ingredients[i];
    if (ing === baseIngredient) continue; // transforme en place plus bas, jamais consomme comme une ressource
    const toConsume = ing.acceptedItemIds
      ? Object.entries(flexAllocations[i] || {})
      : [[ing.itemId, ing.quantity]];

    for (const [itemId, qty] of toConsume) {
      let remaining = qty;
      for (let j = scene.inventory.length - 1; j >= 0 && remaining > 0; j--) {
        const entry = scene.inventory[j];
        if (entry.itemId !== itemId) continue;
        if (isEquippedEntry(scene, entry)) continue;
        const take = Math.min(entry.quantity, remaining);
        entry.quantity -= take;
        remaining -= take;
        if (entry.quantity <= 0) scene.inventory.splice(j, 1);
      }
    }
  }

  if (transferInstance) {
    transferInstanceToResult(transferInstance, recipe.resultItemId);
    scene.showLootToast(`${recipe.name} : objet évolué !`);
    scene.events.emit("inventory-updated", [...scene.inventory]);
    if (Object.values(scene.equipped).includes(transferInstance.instanceId)) {
      scene.recalculatePlayerStats();
      scene.events.emit("equipment-updated", { ...scene.equipped });
    }
    scene.persistProgress();
  } else {
    scene.addItemToInventory(recipe.resultItemId, recipe.resultQuantity); // emet deja inventory-updated + persistProgress
    scene.showLootToast(`${recipe.name} fabriquée !`);
  }
}
