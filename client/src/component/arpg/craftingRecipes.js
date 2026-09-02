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

export function resolveCraftingRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}
