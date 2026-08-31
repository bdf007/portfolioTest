export const CRAFTING_RECIPES = {
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
};

export function resolveCraftingRecipe(recipeId) {
  return CRAFTING_RECIPES[recipeId] || null;
}
