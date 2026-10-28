import { ITEM_DEFS } from "./itemDefs";

/**
 * Recettes des GEMMES, generees a partir d'une table par famille.
 *
 * - Palier 1 (burnGem...) : reactif de la famille x2 + pierre x1 + butin de
 *   monstre x1, fabrique "de zero".
 * - Paliers 2 a 5 (burnGemT2...) : gemme du palier precedent + materiau du
 *   palier (lingot, minerai ou bois) + butin de monstre du palier + reactif
 *   de la famille.
 *
 * Tout est pilote par les tables ci-dessous : changer un cout ou une
 * correspondance se fait ICI, pas recette par recette.
 *
 * ATTENTION (Combiner) : la combinaison libre reconnait une recette quand les
 * objets choisis correspondent EXACTEMENT a ses ingredients, et prend la
 * premiere trouvee. Deux recettes ne doivent donc jamais avoir exactement les
 * memes ingredients (les paliers 2+ sont uniques par construction : la gemme
 * de base fait partie des ingredients ; seuls les paliers 1 sont a surveiller).
 */

// true = le palier 5 de certaines familles consomme le noyau UNIQUE du boss
// elementaire correspondant (cf. `core` dans GEM_FAMILIES). Un noyau consomme
// ne permet plus l'invocation associee. false = noyau de monstre ordinaire.
const USE_UNIQUE_CORES = false;

// niveau du joueur requis pour fabriquer chaque palier de gemme
const UNLOCK_LEVEL = { 1: 1, 2: 8, 3: 15, 4: 25, 5: 35 };

// quantites des paliers 2 a 5 (cle = palier VISE)
const MATERIAL_QTY = { 2: 2, 3: 3, 4: 4, 5: 5 };
const LOOT_QTY = { 2: 2, 3: 2, 4: 3, 5: 3 };
const REAGENT_QTY = { 2: 1, 3: 2, 4: 2, 5: 3 };

// quantites du palier 1
const T1_REAGENT_QTY = 2;
const T1_STONE_QTY = 1;
const T1_LOOT_QTY = 1;

// butin de monstre par palier de gemme ; `slot` (famille) choisit l'entree.
// Une entree peut etre un tableau d'ids si le butin existe en plusieurs
// declinaisons (ex. ["slimeBlob", "slimeBlobRed"]).
const LOOT_LADDER = {
  1: ["slimeBlob", "bearPelt", "spiderLeg"],
  2: ["greyMonsterScale", "crabClaw", "blackBearPelt"],
  3: ["turtleShell", "greenMonsterScale", "batWings"],
  4: ["dragonScale", "ghostEctoplasm", "dragonScale"],
  5: ["monsterCore", "monsterCore", "monsterCore"],
};

// materiau par palier : lingot (raffine), minerai (brut) ou bois
const MATERIAL_LADDER = {
  ingot: { 2: "steelIngot", 3: "cobaltIngot", 4: "crimsonIngot", 5: "novaIngot" },
  ore: { 2: "silverOre", 3: "cobaltOre", 4: "crimsonOre", 5: "novaOre" },
  wood: {
    2: ["ebonyWood"],
    3: ["runewood"],
    4: ["scarletwood"],
    5: ["starwood"],
  },
};

/**
 * Une entree par famille de gemme (cle = id de la gemme de palier 1).
 * reagent : [itemId, ...] ; stone : pierre ou reactif secondaire du palier 1
 * slot    : 0, 1 ou 2 - choisit le butin de monstre dans LOOT_LADDER
 * material: "ingot" | "ore" | "wood" - ressource des paliers 2 a 5
 * core    : (facultatif) noyau unique utilise au palier 5 si USE_UNIQUE_CORES
 */
const GEM_FAMILIES = {
  // ---- effets a l'impact (chance d'infliger un effet) ----
  burnGem: { reagent: "fireCrystal", stone: "ruby", slot: 0, material: "ingot" },
  bleedGem: { reagent: "deerBone", stone: "ruby", slot: 2, material: "ingot" },
  acidGem: { reagent: "sulfur", stone: "peridot", slot: 0, material: "ingot" },
  slowGem: { reagent: "iceCrystal", stone: "aquaMarine", slot: 1, material: "ingot" },
  stunGem: { reagent: "lightningShard", stone: "moonStone", slot: 2, material: "ingot", core: "golemFoudreCore" },
  poisonGem: { reagent: "frogLeg", stone: "peridot", slot: 2, material: "wood" },
  weakenGem: { reagent: "pepper", stone: "smokyQuartz", slot: 1, material: "ingot" },
  rootGem: { reagent: "branch", stone: "peridot", slot: 1, material: "wood" },

  // ---- reactions defensives simples ----
  hasteGem: { reagent: "featherRoot", stone: "smokyQuartz", slot: 2, material: "ingot" },
  repelGem: { reagent: "deerHoof", stone: "foolsGold", slot: 1, material: "ingot" },
  slowWardGem: { reagent: "waterLily", stone: "aquaMarine", slot: 1, material: "ingot" },
  stunWardGem: { reagent: "lightningShard", stone: "smokyQuartz", slot: 0, material: "ingot" },
  randomTeleportGem: { reagent: "shadowEssence", stone: "moonStone", slot: 1, material: "ingot" },
  staticStormWardGem: { reagent: "lightningShard", stone: "diamond", slot: 0, material: "ingot", core: "golemFoudreCore" },
  thornsWardGem: { reagent: "resin", stone: "peridot", slot: 0, material: "wood" },
  sporesWardGem: { reagent: "mushroom", stone: "peridot", slot: 2, material: "wood" },
  curseWardGem: { reagent: "shadowEssence", stone: "smokyQuartz", slot: 1, material: "ingot", core: "golemOmbreCore" },
  riposteGem: { reagent: "whetstone", stone: "foolsGold", slot: 2, material: "ingot" },
  parryGem: { reagent: "whetstone", stone: "diamond", slot: 1, material: "ingot" },
  freezeWardGem: { reagent: "iceCrystal", stone: "moonStone", slot: 0, material: "ingot", core: "golemGlaceCore" },
  rootWardGem: { reagent: "vegetalFiber", stone: "peridot", slot: 0, material: "wood" },
  shockwaveGem: { reagent: "coalOre", stone: "diamond", slot: 1, material: "ore", core: "golemCore" },

  // ---- gemmes d'outil (minage / recolte) ----
  miningSpeedGem: { reagent: "featherRoot", stone: "foolsGold", slot: 2, material: "ore" },
  miningYieldGem: { reagent: "honeycomb", stone: "foolsGold", slot: 0, material: "wood" },
  miningLuckGem: { reagent: "moonStone", stone: "foolsGold", slot: 1, material: "ore" },

  // ---- gemmes reactives d'ability ----
  frostNovaGem: { reagent: "iceCrystal", stone: "diamond", slot: 0, material: "ingot", core: "golemGlaceCore" },
  icePrisonGem: { reagent: "iceCrystal", stone: "smokyQuartz", slot: 2, material: "ingot", core: "golemGlaceCore" },
  fireNovaGem: { reagent: "fireCrystal", stone: "diamond", slot: 0, material: "ingot", core: "golemFeuCore" },
  whirlwindGem: { reagent: "featherRoot", stone: "diamond", slot: 2, material: "ingot" },
  smiteGem: { reagent: "holyWater", stone: "diamond", slot: 1, material: "ingot" },
  arcaneBurstGem: { reagent: "paper", stone: "moonStone", slot: 1, material: "ingot" },
  chainLightningGem: { reagent: "lightningShard", stone: "ruby", slot: 2, material: "ingot", core: "golemFoudreCore" },
  vortexGem: { reagent: "shadowEssence", stone: "aquaMarine", slot: 2, material: "ingot", core: "golemEauCore" },
  quakeGem: { reagent: "coalOre", stone: "foolsGold", slot: 0, material: "ore", core: "golemCore" },
  blizzardGem: { reagent: "iceCrystal", stone: "peridot", slot: 1, material: "ingot", core: "golemGlaceCore" },
  firePoolGem: { reagent: "fireCrystal", stone: "sulfur", slot: 1, material: "ingot", core: "golemFeuCore" },
  shortDashGem: { reagent: "featherRoot", stone: "moonStone", slot: 0, material: "ingot" },
  stealthGem: { reagent: "shadowEssence", stone: "diamond", slot: 1, material: "ingot", core: "golemOmbreCore" },
  manaShieldGem: { reagent: "holyWater", stone: "aquaMarine", slot: 0, material: "ingot" },
};

function gemId(family, tier) {
  return tier === 1 ? family : `${family}T${tier}`;
}

// butin de monstre : un id, ou un tableau d'ids si le meme butin existe en
// plusieurs declinaisons (ingredient flexible : n'importe laquelle convient)
function lootFor(tier, slot) {
  return LOOT_LADDER[tier][slot % LOOT_LADDER[tier].length];
}

function lootIngredient(loot, quantity) {
  return Array.isArray(loot)
    ? { itemId: loot[0], acceptedItemIds: loot, quantity }
    : { itemId: loot, quantity };
}

function materialIngredient(kind, tier) {
  const m = MATERIAL_LADDER[kind][tier];
  const quantity = MATERIAL_QTY[tier];
  if (Array.isArray(m)) {
    // un seul id : ingredient simple ; plusieurs ecritures : ingredient flexible
    return m.length === 1
      ? { itemId: m[0], quantity }
      : { itemId: m[0], acceptedItemIds: m, quantity };
  }
  return { itemId: m, quantity };
}

function buildGemRecipes() {
  const recipes = {};
  for (const [family, spec] of Object.entries(GEM_FAMILIES)) {
    for (let tier = 1; tier <= 5; tier++) {
      const result = gemId(family, tier);
      const def = ITEM_DEFS[result];
      if (!def) continue; // palier absent des definitions : pas de recette

      let ingredients;
      if (tier === 1) {
        ingredients = [
          { itemId: spec.reagent, quantity: T1_REAGENT_QTY },
          { itemId: spec.stone, quantity: T1_STONE_QTY },
          lootIngredient(lootFor(1, spec.slot), T1_LOOT_QTY),
        ];
      } else {
        const useCore = tier === 5 && USE_UNIQUE_CORES && spec.core;
        const lootItem = useCore ? spec.core : lootFor(tier, spec.slot);
        ingredients = [
          { itemId: gemId(family, tier - 1), quantity: 1 },
          materialIngredient(spec.material, tier),
          lootIngredient(lootItem, useCore ? 1 : LOOT_QTY[tier]),
          { itemId: spec.reagent, quantity: REAGENT_QTY[tier] },
        ];
      }

      const id = `${result}Recipe`;
      recipes[id] = {
        id,
        name: `Recette : ${def.name}`,
        resultItemId: result,
        resultQuantity: 1,
        ingredients,
        unlockLevel: UNLOCK_LEVEL[tier],
        discoveryOnly: true,
      };
    }
  }
  return recipes;
}

export const GEM_RECIPES = buildGemRecipes();
