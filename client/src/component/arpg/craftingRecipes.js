export const CRAFTING_RECIPES = {
  healthPotion: {
    id: "healthPotion",
    name: "Potion de soin",
    resultItemId: "healthPotion", // doit exister dans itemDefs.js
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 3 },
      { itemId: "gold", quantity: 10 },
    ],
    unlockLevel: 1, // optionnel - deblocage automatique par niveau, comme les competences
  },
  woodenArrow: {
    id: "woodenArrow",
    name: "Flèche en bois",
    resultItemId: "woodenArrow", // doit exister dans itemDefs.js
    resultQuantity: 5,
    ingredients: [{ itemId: "deerAntler", quantity: 1 }],
    unlockLevel: 1,
  },

  bigWoodenArrow: {
    id: "bigWoodenArrow",
    name: "Flèche en bois géante",
    resultItemId: "bigWoodenArrow",
    resultQuantity: 5,
    ingredients: [
      { acceptedItemIds: ["deerAntler", "woodenArrow"], quantity: 3 },
    ],
    // unlockLevel: 1, // niveau minimum pour l'UTILISER, meme une fois decouverte
    discoveryOnly: true, // <-- jamais debloquee automatiquement, uniquement par combinaison
  },

  // recipe for enchanting weapons

  reinforcedSword: {
    id: "reinforcedSword",
    name: "Épée renforcée",
    resultItemId: "reinforcedSword", // doit exister dans itemDefs.js
    resultQuantity: 1,
    ingredients: [
      { itemId: "woodenSword", quantity: 1 },
      { itemId: "deerAntler", quantity: 3 },
      { itemId: "gold", quantity: 20 },
    ],
    unlockLevel: 1, // optionnel - deblocage automatique par niveau, comme les competences
  },
  flamingSwordRecipe: {
    id: "flamingSwordRecipe",
    name: "Enchantement : Épée enflammée",
    resultItemId: "flamingSword", // l'objet enchante ci-dessus
    resultQuantity: 1,
    ingredients: [
      { itemId: "woodenSword", quantity: 1 },
      { itemId: "fireCrystal", quantity: 2 }, // un ingredient a toi de definir aussi comme objet
    ],
    unlockLevel: 8,
  },
};

/**
 * Normalise recipe.ingredients (une seule liste, comportement historique)
 * OU recipe.ingredientOptions (plusieurs listes alternatives - une seule
 * doit etre entierement satisfaite) en un tableau d'options uniforme,
 * pour que tout le reste du code n'ait qu'UNE seule forme a traiter.
 */
export function getIngredientOptions(recipe) {
  return recipe.ingredientOptions || [recipe.ingredients];
}

export function resolveCraftingRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}
