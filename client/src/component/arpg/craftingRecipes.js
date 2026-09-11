export const CRAFTING_RECIPES = {
  /** Recettes de sorts */
  fireballScrollRecipe: {
    id: "fireballScrollRecipe",
    name: "Recette de sort : Boule de feu",
    resultItemId: "fireballScroll",
    resultQuantity: 1,
    ingredients: [{ itemId: "pepper", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  whirlwindScrollRecipe: {
    id: "whirlwindScrollRecipe",
    name: "Recette de sort : Tourbillon",
    resultItemId: "whirlwindScroll",
    resultQuantity: 1,
    ingredients: [{ itemId: "batWings", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  hasteScrollRecipe: {
    id: "hasteScrollRecipe",
    name: "Recette de sort : Hâte",
    resultItemId: "hasteScroll",
    resultQuantity: 1,
    ingredients: [{ itemId: "frogLeg", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  slowScrollRecipe: {
    id: "slowScrollRecipe",
    name: "Recette de sort : Ralentissement",
    resultItemId: "slowScroll",
    resultQuantity: 1,
    ingredients: [{ itemId: "slimeBlob", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  /** Recettes de potions */
  healthPotionRecipe: {
    id: "healthPotionRecipe",
    name: "Recette de Potion de soin",
    resultItemId: "healthPotion", // doit exister dans itemDefs.js
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 3 },
      { itemId: "gold", quantity: 10 },
    ],
    discoveryOnly: true, // optionnel - deblocage automatique par niveau, comme les competences
  },
  mediumHealthPotionRecipe: {
    id: "mediumHealthPotionRecipe",
    name: "Recette de Potion de soin moyenne",
    resultItemId: "mediumHealthPotion",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 5 },
      { itemId: "gold", quantity: 15 },
    ],
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeHealthPotionRecipe: {
    id: "largeHealthPotionRecipe",
    name: "Recette de Potion de soin grande",
    resultItemId: "largeHealthPotion",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 8 },
      { itemId: "gold", quantity: 25 },
    ],
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  manaPotionRecipe: {
    id: "manaPotionRecipe",
    name: "Recette de Potion de mana",
    resultItemId: "manaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "waterLily", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  mediumManaPotionRecipe: {
    id: "mediumManaPotionRecipe",
    name: "Recette de Potion de mana moyenne",
    resultItemId: "mediumManaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "waterLily", quantity: 3 }], // a adapter
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeManaPotionRecipe: {
    id: "largeManaPotionRecipe",
    name: "Recette de Potion de mana grande",
    resultItemId: "largeManaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "waterLily", quantity: 5 }], // a adapter
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  staminaPotionRecipe: {
    id: "staminaPotionRecipe",
    name: "Recette de Potion de stamina",
    resultItemId: "staminaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "mushroom", quantity: 2 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  mediumStaminaPotionRecipe: {
    id: "mediumStaminaPotionRecipe",
    name: "Recette de Potion de stamina moyenne",
    resultItemId: "mediumStaminaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "mushroom", quantity: 3 }],
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeStaminaPotionRecipe: {
    id: "largeStaminaPotionRecipe",
    name: "Recette de Potion de stamina grande",
    resultItemId: "largeStaminaPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "mushroom", quantity: 5 }],
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  hybridPotionRecipe: {
    id: "hybridPotionRecipe",
    name: "Recette de l'Élixir hybride",
    resultItemId: "hybridPotion",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 1 },
      { itemId: "waterLily", quantity: 1 }, // a adapter
    ],
    // unlockLevel: 6,
    discoveryOnly: true,
  },
  mediumHybridPotionRecipe: {
    id: "mediumHybridPotionRecipe",
    name: "Recette de l'Élixir hybride moyen",
    resultItemId: "mediumHybridPotion",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 2 },
      { itemId: "waterLily", quantity: 2 }, // a adapter
    ],
    // unlockLevel: 7,
    discoveryOnly: true,
  },
  largeHybridPotionRecipe: {
    id: "largeHybridPotionRecipe",
    name: "Recette de l'Élixir hybride grand",
    resultItemId: "largeHybridPotion",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mushroom", quantity: 3 },
      { itemId: "waterLily", quantity: 3 }, // a adapter
    ],
    // unlockLevel: 8,
    discoveryOnly: true,
  },
  strengthPotionRecipe: {
    id: "strengthPotionRecipe",
    name: "Recette de Potion de force",
    resultItemId: "strengthPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "deerAntler", quantity: 2 }],
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  mediumStrengthPotionRecipe: {
    id: "mediumStrengthPotionRecipe",
    name: "Recette de Potion de force moyenne",
    resultItemId: "mediumStrengthPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "deerAntler", quantity: 3 }],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  largeStrengthPotionRecipe: {
    id: "largeStrengthPotionRecipe",
    name: "Recette de Potion de force grande",
    resultItemId: "largeStrengthPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "deerAntler", quantity: 5 }],
    // unlockLevel: 5,
    discoveryOnly: true,
  },
  swiftnessPotionRecipe: {
    id: "swiftnessPotionRecipe",
    name: "Recette de Potion de vitesse",
    resultItemId: "swiftnessPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "featherRoot", quantity: 2 }], // a adapter
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  mediumSwiftnessPotionRecipe: {
    id: "mediumSwiftnessPotionRecipe",
    name: "Recette de Potion de vitesse moyenne",
    resultItemId: "mediumSwiftnessPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "featherRoot", quantity: 3 }], // a adapter
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  largeSwiftnessPotionRecipe: {
    id: "largeSwiftnessPotionRecipe",
    name: "Recette de Potion de vitesse grande",
    resultItemId: "largeSwiftnessPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "featherRoot", quantity: 5 }], // a adapter
    // unlockLevel: 5,
    discoveryOnly: true,
  },
  fireVialRecipe: {
    id: "fireVialRecipe",
    name: "Recette de Fiole de feu",
    resultItemId: "fireVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "sulfur", quantity: 1 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  mediumFireVialRecipe: {
    id: "mediumFireVialRecipe",
    name: "Recette de Fiole de feu moyenne",
    resultItemId: "mediumFireVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "sulfur", quantity: 2 }], // a adapter
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeFireVialRecipe: {
    id: "largeFireVialRecipe",
    name: "Recette de Grande fiole de feu",
    resultItemId: "largeFireVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "sulfur", quantity: 3 }], // a adapter
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  acidVialRecipe: {
    id: "acidVialRecipe",
    name: "Recette de Fiole d'acide",
    resultItemId: "acidVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "orangeMushroom", quantity: 1 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  mediumAcidVialRecipe: {
    id: "mediumAcidVialRecipe",
    name: "Recette de Fiole d'acide moyenne",
    resultItemId: "mediumAcidVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "orangeMushroom", quantity: 2 }],
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeAcidVialRecipe: {
    id: "largeAcidVialRecipe",
    name: "Recette de Grande fiole d'acide",
    resultItemId: "largeAcidVial",
    resultQuantity: 2,
    ingredients: [{ itemId: "orangeMushroom", quantity: 3 }],
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  stunBombRecipe: {
    id: "stunBombRecipe",
    name: "Recette de Bombe étourdissante",
    resultItemId: "stunBomb",
    resultQuantity: 1,
    ingredients: [{ itemId: "sulfur", quantity: 2 }], // a adapter
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  mediumStunBombRecipe: {
    id: "mediumStunBombRecipe",
    name: "Recette de Bombe étourdissante moyenne",
    resultItemId: "mediumStunBomb",
    resultQuantity: 1,
    ingredients: [{ itemId: "sulfur", quantity: 3 }], // a adapter
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  largeStunBombRecipe: {
    id: "largeStunBombRecipe",
    name: "Recette de Grande bombe étourdissante",
    resultItemId: "largeStunBomb",
    resultQuantity: 1,
    ingredients: [{ itemId: "sulfur", quantity: 4 }], // a adapter
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  woodenArrowRecipe: {
    id: "woodenArrowRecipe",
    name: "Recette de Flèche en bois",
    resultItemId: "woodenArrow", // doit exister dans itemDefs.js
    resultQuantity: 5,
    ingredients: [{ itemId: "deerAntler", quantity: 1 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },

  bigWoodenArrowRecipe: {
    id: "bigWoodenArrowRecipe",
    name: "Recette de Flèche en bois géante",
    resultItemId: "bigWoodenArrow",
    resultQuantity: 5,
    ingredients: [
      { acceptedItemIds: ["deerAntler", "woodenArrow"], quantity: 3 },
    ],
    // unlockLevel: 1, // niveau minimum pour l'UTILISER, meme une fois decouverte
    discoveryOnly: true, // <-- jamais debloquee automatiquement, uniquement par combinaison
  },

  detectTrapsScrollRecipe: {
    id: "detectTrapsScrollRecipe",
    name: "Recette de sort : détection",
    resultItemId: "detectTrapsScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "deerAntler", quantity: 2 }, // tes ingredients au choix
      { itemId: "mushroom", quantity: 2 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },

  // recipe for enchanting weapons

  reinforcedSwordRecipe: {
    id: "reinforcedSwordRecipe",
    name: "Recette d'enchantement permanent : Épée renforcée",
    resultItemId: "reinforcedSword", // doit exister dans itemDefs.js
    resultQuantity: 1,
    ingredients: [
      { itemId: "woodenSword", quantity: 1 },
      { itemId: "deerAntler", quantity: 3 },
      { itemId: "gold", quantity: 20 },
    ],
    // unlockLevel: 1,
    // discoveryOnly: true, // optionnel - deblocage automatique par niveau, comme les competences
  },
  flamingSwordRecipe: {
    id: "flamingSwordRecipe",
    name: "Recette d'enchantement permanent : Épée enflammée",
    resultItemId: "flamingSword", // l'objet enchante ci-dessus
    resultQuantity: 1,
    ingredients: [
      { itemId: "woodenSword", quantity: 1 },
      { itemId: "fireCrystal", quantity: 2 }, // un ingredient a toi de definir aussi comme objet
    ],
    // unlockLevel: 8,
    discoveryOnly: true,
  },
  flamingEdgeScrollRecipe: {
    id: "flamingEdgeScrollRecipe",
    name: "Recette d'effet flamboyant",
    resultItemId: "flamingEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "sulfur", quantity: 2 }, // a adapter - ingredient "feu" de ton choix
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  glacialEdgeScrollRecipe: {
    id: "glacialEdgeScrollRecipe",
    name: "Recette d'effet glacial",
    resultItemId: "glacialEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "iceCrystal", quantity: 2 }, // a adapter
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  shockingEdgeScrollRecipe: {
    id: "shockingEdgeScrollRecipe",
    name: "Recette d'effet foudroyant",
    resultItemId: "shockingEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "lightningShard", quantity: 2 }, // a adapter
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 5,
    discoveryOnly: true,
  },
  venomEdgeScrollRecipe: {
    id: "venomEdgeScrollRecipe",
    name: "Recette d'effet empoisonné",
    resultItemId: "venomEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orangeMushroom", quantity: 2 }, // reutilise ton champignon rare existant
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  holyEdgeScrollRecipe: {
    id: "holyEdgeScrollRecipe",
    name: "Recette d'effet sacré",
    resultItemId: "holyEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "holyWater", quantity: 1 }, // a adapter
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 6,
    discoveryOnly: true,
  },
  shadowEdgeScrollRecipe: {
    id: "shadowEdgeScrollRecipe",
    name: "Recette d'effet ténébreux",
    resultItemId: "shadowEdgeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "shadowEssence", quantity: 1 }, // a adapter
      { itemId: "paper", quantity: 1 },
    ],
    // unlockLevel: 6,
    discoveryOnly: true,
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
