import { ITEM_DEFS, resolveItemDef } from "./itemDefs";

/**
 * Recettes d'EQUIPEMENT generees en boucle (armes, armures, objets) :
 * evolutions par palier de metal, de bois et de butin de monstre, variantes
 * "reinforced" et "sharp". Tout est exporte dans un seul objet,
 * EQUIPMENT_RECIPES, repris par craftingRecipes.js.
 *
 * Contenu, dans l'ordre : evolutions de metal/bois/butin (listes de paires),
 * evolution des dagues (table DAGGER_CHAIN), puis les recettes d'equipement
 * ecrites a la main (armes de base en bois, arbalete, epee enflammee) tout en
 * bas, dans EQUIPMENT_RECIPES.
 */

/**
 * Genere en boucle un lot de recettes qui suivent TOUTES le meme motif
 * "objet de palier N + X lingots -> objet de palier N+1" - evite de
 * dupliquer un bloc de recette quasi identique pour chaque arme d'une
 * meme famille (ex: copperSword -> ironSword, copperSpear -> ironSpear...).
 * Modifier le cout commun (ingotQty) ou le niveau requis se fait alors
 * en UN seul endroit plutot que sur chaque recette individuellement.
 *
 * @param {{base:string, result:string, name:string}[]} list
 * @param {string} ingredientItemId
 * @param {number} ingredientQty
 * @param {number} [unlockLevel]
 * @param {boolean} [discoveryOnly] indique si la recette est uniquement decouvrable (non craftable directement)
 * @returns {Object} objet de recettes, au meme format que CRAFTING_RECIPES
 */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildRecipe(
  list,
  ingredientItemId,
  ingredientQty,
  unlockLevel,
  discoveryOnly = true,
  allowEnhancedBase = false,
) {
  const recipes = {};
  for (const { base, result } of list) {
    const id = `${result}Recipe`;
    recipes[id] = {
      id,
      resultItemId: result,
      resultQuantity: 1,
      ingredients: [
        { itemId: base, quantity: 1 },
        { itemId: ingredientItemId, quantity: ingredientQty },
      ],
      ...(unlockLevel != null ? { unlockLevel } : {}),
      ...(discoveryOnly ? { discoveryOnly: true } : {}),
    };

    if (allowEnhancedBase) {
      for (const prefix of ["sharp", "reinforced"]) {
        const enhancedBase = `${prefix}${capitalize(base)}`;
        if (enhancedBase === result) continue;
        if (!ITEM_DEFS[enhancedBase]) continue;
        const upgradeId = `${enhancedBase}UpgradeRecipe`;
        recipes[upgradeId] = {
          id: upgradeId,
          resultItemId: result,
          resultQuantity: 1,
          ingredients: [
            { itemId: enhancedBase, quantity: 1 },
            { itemId: ingredientItemId, quantity: ingredientQty },
          ],
          ...(unlockLevel != null ? { unlockLevel } : {}),
          ...(discoveryOnly ? { discoveryOnly: true } : {}),
        };
      }
    }
  }
  return recipes;
}

const REINFORCED_WOODEN_TIER_WEAPONS = [
  { base: "woodenDagger", result: "reinforcedWoodenDagger" },
  { base: "woodenSword", result: "reinforcedWoodenSword" },
  { base: "woodenSpear", result: "reinforcedWoodenSpear" },
  { base: "woodenMallet", result: "reinforcedWoodenMallet" },
  { base: "woodenShovel", result: "reinforcedWoodenShovel" },
  { base: "woodenHammer", result: "reinforcedWoodenHammer" },
  { base: "woodenSickle", result: "reinforcedWoodenSickle" },
  { base: "woodenShield", result: "reinforcedWoodenShield" },
  { base: "woodenStaff", result: "reinforcedWoodenStaff" },
  { base: "woodenGreatShield", result: "reinforcedWoodenGreatShield" },
  { base: "woodenCrossbow", result: "reinforcedWoodenCrossbow" },
  { base: "woodenBow", result: "reinforcedWoodenBow" },
  // ajoute toutes les autres paires bois -> bois renforcé ici
];

const REINFORCED_WOODEN_TIER_RECIPES = buildRecipe(
  REINFORCED_WOODEN_TIER_WEAPONS,
  "oakWood",
  1,
  1,
  true,
  false,
);

const COPPER_TIER_WEAPONS = [
  { base: "woodenSword", result: "copperSword" },
  { base: "woodenSpear", result: "copperSpear" },
  { base: "woodenMallet", result: "copperMallet" },
  { base: "woodenShovel", result: "copperShovel" },
  { base: "woodenHammer", result: "copperHammer" },
  { base: "woodenSickle", result: "copperSickle" },
  { base: "woodenShield", result: "copperShield" },
  { base: "woodenPickaxe", result: "copperPickaxe" },
  { base: "woodenAxe", result: "copperAxe" },
  { base: "woodenStaff", result: "copperStaff" },
  { base: "woodenGreatShield", result: "copperGreatShield" },
  { base: "woodenArmor", result: "copperArmor" },
  { base: "woodenHelmet", result: "copperHelmet" },
  { base: "armorPants", result: "copperArmorPants" },
  { base: "armorBelt", result: "copperArmorBelt" },
  // ajoute toutes les autres paires bois -> cuivre ici
];

const COPPER_TIER_RECIPES = buildRecipe(
  COPPER_TIER_WEAPONS,
  "copperIngot",
  2,
  1,
  true,
  true,
);

const COPPER_TIER_OBJECTS = [
  { base: "hpRing", result: "copperHpRing" },
  { base: "staminaRing", result: "copperStaminaRing" },
  { base: "manaRing", result: "copperManaRing" },
  { base: "hpNecklace", result: "copperHpNecklace" },
  { base: "staminaNecklace", result: "copperStaminaNecklace" },
  { base: "manaNecklace", result: "copperManaNecklace" },
];

const COPPER_TIER_OBJECT_RECIPES = buildRecipe(
  COPPER_TIER_OBJECTS,
  "copperIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_COPPER_TIER_WEAPONS = [
  { base: "copperDagger", result: "reinforcedCopperDagger" },
  { base: "copperSword", result: "reinforcedCopperSword" },
  { base: "copperSpear", result: "reinforcedCopperSpear" },
  { base: "copperMallet", result: "reinforcedCopperMallet" },
  { base: "copperShovel", result: "reinforcedCopperShovel" },
  { base: "copperHammer", result: "reinforcedCopperHammer" },
  { base: "copperSickle", result: "reinforcedCopperSickle" },
  { base: "copperShield", result: "reinforcedCopperShield" },
  { base: "copperStaff", result: "reinforcedCopperStaff" },
  { base: "copperGreatShield", result: "reinforcedCopperGreatShield" },
  { base: "copperArmor", result: "reinforcedCopperArmor" },
  { base: "copperHelmet", result: "reinforcedCopperHelmet" },
  { base: "copperArmorPants", result: "reinforcedCopperArmorPants" },
  { base: "copperArmorBelt", result: "reinforcedCopperArmorBelt" },
  // ajoute toutes les autres paires cuivre -> cuivre renforcé ici
];

const REINFORCED_COPPER_TIER_RECIPES = buildRecipe(
  REINFORCED_COPPER_TIER_WEAPONS,
  "copperIngot",
  1,
  1,
  true,
  false,
);

const IRON_TIER_WEAPONS = [
  { base: "copperSword", result: "ironSword" },
  { base: "copperSpear", result: "ironSpear" },
  { base: "copperMallet", result: "ironMallet" },
  { base: "copperShovel", result: "ironShovel" },
  { base: "copperHammer", result: "ironHammer" },
  { base: "copperSickle", result: "ironSickle" },
  { base: "copperShield", result: "ironShield" },
  { base: "copperPickaxe", result: "ironPickaxe" },
  { base: "copperAxe", result: "ironAxe" },
  { base: "copperStaff", result: "ironStaff" },
  { base: "copperGreatShield", result: "ironGreatShield" },
  { base: "copperArmor", result: "ironArmor" },
  { base: "copperHelmet", result: "ironHelmet" },
  { base: "copperArmorPants", result: "ironArmorPants" },
  { base: "copperArmorBelt", result: "ironArmorBelt" },
  // ajoute toutes les autres paires cuivre -> fer ici
];

const IRON_TIER_RECIPES = buildRecipe(
  IRON_TIER_WEAPONS,
  "ironIngot",
  2,
  1,
  true,
  true,
);

const IRON_TIER_OBJECTS = [
  { base: "copperHpRing", result: "ironHpRing" },
  { base: "copperStaminaRing", result: "ironStaminaRing" },
  { base: "copperManaRing", result: "ironManaRing" },
  { base: "copperHpNecklace", result: "ironHpNecklace" },
  { base: "copperStaminaNecklace", result: "ironStaminaNecklace" },
  { base: "copperManaNecklace", result: "ironManaNecklace" },
];

const IRON_TIER_OBJECT_RECIPES = buildRecipe(
  IRON_TIER_OBJECTS,
  "ironIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_IRON_TIER_WEAPONS = [
  { base: "ironDagger", result: "reinforcedIronDagger" },
  { base: "ironSword", result: "reinforcedIronSword" },
  { base: "ironSpear", result: "reinforcedIronSpear" },
  { base: "ironMallet", result: "reinforcedIronMallet" },
  { base: "ironShovel", result: "reinforcedIronShovel" },
  { base: "ironHammer", result: "reinforcedIronHammer" },
  { base: "ironSickle", result: "reinforcedIronSickle" },
  { base: "ironShield", result: "reinforcedIronShield" },
  { base: "ironStaff", result: "reinforcedIronStaff" },
  { base: "ironGreatShield", result: "reinforcedIronGreatShield" },
  { base: "ironArmor", result: "reinforcedIronArmor" },
  { base: "ironArmorPants", result: "reinforcedIronArmorPants" },
  { base: "ironArmorBelt", result: "reinforcedIronArmorBelt" },
  { base: "ironHelmet", result: "reinforcedIronHelmet" },
  // ajoute toutes les autres paires fer -> fer renforcé ici
];

const REINFORCED_IRON_TIER_RECIPES = buildRecipe(
  REINFORCED_IRON_TIER_WEAPONS,
  "ironIngot",
  1,
  1,
  true,
  false,
);

const SILVER_TIER_WEAPONS = [
  { base: "ironSword", result: "silverSword" },
  { base: "ironSpear", result: "silverSpear" },
  { base: "ironMallet", result: "silverMallet" },
  { base: "ironShovel", result: "silverShovel" },
  { base: "ironHammer", result: "silverHammer" },
  { base: "ironSickle", result: "silverSickle" },
  { base: "ironShield", result: "silverShield" },
  { base: "ironPickaxe", result: "silverPickaxe" },
  { base: "ironAxe", result: "silverAxe" },
  { base: "ironStaff", result: "silverStaff" },
  { base: "ironGreatShield", result: "silverGreatShield" },
  { base: "ironArmor", result: "silverArmor" },
  { base: "ironHelmet", result: "silverHelmet" },
  { base: "ironArmorPants", result: "silverArmorPants" },
  { base: "ironArmorBelt", result: "silverArmorBelt" },
  // ajoute toutes les autres paires fer -> argent ici
];

const SILVER_TIER_RECIPES = buildRecipe(
  SILVER_TIER_WEAPONS,
  "silverIngot",
  2,
  1,
  true,
  true,
);

const SILVER_TIER_OBJECTS = [
  { base: "ironHpRing", result: "silverHpRing" },
  { base: "ironStaminaRing", result: "silverStaminaRing" },
  { base: "ironManaRing", result: "silverManaRing" },
  { base: "ironHpNecklace", result: "silverHpNecklace" },
  { base: "ironStaminaNecklace", result: "silverStaminaNecklace" },
  { base: "ironManaNecklace", result: "silverManaNecklace" },
];

const SILVER_TIER_OBJECT_RECIPES = buildRecipe(
  SILVER_TIER_OBJECTS,
  "silverIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_SILVER_TIER_WEAPONS = [
  { base: "silverDagger", result: "reinforcedSilverDagger" },
  { base: "silverSword", result: "reinforcedSilverSword" },
  { base: "silverSpear", result: "reinforcedSilverSpear" },
  { base: "silverMallet", result: "reinforcedSilverMallet" },
  { base: "silverShovel", result: "reinforcedSilverShovel" },
  { base: "silverHammer", result: "reinforcedSilverHammer" },
  { base: "silverSickle", result: "reinforcedSilverSickle" },
  { base: "silverShield", result: "reinforcedSilverShield" },
  { base: "silverStaff", result: "reinforcedSilverStaff" },
  { base: "silverArmor", result: "reinforcedSilverArmor" },
  { base: "silverHelmet", result: "reinforcedSilverHelmet" },
  { base: "silverArmorPants", result: "reinforcedSilverArmorPants" },
  { base: "silverArmorBelt", result: "reinforcedSilverArmorBelt" },
  // ajoute toutes les autres paires argent -> argent renforcé ici
];

const REINFORCED_SILVER_TIER_RECIPES = buildRecipe(
  REINFORCED_SILVER_TIER_WEAPONS,
  "silverIngot",
  1,
  1,
  true,
  false,
);

const STEEL_TIER_WEAPONS = [
  { base: "silverSword", result: "steelSword" },
  { base: "silverSpear", result: "steelSpear" },
  { base: "silverMallet", result: "steelMallet" },
  { base: "silverShovel", result: "steelShovel" },
  { base: "silverHammer", result: "steelHammer" },
  { base: "silverSickle", result: "steelSickle" },
  { base: "silverShield", result: "steelShield" },
  { base: "silverPickaxe", result: "steelPickaxe" },
  { base: "silverAxe", result: "steelAxe" },
  { base: "silverStaff", result: "steelStaff" },
  { base: "silverGreatShield", result: "steelGreatShield" },
  { base: "silverArmor", result: "steelArmor" },
  { base: "silverHelmet", result: "steelHelmet" },
  { base: "silverArmorPants", result: "steelArmorPants" },
  { base: "silverArmorBelt", result: "steelArmorBelt" },
  // ajoute toutes les autres paires argent -> acier ici
];

const STEEL_TIER_RECIPES = buildRecipe(
  STEEL_TIER_WEAPONS,
  "steelIngot",
  2,
  1,
  true,
  true,
);

const STEEL_TIER_OBJECTS = [
  { base: "silverHpRing", result: "steelHpRing" },
  { base: "silverStaminaRing", result: "steelStaminaRing" },
  { base: "silverManaRing", result: "steelManaRing" },
  { base: "silverHpNecklace", result: "steelHpNecklace" },
  { base: "silverStaminaNecklace", result: "steelStaminaNecklace" },
  { base: "silverManaNecklace", result: "steelManaNecklace" },
];

const STEEL_TIER_OBJECT_RECIPES = buildRecipe(
  STEEL_TIER_OBJECTS,
  "steelIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_STEEL_TIER_WEAPONS = [
  { base: "steelDagger", result: "reinforcedSteelDagger" },
  { base: "steelSword", result: "reinforcedSteelSword" },
  { base: "steelSpear", result: "reinforcedSteelSpear" },
  { base: "steelMallet", result: "reinforcedSteelMallet" },
  { base: "steelShovel", result: "reinforcedSteelShovel" },
  { base: "steelHammer", result: "reinforcedSteelHammer" },
  { base: "steelSickle", result: "reinforcedSteelSickle" },
  { base: "steelShield", result: "reinforcedSteelShield" },
  { base: "steelStaff", result: "reinforcedSteelStaff" },
  { base: "steelGreatShield", result: "reinforcedSteelGreatShield" },
  { base: "steelHelmet", result: "reinforcedSteelHelmet" },
  { base: "steelArmor", result: "reinforcedSteelArmor" },
  { base: "steelArmorPants", result: "reinforcedSteelArmorPants" },
  { base: "steelArmorBelt", result: "reinforcedSteelArmorBelt" },
  // ajoute toutes les autres paires acier -> acier renforcé ici
];

const REINFORCED_STEEL_TIER_RECIPES = buildRecipe(
  REINFORCED_STEEL_TIER_WEAPONS,
  "steelIngot",
  1,
  1,
  true,
  false,
);

const GOLD_TIER_WEAPONS = [
  { base: "steelSword", result: "goldSword" },
  { base: "steelSpear", result: "goldSpear" },
  { base: "steelMallet", result: "goldMallet" },
  { base: "steelShovel", result: "goldShovel" },
  { base: "steelHammer", result: "goldHammer" },
  { base: "steelSickle", result: "goldSickle" },
  { base: "steelShield", result: "goldShield" },
  { base: "steelPickaxe", result: "goldPickaxe" },
  { base: "steelAxe", result: "goldAxe" },
  { base: "steelStaff", result: "goldStaff" },
  { base: "steelGreatShield", result: "goldGreatShield" },
  { base: "steelArmor", result: "goldArmor" },
  { base: "steelHelmet", result: "goldHelmet" },
  { base: "steelArmorPants", result: "goldArmorPants" },
  { base: "steelArmorBelt", result: "goldArmorBelt" },
];

const GOLD_TIER_RECIPES = buildRecipe(
  GOLD_TIER_WEAPONS,
  "goldIngot",
  2,
  1,
  true,
  true,
);

const GOLD_TIER_OBJECTS = [
  { base: "steelHpRing", result: "goldHpRing" },
  { base: "steelStaminaRing", result: "goldStaminaRing" },
  { base: "steelManaRing", result: "goldManaRing" },
  { base: "steelHpNecklace", result: "goldHpNecklace" },
  { base: "steelStaminaNecklace", result: "goldStaminaNecklace" },
  { base: "steelManaNecklace", result: "goldManaNecklace" },
];

const GOLD_TIER_OBJECT_RECIPES = buildRecipe(
  GOLD_TIER_OBJECTS,
  "goldIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_GOLD_TIER_WEAPONS = [
  { base: "goldDagger", result: "reinforcedGoldDagger" },
  { base: "goldSword", result: "reinforcedGoldSword" },
  { base: "goldSpear", result: "reinforcedGoldSpear" },
  { base: "goldMallet", result: "reinforcedGoldMallet" },
  { base: "goldShovel", result: "reinforcedGoldShovel" },
  { base: "goldHammer", result: "reinforcedGoldHammer" },
  { base: "goldSickle", result: "reinforcedGoldSickle" },
  { base: "goldShield", result: "reinforcedGoldShield" },
  { base: "goldStaff", result: "reinforcedGoldStaff" },
  { base: "goldGreatShield", result: "reinforcedGoldGreatShield" },
  { base: "goldArmor", result: "reinforcedGoldArmor" },
  { base: "goldHelmet", result: "reinforcedGoldHelmet" },
  { base: "goldArmorPants", result: "reinforcedGoldArmorPants" },
  { base: "goldArmorBelt", result: "reinforcedGoldArmorBelt" },
  // ajoute toutes les autres paires or -> or renforcé ici
];

const REINFORCED_GOLD_TIER_RECIPES = buildRecipe(
  REINFORCED_GOLD_TIER_WEAPONS,
  "goldIngot",
  1,
  1,
  true,
  false,
);

const PLATINIUM_TIER_WEAPONS = [
  { base: "goldSword", result: "platiniumSword" },
  { base: "goldSpear", result: "platiniumSpear" },
  { base: "goldMallet", result: "platiniumMallet" },
  { base: "goldShovel", result: "platiniumShovel" },
  { base: "goldHammer", result: "platiniumHammer" },
  { base: "goldSickle", result: "platiniumSickle" },
  { base: "goldShield", result: "platiniumShield" },
  { base: "goldPickaxe", result: "platiniumPickaxe" },
  { base: "goldAxe", result: "platiniumAxe" },
  { base: "goldStaff", result: "platiniumStaff" },
  { base: "goldGreatShield", result: "platiniumGreatShield" },
  { base: "goldArmor", result: "platiniumArmor" },
  { base: "goldHelmet", result: "platiniumHelmet" },
  { base: "goldArmorPants", result: "platiniumArmorPants" },
  { base: "goldArmorBelt", result: "platiniumArmorBelt" },
];

const PLATINIUM_TIER_RECIPES = buildRecipe(
  PLATINIUM_TIER_WEAPONS,
  "platiniumIngot",
  2,
  1,
  true,
  true,
);

const PLATINIUM_TIER_OBJECTS = [
  { base: "goldHpRing", result: "platiniumHpRing" },
  { base: "goldStaminaRing", result: "platiniumStaminaRing" },
  { base: "goldManaRing", result: "platiniumManaRing" },
  { base: "goldHpNecklace", result: "platiniumHpNecklace" },
  { base: "goldStaminaNecklace", result: "platiniumStaminaNecklace" },
  { base: "goldManaNecklace", result: "platiniumManaNecklace" },
];

const PLATINIUM_TIER_OBJECT_RECIPES = buildRecipe(
  PLATINIUM_TIER_OBJECTS,
  "platiniumIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_PLATINIUM_TIER_WEAPONS = [
  { base: "platiniumSword", result: "reinforcedPlatiniumSword" },
  { base: "platiniumSpear", result: "reinforcedPlatiniumSpear" },
  { base: "platiniumMallet", result: "reinforcedPlatiniumMallet" },
  { base: "platiniumShovel", result: "reinforcedPlatiniumShovel" },
  { base: "platiniumHammer", result: "reinforcedPlatiniumHammer" },
  { base: "platiniumSickle", result: "reinforcedPlatiniumSickle" },
  { base: "platiniumShield", result: "reinforcedPlatiniumShield" },
  { base: "platiniumStaff", result: "reinforcedPlatiniumStaff" },
  { base: "platiniumGreatShield", result: "reinforcedPlatiniumGreatShield" },
  { base: "platiniumArmor", result: "reinforcedPlatiniumArmor" },
  { base: "platiniumHelmet", result: "reinforcedPlatiniumHelmet" },
  { base: "platiniumArmorPants", result: "reinforcedPlatiniumArmorPants" },
  { base: "platiniumArmorBelt", result: "reinforcedPlatiniumArmorBelt" },
  { base: "platiniumDagger", result: "reinforcedPlatiniumDagger" },
  // ajoute toutes les autres paires platine -> platine renforcé ici
];

const REINFORCED_PLATINIUM_TIER_RECIPES = buildRecipe(
  REINFORCED_PLATINIUM_TIER_WEAPONS,
  "platiniumIngot",
  1,
  1,
  true,
  false,
);

const COBALT_TIER_WEAPONS = [
  { base: "platiniumSword", result: "cobaltSword" },
  { base: "platiniumSpear", result: "cobaltSpear" },
  { base: "platiniumMallet", result: "cobaltMallet" },
  { base: "platiniumShovel", result: "cobaltShovel" },
  { base: "platiniumHammer", result: "cobaltHammer" },
  { base: "platiniumSickle", result: "cobaltSickle" },
  { base: "platiniumShield", result: "cobaltShield" },
  { base: "platiniumPickaxe", result: "cobaltPickaxe" },
  { base: "platiniumAxe", result: "cobaltAxe" },
  { base: "platiniumStaff", result: "cobaltStaff" },
  { base: "platiniumGreatShield", result: "cobaltGreatShield" },
  { base: "platiniumArmor", result: "cobaltArmor" },
  { base: "platiniumHelmet", result: "cobaltHelmet" },
  { base: "platiniumArmorPants", result: "cobaltArmorPants" },
  { base: "platiniumArmorBelt", result: "cobaltArmorBelt" },
];

const COBALT_TIER_RECIPES = buildRecipe(
  COBALT_TIER_WEAPONS,
  "cobaltIngot",
  2,
  1,
  true,
  true,
);

const COBALT_TIER_OBJECTS = [
  { base: "platiniumHpRing", result: "cobaltHpRing" },
  { base: "platiniumStaminaRing", result: "cobaltStaminaRing" },
  { base: "platiniumManaRing", result: "cobaltManaRing" },
  { base: "platiniumHpNecklace", result: "cobaltHpNecklace" },
  { base: "platiniumStaminaNecklace", result: "cobaltStaminaNecklace" },
  { base: "platiniumManaNecklace", result: "cobaltManaNecklace" },
];

const COBALT_TIER_OBJECT_RECIPES = buildRecipe(
  COBALT_TIER_OBJECTS,
  "cobaltIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_COBALT_TIER_WEAPONS = [
  { base: "cobaltSword", result: "reinforcedCobaltSword" },
  { base: "cobaltSpear", result: "reinforcedCobaltSpear" },
  { base: "cobaltMallet", result: "reinforcedCobaltMallet" },
  { base: "cobaltShovel", result: "reinforcedCobaltShovel" },
  { base: "cobaltHammer", result: "reinforcedCobaltHammer" },
  { base: "cobaltSickle", result: "reinforcedCobaltSickle" },
  { base: "cobaltShield", result: "reinforcedCobaltShield" },
  { base: "cobaltStaff", result: "reinforcedCobaltStaff" },
  { base: "cobaltGreatShield", result: "reinforcedCobaltGreatShield" },
  { base: "cobaltArmor", result: "reinforcedCobaltArmor" },
  { base: "cobaltHelmet", result: "reinforcedCobaltHelmet" },
  { base: "cobaltArmorPants", result: "reinforcedCobaltArmorPants" },
  { base: "cobaltArmorBelt", result: "reinforcedCobaltArmorBelt" },
  { base: "cobaltDagger", result: "reinforcedCobaltDagger" },
  // ajoute toutes les autres paires cobalt -> cobalt renforcé ici
];

const REINFORCED_COBALT_TIER_RECIPES = buildRecipe(
  REINFORCED_COBALT_TIER_WEAPONS,
  "cobaltIngot",
  1,
  1,
  true,
  false,
);

const ADAMANTINE_TIER_WEAPONS = [
  { base: "cobaltSword", result: "adamantineSword" },
  { base: "cobaltSpear", result: "adamantineSpear" },
  { base: "cobaltMallet", result: "adamantineMallet" },
  { base: "cobaltShovel", result: "adamantineShovel" },
  { base: "cobaltHammer", result: "adamantineHammer" },
  { base: "cobaltSickle", result: "adamantineSickle" },
  { base: "cobaltShield", result: "adamantineShield" },
  { base: "cobaltPickaxe", result: "adamantinePickaxe" },
  { base: "cobaltAxe", result: "adamantineAxe" },
  { base: "cobaltGreatShield", result: "adamantineGreatShield" },
  { base: "cobaltStaff", result: "adamantineStaff" },
  { base: "cobaltArmor", result: "adamantineArmor" },
  { base: "cobaltHelmet", result: "adamantineHelmet" },
  { base: "cobaltArmorPants", result: "adamantineArmorPants" },
  { base: "cobaltArmorBelt", result: "adamantineArmorBelt" },
];

const ADAMANTINE_TIER_RECIPES = buildRecipe(
  ADAMANTINE_TIER_WEAPONS,
  "adamantineIngot",
  2,
  1,
  true,
  true,
);

const ADAMANTINE_TIER_OBJECTS = [
  { base: "cobaltHpRing", result: "adamantineHpRing" },
  { base: "cobaltStaminaRing", result: "adamantineStaminaRing" },
  { base: "cobaltManaRing", result: "adamantineManaRing" },
  { base: "cobaltHpNecklace", result: "adamantineHpNecklace" },
  { base: "cobaltStaminaNecklace", result: "adamantineStaminaNecklace" },
  { base: "cobaltManaNecklace", result: "adamantineManaNecklace" },
];

const ADAMANTINE_TIER_OBJECT_RECIPES = buildRecipe(
  ADAMANTINE_TIER_OBJECTS,
  "adamantineIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_ADAMANTINE_TIER_WEAPONS = [
  { base: "adamantineSword", result: "reinforcedAdamantineSword" },
  { base: "adamantineSpear", result: "reinforcedAdamantineSpear" },
  { base: "adamantineMallet", result: "reinforcedAdamantineMallet" },
  { base: "adamantineShovel", result: "reinforcedAdamantineShovel" },
  { base: "adamantineHammer", result: "reinforcedAdamantineHammer" },
  { base: "adamantineSickle", result: "reinforcedAdamantineSickle" },
  { base: "adamantineShield", result: "reinforcedAdamantineShield" },
  { base: "adamantineStaff", result: "reinforcedAdamantineStaff" },
  { base: "adamantineGreatShield", result: "reinforcedAdamantineGreatShield" },
  { base: "adamantineArmor", result: "reinforcedAdamantineArmor" },
  { base: "adamantineHelmet", result: "reinforcedAdamantineHelmet" },
  { base: "adamantineArmorPants", result: "reinforcedAdamantineArmorPants" },
  { base: "adamantineArmorBelt", result: "reinforcedAdamantineArmorBelt" },
  { base: "adamantineDagger", result: "reinforcedAdamantineDagger" },
  // ajoute toutes les autres paires adamantine -> adamantine renforcé ici
];

const REINFORCED_ADAMANTINE_TIER_RECIPES = buildRecipe(
  REINFORCED_ADAMANTINE_TIER_WEAPONS,
  "adamantineIngot",
  1,
  1,
  true,
  false,
);

const CRIMSON_TIER_WEAPONS = [
  { base: "adamantineSword", result: "crimsonSword" },
  { base: "adamantineSpear", result: "crimsonSpear" },
  { base: "adamantineMallet", result: "crimsonMallet" },
  { base: "adamantineShovel", result: "crimsonShovel" },
  { base: "adamantineHammer", result: "crimsonHammer" },
  { base: "adamantineSickle", result: "crimsonSickle" },
  { base: "adamantineShield", result: "crimsonShield" },
  { base: "adamantinePickaxe", result: "crimsonPickaxe" },
  { base: "adamantineAxe", result: "crimsonAxe" },
  { base: "adamantineStaff", result: "crimsonStaff" },
  { base: "adamantineGreatShield", result: "crimsonGreatShield" },
  { base: "adamantineArmor", result: "crimsonArmor" },
  { base: "adamantineHelmet", result: "crimsonHelmet" },
  { base: "adamantineArmorPants", result: "crimsonArmorPants" },
  { base: "adamantineArmorBelt", result: "crimsonArmorBelt" },
];

const CRIMSON_TIER_RECIPES = buildRecipe(
  CRIMSON_TIER_WEAPONS,
  "crimsonIngot",
  2,
  1,
  true,
  true,
);

const CRIMSON_TIER_OBJECTS = [
  { base: "adamantineHpRing", result: "crimsonHpRing" },
  { base: "adamantineStaminaRing", result: "crimsonStaminaRing" },
  { base: "adamantineManaRing", result: "crimsonManaRing" },
  { base: "adamantineHpNecklace", result: "crimsonHpNecklace" },
  { base: "adamantineStaminaNecklace", result: "crimsonStaminaNecklace" },
  { base: "adamantineManaNecklace", result: "crimsonManaNecklace" },
];

const CRIMSON_TIER_OBJECT_RECIPES = buildRecipe(
  CRIMSON_TIER_OBJECTS,
  "crimsonIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_CRIMSON_TIER_WEAPONS = [
  { base: "crimsonSword", result: "reinforcedCrimsonSword" },
  { base: "crimsonSpear", result: "reinforcedCrimsonSpear" },
  { base: "crimsonMallet", result: "reinforcedCrimsonMallet" },
  { base: "crimsonShovel", result: "reinforcedCrimsonShovel" },
  { base: "crimsonHammer", result: "reinforcedCrimsonHammer" },
  { base: "crimsonSickle", result: "reinforcedCrimsonSickle" },
  { base: "crimsonShield", result: "reinforcedCrimsonShield" },
  { base: "crimsonStaff", result: "reinforcedCrimsonStaff" },
  { base: "crimsonGreatShield", result: "reinforcedCrimsonGreatShield" },
  { base: "crimsonArmor", result: "reinforcedCrimsonArmor" },
  { base: "crimsonHelmet", result: "reinforcedCrimsonHelmet" },
  { base: "crimsonArmorPants", result: "reinforcedCrimsonArmorPants" },
  { base: "crimsonArmorBelt", result: "reinforcedCrimsonArmorBelt" },
  { base: "crimsonDagger", result: "reinforcedCrimsonDagger" },
  // ajoute toutes les autres paires crimson -> crimson renforcé ici
];

const REINFORCED_CRIMSON_TIER_RECIPES = buildRecipe(
  REINFORCED_CRIMSON_TIER_WEAPONS,
  "crimsonIngot",
  1,
  1,
  true,
  false,
);

const ANGELIC_TIER_WEAPONS = [
  { base: "crimsonSword", result: "angelicSword" },
  { base: "crimsonSpear", result: "angelicSpear" },
  { base: "crimsonMallet", result: "angelicMallet" },
  { base: "crimsonShovel", result: "angelicShovel" },
  { base: "crimsonHammer", result: "angelicHammer" },
  { base: "crimsonSickle", result: "angelicSickle" },
  { base: "crimsonShield", result: "angelicShield" },
  { base: "crimsonPickaxe", result: "angelicPickaxe" },
  { base: "crimsonAxe", result: "angelicAxe" },
  { base: "crimsonStaff", result: "angelicStaff" },
  { base: "crimsonGreatShield", result: "angelicGreatShield" },
  { base: "crimsonArmor", result: "angelicArmor" },
  { base: "crimsonHelmet", result: "angelicHelmet" },
  { base: "crimsonArmorPants", result: "angelicArmorPants" },
  { base: "crimsonArmorBelt", result: "angelicArmorBelt" },
];

const ANGELIC_TIER_RECIPES = buildRecipe(
  ANGELIC_TIER_WEAPONS,
  "angelicIngot",
  2,
  1,
  true,
  true,
);

const ANGELIC_TIER_OBJECTS = [
  { base: "crimsonHpRing", result: "angelicHpRing" },
  { base: "crimsonStaminaRing", result: "angelicStaminaRing" },
  { base: "crimsonManaRing", result: "angelicManaRing" },
  { base: "crimsonHpNecklace", result: "angelicHpNecklace" },
  { base: "crimsonStaminaNecklace", result: "angelicStaminaNecklace" },
  { base: "crimsonManaNecklace", result: "angelicManaNecklace" },
];

const ANGELIC_TIER_OBJECT_RECIPES = buildRecipe(
  ANGELIC_TIER_OBJECTS,
  "angelicIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_ANGELIC_TIER_WEAPONS = [
  { base: "angelicSword", result: "reinforcedAngelicSword" },
  { base: "angelicSpear", result: "reinforcedAngelicSpear" },
  { base: "angelicMallet", result: "reinforcedAngelicMallet" },
  { base: "angelicShovel", result: "reinforcedAngelicShovel" },
  { base: "angelicHammer", result: "reinforcedAngelicHammer" },
  { base: "angelicSickle", result: "reinforcedAngelicSickle" },
  { base: "angelicShield", result: "reinforcedAngelicShield" },
  { base: "angelicStaff", result: "reinforcedAngelicStaff" },
  { base: "angelicGreatShield", result: "reinforcedAngelicGreatShield" },
  { base: "angelicArmor", result: "reinforcedAngelicArmor" },
  { base: "angelicHelmet", result: "reinforcedAngelicHelmet" },
  { base: "angelicArmorPants", result: "reinforcedAngelicArmorPants" },
  { base: "angelicArmorBelt", result: "reinforcedAngelicArmorBelt" },
  { base: "angelicDagger", result: "reinforcedAngelicDagger" },
  // ajoute toutes les autres paires angelic -> angelic renforcé ici
];

const REINFORCED_ANGELIC_TIER_RECIPES = buildRecipe(
  REINFORCED_ANGELIC_TIER_WEAPONS,
  "angelicIngot",
  1,
  1,
  true,
  false,
);

const FATEFUL_TIER_WEAPONS = [
  { base: "angelicSword", result: "fatefulSword" },
  { base: "angelicSpear", result: "fatefulSpear" },
  { base: "angelicMallet", result: "fatefulMallet" },
  { base: "angelicShovel", result: "fatefulShovel" },
  { base: "angelicHammer", result: "fatefulHammer" },
  { base: "angelicSickle", result: "fatefulSickle" },
  { base: "angelicShield", result: "fatefulShield" },
  { base: "angelicPickaxe", result: "fatefulPickaxe" },
  { base: "angelicAxe", result: "fatefulAxe" },
  { base: "angelicStaff", result: "fatefulStaff" },
  { base: "angelicGreatShield", result: "fatefulGreatShield" },
  { base: "angelicArmor", result: "fatefulArmor" },
  { base: "angelicHelmet", result: "fatefulHelmet" },
  { base: "angelicArmorPants", result: "fatefulArmorPants" },
  { base: "angelicArmorBelt", result: "fatefulArmorBelt" },
];

const FATEFUL_TIER_RECIPES = buildRecipe(
  FATEFUL_TIER_WEAPONS,
  "fatefulIngot",
  2,
  1,
  true,
  true,
);

const FATEFUL_TIER_OBJECTS = [
  { base: "angelicHpRing", result: "fatefulHpRing" },
  { base: "angelicStaminaRing", result: "fatefulStaminaRing" },
  { base: "angelicManaRing", result: "fatefulManaRing" },
  { base: "angelicHpNecklace", result: "fatefulHpNecklace" },
  { base: "angelicStaminaNecklace", result: "fatefulStaminaNecklace" },
  { base: "angelicManaNecklace", result: "fatefulManaNecklace" },
];

const FATEFUL_TIER_OBJECT_RECIPES = buildRecipe(
  FATEFUL_TIER_OBJECTS,
  "fatefulIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_FATEFUL_TIER_WEAPONS = [
  { base: "fatefulSword", result: "reinforcedFatefulSword" },
  { base: "fatefulSpear", result: "reinforcedFatefulSpear" },
  { base: "fatefulMallet", result: "reinforcedFatefulMallet" },
  { base: "fatefulShovel", result: "reinforcedFatefulShovel" },
  { base: "fatefulHammer", result: "reinforcedFatefulHammer" },
  { base: "fatefulSickle", result: "reinforcedFatefulSickle" },
  { base: "fatefulShield", result: "reinforcedFatefulShield" },
  { base: "fatefulStaff", result: "reinforcedFatefulStaff" },
  { base: "fatefulGreatShield", result: "reinforcedFatefulGreatShield" },
  { base: "fatefulArmor", result: "reinforcedFatefulArmor" },
  { base: "fatefulHelmet", result: "reinforcedFatefulHelmet" },
  { base: "fatefulArmorPants", result: "reinforcedFatefulArmorPants" },
  { base: "fatefulArmorBelt", result: "reinforcedFatefulArmorBelt" },
  { base: "fatefulDagger", result: "reinforcedFatefulDagger" },
  // ajoute toutes les autres paires fateful -> fateful renforcé ici
];

const REINFORCED_FATEFUL_TIER_RECIPES = buildRecipe(
  REINFORCED_FATEFUL_TIER_WEAPONS,
  "fatefulIngot",
  1,
  1,
  true,
  false,
);

const NOVA_TIER_WEAPONS = [
  { base: "fatefulSword", result: "novaSword" },
  { base: "fatefulSpear", result: "novaSpear" },
  { base: "fatefulMallet", result: "novaMallet" },
  { base: "fatefulShovel", result: "novaShovel" },
  { base: "fatefulHammer", result: "novaHammer" },
  { base: "fatefulSickle", result: "novaSickle" },
  { base: "fatefulShield", result: "novaShield" },
  { base: "fatefulPickaxe", result: "novaPickaxe" },
  { base: "fatefulAxe", result: "novaAxe" },
  { base: "fatefulStaff", result: "novaStaff" },
  { base: "fatefulGreatShield", result: "novaGreatShield" },
  { base: "fatefulArmor", result: "novaArmor" },
  { base: "fatefulHelmet", result: "novaHelmet" },
  { base: "fatefulArmorPants", result: "novaArmorPants" },
  { base: "fatefulArmorBelt", result: "novaArmorBelt" },
];

const NOVA_TIER_RECIPES = buildRecipe(
  NOVA_TIER_WEAPONS,
  "novaIngot",
  2,
  1,
  true,
  true,
);

const NOVA_TIER_OBJECTS = [
  { base: "fatefulHpRing", result: "novaHpRing" },
  { base: "fatefulStaminaRing", result: "novaStaminaRing" },
  { base: "fatefulManaRing", result: "novaManaRing" },
  { base: "fatefulHpNecklace", result: "novaHpNecklace" },
  { base: "fatefulStaminaNecklace", result: "novaStaminaNecklace" },
  { base: "fatefulManaNecklace", result: "novaManaNecklace" },
];

const NOVA_TIER_OBJECT_RECIPES = buildRecipe(
  NOVA_TIER_OBJECTS,
  "novaIngot",
  1,
  1,
  true,
  true,
);

const REINFORCED_NOVA_TIER_WEAPONS = [
  { base: "novaSword", result: "reinforcedNovaSword" },
  { base: "novaSpear", result: "reinforcedNovaSpear" },
  { base: "novaMallet", result: "reinforcedNovaMallet" },
  { base: "novaShovel", result: "reinforcedNovaShovel" },
  { base: "novaHammer", result: "reinforcedNovaHammer" },
  { base: "novaSickle", result: "reinforcedNovaSickle" },
  { base: "novaShield", result: "reinforcedNovaShield" },
  { base: "novaStaff", result: "reinforcedNovaStaff" },
  { base: "novaGreatShield", result: "reinforcedNovaGreatShield" },
  { base: "novaArmor", result: "reinforcedNovaArmor" },
  { base: "novaHelmet", result: "reinforcedNovaHelmet" },
  { base: "novaArmorPants", result: "reinforcedNovaArmorPants" },
  { base: "novaArmorBelt", result: "reinforcedNovaArmorBelt" },
  // ajoute toutes les autres paires nova -> nova renforcé ici
];

const REINFORCED_NOVA_TIER_RECIPES = buildRecipe(
  REINFORCED_NOVA_TIER_WEAPONS,
  "novaIngot",
  1,
  1,
  true,
  false,
);

const SHARP_WEAPONS = [
  { base: "copperDagger", result: "sharpCopperDagger" },
  { base: "copperSword", result: "sharpCopperSword" },
  { base: "copperSpear", result: "sharpCopperSpear" },
  { base: "copperMallet", result: "sharpCopperMallet" },
  { base: "copperShovel", result: "sharpCopperShovel" },
  { base: "copperHammer", result: "sharpCopperHammer" },
  { base: "copperSickle", result: "sharpCopperSickle" },
  { base: "ironDagger", result: "sharpIronDagger" },
  { base: "ironSword", result: "sharpIronSword" },
  { base: "ironSpear", result: "sharpIronSpear" },
  { base: "ironMallet", result: "sharpIronMallet" },
  { base: "ironShovel", result: "sharpIronShovel" },
  { base: "ironHammer", result: "sharpIronHammer" },
  { base: "ironSickle", result: "sharpIronSickle" },
  { base: "steelDagger", result: "sharpSteelDagger" },
  { base: "steelSword", result: "sharpSteelSword" },
  { base: "steelSpear", result: "sharpSteelSpear" },
  { base: "steelMallet", result: "sharpSteelMallet" },
  { base: "steelShovel", result: "sharpSteelShovel" },
  { base: "steelHammer", result: "sharpSteelHammer" },
  { base: "steelSickle", result: "sharpSteelSickle" },
  { base: "silverDagger", result: "sharpSilverDagger" },
  { base: "silverSword", result: "sharpSilverSword" },
  { base: "silverSpear", result: "sharpSilverSpear" },
  { base: "silverMallet", result: "sharpSilverMallet" },
  { base: "silverShovel", result: "sharpSilverShovel" },
  { base: "silverHammer", result: "sharpSilverHammer" },
  { base: "silverSickle", result: "sharpSilverSickle" },
  { base: "goldDagger", result: "sharpGoldDagger" },
  { base: "goldSword", result: "sharpGoldSword" },
  { base: "goldSpear", result: "sharpGoldSpear" },
  { base: "goldMallet", result: "sharpGoldMallet" },
  { base: "goldShovel", result: "sharpGoldShovel" },
  { base: "goldHammer", result: "sharpGoldHammer" },
  { base: "goldSickle", result: "sharpGoldSickle" },
  { base: "platiniumDagger", result: "sharpPlatiniumDagger" },
  { base: "platiniumSword", result: "sharpPlatiniumSword" },
  { base: "platiniumSpear", result: "sharpPlatiniumSpear" },
  { base: "platiniumMallet", result: "sharpPlatiniumMallet" },
  { base: "platiniumShovel", result: "sharpPlatiniumShovel" },
  { base: "platiniumHammer", result: "sharpPlatiniumHammer" },
  { base: "platiniumSickle", result: "sharpPlatiniumSickle" },
  { base: "cobaltDagger", result: "sharpCobaltDagger" },
  { base: "cobaltSword", result: "sharpCobaltSword" },
  { base: "cobaltSpear", result: "sharpCobaltSpear" },
  { base: "cobaltMallet", result: "sharpCobaltMallet" },
  { base: "cobaltShovel", result: "sharpCobaltShovel" },
  { base: "cobaltHammer", result: "sharpCobaltHammer" },
  { base: "cobaltSickle", result: "sharpCobaltSickle" },
  { base: "adamantineDagger", result: "sharpAdamantineDagger" },
  { base: "adamantineSword", result: "sharpAdamantineSword" },
  { base: "adamantineSpear", result: "sharpAdamantineSpear" },
  { base: "adamantineMallet", result: "sharpAdamantineMallet" },
  { base: "adamantineShovel", result: "sharpAdamantineShovel" },
  { base: "adamantineHammer", result: "sharpAdamantineHammer" },
  { base: "adamantineSickle", result: "sharpAdamantineSickle" },
  { base: "crimsonDagger", result: "sharpCrimsonDagger" },
  { base: "crimsonSword", result: "sharpCrimsonSword" },
  { base: "crimsonSpear", result: "sharpCrimsonSpear" },
  { base: "crimsonMallet", result: "sharpCrimsonMallet" },
  { base: "crimsonShovel", result: "sharpCrimsonShovel" },
  { base: "crimsonHammer", result: "sharpCrimsonHammer" },
  { base: "crimsonSickle", result: "sharpCrimsonSickle" },
  { base: "angelicDagger", result: "sharpAngelicDagger" },
  { base: "angelicSword", result: "sharpAngelicSword" },
  { base: "angelicSpear", result: "sharpAngelicSpear" },
  { base: "angelicMallet", result: "sharpAngelicMallet" },
  { base: "angelicShovel", result: "sharpAngelicShovel" },
  { base: "angelicHammer", result: "sharpAngelicHammer" },
  { base: "angelicSickle", result: "sharpAngelicSickle" },
  { base: "fatefulDagger", result: "sharpFatefulDagger" },
  { base: "fatefulSword", result: "sharpFatefulSword" },
  { base: "fatefulSpear", result: "sharpFatefulSpear" },
  { base: "fatefulMallet", result: "sharpFatefulMallet" },
  { base: "fatefulShovel", result: "sharpFatefulShovel" },
  { base: "fatefulHammer", result: "sharpFatefulHammer" },
  { base: "fatefulSickle", result: "sharpFatefulSickle" },
  { base: "novaDagger", result: "sharpNovaDagger" },
  { base: "novaSword", result: "sharpNovaSword" },
  { base: "novaSpear", result: "sharpNovaSpear" },
  { base: "novaMallet", result: "sharpNovaMallet" },
  { base: "novaShovel", result: "sharpNovaShovel" },
  { base: "novaHammer", result: "sharpNovaHammer" },
  { base: "novaSickle", result: "sharpNovaSickle" },
];

const SHARPENING_RECIPES = buildRecipe(
  SHARP_WEAPONS,
  "whetstone",
  1,
  1,
  true,
  false,
);

const OAKWOOD_TIER_WEAPONS = [
  { base: "woodenBow", result: "oakBow" },
  { base: "woodenCrossbow", result: "oakCrossbow" },
  { base: "woodenStaff", result: "oakStaff" },
  { base: "woodenBuckler", result: "oakBuckler" },
];

const OAKWOOD_TIER_RECIPES = buildRecipe(
  OAKWOOD_TIER_WEAPONS,
  "oakWood",
  2,
  1,
  true,
  true,
);

const OAKWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "oakHpRing" },
  { base: "staminaRing", result: "oakStaminaRing" },
  { base: "manaRing", result: "oakManaRing" },
];

const OAKWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  OAKWOOD_TIER_OBJECTS,
  "oakWood",
  1,
  1,
  true,
  true,
);

const REINFORCED_OAKWOOD_TIER_WEAPONS = [
  { base: "oakBow", result: "reinforcedOakBow" },
  { base: "oakCrossbow", result: "reinforcedOakCrossbow" },
  { base: "oakStaff", result: "reinforcedOakStaff" },
  { base: "oakBuckler", result: "reinforcedOakBuckler" },
];

const REINFORCED_OAKWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_OAKWOOD_TIER_WEAPONS,
  "oakWood",
  1,
  1,
  true,
  false,
);

const ASHWOOD_TIER_WEAPONS = [
  { base: "oakBow", result: "ashBow" },
  { base: "oakCrossbow", result: "ashCrossbow" },
  { base: "oakStaff", result: "ashStaff" },
  { base: "oakBuckler", result: "ashBuckler" },
];

const ASHWOOD_TIER_RECIPES = buildRecipe(
  ASHWOOD_TIER_WEAPONS,
  "ashWood",
  2,
  1,
  true,
  true,
);

const ASHWOOD_TIER_OBJECTS = [
  { base: "oakHpRing", result: "ashHpRing" },
  { base: "oakStaminaRing", result: "ashStaminaRing" },
  { base: "oakManaRing", result: "ashManaRing" },
];

const ASHWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  ASHWOOD_TIER_OBJECTS,
  "ashWood",
  1,
  1,
  true,
  true,
);

const REINFORCED_ASHWOOD_TIER_WEAPONS = [
  { base: "ashBow", result: "reinforcedAshBow" },
  { base: "ashCrossbow", result: "reinforcedAshCrossbow" },
  { base: "ashStaff", result: "reinforcedAshStaff" },
  { base: "ashBuckler", result: "reinforcedAshBuckler" },
];

const REINFORCED_ASHWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_ASHWOOD_TIER_WEAPONS,
  "ashWood",
  1,
  1,
  true,
  false,
);

const YEWWOOD_TIER_WEAPONS = [
  { base: "ashBow", result: "yewBow" },
  { base: "ashCrossbow", result: "yewCrossbow" },
  { base: "ashStaff", result: "yewStaff" },
  { base: "ashBuckler", result: "yewBuckler" },
];

const YEWWOOD_TIER_RECIPES = buildRecipe(
  YEWWOOD_TIER_WEAPONS,
  "yewWood",
  2,
  1,
  true,
  true,
);

const YEWWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "yewHpRing" },
  { base: "staminaRing", result: "yewStaminaRing" },
  { base: "manaRing", result: "yewManaRing" },
];

const YEWWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  YEWWOOD_TIER_OBJECTS,
  "yewWood",
  1,
  1,
  true,
  true,
);

const REINFORCED_YEWWOOD_TIER_WEAPONS = [
  { base: "yewBow", result: "reinforcedYewBow" },
  { base: "yewCrossbow", result: "reinforcedYewCrossbow" },
  { base: "yewStaff", result: "reinforcedYewStaff" },
  { base: "yewBuckler", result: "reinforcedYewBuckler" },
];

const REINFORCED_YEWWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_YEWWOOD_TIER_WEAPONS,
  "yewWood",
  1,
  1,
  true,
  false,
);

const EBONYWOOD_TIER_WEAPONS = [
  { base: "yewBow", result: "ebonyBow" },
  { base: "yewCrossbow", result: "ebonyCrossbow" },
  { base: "yewStaff", result: "ebonyStaff" },
  { base: "yewBuckler", result: "ebonyBuckler" },
];

const EBONYWOOD_TIER_RECIPES = buildRecipe(
  EBONYWOOD_TIER_WEAPONS,
  "ebonyWood",
  2,
  1,
  true,
  true,
);

const EBONYWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "ebonyHpRing" },
  { base: "staminaRing", result: "ebonyStaminaRing" },
  { base: "manaRing", result: "ebonyManaRing" },
];

const EBONYWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  EBONYWOOD_TIER_OBJECTS,
  "ebonyWood",
  1,
  1,
  true,
  true,
);

const REINFORCED_EBONYWOOD_TIER_WEAPONS = [
  { base: "ebonyBow", result: "reinforcedEbonyBow" },
  { base: "ebonyCrossbow", result: "reinforcedEbonyCrossbow" },
  { base: "ebonyStaff", result: "reinforcedEbonyStaff" },
  { base: "ebonyBuckler", result: "reinforcedEbonyBuckler" },
];

const REINFORCED_EBONYWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_EBONYWOOD_TIER_WEAPONS,
  "ebonyWood",
  1,
  1,
  true,
  false,
);

const PETRIFIEDWOOD_TIER_WEAPONS = [
  { base: "ebonyBow", result: "petrifiedBow" },
  { base: "ebonyCrossbow", result: "petrifiedCrossbow" },
  { base: "ebonyStaff", result: "petrifiedStaff" },
  { base: "ebonyBuckler", result: "petrifiedBuckler" },
];

const PETRIFIEDWOOD_TIER_RECIPES = buildRecipe(
  PETRIFIEDWOOD_TIER_WEAPONS,
  "petrifiedWood",
  2,
  1,
  true,
  true,
);

const PETRIFIEDWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "petrifiedHpRing" },
  { base: "staminaRing", result: "petrifiedStaminaRing" },
  { base: "manaRing", result: "petrifiedManaRing" },
];

const PETRIFIEDWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  PETRIFIEDWOOD_TIER_OBJECTS,
  "petrifiedWood",
  1,
  1,
  true,
  true,
);

const REINFORCED_PETRIFIEDWOOD_TIER_WEAPONS = [
  { base: "petrifiedBow", result: "reinforcedPetrifiedBow" },
  { base: "petrifiedCrossbow", result: "reinforcedPetrifiedCrossbow" },
  { base: "petrifiedStaff", result: "reinforcedPetrifiedStaff" },
  { base: "petrifiedBuckler", result: "reinforcedPetrifiedBuckler" },
];

const REINFORCED_PETRIFIEDWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_PETRIFIEDWOOD_TIER_WEAPONS,
  "petrifiedWood",
  1,
  1,
  true,
  false,
);

const MISTWOOD_TIER_WEAPONS = [
  { base: "petrifiedBow", result: "mistwoodBow" },
  { base: "petrifiedCrossbow", result: "mistwoodCrossbow" },
  { base: "petrifiedStaff", result: "mistwoodStaff" },
  { base: "petrifiedBuckler", result: "mistwoodBuckler" },
];

const MISTWOOD_TIER_RECIPES = buildRecipe(
  MISTWOOD_TIER_WEAPONS,
  "mistwood",
  2,
  1,
  true,
  true,
);

const MISTWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "mistwoodHpRing" },
  { base: "staminaRing", result: "mistwoodStaminaRing" },
  { base: "manaRing", result: "mistwoodManaRing" },
];

const MISTWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  MISTWOOD_TIER_OBJECTS,
  "mistwood",
  1,
  1,
  true,
  true,
);

const REINFORCED_MISTWOOD_TIER_WEAPONS = [
  { base: "mistwoodBow", result: "reinforcedMistwoodBow" },
  { base: "mistwoodCrossbow", result: "reinforcedMistwoodCrossbow" },
  { base: "mistwoodStaff", result: "reinforcedMistwoodStaff" },
  { base: "mistwoodBuckler", result: "reinforcedMistwoodBuckler" },
];

const REINFORCED_MISTWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_MISTWOOD_TIER_WEAPONS,
  "mistwood",
  1,
  1,
  true,
  false,
);

const RUNEWOOD_TIER_WEAPONS = [
  { base: "mistwoodBow", result: "runewoodBow" },
  { base: "mistwoodCrossbow", result: "runewoodCrossbow" },
  { base: "mistwoodStaff", result: "runewoodStaff" },
  { base: "mistwoodBuckler", result: "runewoodBuckler" },
];

const RUNEWOOD_TIER_RECIPES = buildRecipe(
  RUNEWOOD_TIER_WEAPONS,
  "runewood",
  2,
  1,
  true,
  true,
);

const RUNEWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "runewoodHpRing" },
  { base: "staminaRing", result: "runewoodStaminaRing" },
  { base: "manaRing", result: "runewoodManaRing" },
];

const RUNEWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  RUNEWOOD_TIER_OBJECTS,
  "runewood",
  1,
  1,
  true,
  true,
);

const REINFORCED_RUNEWOOD_TIER_WEAPONS = [
  { base: "runewoodBow", result: "reinforcedRunewoodBow" },
  { base: "runewoodCrossbow", result: "reinforcedRunewoodCrossbow" },
  { base: "runewoodStaff", result: "reinforcedRunewoodStaff" },
  { base: "runewoodBuckler", result: "reinforcedRunewoodBuckler" },
];

const REINFORCED_RUNEWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_RUNEWOOD_TIER_WEAPONS,
  "runewood",
  1,
  1,
  true,
  false,
);

const SKYWOOD_TIER_WEAPONS = [
  { base: "runewoodBow", result: "skywoodBow" },
  { base: "runewoodCrossbow", result: "skywoodCrossbow" },
  { base: "runewoodStaff", result: "skywoodStaff" },
  { base: "runewoodBuckler", result: "skywoodBuckler" },
];

const SKYWOOD_TIER_RECIPES = buildRecipe(
  SKYWOOD_TIER_WEAPONS,
  "runewood",
  2,
  1,
  true,
  true,
);

const SKYWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "skywoodHpRing" },
  { base: "staminaRing", result: "skywoodStaminaRing" },
  { base: "manaRing", result: "skywoodManaRing" },
];

const SKYWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  SKYWOOD_TIER_OBJECTS,
  "runewood",
  1,
  1,
  true,
  true,
);

const REINFORCED_SKYWOOD_TIER_WEAPONS = [
  { base: "skywoodBow", result: "reinforcedSkywoodBow" },
  { base: "skywoodCrossbow", result: "reinforcedSkywoodCrossbow" },
  { base: "skywoodStaff", result: "reinforcedSkywoodStaff" },
  { base: "skywoodBuckler", result: "reinforcedSkywoodBuckler" },
];

const REINFORCED_SKYWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_SKYWOOD_TIER_WEAPONS,
  "runewood",
  1,
  1,
  true,
  false,
);

const SCARLETWOOD_TIER_WEAPONS = [
  { base: "skywoodBow", result: "scarletwoodBow" },
  { base: "skywoodCrossbow", result: "scarletwoodCrossbow" },
  { base: "skywoodStaff", result: "scarletwoodStaff" },
  { base: "skywoodBuckler", result: "scarletwoodBuckler" },
];

const SCARLETWOOD_TIER_RECIPES = buildRecipe(
  SCARLETWOOD_TIER_WEAPONS,
  "scarletwood",
  2,
  1,
  true,
  true,
);

const SCARLETWOOD_TIER_OBJECTS = [
  { base: "hpRing", result: "scarletwoodHpRing" },
  { base: "staminaRing", result: "scarletwoodStaminaRing" },
  { base: "manaRing", result: "scarletwoodManaRing" },
];

const SCARLETWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  SCARLETWOOD_TIER_OBJECTS,
  "scarletwood",
  1,
  1,
  true,
  true,
);

const REINFORCED_SCARLETWOOD_TIER_WEAPONS = [
  { base: "scarletwoodBow", result: "reinforcedScarletwoodBow" },
  { base: "scarletwoodCrossbow", result: "reinforcedScarletwoodCrossbow" },
  { base: "scarletwoodStaff", result: "reinforcedScarletwoodStaff" },
  { base: "scarletwoodBuckler", result: "reinforcedScarletwoodBuckler" },
];

const REINFORCED_SCARLETWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_SCARLETWOOD_TIER_WEAPONS,
  "scarletwood",
  1,
  1,
  true,
  false,
);

const SACREDWOOD_TIER_WEAPONS = [
  { base: "scarletwoodBow", result: "sacredBow" },
  { base: "scarletwoodCrossbow", result: "sacredCrossbow" },
  { base: "scarletwoodStaff", result: "sacredStaff" },
  { base: "scarletwoodBuckler", result: "sacredBuckler" },
];

const SACREDWOOD_TIER_RECIPES = buildRecipe(
  SACREDWOOD_TIER_WEAPONS,
  "sacredWood",
  2,
  1,
  true,
  true,
);

const SACREDWOOD_TIER_OBJECTS = [
  { base: "sacredHpRing", result: "sacredwoodHpRing" },
  { base: "sacredStaminaRing", result: "sacredwoodStaminaRing" },
  { base: "sacredManaRing", result: "sacredwoodManaRing" },
];

const SACREDWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  SACREDWOOD_TIER_OBJECTS,
  "sacredWood",
  2,
  1,
  true,
  true,
);

const REINFORCED_SACREDWOOD_TIER_WEAPONS = [
  { base: "sacredBow", result: "reinforcedSacredBow" },
  { base: "sacredCrossbow", result: "reinforcedSacredCrossbow" },
  { base: "sacredStaff", result: "reinforcedSacredStaff" },
  { base: "sacredBuckler", result: "reinforcedSacredBuckler" },
];

const REINFORCED_SACREDWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_SACREDWOOD_TIER_WEAPONS,
  "sacredWood",
  1,
  1,
  true,
  false,
);

const ETERNALWOOD_TIER_WEAPONS = [
  { base: "sacredBow", result: "eternalBow" },
  { base: "sacredCrossbow", result: "eternalCrossbow" },
  { base: "sacredStaff", result: "eternalStaff" },
  { base: "sacredBuckler", result: "eternalBuckler" },
];

const ETERNALWOOD_TIER_RECIPES = buildRecipe(
  ETERNALWOOD_TIER_WEAPONS,
  "eternalWood",
  2,
  1,
  true,
  true,
);

const ETERNALWOOD_TIER_OBJECTS = [
  { base: "eternalHpRing", result: "eternalwoodHpRing" },
  { base: "eternalStaminaRing", result: "eternalwoodStaminaRing" },
  { base: "eternalManaRing", result: "eternalwoodManaRing" },
];

const ETERNALWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  ETERNALWOOD_TIER_OBJECTS,
  "eternalWood",
  2,
  1,
  true,
  true,
);

const REINFORCED_ETERNALWOOD_TIER_WEAPONS = [
  { base: "eternalBow", result: "reinforcedEternalBow" },
  { base: "eternalCrossbow", result: "reinforcedEternalCrossbow" },
  { base: "eternalStaff", result: "reinforcedEternalStaff" },
  { base: "eternalBuckler", result: "reinforcedEternalBuckler" },
];

const REINFORCED_ETERNALWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_ETERNALWOOD_TIER_WEAPONS,
  "eternalWood",
  1,
  1,
  true,
  false,
);

const STARWOOD_TIER_WEAPONS = [
  { base: "eternalBow", result: "starwoodBow" },
  { base: "eternalCrossbow", result: "starwoodCrossbow" },
  { base: "eternalStaff", result: "starwoodStaff" },
  { base: "eternalBuckler", result: "starwoodBuckler" },
];

const STARWOOD_TIER_RECIPES = buildRecipe(
  STARWOOD_TIER_WEAPONS,
  "starwood",
  2,
  1,
  true,
  true,
);

const STARWOOD_TIER_OBJECTS = [
  { base: "starwoodHpRing", result: "starwoodHpRing" },
  { base: "starwoodStaminaRing", result: "starwoodStaminaRing" },
  { base: "starwoodManaRing", result: "starwoodManaRing" },
];

const STARWOOD_TIER_OBJECT_RECIPES = buildRecipe(
  STARWOOD_TIER_OBJECTS,
  "starwood",
  2,
  1,
  true,
  true,
);

const REINFORCED_STARWOOD_TIER_WEAPONS = [
  { base: "starwoodBow", result: "reinforcedStarwoodBow" },
  { base: "starwoodCrossbow", result: "reinforcedStarwoodCrossbow" },
  { base: "starwoodStaff", result: "reinforcedStarwoodStaff" },
  { base: "starwoodBuckler", result: "reinforcedStarwoodBuckler" },
];

const REINFORCED_STARWOOD_TIER_RECIPES = buildRecipe(
  REINFORCED_STARWOOD_TIER_WEAPONS,
  "starwood",
  1,
  1,
  true,
  false,
);

const REINFORCED_FURTUFT_TIER_ARMORS = [
  { base: "mageRobe", result: "reinforcedMageRobe" },
  { base: "leatherArmor", result: "reinforcedLeatherArmor" },
  { base: "boots", result: "reinforcedBoots" },
  { base: "mageHat", result: "reinforcedMageHat" },
  { base: "leatherHelmet", result: "reinforcedLeatherHelmet" },
  { base: "pants", result: "reinforcedPants" },
  { base: "belt", result: "reinforcedBelt" },
];

const REINFORCED_FURTUFT_TIER_RECIPES = buildRecipe(
  REINFORCED_FURTUFT_TIER_ARMORS,
  "furTuft",
  1,
  1,
  true,
  false,
);

const SLIMEBLOB_TIERS = [
  { base: "mageRobe", result: "slimeBlobMageRobe" },
  { base: "leatherArmor", result: "slimeBlobLeatherArmor" },
  { base: "boots", result: "slimeBlobBoots" },
  { base: "mageHat", result: "slimeBlobMageHat" },
  { base: "leatherHelmet", result: "slimeBlobLeatherHelmet" },
  { base: "pants", result: "slimeBlobPants" },
  { base: "belt", result: "slimeBlobBelt" },
];

const SLIMEBLOB_TIER_RECIPES = buildRecipe(
  SLIMEBLOB_TIERS,
  "slimeBlob",
  2,
  1,
  true,
  true,
);

const SLIMEBLOB_TIER_OBJECTS = [
  { base: "hpNecklace", result: "slimeBlobHpNecklace" },
  { base: "staminaNecklace", result: "slimeBlobStaminaNecklace" },
  { base: "manaNecklace", result: "slimeBlobManaNecklace" },
];

const SLIMEBLOB_TIER_OBJECT_RECIPES = buildRecipe(
  SLIMEBLOB_TIER_OBJECTS,
  "slimeBlob",
  1,
  1,
  true,
  true,
);

const REINFORCED_SLIMEBLOB_TIER_ARMOR = [
  { base: "slimeBlobMageRobe", result: "reinforcedSlimeBlobMageRobe" },
  { base: "slimeBlobLeatherArmor", result: "reinforcedSlimeBlobLeatherArmor" },
  { base: "slimeBlobBoots", result: "reinforcedSlimeBlobBoots" },
  { base: "slimeBlobMageHat", result: "reinforcedSlimeBlobMageHat" },
  {
    base: "slimeBlobLeatherHelmet",
    result: "reinforcedSlimeBlobLeatherHelmet",
  },
  { base: "slimeBlobPants", result: "reinforcedSlimeBlobPants" },
  { base: "slimeBlobBelt", result: "reinforcedSlimeBlobBelt" },
];

const REINFORCED_SLIMEBLOB_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_SLIMEBLOB_TIER_ARMOR,
  "slimeBlob",
  1,
  1,
  true,
  false,
);

const BEAR_PELT_TIERS = [
  { base: "slimeBlobMageRobe", result: "bearPeltMageRobe" },
  { base: "slimeBlobLeatherArmor", result: "bearPeltLeatherArmor" },
  { base: "slimeBlobBoots", result: "bearPeltBoots" },
  { base: "slimeBlobMageHat", result: "bearPeltMageHat" },
  { base: "slimeBlobLeatherHelmet", result: "bearPeltLeatherHelmet" },
  { base: "slimeBlobPants", result: "bearPeltPants" },
  { base: "slimeBlobBelt", result: "bearPeltBelt" },
];

const BEAR_PELT_TIER_RECIPES = buildRecipe(
  BEAR_PELT_TIERS,
  "bearPelt",
  2,
  1,
  true,
  true,
);

const BEAR_PELT_TIER_OBJECTS = [
  { base: "slimeBlobHpNecklace", result: "bearPeltHpNecklace" },
  { base: "slimeBlobStaminaNecklace", result: "bearPeltStaminaNecklace" },
  { base: "slimeBlobManaNecklace", result: "bearPeltManaNecklace" },
];

const BEAR_PELT_TIER_OBJECT_RECIPES = buildRecipe(
  BEAR_PELT_TIER_OBJECTS,
  "bearPelt",
  1,
  1,
  true,
  true,
);

const REINFORCED_BEAR_PELT_TIERS_ARMOR = [
  { base: "bearPeltMageRobe", result: "reinforcedBearPeltMageRobe" },
  { base: "bearPeltLeatherArmor", result: "reinforcedBearPeltLeatherArmor" },
  { base: "bearPeltBoots", result: "reinforcedBearPeltBoots" },
  { base: "bearPeltMageHat", result: "reinforcedBearPeltMageHat" },
  { base: "bearPeltLeatherHelmet", result: "reinforcedBearPeltLeatherHelmet" },
  { base: "bearPeltPants", result: "reinforcedBearPeltPants" },
  { base: "bearPeltBelt", result: "reinforcedBearPeltBelt" },
];
const REINFORCED_BEAR_PELT_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_BEAR_PELT_TIERS_ARMOR,
  "bearPelt",
  1,
  1,
  true,
  false,
);

const SPIDER_LEG_TIERS = [
  { base: "bearPeltMageRobe", result: "spiderLegMageRobe" },
  { base: "bearPeltLeatherArmor", result: "spiderLegLeatherArmor" },
  { base: "bearPeltBoots", result: "spiderLegBoots" },
  { base: "bearPeltMageHat", result: "spiderLegMageHat" },
  { base: "bearPeltLeatherHelmet", result: "spiderLegLeatherHelmet" },
  { base: "bearPeltPants", result: "spiderLegPants" },
  { base: "bearPeltBelt", result: "spiderLegBelt" },
];

const SPIDER_LEG_TIER_RECIPES = buildRecipe(
  SPIDER_LEG_TIERS,
  "spiderLeg",
  2,
  1,
  true,
  true,
);

const SPIDER_LEG_TIER_OBJECTS = [
  { base: "bearPeltHpNecklace", result: "spiderLegHpNecklace" },
  { base: "bearPeltStaminaNecklace", result: "spiderLegStaminaNecklace" },
  { base: "bearPeltManaNecklace", result: "spiderLegManaNecklace" },
];

const SPIDER_LEG_TIER_OBJECT_RECIPES = buildRecipe(
  SPIDER_LEG_TIER_OBJECTS,
  "spiderLeg",
  1,
  1,
  true,
  true,
);

const REINFORCED_SPIDER_LEG_TIERS_ARMOR = [
  { base: "spiderLegMageRobe", result: "reinforcedSpiderLegMageRobe" },
  { base: "spiderLegLeatherArmor", result: "reinforcedSpiderLegLeatherArmor" },
  { base: "spiderLegBoots", result: "reinforcedSpiderLegBoots" },
  { base: "spiderLegMageHat", result: "reinforcedSpiderLegMageHat" },
  {
    base: "spiderLegLeatherHelmet",
    result: "reinforcedSpiderLegLeatherHelmet",
  },
  { base: "spiderLegPants", result: "reinforcedSpiderLegPants" },
  { base: "spiderLegBelt", result: "reinforcedSpiderLegBelt" },
];

const REINFORCED_SPIDER_LEG_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_SPIDER_LEG_TIERS_ARMOR,
  "spiderLeg",
  1,
  1,
  true,
  false,
);

const GREY_MONSTER_SCALE_TIERS = [
  { base: "spiderLegMageRobe", result: "greyMonsterScaleMageRobe" },
  { base: "spiderLegLeatherArmor", result: "greyMonsterScaleLeatherArmor" },
  { base: "spiderLegBoots", result: "greyMonsterScaleBoots" },
  { base: "spiderLegMageHat", result: "greyMonsterScaleMageHat" },
  { base: "spiderLegLeatherHelmet", result: "greyMonsterScaleLeatherHelmet" },
  { base: "spiderLegPants", result: "greyMonsterScalePants" },
  { base: "spiderLegBelt", result: "greyMonsterScaleBelt" },
];

const GREY_MONSTER_SCALE_TIER_RECIPES = buildRecipe(
  GREY_MONSTER_SCALE_TIERS,
  "greyMonsterScale",
  2,
  1,
  true,
  true,
);

const GREY_MONSTER_SCALE_TIER_OBJECTS = [
  { base: "spiderLegHpNecklace", result: "greyMonsterScaleHpNecklace" },
  {
    base: "spiderLegStaminaNecklace",
    result: "greyMonsterScaleStaminaNecklace",
  },
  { base: "spiderLegManaNecklace", result: "greyMonsterScaleManaNecklace" },
];

const GREY_MONSTER_SCALE_TIER_OBJECT_RECIPES = buildRecipe(
  GREY_MONSTER_SCALE_TIER_OBJECTS,
  "greyMonsterScale",
  1,
  1,
  true,
  true,
);

const REINFORCED_GREY_MONSTER_SCALE_TIERS_ARMOR = [
  {
    base: "greyMonsterScaleMageRobe",
    result: "reinforcedGreyMonsterScaleMageRobe",
  },
  {
    base: "greyMonsterScaleLeatherArmor",
    result: "reinforcedGreyMonsterScaleLeatherArmor",
  },
  { base: "greyMonsterScaleBoots", result: "reinforcedGreyMonsterScaleBoots" },
  {
    base: "greyMonsterScaleMageHat",
    result: "reinforcedGreyMonsterScaleMageHat",
  },
  {
    base: "greyMonsterScaleLeatherHelmet",
    result: "reinforcedGreyMonsterScaleLeatherHelmet",
  },
  { base: "greyMonsterScalePants", result: "reinforcedGreyMonsterScalePants" },
  { base: "greyMonsterScaleBelt", result: "reinforcedGreyMonsterScaleBelt" },
];

const REINFORCED_GREY_MONSTER_SCALE_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_GREY_MONSTER_SCALE_TIERS_ARMOR,
  "greyMonsterScale",
  1,
  1,
  true,
  false,
);

const CRAB_CLAW_TIERS = [
  { base: "greyMonsterScaleMageRobe", result: "crabClawMageRobe" },
  { base: "greyMonsterScaleLeatherArmor", result: "crabClawLeatherArmor" },
  { base: "greyMonsterScaleBoots", result: "crabClawBoots" },
  { base: "greyMonsterScaleMageHat", result: "crabClawMageHat" },
  { base: "greyMonsterScaleLeatherHelmet", result: "crabClawLeatherHelmet" },
  { base: "greyMonsterScalePants", result: "crabClawPants" },
  { base: "greyMonsterScaleBelt", result: "crabClawBelt" },
];

const CRAB_CLAW_TIER_RECIPES = buildRecipe(
  CRAB_CLAW_TIERS,
  "crabClaw",
  2,
  1,
  true,
  true,
);

const CRAB_CLAW_TIER_OBJECTS = [
  { base: "greyMonsterScaleHpNecklace", result: "crabClawHpNecklace" },
  {
    base: "greyMonsterScaleStaminaNecklace",
    result: "crabClawStaminaNecklace",
  },
  { base: "greyMonsterScaleManaNecklace", result: "crabClawManaNecklace" },
];

const CRAB_CLAW_TIER_OBJECT_RECIPES = buildRecipe(
  CRAB_CLAW_TIER_OBJECTS,
  "crabClaw",
  1,
  1,
  true,
  true,
);

const REINFORCED_CRAB_CLAW_TIERS_ARMOR = [
  { base: "crabClawMageRobe", result: "reinforcedCrabClawMageRobe" },
  { base: "crabClawLeatherArmor", result: "reinforcedCrabClawLeatherArmor" },
  { base: "crabClawBoots", result: "reinforcedCrabClawBoots" },
  { base: "crabClawMageHat", result: "reinforcedCrabClawMageHat" },
  { base: "crabClawLeatherHelmet", result: "reinforcedCrabClawLeatherHelmet" },
  { base: "crabClawPants", result: "reinforcedCrabClawPants" },
  { base: "crabClawBelt", result: "reinforcedCrabClawBelt" },
];

const REINFORCED_CRAB_CLAW_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_CRAB_CLAW_TIERS_ARMOR,
  "crabClaw",
  1,
  1,
  true,
  false,
);

const BLACK_BEAR_PELT_TIERS = [
  { base: "crabClawMageRobe", result: "blackBearPeltMageRobe" },
  { base: "crabClawLeatherArmor", result: "blackBearPeltLeatherArmor" },
  { base: "crabClawBoots", result: "blackBearPeltBoots" },
  { base: "crabClawMageHat", result: "blackBearPeltMageHat" },
  { base: "crabClawLeatherHelmet", result: "blackBearPeltLeatherHelmet" },
  { base: "crabClawPants", result: "blackBearPeltPants" },
  { base: "crabClawBelt", result: "blackBearPeltBelt" },
];

const BLACK_BEAR_PELT_TIER_RECIPES = buildRecipe(
  BLACK_BEAR_PELT_TIERS,
  "blackBearPelt",
  2,
  1,
  true,
  true,
);

const BLACK_BEAR_PELT_TIER_OBJECTS = [
  { base: "crabClawHpNecklace", result: "blackBearPeltHpNecklace" },
  { base: "crabClawStaminaNecklace", result: "blackBearPeltStaminaNecklace" },
  { base: "crabClawManaNecklace", result: "blackBearPeltManaNecklace" },
];

const BLACK_BEAR_PELT_TIER_OBJECT_RECIPES = buildRecipe(
  BLACK_BEAR_PELT_TIER_OBJECTS,
  "blackBearPelt",
  1,
  1,
  true,
  true,
);

const REINFORCED_BLACK_BEAR_PELT_TIERS_ARMOR = [
  { base: "blackBearPeltMageRobe", result: "reinforcedBlackBearPeltMageRobe" },
  {
    base: "blackBearPeltLeatherArmor",
    result: "reinforcedBlackBearPeltLeatherArmor",
  },
  { base: "blackBearPeltBoots", result: "reinforcedBlackBearPeltBoots" },
  { base: "blackBearPeltMageHat", result: "reinforcedBlackBearPeltMageHat" },
  {
    base: "blackBearPeltLeatherHelmet",
    result: "reinforcedBlackBearPeltLeatherHelmet",
  },
  { base: "blackBearPeltPants", result: "reinforcedBlackBearPeltPants" },
  { base: "blackBearPeltBelt", result: "reinforcedBlackBearPeltBelt" },
];

const REINFORCED_BLACK_BEAR_PELT_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_BLACK_BEAR_PELT_TIERS_ARMOR,
  "blackBearPelt",
  1,
  1,
  true,
  false,
);

const TURTLE_SHELL_TIERS = [
  { base: "blackBearPeltMageRobe", result: "turtleShellMageRobe" },
  { base: "blackBearPeltLeatherArmor", result: "turtleShellLeatherArmor" },
  { base: "blackBearPeltBoots", result: "turtleShellBoots" },
  { base: "blackBearPeltMageHat", result: "turtleShellMageHat" },
  { base: "blackBearPeltLeatherHelmet", result: "turtleShellLeatherHelmet" },
  { base: "blackBearPeltPants", result: "turtleShellPants" },
  { base: "blackBearPeltBelt", result: "turtleShellBelt" },
];

const TURTLE_SHELL_TIER_RECIPES = buildRecipe(
  TURTLE_SHELL_TIERS,
  "turtleShell",
  2,
  1,
  true,
  true,
);

const TURTLE_SHELL_TIER_OBJECTS = [
  { base: "blackBearPeltHpNecklace", result: "turtleShellHpNecklace" },
  {
    base: "blackBearPeltStaminaNecklace",
    result: "turtleShellStaminaNecklace",
  },
  { base: "blackBearPeltManaNecklace", result: "turtleShellManaNecklace" },
];

const TURTLE_SHELL_TIER_OBJECT_RECIPES = buildRecipe(
  TURTLE_SHELL_TIER_OBJECTS,
  "turtleShell",
  1,
  1,
  true,
  true,
);

const REINFORCED_TURTLE_SHELL_TIERS_ARMOR = [
  { base: "turtleShellMageRobe", result: "reinforcedTurtleShellMageRobe" },
  {
    base: "turtleShellLeatherArmor",
    result: "reinforcedTurtleShellLeatherArmor",
  },
  { base: "turtleShellBoots", result: "reinforcedTurtleShellBoots" },
  { base: "turtleShellMageHat", result: "reinforcedTurtleShellMageHat" },
  {
    base: "turtleShellLeatherHelmet",
    result: "reinforcedTurtleShellLeatherHelmet",
  },
  { base: "turtleShellPants", result: "reinforcedTurtleShellPants" },
  { base: "turtleShellBelt", result: "reinforcedTurtleShellBelt" },
];

const REINFORCED_TURTLE_SHELL_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_TURTLE_SHELL_TIERS_ARMOR,
  "turtleShell",
  1,
  1,
  true,
  false,
);

const GREEN_MONSTER_SCALE_TIERS = [
  { base: "turtleShellMageRobe", result: "greenMonsterScaleMageRobe" },
  { base: "turtleShellLeatherArmor", result: "greenMonsterScaleLeatherArmor" },
  { base: "turtleShellBoots", result: "greenMonsterScaleBoots" },
  { base: "turtleShellMageHat", result: "greenMonsterScaleMageHat" },
  {
    base: "turtleShellLeatherHelmet",
    result: "greenMonsterScaleLeatherHelmet",
  },
  { base: "turtleShellPants", result: "greenMonsterScalePants" },
  { base: "turtleShellBelt", result: "greenMonsterScaleBelt" },
];

const GREEN_MONSTER_SCALE_TIER_RECIPES = buildRecipe(
  GREEN_MONSTER_SCALE_TIERS,
  "greenMonsterScale",
  2,
  1,
  true,
  true,
);

const GREEN_MONSTER_SCALE_TIER_OBJECTS = [
  { base: "turtleShellHpNecklace", result: "greenMonsterScaleHpNecklace" },
  {
    base: "turtleShellStaminaNecklace",
    result: "greenMonsterScaleStaminaNecklace",
  },
  { base: "turtleShellManaNecklace", result: "greenMonsterScaleManaNecklace" },
];

const GREEN_MONSTER_SCALE_TIER_OBJECT_RECIPES = buildRecipe(
  GREEN_MONSTER_SCALE_TIER_OBJECTS,
  "greenMonsterScale",
  1,
  1,
  true,
  true,
);

const REINFORCED_GREEN_MONSTER_SCALE_TIERS_ARMOR = [
  {
    base: "greenMonsterScaleMageRobe",
    result: "reinforcedGreenMonsterScaleMageRobe",
  },
  {
    base: "greenMonsterScaleLeatherArmor",
    result: "reinforcedGreenMonsterScaleLeatherArmor",
  },
  {
    base: "greenMonsterScaleBoots",
    result: "reinforcedGreenMonsterScaleBoots",
  },
  {
    base: "greenMonsterScaleMageHat",
    result: "reinforcedGreenMonsterScaleMageHat",
  },
  {
    base: "greenMonsterScaleLeatherHelmet",
    result: "reinforcedGreenMonsterScaleLeatherHelmet",
  },
  {
    base: "greenMonsterScalePants",
    result: "reinforcedGreenMonsterScalePants",
  },
  { base: "greenMonsterScaleBelt", result: "reinforcedGreenMonsterScaleBelt" },
];

const REINFORCED_GREEN_MONSTER_SCALE_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_GREEN_MONSTER_SCALE_TIERS_ARMOR,
  "greenMonsterScale",
  1,
  1,
  true,
  false,
);

const BAT_WINGS_TIERS = [
  { base: "greenMonsterScaleMageRobe", result: "batWingsMageRobe" },
  { base: "greenMonsterScaleLeatherArmor", result: "batWingsLeatherArmor" },
  { base: "greenMonsterScaleBoots", result: "batWingsBoots" },
  { base: "greenMonsterScaleMageHat", result: "batWingsMageHat" },
  { base: "greenMonsterScaleLeatherHelmet", result: "batWingsLeatherHelmet" },
  { base: "greenMonsterScalePants", result: "batWingsPants" },
  { base: "greenMonsterScaleBelt", result: "batWingsBelt" },
];

const BAT_WINGS_TIER_RECIPES = buildRecipe(
  BAT_WINGS_TIERS,
  "batWings",
  2,
  1,
  true,
  true,
);

const BAT_WINGS_TIER_OBJECTS = [
  { base: "greenMonsterScaleHpNecklace", result: "batWingsHpNecklace" },
  {
    base: "greenMonsterScaleStaminaNecklace",
    result: "batWingsStaminaNecklace",
  },
  { base: "greenMonsterScaleManaNecklace", result: "batWingsManaNecklace" },
];

const BAT_WINGS_TIER_OBJECT_RECIPES = buildRecipe(
  BAT_WINGS_TIER_OBJECTS,
  "batWings",
  1,
  1,
  true,
  true,
);

const REINFORCED_BAT_WINGS_TIERS_ARMOR = [
  { base: "batWingsMageRobe", result: "reinforcedBatWingsMageRobe" },
  { base: "batWingsLeatherArmor", result: "reinforcedBatWingsLeatherArmor" },
  { base: "batWingsBoots", result: "reinforcedBatWingsBoots" },
  { base: "batWingsMageHat", result: "reinforcedBatWingsMageHat" },
  { base: "batWingsLeatherHelmet", result: "reinforcedBatWingsLeatherHelmet" },
  { base: "batWingsPants", result: "reinforcedBatWingsPants" },
  { base: "batWingsBelt", result: "reinforcedBatWingsBelt" },
];

const REINFORCED_BAT_WINGS_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_BAT_WINGS_TIERS_ARMOR,
  "batWings",
  1,
  1,
  true,
  false,
);

const DRAGON_SCALE_TIERS = [
  { base: "batWingsMageRobe", result: "dragonScaleMageRobe" },
  { base: "batWingsLeatherArmor", result: "dragonScaleLeatherArmor" },
  { base: "batWingsBoots", result: "dragonScaleBoots" },
  { base: "batWingsMageHat", result: "dragonScaleMageHat" },
  { base: "batWingsLeatherHelmet", result: "dragonScaleLeatherHelmet" },
  { base: "batWingsPants", result: "dragonScalePants" },
  { base: "batWingsBelt", result: "dragonScaleBelt" },
];

const DRAGON_SCALE_TIER_RECIPES = buildRecipe(
  DRAGON_SCALE_TIERS,
  "dragonScale",
  2,
  1,
  true,
  true,
);

const DRAGON_SCALE_TIER_OBJECTS = [
  { base: "batWingsHpNecklace", result: "dragonScaleHpNecklace" },
  { base: "batWingsStaminaNecklace", result: "dragonScaleStaminaNecklace" },
  { base: "batWingsManaNecklace", result: "dragonScaleManaNecklace" },
];

const DRAGON_SCALE_TIER_OBJECT_RECIPES = buildRecipe(
  DRAGON_SCALE_TIER_OBJECTS,
  "dragonScale",
  1,
  1,
  true,
  true,
);

const REINFORCED_DRAGON_SCALE_TIERS_ARMOR = [
  { base: "dragonScaleMageRobe", result: "reinforcedDragonScaleMageRobe" },
  {
    base: "dragonScaleLeatherArmor",
    result: "reinforcedDragonScaleLeatherArmor",
  },
  { base: "dragonScaleBoots", result: "reinforcedDragonScaleBoots" },
  { base: "dragonScaleMageHat", result: "reinforcedDragonScaleMageHat" },
  {
    base: "dragonScaleLeatherHelmet",
    result: "reinforcedDragonScaleLeatherHelmet",
  },
  { base: "dragonScalePants", result: "reinforcedDragonScalePants" },
  { base: "dragonScaleBelt", result: "reinforcedDragonScaleBelt" },
];

const REINFORCED_DRAGON_SCALE_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_DRAGON_SCALE_TIERS_ARMOR,
  "dragonScale",
  1,
  1,
  true,
  false,
);

const GHOST_ECTOPLASM_TIERS = [
  { base: "dragonScaleMageRobe", result: "ghostEctoplasmMageRobe" },
  { base: "dragonScaleLeatherArmor", result: "ghostEctoplasmLeatherArmor" },
  { base: "dragonScaleBoots", result: "ghostEctoplasmBoots" },
  { base: "dragonScaleMageHat", result: "ghostEctoplasmMageHat" },
  { base: "dragonScaleLeatherHelmet", result: "ghostEctoplasmLeatherHelmet" },
  { base: "dragonScalePants", result: "ghostEctoplasmPants" },
  { base: "dragonScaleBelt", result: "ghostEctoplasmBelt" },
];

const GHOST_ECTOPLASM_TIER_RECIPES = buildRecipe(
  GHOST_ECTOPLASM_TIERS,
  "ghostEctoplasm",
  2,
  1,
  true,
  true,
);

const GHOST_ECTOPLASM_TIER_OBJECTS = [
  { base: "dragonScaleHpNecklace", result: "ghostEctoplasmHpNecklace" },
  {
    base: "dragonScaleStaminaNecklace",
    result: "ghostEctoplasmStaminaNecklace",
  },
  { base: "dragonScaleManaNecklace", result: "ghostEctoplasmManaNecklace" },
];

const GHOST_ECTOPLASM_TIER_OBJECT_RECIPES = buildRecipe(
  GHOST_ECTOPLASM_TIER_OBJECTS,
  "ghostEctoplasm",
  1,
  1,
  true,
  true,
);

const REINFORCED_GHOST_ECTOPLASM_TIERS_ARMOR = [
  {
    base: "ghostEctoplasmMageRobe",
    result: "reinforcedGhostEctoplasmMageRobe",
  },
  {
    base: "ghostEctoplasmLeatherArmor",
    result: "reinforcedGhostEctoplasmLeatherArmor",
  },
  { base: "ghostEctoplasmBoots", result: "reinforcedGhostEctoplasmBoots" },
  { base: "ghostEctoplasmMageHat", result: "reinforcedGhostEctoplasmMageHat" },
  {
    base: "ghostEctoplasmLeatherHelmet",
    result: "reinforcedGhostEctoplasmLeatherHelmet",
  },
  { base: "ghostEctoplasmPants", result: "reinforcedGhostEctoplasmPants" },
  { base: "ghostEctoplasmBelt", result: "reinforcedGhostEctoplasmBelt" },
];

const REINFORCED_GHOST_ECTOPLASM_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_GHOST_ECTOPLASM_TIERS_ARMOR,
  "ghostEctoplasm",
  1,
  1,
  true,
  false,
);

const MONSTER_CORE_TIERS = [
  { base: "ghostEctoplasmMageRobe", result: "monsterCoreMageRobe" },
  { base: "ghostEctoplasmLeatherArmor", result: "monsterCoreLeatherArmor" },
  { base: "ghostEctoplasmBoots", result: "monsterCoreBoots" },
  { base: "ghostEctoplasmMageHat", result: "monsterCoreMageHat" },
  { base: "ghostEctoplasmLeatherHelmet", result: "monsterCoreLeatherHelmet" },
  { base: "ghostEctoplasmPants", result: "monsterCorePants" },
  { base: "ghostEctoplasmBelt", result: "monsterCoreBelt" },
];

const MONSTER_CORE_TIER_RECIPES = buildRecipe(
  MONSTER_CORE_TIERS,
  "monsterCore",
  2,
  1,
  true,
  true,
);

const MONSTER_CORE_TIER_OBJECTS = [
  { base: "ghostEctoplasmHpNecklace", result: "monsterCoreHpNecklace" },
  {
    base: "ghostEctoplasmStaminaNecklace",
    result: "monsterCoreStaminaNecklace",
  },
  { base: "ghostEctoplasmManaNecklace", result: "monsterCoreManaNecklace" },
];

const MONSTER_CORE_TIER_OBJECT_RECIPES = buildRecipe(
  MONSTER_CORE_TIER_OBJECTS,
  "monsterCore",
  1,
  1,
  true,
  true,
);

const REINFORCED_MONSTER_CORE_TIERS_ARMOR = [
  { base: "monsterCoreMageRobe", result: "reinforcedMonsterCoreMageRobe" },
  {
    base: "monsterCoreLeatherArmor",
    result: "reinforcedMonsterCoreLeatherArmor",
  },
  { base: "monsterCoreBoots", result: "reinforcedMonsterCoreBoots" },
  { base: "monsterCoreMageHat", result: "reinforcedMonsterCoreMageHat" },
  {
    base: "monsterCoreLeatherHelmet",
    result: "reinforcedMonsterCoreLeatherHelmet",
  },
  { base: "monsterCorePants", result: "reinforcedMonsterCorePants" },
  { base: "monsterCoreBelt", result: "reinforcedMonsterCoreBelt" },
];

const REINFORCED_MONSTER_CORE_TIER_ARMOR_RECIPES = buildRecipe(
  REINFORCED_MONSTER_CORE_TIERS_ARMOR,
  "monsterCore",
  1,
  1,
  true,
  false,
);

// ---------------------------------------------------------------------------
// DAGUES : chaine d'evolution a 1 lingot par palier
// wooden -> copper -> iron -> ... -> nova. Pour chaque maillon, buildRecipe
// (allowEnhancedBase = true) cree aussi les recettes depuis la version
// "reinforced" / "sharp" de la dague precedente, quand elles existent dans
// ITEM_DEFS (ex: reinforcedCopperDaggerUpgradeRecipe).
// Pour ajouter un palier : ajoute le nom du metal a la fin de DAGGER_CHAIN
// (l'objet `<metal>Dagger` et le lingot `<metal>Ingot` doivent exister).
// ---------------------------------------------------------------------------
const DAGGER_CHAIN = [
  "wooden",
  "copper",
  "iron",
  "silver",
  "steel",
  "gold",
  "platinium",
  "cobalt",
  "adamantine",
  "crimson",
  "angelic",
  "fateful",
  "nova",
];
const DAGGER_INGOT_QTY = 1;

function buildDaggerEvolutionRecipes() {
  const recipes = {};
  for (let i = 1; i < DAGGER_CHAIN.length; i++) {
    const base = `${DAGGER_CHAIN[i - 1]}Dagger`;
    const result = `${DAGGER_CHAIN[i]}Dagger`;
    const built = buildRecipe(
      [{ base, result }],
      `${DAGGER_CHAIN[i]}Ingot`,
      DAGGER_INGOT_QTY,
      undefined,
      true,
      true,
    );
    for (const recipe of Object.values(built)) {
      recipe.name = `Recette d'évolution : ${resolveItemDef(recipe.resultItemId).name}`;
    }
    Object.assign(recipes, built);
  }
  return recipes;
}

const DAGGER_EVOLUTION_RECIPES = buildDaggerEvolutionRecipes();

export const EQUIPMENT_RECIPES = {
  ...REINFORCED_WOODEN_TIER_RECIPES,
  ...COPPER_TIER_RECIPES,
  ...REINFORCED_COPPER_TIER_RECIPES,
  ...IRON_TIER_RECIPES,
  ...REINFORCED_IRON_TIER_RECIPES,
  ...SILVER_TIER_RECIPES,
  ...REINFORCED_SILVER_TIER_RECIPES,
  ...STEEL_TIER_RECIPES,
  ...REINFORCED_STEEL_TIER_RECIPES,
  ...GOLD_TIER_RECIPES,
  ...REINFORCED_GOLD_TIER_RECIPES,
  ...PLATINIUM_TIER_RECIPES,
  ...REINFORCED_PLATINIUM_TIER_RECIPES,
  ...COBALT_TIER_RECIPES,
  ...REINFORCED_COBALT_TIER_RECIPES,
  ...ADAMANTINE_TIER_RECIPES,
  ...REINFORCED_ADAMANTINE_TIER_RECIPES,
  ...CRIMSON_TIER_RECIPES,
  ...REINFORCED_CRIMSON_TIER_RECIPES,
  ...ANGELIC_TIER_RECIPES,
  ...REINFORCED_ANGELIC_TIER_RECIPES,
  ...FATEFUL_TIER_RECIPES,
  ...REINFORCED_FATEFUL_TIER_RECIPES,
  ...NOVA_TIER_RECIPES,
  ...REINFORCED_NOVA_TIER_RECIPES,
  ...SHARPENING_RECIPES,
  ...OAKWOOD_TIER_RECIPES,
  ...REINFORCED_OAKWOOD_TIER_RECIPES,
  ...ASHWOOD_TIER_RECIPES,
  ...REINFORCED_ASHWOOD_TIER_RECIPES,
  ...YEWWOOD_TIER_RECIPES,
  ...REINFORCED_YEWWOOD_TIER_RECIPES,
  ...EBONYWOOD_TIER_RECIPES,
  ...REINFORCED_EBONYWOOD_TIER_RECIPES,
  ...PETRIFIEDWOOD_TIER_RECIPES,
  ...REINFORCED_PETRIFIEDWOOD_TIER_RECIPES,
  ...MISTWOOD_TIER_RECIPES,
  ...REINFORCED_MISTWOOD_TIER_RECIPES,
  ...RUNEWOOD_TIER_RECIPES,
  ...REINFORCED_RUNEWOOD_TIER_RECIPES,
  ...SKYWOOD_TIER_RECIPES,
  ...REINFORCED_SKYWOOD_TIER_RECIPES,
  ...SCARLETWOOD_TIER_RECIPES,
  ...REINFORCED_SCARLETWOOD_TIER_RECIPES,
  ...SACREDWOOD_TIER_RECIPES,
  ...REINFORCED_SACREDWOOD_TIER_RECIPES,
  ...ETERNALWOOD_TIER_RECIPES,
  ...REINFORCED_ETERNALWOOD_TIER_RECIPES,
  ...STARWOOD_TIER_RECIPES,
  ...REINFORCED_STARWOOD_TIER_RECIPES,
  ...SLIMEBLOB_TIER_RECIPES,
  ...BEAR_PELT_TIER_RECIPES,
  ...SPIDER_LEG_TIER_RECIPES,
  ...GREY_MONSTER_SCALE_TIER_RECIPES,
  ...CRAB_CLAW_TIER_RECIPES,
  ...BLACK_BEAR_PELT_TIER_RECIPES,
  ...TURTLE_SHELL_TIER_RECIPES,
  ...GREEN_MONSTER_SCALE_TIER_RECIPES,
  ...BAT_WINGS_TIER_RECIPES,
  ...DRAGON_SCALE_TIER_RECIPES,
  ...GHOST_ECTOPLASM_TIER_RECIPES,
  ...MONSTER_CORE_TIER_RECIPES,
  ...OAKWOOD_TIER_OBJECT_RECIPES,
  ...ASHWOOD_TIER_OBJECT_RECIPES,
  ...YEWWOOD_TIER_OBJECT_RECIPES,
  ...EBONYWOOD_TIER_OBJECT_RECIPES,
  ...PETRIFIEDWOOD_TIER_OBJECT_RECIPES,
  ...MISTWOOD_TIER_OBJECT_RECIPES,
  ...RUNEWOOD_TIER_OBJECT_RECIPES,
  ...SKYWOOD_TIER_OBJECT_RECIPES,
  ...SCARLETWOOD_TIER_OBJECT_RECIPES,
  ...SACREDWOOD_TIER_OBJECT_RECIPES,
  ...ETERNALWOOD_TIER_OBJECT_RECIPES,
  ...STARWOOD_TIER_OBJECT_RECIPES,
  ...COPPER_TIER_OBJECT_RECIPES,
  ...IRON_TIER_OBJECT_RECIPES,
  ...SILVER_TIER_OBJECT_RECIPES,
  ...STEEL_TIER_OBJECT_RECIPES,
  ...GOLD_TIER_OBJECT_RECIPES,
  ...PLATINIUM_TIER_OBJECT_RECIPES,
  ...COBALT_TIER_OBJECT_RECIPES,
  ...ADAMANTINE_TIER_OBJECT_RECIPES,
  ...CRIMSON_TIER_OBJECT_RECIPES,
  ...ANGELIC_TIER_OBJECT_RECIPES,
  ...FATEFUL_TIER_OBJECT_RECIPES,
  ...NOVA_TIER_OBJECT_RECIPES,
  ...SLIMEBLOB_TIER_OBJECT_RECIPES,
  ...BEAR_PELT_TIER_OBJECT_RECIPES,
  ...SPIDER_LEG_TIER_OBJECT_RECIPES,
  ...GREY_MONSTER_SCALE_TIER_OBJECT_RECIPES,
  ...CRAB_CLAW_TIER_OBJECT_RECIPES,
  ...BLACK_BEAR_PELT_TIER_OBJECT_RECIPES,
  ...TURTLE_SHELL_TIER_OBJECT_RECIPES,
  ...GREEN_MONSTER_SCALE_TIER_OBJECT_RECIPES,
  ...BAT_WINGS_TIER_OBJECT_RECIPES,
  ...DRAGON_SCALE_TIER_OBJECT_RECIPES,
  ...GHOST_ECTOPLASM_TIER_OBJECT_RECIPES,
  ...MONSTER_CORE_TIER_OBJECT_RECIPES,
  ...REINFORCED_FURTUFT_TIER_RECIPES,
  ...REINFORCED_SLIMEBLOB_TIER_ARMOR_RECIPES,
  ...REINFORCED_BEAR_PELT_TIER_ARMOR_RECIPES,
  ...REINFORCED_SPIDER_LEG_TIER_ARMOR_RECIPES,
  ...REINFORCED_GREY_MONSTER_SCALE_TIER_ARMOR_RECIPES,
  ...REINFORCED_CRAB_CLAW_TIER_ARMOR_RECIPES,
  ...REINFORCED_BLACK_BEAR_PELT_TIER_ARMOR_RECIPES,
  ...REINFORCED_TURTLE_SHELL_TIER_ARMOR_RECIPES,
  ...REINFORCED_GREEN_MONSTER_SCALE_TIER_ARMOR_RECIPES,
  ...REINFORCED_BAT_WINGS_TIER_ARMOR_RECIPES,
  ...REINFORCED_DRAGON_SCALE_TIER_ARMOR_RECIPES,
  ...REINFORCED_GHOST_ECTOPLASM_TIER_ARMOR_RECIPES,
  ...REINFORCED_MONSTER_CORE_TIER_ARMOR_RECIPES,
  ...DAGGER_EVOLUTION_RECIPES,

  // ---- recettes d'equipement ecrites a la main ----
  // armes de base en bois (recompense de la quete du bucheron, selon l'archetype)
  woodenDaggerRecipe: {
    id: "woodenDaggerRecipe",
    name: "Recette : Dague en bois",
    resultItemId: "woodenDagger",
    resultQuantity: 1,
    ingredients: [{ itemId: "branch", quantity: 2 }],
    discoveryOnly: true,
  },
  woodenSwordRecipe: {
    id: "woodenSwordRecipe",
    name: "Recette : Épée en bois",
    resultItemId: "woodenSword",
    resultQuantity: 1,
    ingredients: [
      { itemId: "branch", quantity: 3 },
      { itemId: "snail1Shell", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  woodenBowRecipe: {
    id: "woodenBowRecipe",
    name: "Recette : Arc en bois",
    resultItemId: "woodenBow",
    resultQuantity: 1,
    ingredients: [
      { itemId: "branch", quantity: 3 },
      { itemId: "spiderFur", quantity: 1 },
    ],
    discoveryOnly: true,
  },
  woodenStaffRecipe: {
    id: "woodenStaffRecipe",
    name: "Recette : Bâton en bois",
    resultItemId: "woodenStaff",
    resultQuantity: 1,
    ingredients: [{ itemId: "branch", quantity: 3 }],
    discoveryOnly: true,
  },
  woodenCrossbowRecipe: {
    id: "woodenCrossbowRecipe",
    name: "Recette : Arbalète en bois",
    resultItemId: "woodenCrossbow",
    resultQuantity: 1,
    ingredients: [
      { itemId: "wood", quantity: 1 },
      { itemId: "branch", quantity: 2 },
      { itemId: "vegetalFiber", quantity: 2 },
      { itemId: "gnomeClaw", quantity: 1 },
    ],
    discoveryOnly: true,
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
};
