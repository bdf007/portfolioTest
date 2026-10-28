import { resolveItemDef } from "./itemDefs";
import { GEM_RECIPES } from "./gemRecipes";
import { EQUIPMENT_RECIPES } from "./equipmentRecipes";

export const CRAFTING_RECIPES = {
  // recettes d'equipement generees (cf. equipmentRecipes.js)
  ...EQUIPMENT_RECIPES,

  ...GEM_RECIPES,

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
  healingAuraScrollRecipe: {
    id: "healingAuraScrollRecipe",
    name: "Recette de sort : Soin de zone",
    resultItemId: "healingAuraScroll",
    resultQuantity: 1,
    ingredients: [{ itemId: "berries", quantity: 3 }],
    discoveryOnly: true,
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
    ingredients: [{ itemId: "waterLily", quantity: 2 }],
    // unlockLevel: 3,
    discoveryOnly: true,
  },
  mediumStrengthPotionRecipe: {
    id: "mediumStrengthPotionRecipe",
    name: "Recette de Potion de force moyenne",
    resultItemId: "mediumStrengthPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "waterLily", quantity: 3 }],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  largeStrengthPotionRecipe: {
    id: "largeStrengthPotionRecipe",
    name: "Recette de Potion de force grande",
    resultItemId: "largeStrengthPotion",
    resultQuantity: 1,
    ingredients: [{ itemId: "waterLily", quantity: 5 }],
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
    ingredients: [{ acceptedItemIds: ["wood", "oakWood"], quantity: 1 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },
  woodenCrossbowBoltRecipe: {
    id: "woodenCrossbowBoltRecipe",
    name: "Recette de Carreau d'arbalète en bois",
    resultItemId: "woodenCrossbowBolt",
    resultQuantity: 10,
    ingredients: [
      { itemId: "branch", quantity: 4 },
      { itemId: "gnomeClaw", quantity: 1 },
      { itemId: "vegetalFiber", quantity: 2 },
    ],
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

  branchRecipe: {
    id: "branchRecipe",
    name: "Recette de Branche",
    resultItemId: "branch",
    resultQuantity: 4,
    ingredients: [{ itemId: "wood", quantity: 1 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },

  blanckScrollRecipe: {
    id: "blanckScrollRecipe",
    name: "Recette de Parchemin vierge",
    resultItemId: "blanckScroll",
    resultQuantity: 5,
    ingredients: [
      { itemId: "vegetalFiber", quantity: 2 },
      { itemId: "wood", quantity: 1 },
      { itemId: "coalOre", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },

  grimoireRecipe: {
    id: "grimoireRecipe",
    name: "Recette de Grimoire",
    resultItemId: "grimoire",
    resultQuantity: 1,
    ingredients: [
      {
        acceptedItemIds: [
          "gnomeFurTuft",
          "batFur",
          "blackBearFurTuft",
          "trollBlueFurTuft",
          "trollGrisFurTuft",
          "trollRoseFurTuft",
          "trollRougeFurTuft",
          "trollVertFurTuft",
          "trollVioletFurTuft",
          "orqueGreyFurTuft",
          "spiderFur",
        ],
        quantity: 2,
      },
      { itemId: "blanckScroll", quantity: 10 },
    ],
    discoveryOnly: true,
  },

  socketPerforationScrollRecipe: {
    id: "socketPerforationScrollRecipe",
    name: "Recette de sort : perforation de socket",
    resultItemId: "socketPerforationScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blanckScroll", quantity: 1 },
      { itemId: "coalOre", quantity: 1 },
      { itemId: "manaPotion", quantity: 1 },
    ],
    discoveryOnly: true,
  },

  gemExtractionScrollRecipe: {
    id: "gemExtractionScrollRecipe",
    name: "Recette de sort : extraction de gemme",
    resultItemId: "gemExtractionScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blanckScroll", quantity: 1 },
      { itemId: "copperOre", quantity: 1 },
      { itemId: "healthPotion", quantity: 1 },
    ],
    discoveryOnly: true,
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

  summonAngryBrownMushroomRecipe: {
    id: "summonAngryBrownMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Champignon brun en colère",
    resultItemId: "summonAngryBrownMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "angryBrownMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },
  summonGnomeGreenRecipe: {
    id: "summonGnomeGreenRecipe",
    name: "Recette de Parchemin : Invocation : Gnome Vert",
    resultItemId: "summonGnomeGreenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "gnomeGreenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },

  summonAngryTrentRecipe: {
    id: "summonAngryTrentRecipe",
    name: "Recette de Parchemin : Invocation : Ronchêne",
    resultItemId: "summonAngryTrentScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "angryTrentCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },

  summonKnifedBatRecipe: {
    id: "summonKnifedBatRecipe",
    name: "Recette de Parchemin : Invocation : Chauve-souris poignardée",
    resultItemId: "summonKnifedBatScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knifedBatCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
  },
  summonDeer1Recipe: {
    id: "summonDeer1Recipe",
    name: "Recette de Parchemin : Invocation : Cerf",
    resultItemId: "summonDeer1Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "deer1Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
    // unlockLevel: ..., // optionnel
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
  // gemmes
  miningYieldGemRecipe: {
    id: "miningYieldGemRecipe",
    name: "Recette de gemme de rendement minier",
    resultItemId: "miningYieldGem",
    resultQuantity: 1,
    ingredients: [
      // à modifier
      { itemId: "copperOre", quantity: 1 },
      { itemId: "copperIngot", quantity: 1 },
      { itemId: "gnomeFurTuft", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  burnGemRecipe: {
    id: "burnGemRecipe",
    name: "Recette de gemme de brûlure",
    resultItemId: "burnGem",
    resultQuantity: 1,
    ingredients: [
      { itemId: "ruby", quantity: 1 },
      { itemId: "wood", quantity: 1 },
    ],
    discoveryOnly: true,
  },

  // Minerai et lingots

  copperIngotRecipe: {
    id: "copperIngotRecipe",
    name: "Recette de lingot de cuivre",
    resultItemId: "copperIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "copperOre", quantity: 3 }],
    // unlockLevel: 1,
    discoveryOnly: true,
  },

  ironIngotRecipe: {
    id: "ironIngotRecipe",
    name: "Recette de lingot de fer",
    resultItemId: "ironIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "ironOre", quantity: 3 }],
    // unlockLevel: 2,
    discoveryOnly: true,
  },
  silverIngotRecipe: {
    id: "silverIngotRecipe",
    name: "Recette de lingot d'argent",
    resultItemId: "silverIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "silverOre", quantity: 3 }],
    // unlockLevel: 3,
    discoveryOnly: true,
  },

  steelIngotRecipe: {
    id: "steelIngotRecipe",
    name: "Recette de lingot d'acier",
    resultItemId: "steelIngot",
    resultQuantity: 1,
    ingredients: [
      { itemId: "ironIngot", quantity: 2 },
      { itemId: "coalOre", quantity: 1 },
    ],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  goldIngotRecipe: {
    id: "goldIngotRecipe",
    name: "Recette de lingot d'or",
    resultItemId: "goldIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "goldOre", quantity: 3 }],
    // unlockLevel: 4,
    discoveryOnly: true,
  },
  platiniumIngotRecipe: {
    id: "platiniumIngotRecipe",
    name: "Recette de lingot de platine",
    resultItemId: "platiniumIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "platiniumOre", quantity: 3 }],
    // unlockLevel: 5,
    discoveryOnly: true,
  },
  cobaltIngotRecipe: {
    id: "cobaltIngotRecipe",
    name: "Recette de lingot de cobalt",
    resultItemId: "cobaltIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "cobaltOre", quantity: 3 }],
    // unlockLevel: 6,
    discoveryOnly: true,
  },
  adamantineIngotRecipe: {
    id: "adamantineIngotRecipe",
    name: "Recette de lingot d'adamantine",
    resultItemId: "adamantineIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "adamantineOre", quantity: 3 }],
    // unlockLevel: 7,
    discoveryOnly: true,
  },
  crimsonIngotRecipe: {
    id: "crimsonIngotRecipe",
    name: "Recette de lingot de cramoisi",
    resultItemId: "crimsonIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "crimsonOre", quantity: 3 }],
    // unlockLevel: 8,
    discoveryOnly: true,
  },
  angelicIngotRecipe: {
    id: "angelicIngotRecipe",
    name: "Recette de lingot angélique",
    resultItemId: "angelicIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "angelicOre", quantity: 3 }],
    // unlockLevel: 9,
    discoveryOnly: true,
  },
  fatefulIngotRecipe: {
    id: "fatefulIngotRecipe",
    name: "Recette de lingot fatidique",
    resultItemId: "fatefulIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "fatefulOre", quantity: 3 }],
    // unlockLevel: 10,
    discoveryOnly: true,
  },
  novaIngotRecipe: {
    id: "novaIngotRecipe",
    name: "Recette de lingot de nova",
    resultItemId: "novaIngot",
    resultQuantity: 1,
    ingredients: [{ itemId: "novaOre", quantity: 3 }],
    // unlockLevel: 11,
    discoveryOnly: true,
  },
  summonMudGolemRecipe: {
    id: "summonMudGolemRecipe",
    name: "Recette de Parchemin : Invocation : Golem de boue",
    resultItemId: "summonMudGolemScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mudGolemCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedBeetleRecipe: {
    id: "summonRedBeetleRecipe",
    name: "Recette de Parchemin : Invocation : Insecte Rouge",
    resultItemId: "summonRedBeetleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redBeetleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPinkOgreRecipe: {
    id: "summonPinkOgreRecipe",
    name: "Recette de Parchemin : Invocation : Ogre rose",
    resultItemId: "summonPinkOgreScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "pinkOgreCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBatRecipe: {
    id: "summonBatRecipe",
    name: "Recette de Parchemin : Invocation : Chauve-souris",
    resultItemId: "summonBatScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "batCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBeeRecipe: {
    id: "summonBeeRecipe",
    name: "Recette de Parchemin : Invocation : Abeille",
    resultItemId: "summonBeeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "beeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBigtickRecipe: {
    id: "summonBigtickRecipe",
    name: "Recette de Parchemin : Invocation : Gros tique",
    resultItemId: "summonBigtickScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "bigtickCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlackdragonRecipe: {
    id: "summonBlackdragonRecipe",
    name: "Recette de Parchemin : Invocation : Dragon noir",
    resultItemId: "summonBlackdragonScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blackdragonCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonDarkelfRecipe: {
    id: "summonDarkelfRecipe",
    name: "Recette de Parchemin : Invocation : Elfe noir",
    resultItemId: "summonDarkelfScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "darkelfCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonDemonDragonRecipe: {
    id: "summonDemonDragonRecipe",
    name: "Recette de Parchemin : Invocation : Dragon démon",
    resultItemId: "summonDemonDragonScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "demonDragonCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonDwarfRecipe: {
    id: "summonDwarfRecipe",
    name: "Recette de Parchemin : Invocation : Nain",
    resultItemId: "summonDwarfScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "dwarfCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy1Recipe: {
    id: "summonFantasy1Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 1",
    resultItemId: "summonFantasy1Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy1Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy2Recipe: {
    id: "summonFantasy2Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 2",
    resultItemId: "summonFantasy2Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy2Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy3Recipe: {
    id: "summonFantasy3Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 3",
    resultItemId: "summonFantasy3Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy3Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy4Recipe: {
    id: "summonFantasy4Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 4",
    resultItemId: "summonFantasy4Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy4Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueGreenRecipe: {
    id: "summonOrqueGreenRecipe",
    name: "Recette de Parchemin : Invocation : Orque Verte",
    resultItemId: "summonOrqueGreenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueGreenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonredWarriorMushroomRecipe: {
    id: "summonredWarriorMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Guerrier Champignon Rouge",
    resultItemId: "summonredWarriorMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redWarriorMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy7Recipe: {
    id: "summonFantasy7Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 7",
    resultItemId: "summonFantasy7Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy7Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMassecailleBlueRecipe: {
    id: "summonMassecailleBlueRecipe",
    name: "Recette de Parchemin : Invocation : Massecaille Bleu",
    resultItemId: "summonMassecailleBlueScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "massecailleBlueCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonFantasy9Recipe: {
    id: "summonFantasy9Recipe",
    name: "Recette de Parchemin : Invocation : Fantasy 9",
    resultItemId: "summonFantasy9Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "fantasy9Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonKnightJauneRougeRecipe: {
    id: "summonKnightJauneRougeRecipe",
    name: "Recette de Parchemin : Invocation : Knight Jaune Rouge",
    resultItemId: "summonKnightJauneRougeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knightJauneRougeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGargoyleRecipe: {
    id: "summonGargoyleRecipe",
    name: "Recette de Parchemin : Invocation : Gargouille",
    resultItemId: "summonGargoyleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "gargoyleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGhostRecipe: {
    id: "summonGhostRecipe",
    name: "Recette de Parchemin : Invocation : Fantome",
    resultItemId: "summonGhostScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "ghostCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGnomeFouRecipe: {
    id: "summonGnomeFouRecipe",
    name: "Recette de Parchemin : Invocation : Gnome fou",
    resultItemId: "summonGnomeFouScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "gnomeFouCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGolemRecipe: {
    id: "summonGolemRecipe",
    name: "Recette de Parchemin : Invocation : Golem",
    resultItemId: "summonGolemScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGorillaRecipe: {
    id: "summonGorillaRecipe",
    name: "Recette de Parchemin : Invocation : Gorille",
    resultItemId: "summonGorillaScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "gorillaCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreendragonRecipe: {
    id: "summonGreendragonRecipe",
    name: "Recette de Parchemin : Invocation : Dragon vert",
    resultItemId: "summonGreendragonScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greendragonCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOgreBrownRecipe: {
    id: "summonOgreBrownRecipe",
    name: "Recette de Parchemin : Invocation : Gourdogre — Clan Fangebois",
    resultItemId: "summonOgreBrownScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "ogreBrownCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedbeetleRecipe: {
    id: "summonRedbeetleRecipe",
    name: "Recette de Parchemin : Invocation : Insecte rouge",
    resultItemId: "summonRedbeetleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redbeetleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot1Recipe: {
    id: "summonRobot1Recipe",
    name: "Recette de Parchemin : Invocation : Robot1",
    resultItemId: "summonRobot1Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot1Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot2Recipe: {
    id: "summonRobot2Recipe",
    name: "Recette de Parchemin : Invocation : Robot2",
    resultItemId: "summonRobot2Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot2Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot3Recipe: {
    id: "summonRobot3Recipe",
    name: "Recette de Parchemin : Invocation : Robot3",
    resultItemId: "summonRobot3Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot3Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot4Recipe: {
    id: "summonRobot4Recipe",
    name: "Recette de Parchemin : Invocation : Robot4",
    resultItemId: "summonRobot4Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot4Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot5Recipe: {
    id: "summonRobot5Recipe",
    name: "Recette de Parchemin : Invocation : Robot5",
    resultItemId: "summonRobot5Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot5Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot6Recipe: {
    id: "summonRobot6Recipe",
    name: "Recette de Parchemin : Invocation : Robot6",
    resultItemId: "summonRobot6Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot6Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot7Recipe: {
    id: "summonRobot7Recipe",
    name: "Recette de Parchemin : Invocation : Robot7",
    resultItemId: "summonRobot7Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot7Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot8Recipe: {
    id: "summonRobot8Recipe",
    name: "Recette de Parchemin : Invocation : Robot8",
    resultItemId: "summonRobot8Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot8Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot9Recipe: {
    id: "summonRobot9Recipe",
    name: "Recette de Parchemin : Invocation : Robot9",
    resultItemId: "summonRobot9Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot9Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRobot10Recipe: {
    id: "summonRobot10Recipe",
    name: "Recette de Parchemin : Invocation : Robot10",
    resultItemId: "summonRobot10Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "robot10Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSkeletonRecipe: {
    id: "summonSkeletonRecipe",
    name: "Recette de Parchemin : Invocation : Squelette",
    resultItemId: "summonSkeletonScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "skeletonCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSkeletonkingRecipe: {
    id: "summonSkeletonkingRecipe",
    name: "Recette de Parchemin : Invocation : Roi Squelette",
    resultItemId: "summonSkeletonkingScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "skeletonkingCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSpiderRecipe: {
    id: "summonSpiderRecipe",
    name: "Recette de Parchemin : Invocation : Tarentule",
    resultItemId: "summonSpiderScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "spiderCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonYellowSlimeRecipe: {
    id: "summonYellowSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob jaune",
    resultItemId: "summonYellowSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "yellowSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueSlimeRecipe: {
    id: "summonBlueSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob bleu",
    resultItemId: "summonBlueSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPurpleSlimeRecipe: {
    id: "summonPurpleSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob violet",
    resultItemId: "summonPurpleSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "purpleSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonYellowWarriorMushroomRecipe: {
    id: "summonYellowWarriorMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Guerrier Champignon Jaune",
    resultItemId: "summonYellowWarriorMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "yellowWarriorMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueWarriorMushroomRecipe: {
    id: "summonBlueWarriorMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Guerrier Champignon Bleu",
    resultItemId: "summonBlueWarriorMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueWarriorMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreenWarriorMushroomRecipe: {
    id: "summonGreenWarriorMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Guerrier Champignon Vert",
    resultItemId: "summonGreenWarriorMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greenWarriorMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPurpleWarriorMushroomRecipe: {
    id: "summonPurpleWarriorMushroomRecipe",
    name: "Recette de Parchemin : Invocation : Guerrier Champignon Violet",
    resultItemId: "summonPurpleWarriorMushroomScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "purpleWarriorMushroomCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlackBearRecipe: {
    id: "summonBlackBearRecipe",
    name: "Recette de Parchemin : Invocation : Ours noir",
    resultItemId: "summonBlackBearScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blackBearCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWhiteBearRecipe: {
    id: "summonWhiteBearRecipe",
    name: "Recette de Parchemin : Invocation : Ours Blanc",
    resultItemId: "summonWhiteBearScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "whiteBearCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonKnightBleuArgentRecipe: {
    id: "summonKnightBleuArgentRecipe",
    name: "Recette de Parchemin : Invocation : Chevalier Bleu Argent",
    resultItemId: "summonKnightBleuArgentScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knightBleuArgentCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonKnightNoirCramoisiRecipe: {
    id: "summonKnightNoirCramoisiRecipe",
    name: "Recette de Parchemin : Invocation : Chevalier Noir Cramoisi",
    resultItemId: "summonKnightNoirCramoisiScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knightNoirCramoisiCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonKnightVertOrRecipe: {
    id: "summonKnightVertOrRecipe",
    name: "Recette de Parchemin : Invocation : Chevalier Vert or",
    resultItemId: "summonKnightVertOrScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knightVertOrCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonKnightVioletArgentRecipe: {
    id: "summonKnightVioletArgentRecipe",
    name: "Recette de Parchemin : Invocation : Chevalier Violet Argent",
    resultItemId: "summonKnightVioletArgentScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "knightVioletArgentCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMassecaillePurpleRecipe: {
    id: "summonMassecaillePurpleRecipe",
    name: "Recette de Parchemin : Invocation : Massecaille Violet",
    resultItemId: "summonMassecaillePurpleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "massecaillePurpleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMassecailleGreenRecipe: {
    id: "summonMassecailleGreenRecipe",
    name: "Recette de Parchemin : Invocation : Massecaille Vert",
    resultItemId: "summonMassecailleGreenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "massecailleGreenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMassecailleRedRecipe: {
    id: "summonMassecailleRedRecipe",
    name: "Recette de Parchemin : Invocation : Massecaille Rouge",
    resultItemId: "summonMassecailleRedScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "massecailleRedCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMassecailleYellowRecipe: {
    id: "summonMassecailleYellowRecipe",
    name: "Recette de Parchemin : Invocation : Massecaille Jaune",
    resultItemId: "summonMassecailleYellowScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "massecailleYellowCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueBlackRecipe: {
    id: "summonOrqueBlackRecipe",
    name: "Recette de Parchemin : Invocation : Orque en noir",
    resultItemId: "summonOrqueBlackScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueBlackCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueYellowRecipe: {
    id: "summonOrqueYellowRecipe",
    name: "Recette de Parchemin : Invocation : Orque en jaune",
    resultItemId: "summonOrqueYellowScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueYellowCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueBlueRecipe: {
    id: "summonOrqueBlueRecipe",
    name: "Recette de Parchemin : Invocation : Orque en bleu",
    resultItemId: "summonOrqueBlueScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueBlueCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueRedRecipe: {
    id: "summonOrqueRedRecipe",
    name: "Recette de Parchemin : Invocation : Orque en rouge",
    resultItemId: "summonOrqueRedScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueRedCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrquePurpleRecipe: {
    id: "summonOrquePurpleRecipe",
    name: "Recette de Parchemin : Invocation : Orque en violet",
    resultItemId: "summonOrquePurpleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orquePurpleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrqueGreyRecipe: {
    id: "summonOrqueGreyRecipe",
    name: "Recette de Parchemin : Invocation : Orque en gris",
    resultItemId: "summonOrqueGreyScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orqueGreyCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollBlueRecipe: {
    id: "summonTrollBlueRecipe",
    name: "Recette de Parchemin : Invocation : Troll Bleu",
    resultItemId: "summonTrollBlueScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollBlueCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollGrisRecipe: {
    id: "summonTrollGrisRecipe",
    name: "Recette de Parchemin : Invocation : Troll Gris",
    resultItemId: "summonTrollGrisScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollGrisCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollRoseRecipe: {
    id: "summonTrollRoseRecipe",
    name: "Recette de Parchemin : Invocation : Troll rose",
    resultItemId: "summonTrollRoseScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollRoseCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollRougeRecipe: {
    id: "summonTrollRougeRecipe",
    name: "Recette de Parchemin : Invocation : Troll Rouge",
    resultItemId: "summonTrollRougeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollRougeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollVertRecipe: {
    id: "summonTrollVertRecipe",
    name: "Recette de Parchemin : Invocation : Troll vert",
    resultItemId: "summonTrollVertScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollVertCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTrollVioletRecipe: {
    id: "summonTrollVioletRecipe",
    name: "Recette de Parchemin : Invocation : Troll Violet",
    resultItemId: "summonTrollVioletScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "trollVioletCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockRedRecipe: {
    id: "summonWarlockRedRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Rouge",
    resultItemId: "summonWarlockRedScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockRedCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockWhiteRecipe: {
    id: "summonWarlockWhiteRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Blanc",
    resultItemId: "summonWarlockWhiteScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockWhiteCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockGreenRecipe: {
    id: "summonWarlockGreenRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Vert",
    resultItemId: "summonWarlockGreenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockGreenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockBlueRecipe: {
    id: "summonWarlockBlueRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Bleu",
    resultItemId: "summonWarlockBlueScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockBlueCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockBlackRecipe: {
    id: "summonWarlockBlackRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Noir",
    resultItemId: "summonWarlockBlackScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockBlackCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWarlockPurpleRecipe: {
    id: "summonWarlockPurpleRecipe",
    name: "Recette de Parchemin : Invocation : Sorcier Violet",
    resultItemId: "summonWarlockPurpleScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "warlockPurpleCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },

  summonGolemEauRecipe: {
    id: "summonGolemEauRecipe",
    name: "Recette de Parchemin : Invocation : Golem d'eau",
    resultItemId: "summonGolemEauScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemEauCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGolemFeuRecipe: {
    id: "summonGolemFeuRecipe",
    name: "Recette de Parchemin : Invocation : Golem de feu",
    resultItemId: "summonGolemFeuScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemFeuCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGolemFoudreRecipe: {
    id: "summonGolemFoudreRecipe",
    name: "Recette de Parchemin : Invocation : Golem de foudre",
    resultItemId: "summonGolemFoudreScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemFoudreCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGolemGlaceRecipe: {
    id: "summonGolemGlaceRecipe",
    name: "Recette de Parchemin : Invocation : Golem de glace",
    resultItemId: "summonGolemGlaceScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemGlaceCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGolemOmbreRecipe: {
    id: "summonGolemOmbreRecipe",
    name: "Recette de Parchemin : Invocation : Golem d'ombre",
    resultItemId: "summonGolemOmbreScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "golemOmbreCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonZombiequeenBossRecipe: {
    id: "summonZombiequeenBossRecipe",
    name: "Recette de Parchemin : Invocation : Reine Zombie",
    resultItemId: "summonZombiequeenBossScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "zombiequeenBossCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonZombiequeenRecipe: {
    id: "summonZombiequeenRecipe",
    name: "Recette de Parchemin : Invocation : Reine Zombie",
    resultItemId: "summonZombiequeenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "zombiequeenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBeequeenBossRecipe: {
    id: "summonBeequeenBossRecipe",
    name: "Recette de Parchemin : Invocation : Reine des abeilles",
    resultItemId: "summonBeequeenBossScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "beequeenBossCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBeequeenRecipe: {
    id: "summonBeequeenRecipe",
    name: "Recette de Parchemin : Invocation : Abeille Royale",
    resultItemId: "summonBeequeenScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "beequeenCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGrayGriblinRecipe: {
    id: "summonGrayGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Griblin",
    resultItemId: "summonGrayGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "grayGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreenGriblinRecipe: {
    id: "summonGreenGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Griblin Emeraude",
    resultItemId: "summonGreenGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greenGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedGriblinRecipe: {
    id: "summonRedGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Griblin Ecarlate",
    resultItemId: "summonRedGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueGriblinRecipe: {
    id: "summonBlueGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Grinblin Azur",
    resultItemId: "summonBlueGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPurpleGriblinRecipe: {
    id: "summonPurpleGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Griblin Améthyste",
    resultItemId: "summonPurpleGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "purpleGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGoldGriblinRecipe: {
    id: "summonGoldGriblinRecipe",
    name: "Recette de Parchemin : Invocation : Griblin Doré",
    resultItemId: "summonGoldGriblinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "goldGriblinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedManditaureRecipe: {
    id: "summonRedManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure écarlate",
    resultItemId: "summonRedManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueManditaureRecipe: {
    id: "summonBlueManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure azur",
    resultItemId: "summonBlueManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreenManditaureRecipe: {
    id: "summonGreenManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure émeraude",
    resultItemId: "summonGreenManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greenManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPurpleManditaureRecipe: {
    id: "summonPurpleManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure améthyste",
    resultItemId: "summonPurpleManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "purpleManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonYellowManditaureRecipe: {
    id: "summonYellowManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure doré",
    resultItemId: "summonYellowManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "yellowManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlackManditaureRecipe: {
    id: "summonBlackManditaureRecipe",
    name: "Recette de Parchemin : Invocation : Manditaure noir",
    resultItemId: "summonBlackManditaureScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blackManditaureCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPurpleSpectrelinRecipe: {
    id: "summonPurpleSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Spectrelin",
    resultItemId: "summonPurpleSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "purpleSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrangeSpectrelinRecipe: {
    id: "summonOrangeSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Brumelin",
    resultItemId: "summonOrangeSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orangeSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCyanSpectrelinRecipe: {
    id: "summonCyanSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Glaselin",
    resultItemId: "summonCyanSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "cyanSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPinkSpectrelinRecipe: {
    id: "summonPinkSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Hanteline",
    resultItemId: "summonPinkSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "pinkSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSilverSpectrelinRecipe: {
    id: "summonSilverSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Ombrelin",
    resultItemId: "summonSilverSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "silverSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBronzeSpectrelinRecipe: {
    id: "summonBronzeSpectrelinRecipe",
    name: "Recette de Parchemin : Invocation : Echolin",
    resultItemId: "summonBronzeSpectrelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "bronzeSpectrelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreenGemmacrabeRecipe: {
    id: "summonGreenGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Gemmacrabe",
    resultItemId: "summonGreenGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greenGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedGemmacrabeRecipe: {
    id: "summonRedGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Braisecrabe",
    resultItemId: "summonRedGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueGemmacrabeRecipe: {
    id: "summonBlueGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Abyssacrabe",
    resultItemId: "summonBlueGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonYellowGemmacrabeRecipe: {
    id: "summonYellowGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Ambracrabre",
    resultItemId: "summonYellowGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "yellowGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrangeGemmacrabeRecipe: {
    id: "summonOrangeGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Corailcrabe",
    resultItemId: "summonOrangeGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orangeGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWhiteGemmacrabeRecipe: {
    id: "summonWhiteGemmacrabeRecipe",
    name: "Recette de Parchemin : Invocation : Nacrabe",
    resultItemId: "summonWhiteGemmacrabeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "whiteGemmacrabeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonBlueGrayVesperinRecipe: {
    id: "summonBlueGrayVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Vesperin",
    resultItemId: "summonBlueGrayVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "blueGrayVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSilverVesperinRecipe: {
    id: "summonSilverVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Astrelin",
    resultItemId: "summonSilverVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "silverVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGoldVesperinRecipe: {
    id: "summonGoldVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Solelin",
    resultItemId: "summonGoldVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "goldVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCopperVesperinRecipe: {
    id: "summonCopperVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Forgelin",
    resultItemId: "summonCopperVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "copperVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSteelVesperinRecipe: {
    id: "summonSteelVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Lamelin",
    resultItemId: "summonSteelVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "steelVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonEmeraldVesperinRecipe: {
    id: "summonEmeraldVesperinRecipe",
    name: "Recette de Parchemin : Invocation : Jadelin",
    resultItemId: "summonEmeraldVesperinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "emeraldVesperinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrangeTikorinRecipe: {
    id: "summonOrangeTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Tikorin",
    resultItemId: "summonOrangeTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orangeTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonLightOakTikorinRecipe: {
    id: "summonLightOakTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Clarorin",
    resultItemId: "summonLightOakTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "lightOakTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonWalnutTikorinRecipe: {
    id: "summonWalnutTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Racorin",
    resultItemId: "summonWalnutTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "walnutTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonMahoganyTikorinRecipe: {
    id: "summonMahoganyTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Braisorin",
    resultItemId: "summonMahoganyTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "mahoganyTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonEbonyTikorinRecipe: {
    id: "summonEbonyTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Noctorin",
    resultItemId: "summonEbonyTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "ebonyTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGoldenBeechTikorinRecipe: {
    id: "summonGoldenBeechTikorinRecipe",
    name: "Recette de Parchemin : Invocation : Auréorin",
    resultItemId: "summonGoldenBeechTikorinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "goldenBeechTikorinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPinkLimacorneRecipe: {
    id: "summonPinkLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Limacorne",
    resultItemId: "summonPinkLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "pinkLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonDeepBlueLimacorneRecipe: {
    id: "summonDeepBlueLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Gouffrorne",
    resultItemId: "summonDeepBlueLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "deepBlueLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonTurquoiseLimacorneRecipe: {
    id: "summonTurquoiseLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Réciforne",
    resultItemId: "summonTurquoiseLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "turquoiseLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonAlgaeGreenLimacorneRecipe: {
    id: "summonAlgaeGreenLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Algorne",
    resultItemId: "summonAlgaeGreenLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "algaeGreenLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCoralLimacorneRecipe: {
    id: "summonCoralLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Corallorne",
    resultItemId: "summonCoralLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "coralLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonPearlLimacorneRecipe: {
    id: "summonPearlLimacorneRecipe",
    name: "Recette de Parchemin : Invocation : Perlorne",
    resultItemId: "summonPearlLimacorneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "pearlLimacorneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraquelinRecipe: {
    id: "summonCraquelinRecipe",
    name: "Recette de Parchemin : Invocation : Craquelin",
    resultItemId: "summonCraquelinScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craquelinCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraqueglaceRecipe: {
    id: "summonCraqueglaceRecipe",
    name: "Recette de Parchemin : Invocation : Craqueglace",
    resultItemId: "summonCraqueglaceScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craqueglaceCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraqueveninRecipe: {
    id: "summonCraqueveninRecipe",
    name: "Recette de Parchemin : Invocation : Craquevenin",
    resultItemId: "summonCraqueveninScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craqueveninCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraquarcaneRecipe: {
    id: "summonCraquarcaneRecipe",
    name: "Recette de Parchemin : Invocation : Craquarcane",
    resultItemId: "summonCraquarcaneScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craquarcaneCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraquorRecipe: {
    id: "summonCraquorRecipe",
    name: "Recette de Parchemin : Invocation : Craquor",
    resultItemId: "summonCraquorScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craquorCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonCraquombreRecipe: {
    id: "summonCraquombreRecipe",
    name: "Recette de Parchemin : Invocation : Craquombre",
    resultItemId: "summonCraquombreScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "craquombreCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonRedSlimeRecipe: {
    id: "summonRedSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob rouge",
    resultItemId: "summonRedSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "redSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonOrangeSlimeRecipe: {
    id: "summonOrangeSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob orange",
    resultItemId: "summonOrangeSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "orangeSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSkyBlueSlimeRecipe: {
    id: "summonSkyBlueSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob bleu ciel",
    resultItemId: "summonSkyBlueSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "skyBlueSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonGreenSlimeRecipe: {
    id: "summonGreenSlimeRecipe",
    name: "Recette de Parchemin : Invocation : Blob vert",
    resultItemId: "summonGreenSlimeScroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "greenSlimeCore", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSnail1Recipe: {
    id: "summonSnail1Recipe",
    name: "Recette de Parchemin : Invocation : Escargot géant",
    resultItemId: "summonSnail1Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "snail1Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  summonSpider2Recipe: {
    id: "summonSpider2Recipe",
    name: "Recette de Parchemin : Invocation : Araignée noire",
    resultItemId: "summonSpider2Scroll",
    resultQuantity: 1,
    ingredients: [
      { itemId: "spider2Core", quantity: 1 },
      { itemId: "grimoire", quantity: 1 },
    ],
    discoveryOnly: true,
  },
};

// Les recettes generees par buildRecipe() n'ont pas de champ `name` explicite
// (contrairement aux recettes ecrites a la main) : on le derive ici, une seule
// fois au chargement du module, a partir du nom de l'objet resultant. Ca couvre
// aussi bien resolveCraftingRecipe() que les endroits qui iterent directement
// sur Object.values(CRAFTING_RECIPES) (ex: findMatchingRecipeIgnoringLevel).
for (const recipe of Object.values(CRAFTING_RECIPES)) {
  if (!recipe.name) {
    recipe.name = resolveItemDef(recipe.resultItemId).name;
  }
}

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
