import Phaser from "phaser";
import { createRng } from "../rng";
import { computeWallCornerIndex } from "../autotile";
import { computeMask } from "../blob47";
import { DUNGEON1_TILESET, floorFrame } from "../tilesets/dungeon1";
import {
  FORTRESS1_TILESET,
  COLUMNS_PER_ROW,
  autotileFrame as fortressAutotileFrame,
} from "../tilesets/fortress1";
import {
  FORTRESS_AUTOTILE_SPRITESHEET,
  DUNGEON_AUTOTILE_SPRITESHEET,
  DESERT_AUTOTILE_SPRITESHEET,
  DESERT2_AUTOTILE_SPRITESHEET,
  HILLS1_AUTOTILE_SPRITESHEET,
  HILLS2_AUTOTILE_SPRITESHEET,
  HILLS3_AUTOTILE_SPRITESHEET,
  SNOW_AUTOTILE_SPRITESHEET,
  DARKWOODS_AUTOTILE_SPRITESHEET,
  DARKWOODS2_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
  CITY_WALLS1_AUTOTILE_SPRITESHEET,
  CITY_WALLS2_AUTOTILE_SPRITESHEET,
  CITY_WALLS3_AUTOTILE_SPRITESHEET,
  // CITY_WALLSE2_AUTOTILE_SPRITESHEET,
  // CITY_WALLSE3_AUTOTILE_SPRITESHEET,
  // FORTRESS1_AUTOTILE_SPRITESHEET,
  // FORTRESS2_AUTOTILE_SPRITESHEET,
  // FORTRESS3_AUTOTILE_SPRITESHEET,
  // FORTRESSE1_AUTOTILE_SPRITESHEET,
  // FORTRESSE2_AUTOTILE_SPRITESHEET,
  // FORTRESSE3_AUTOTILE_SPRITESHEET,
  // TECH_FORTRESS1_AUTOTILE_SPRITESHEET,
  // TECH_FORTRESS2_AUTOTILE_SPRITESHEET,
  // TECH_FORTRESSE1_AUTOTILE_SPRITESHEET,
  // TECH_FORTRESSE2_AUTOTILE_SPRITESHEET,
  TOWER1_AUTOTILE_SPRITESHEET,
  TOWER2_AUTOTILE_SPRITESHEET,
  TOWER3_AUTOTILE_SPRITESHEET,
  TOWER4_AUTOTILE_SPRITESHEET,
  // TOWERE1_AUTOTILE_SPRITESHEET,
  // TOWERE2_AUTOTILE_SPRITESHEET,
  // TOWERE3_AUTOTILE_SPRITESHEET,
  MINES1_AUTOTILE_SPRITESHEET,
  MINES2_AUTOTILE_SPRITESHEET,
  MINES3_AUTOTILE_SPRITESHEET,
  // DESERT_TOWNE1_AUTOTILE_SPRITESHEET,
  // DESERT_TOWNE2_AUTOTILE_SPRITESHEET,
  // ROUFTOPSF_AUTOTILE_SPRITESHEET,
  // DUNGEONS_A21_AUTOTILE_SPRITESHEET,
  // DUNGEONS_A22_AUTOTILE_SPRITESHEET,
  // GREY_COASTA51_AUTOTILE_SPRITESHEET,
  CITY_TILES_AUTOTILE_SPRITESHEET,
  // STANDARD_COAST_A_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
  // STANDARD_COAST2_A_AUTOTILE_SPRITESHEET,
  CITY_HOUSES,
  MUDDY_CAVE_AUTOTILE_SPRITESHEET,
  MUDDY_CAVE_V2_AUTOTILE_SPRITESHEET,
  MUDDY_CAVE_V3_AUTOTILE_SPRITESHEET,
  MUDDY_CAVE_V4_AUTOTILE_SPRITESHEET,
  SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  SPRING_FOREST_AUTOTILE_SPRITESHEET,
  AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  WINTER_FOREST_AUTOTILE_SPRITESHEET,
  WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V04_AUTOTILE_SPRITESHEET,
  TILE_IMAGE_REGISTRY,
  OBJECTS_DUNGEON_01_SPRITESHEET,
  DETAILS_SPRITESHEET,
} from "../spriteRegistry";

import { TILE_SIZE } from "./gameConstants";

// WALL est la source unique de verite desormais - MainScene.js l'importe
// depuis ce fichier (cf. le reste du moteur qui compare des cases de grille
// a WALL en dehors de tout rendu de decor : IA ennemie, pathfinding, sorts...).
export const WALL = 1;

const TILESET_COLORS = {
  cave: { wall: 0x3a3542, floor: 0xc8be9e },
  ruins: { wall: 0x372f38, floor: 0xd2b48c },
  cavechain: { wall: 0x2f3a34, floor: 0xa8c0a0 },
  drunkardwalk: { wall: 0x3a2f2a, floor: 0xb89878 },
  maze: { wall: 0x28282f, floor: 0x8a8a9a },
  noise: { wall: 0x2a3540, floor: 0x94b0a8 },
  voronoi: { wall: 0x3a2f3a, floor: 0xb090a0 },
  tree: { wall: 0x2e4a2a, floor: 0x5a7a4a },
  temple: { wall: 0x32303c, floor: 0xbec8d7 },
  town: { wall: 0xc8bfa0, floor: 0xc8bfa0 },
};

const WALL_CORNER_INDEX_TO_FRAME_0_0 = [
  {
    variants: [
      { tiles: 70, weight: 5 }, // mur normal, le plus frequent
      { tiles: 71, weight: 1 }, // meme mur + déco superposee, plus rare
      // { tiles: 86, weight: 1 }, // autre variante, encore plus rare
      // { tiles: 87, weight: 1 },
      // { tiles: 69, weight: 1 },
      // { tiles: 85, weight: 1 },
    ],
  },
  32,
  0,
  16,
  2,
  [32, 2],
  1,
  23,
  34,
  {
    variants: [
      { tiles: 33, weight: 5 }, // mur normal, le plus frequent
      { tiles: [33, 46], weight: 1 }, // meme mur + déco superposee, plus rare
      { tiles: [33, 183], weight: 1 }, // autre variante, encore plus rare
      { tiles: [33, 182], weight: 1 }, // autre variante, encore plus rare
      { tiles: [33, 181], weight: 1 }, // autre variante, encore plus rare
      { tiles: [33, 70], weight: 1 }, // autre variante, encore plus rare
    ],
  },
  [34, 0],
  7,
  18,
  6,
  22,
  17,
];
const WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1 = [
  118,
  32,
  0,
  16,
  2,
  [32, 2],
  1,
  23,
  34,
  33,
  [34, 0],
  7,
  18,
  6,
  22,
  17,
];
const WALL_CORNER_INDEX_TO_FRAME_0_0_CITY_WALLS = [
  224,
  32,
  0,
  16,
  2,
  [32, 2],
  1,
  23,
  34,
  33,
  [34, 0],
  7,
  18,
  6,
  22,
  17,
];
const WALL_CORNER_INDEX_TO_FRAME_0_1_CITY_WALLS = [
  224,
  35,
  0,
  16,
  2,
  [32, 2],
  4,
  55,
  34,
  33,
  [34, 0],
  7,
  18,
  6,
  54,
  20,
];
const WALL_CORNER_INDEX_TO_FRAME_2_0_CITY_WALLS = [
  224, 128, 96, 112, 98, 132, 97, 99, 130, 129, 131, 115, 114, 116, 100, 113,
];
const WALL_CORNER_INDEX_TO_FRAME_0_1 = [
  70,
  35,
  3,
  19,
  5,
  [35, 5],
  4,
  20,
  37,
  36,
  [37, 3],
  39,
  21,
  38,
  20,
  20,
];
const WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_1 = [
  {
    variants: [
      { tiles: 7, weight: 5 }, // mur normal, le plus frequent
      { tiles: 228, weight: 1 }, // meme mur + déco superposee, plus rare
      { tiles: 260, weight: 1 }, // autre variante, encore plus rare
    ],
  },
  64,
  0,
  32,
  2,
  4,
  1,
  68,
  66,
  65,
  4,
  36,
  34,
  35,
  67,
  4,
];
const WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_2 = [
  7,
  160,
  96,
  128,
  98,
  [160, 129],
  97,
  132,
  162,
  161,
  [162, 129],
  100,
  130,
  99,
  131,
  129,
];
const WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_3 = [
  7, 256, 192, 224, 194, 196, 193, 196, 258, 257, 195, 164, 226, 163, 195, 225,
];
const WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_4 = [
  7, 352, 288, 320, 290, 196, 289, 196, 354, 353, 195, 164, 322, 163, 195, 225,
];
const WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2 = [
  86,
  35,
  3,
  19,
  5,
  [35, 5],
  4,
  4,
  37,
  36,
  [37, 3],
  39,
  21,
  38,
  4,
  20,
];
const WALL_CORNER_INDEX_TO_FRAME_DARKWOODS_1_3 = [
  86, 128, 96, 112, 98, 131, 97, 113, 130, 129, 132, 115, 114, 116, 113, 113,
];
const WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_0_1 = [
  {
    variants: [
      { tiles: 0, weight: 5 },
      { tiles: 1, weight: 1 },
    ],
  },
  48,
  16,
  32,
  18,
  [48, 18],
  17,
  19,
  50,
  49,
  [18, 35],
  35,
  34,
  36,
  20,
  33,
];
const WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_1_1 = [
  {
    variants: [
      { tiles: 1, weight: 5 },
      { tiles: 0, weight: 1 },
    ],
  },
  53,
  21,
  37,
  23,
  [53, 23],
  22,
  19,
  55,
  54,
  [23, 53],
  35,
  39,
  36,
  20,
  33,
];
const WALL_CORNER_INDEX_TO_FRAME_1_0 = [
  70,
  80,
  48,
  64,
  50,
  [80, 50],
  49,
  68,
  82,
  81,
  [82, 48],
  52,
  66,
  51,
  67,
  65,
];
// const WALL_CORNER_INDEX_TO_FRAME_1_0_HILLS = [
//   70, 80, 48, 64, 50, 80, 49, 51, 82, 81, 50, 67, 66, 68, 52, 65,
// ];
const WALL_CORNER_INDEX_TO_FRAME_1_0_MOUNTAIN3B = [
  70, 80, 48, 64, 50, 83, 49, 51, 82, 81, 84, 67, 66, 68, 52, 65,
];
const WALL_CORNER_INDEX_TO_FRAME_2_0 = [
  70, 128, 96, 112, 98, 131, 97, 99, 130, 129, 132, 115, 114, 116, 100, 113,
];

const WALL_CORNER_INDEX_TO_FRAME_0_0_MUDDY_CAVE = [
  {
    variants: [
      { tiles: 264, weight: 3 },
      { tiles: 265, weight: 2 },
      { tiles: 262, weight: 1 },
    ],
  },
  60,
  0,
  40,
  3,
  [60, 3],
  1,
  32,
  63,
  {
    variants: [
      { tiles: 61, weight: 5 },
      { tiles: [61, 252], weight: 3 },
      { tiles: [61, 292], weight: 3 },
    ],
  },
  [63, 0],
  22,
  43,
  21,
  41,
  80,
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_0 = [
  265,
  65,
  1,
  33,
  3,
  99,
  2,
  100,
  67,
  66,
  131,
  129,
  35,
  130,
  132,
  {
    variants: [
      { tiles: 34, weight: 5 },
      { tiles: 4, weight: 1 },
      { tiles: 36, weight: 1 },
      { tiles: 68, weight: 1 },
    ],
  },
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1 = [
  265, 69, 5, 37, 7, 103, 6, 104, 71, 70, 135, 102, 39, 101, 136,
  // {
  //   variants: [
  //     { tiles: [34, 46], weight: 10 },
  //     { tiles: [34, 144], weight: 2 },
  //     { tiles: [34, 48], weight: 1 },
  //     { tiles: [34, 80], weight: 1 },
  //     { tiles: [34, 554], weight: 0.5 },
  //   ],
  // },
  40,
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0 = [
  266, 133, 101, 39, 102, 135, 70, 32, 134, 6, 103, 7, 37, 5, 96,
  // {
  //   variants: [
  //     { tiles: [34, 46], weight: 10 },
  //     { tiles: [34, 144], weight: 2 },
  //     { tiles: [34, 48], weight: 1 },
  //     { tiles: [34, 80], weight: 1 },
  //     { tiles: [34, 554], weight: 0.5 },
  //   ],
  // },
  32,
];
const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2 = [
  265,
  73,
  9,
  41,
  11,
  107,
  10,
  42,
  75,
  74,
  139,
  106,
  43,
  105,
  140,
  {
    variants: [
      { tiles: [12], weight: 10 },
      { tiles: [44], weight: 2 },
      { tiles: [76], weight: 1 },
      { tiles: [108], weight: 1 },
      { tiles: [42], weight: 0.5 },
    ],
  },
  // 44,
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0 = [
  298, 77, 13, 45, 15, 77, 14, 142, 79, 78, 15, 141, 47, 109, 46,
  // {
  //   variants: [
  //     { tiles: [34, 46], weight: 10 },
  //     { tiles: [34, 144], weight: 2 },
  //     { tiles: [34, 48], weight: 1 },
  //     { tiles: [34, 80], weight: 1 },
  //     { tiles: [34, 554], weight: 0.5 },
  //   ],
  // },
  46,
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1 = [
  298, 77, 13, 45, 15, 77, 14, 142, 79, 78, 15, 141, 47, 109, 46,
  // {
  //   variants: [
  //     { tiles: [34, 46], weight: 10 },
  //     { tiles: [34, 144], weight: 2 },
  //     { tiles: [34, 48], weight: 1 },
  //     { tiles: [34, 80], weight: 1 },
  //     { tiles: [34, 554], weight: 0.5 },
  //   ],
  // },
  46,
];
const WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2 = [
  262, 77, 13, 45, 15, 77, 14, 142, 79, 78, 15, 141, 47, 109, 46,
  // {
  //   variants: [
  //     { tiles: [34, 46], weight: 10 },
  //     { tiles: [34, 144], weight: 2 },
  //     { tiles: [34, 48], weight: 1 },
  //     { tiles: [34, 80], weight: 1 },
  //     { tiles: [34, 554], weight: 0.5 },
  //   ],
  // },
  46,
];

const WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0 = [
  266, 596, 532, 564, 534, 630, 533, 661, 598, 597, 662, 629, 566, 628, 660,
  // {
  //   variants: [
  //     { tiles: 565, weight: 5 },
  //     { tiles: 203, weight: 1 },
  //     { tiles: 267, weight: 1 },
  //     { tiles: 299, weight: 1 },
  //   ],
  // },
  565,
];
const WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1 = [
  266,
  599,
  535,
  567,
  537,
  633,
  536,
  664,
  601,
  600,
  665,
  632,
  569,
  631,
  663,
  {
    variants: [
      { tiles: 568, weight: 5 },
      { tiles: 203, weight: 1 },
      { tiles: 267, weight: 1 },
      { tiles: 299, weight: 1 },
      { tiles: 208, weight: 1 },
      { tiles: 240, weight: 1 },
    ],
  },
  // 565,
];
const WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2 = [
  265, 602, 538, 570, 540, 636, 539, 667, 604, 603, 668, 635, 572, 634, 666,
  // {
  //   variants: [
  //     { tiles: 571, weight: 5 },
  //     { tiles: 203, weight: 1 },
  //     { tiles: 267, weight: 1 },
  //     { tiles: 299, weight: 1 },
  //     { tiles: 208, weight: 1 },
  //     { tiles: 240, weight: 1 },
  //   ],
  // },
  565,
];
const WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3 = [
  265,
  605,
  541,
  573,
  543,
  639,
  542,
  670,
  607,
  606,
  671,
  638,
  575,
  637,
  669,
  {
    variants: [
      { tiles: 568, weight: 10 },
      { tiles: 203, weight: 1 },
      { tiles: 267, weight: 1 },
      { tiles: 299, weight: 1 },
      { tiles: 208, weight: 1 },
      { tiles: 240, weight: 1 },
    ],
  },
  // 568,
];
const WALL_CORNER_INDEX_TO_FRAME_0_0_WINTER_SNOWY_FOREST = [
  {
    variants: [
      { tiles: 265, weight: 5 },
      { tiles: 201, weight: 1 },
      { tiles: 233, weight: 1 },
      { tiles: 297, weight: 1 },
    ],
  },
  65,
  1,
  33,
  3,
  65,
  2,
  130,
  67,
  66,
  3,
  98,
  35,
  97,
  129,
  {
    variants: [
      { tiles: 34, weight: 5 },
      { tiles: 4, weight: 1 },
      { tiles: 36, weight: 1 },
      { tiles: 68, weight: 1 },
    ],
  },
];

const WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_1 = [
  {
    variants: [
      { tiles: 299, weight: 5 },
      { tiles: 265, weight: 1 },
      { tiles: 231, weight: 1 },
      { tiles: 333, weight: 1 },
    ],
  },
  141,
  107,
  41,
  108,
  141,
  74,
  75,
  142,
  6,
  73,
  7,
  39,
  5,
  73,
  36,
];
const WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_2 = [
  {
    variants: [
      { tiles: 299, weight: 5 },
      { tiles: 265, weight: 1 },
      { tiles: 231, weight: 1 },
      { tiles: 333, weight: 1 },
    ],
  },
  77,
  9,
  43,
  11,
  77,
  10,
  146,
  79,
  78,
  11,
  112,
  45,
  {
    variants: [
      { tiles: 113, weight: 1 },
      { tiles: 111, weight: 1 },
    ],
  },

  {
    variants: [
      { tiles: 147, weight: 1 },
      { tiles: 145, weight: 1 },
    ],
  },
  44,
];

/**
 * Compose une texture de tileset a 4 coins (identite d'ordre - meme
 * WALL_CORNER_INDEX_TO_FRAME_0_0 que Desert) a partir d'une spritesheet
 * source generique - reutilisable pour tout tileset partageant EXACTEMENT
 * la meme disposition de sprites (juste une teinte differente), comme
 * Hills vis-a-vis de Desert.
 *
 * Deplacee telle quelle depuis MainScene.js (composeCornerAutotileTexture) -
 * seule differences : c'est desormais une fonction exportee qui recoit la
 * scene en 1er parametre au lieu d'etre une methode de MainScene.
 */
export function composeCornerAutotileTexture(
  scene,
  grid,
  sourceSpritesheet,
  cacheKeySuffix,
  cornerTable = WALL_CORNER_INDEX_TO_FRAME_0_0,
  floorTileId = 17,
) {
  const phaserTilesetKey = `${cacheKeySuffix}-autotile-composed`;
  if (scene.textures.exists(phaserTilesetKey))
    scene.textures.remove(phaserTilesetKey);

  const rawFloorVariants = Array.isArray(floorTileId)
    ? floorTileId
    : [floorTileId];
  const floorVariants = rawFloorVariants.map((v) =>
    typeof v === "number" ? { tileId: v, weight: 1 } : v,
  );

  // normalise chaque position du cornerTable en une liste de variantes
  // ponderees {tiles, weight} - un nombre nu ou un tableau [x,y] devient
  // une variante UNIQUE de poids 1 (comportement historique inchange) ;
  // {variants:[...]} est deja dans ce format
  const normalizedCorners = cornerTable.map((entry) => {
    if (
      entry &&
      typeof entry === "object" &&
      !Array.isArray(entry) &&
      entry.variants
    ) {
      return entry.variants;
    }
    return [{ tiles: entry, weight: 1 }];
  });

  let slotCursor = 1; // slot 0 = sol de base
  const cornerSlotRanges = normalizedCorners.map((variants) =>
    variants.map(() => slotCursor++),
  );
  const floorExtraSlots = [];
  for (let i = 1; i < floorVariants.length; i++)
    floorExtraSlots.push(slotCursor++);
  const SLOT_COUNT = slotCursor;

  const composedTex = scene.textures.createCanvas(
    phaserTilesetKey,
    TILE_SIZE * SLOT_COUNT,
    TILE_SIZE,
  );
  const cctx = composedTex.getContext();
  cctx.imageSmoothingEnabled = false;
  const sourceImg = scene.textures.get(sourceSpritesheet.key).getSourceImage();
  // const SOURCE_COLS = 16;
  const SOURCE_COLS = sourceImg.width / 16; // au lieu de la constante figée à 16
  const slotSourceTileIds = new Array(SLOT_COUNT).fill(null);

  const drawTileOnly = (tileid, slotIndex) => {
    const sx = (tileid % SOURCE_COLS) * 16;
    const sy = Math.floor(tileid / SOURCE_COLS) * 16;
    cctx.drawImage(
      sourceImg,
      sx,
      sy,
      16,
      16,
      slotIndex * TILE_SIZE,
      0,
      TILE_SIZE,
      TILE_SIZE,
    );
  };
  const drawFloorAt = (slotIndex, variantIndex = 0) => {
    const variant = floorVariants[variantIndex];
    const tiles = Array.isArray(variant.tileId)
      ? variant.tileId
      : [variant.tileId];
    for (const t of tiles) drawTileOnly(t, slotIndex);
  };
  drawFloorAt(0, 0);
  slotSourceTileIds[0] = floorVariants[0].tileId;

  normalizedCorners.forEach((variants, bitmask) => {
    const range = cornerSlotRanges[bitmask];
    variants.forEach((variant, vi) => {
      const slotIndex = range[vi];
      drawFloorAt(slotIndex, 0);
      const tiles = Array.isArray(variant.tiles)
        ? variant.tiles
        : [variant.tiles];
      for (const t of tiles) drawTileOnly(t, slotIndex);
      slotSourceTileIds[slotIndex] = tiles.length === 1 ? tiles[0] : tiles;
    });
  });

  floorVariants.forEach((v, i) => {
    if (i === 0) return;
    drawFloorAt(floorExtraSlots[i - 1], i);
    slotSourceTileIds[floorExtraSlots[i - 1]] = v.tileId;
  });
  composedTex.refresh();

  const floorSlotIndices = [0, ...floorExtraSlots];
  const floorWeights = floorVariants.map((v) => v.weight);
  const floorRng = createRng(
    `${scene.currentSeed}-${cacheKeySuffix}-floor-variant`,
  );
  const cornerRng = createRng(
    `${scene.currentSeed}-${cacheKeySuffix}-corner-variant`,
  );

  const pickWeighted = (rng, weights, slots) => {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return slots[i];
    }
    return slots[slots.length - 1];
  };

  const renderGrid = Array.from({ length: grid.length }, () =>
    new Array(grid[0].length).fill(0),
  );
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === 1) {
        const bitmask = computeWallCornerIndex(grid, x, y);
        const variants = normalizedCorners[bitmask];
        const slots = cornerSlotRanges[bitmask];
        renderGrid[y][x] =
          variants.length === 1
            ? slots[0]
            : pickWeighted(
                cornerRng,
                variants.map((v) => v.weight),
                slots,
              );
      } else if (floorSlotIndices.length > 1) {
        renderGrid[y][x] = pickWeighted(
          floorRng,
          floorWeights,
          floorSlotIndices,
        );
      }
    }
  }

  return {
    phaserTilesetKey,
    renderGrid,
    floorSlotIndices,
    slotSourceTileIds,
  };
}

/**
 * Construit le rendu visuel complet d'un etage : choix/composition du
 * tileset selon le biome, creation du tilemap Phaser (this.map/this.layer),
 * configuration des collisions, et placement des batiments de ville le cas
 * echeant.
 *
 * Deplacee telle quelle depuis MainScene.loadLevel() (la portion qui allait
 * du calcul de `useRealAutotile` jusqu'a la reouverture de la porte de la
 * salle secrete deja decouverte) - fait directement les memes affectations
 * sur `scene` (scene.map, scene.layer, scene.currentFloorTileIndex,
 * scene.currentRenderGrid, scene.currentRawTilesetKey,
 * scene.currentSlotSourceTileIds, scene.townHouseSprites) qu'avant sur
 * `this`, donc tout le reste de loadLevel() qui lit ces proprietes n'a pas
 * besoin de changer.
 *
 * @param {Phaser.Scene} scene - la MainScene appelante
 * @param {object} params
 * @param {number[][]} params.grid
 * @param {string} params.tileset
 * @param {object} params.data - la reponse complete de fetchLevel (utilisee
 *   ici pour data.townBuildings et data.secretRoom)
 * @param {number} params.depth
 */
export function buildFloorTilemap(scene, { grid, tileset, data, depth }) {
  const useRealAutotile =
    tileset === "desert" ||
    tileset === "desert_2" || // WALL_CORNER_INDEX_TO_FRAME_0_0
    tileset === "hills" ||
    tileset === "snow" ||
    tileset === "darkwoods_1_1" ||
    tileset === "darkwoods_1_2" ||
    tileset === "darkwoods_1_3" ||
    tileset === "darkwoods2" ||
    tileset === "standardFields_1_0_1" ||
    tileset === "standardFields_1_1_1" ||
    tileset === "standardFields_2_0_1" ||
    tileset === "standardFields_2_1_1" ||
    tileset === "standardFields_3_0_1" ||
    tileset === "standardFields_3_1_1" ||
    tileset === "desertMountain2" ||
    tileset === "desertMountain3" ||
    tileset === "desertMountain2_2" ||
    tileset === "desertMountain3_2" ||
    tileset === "desert2_2" ||
    tileset === "hills1" ||
    tileset === "hills2" ||
    tileset === "hills3" ||
    tileset === "hills4" ||
    tileset === "hills5" ||
    tileset === "hills6" ||
    tileset === "hills7" ||
    tileset === "hills8" ||
    tileset === "mines1" ||
    tileset === "mines2" || //WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2
    tileset === "mines3" || //WALL_CORNER_INDEX_TO_FRAME_0_1_MINES3
    tileset === "tower1" || // WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1
    tileset === "tower2" ||
    tileset === "tower3" ||
    tileset === "tower4" ||
    tileset === "cityWalls1_0_0" ||
    tileset === "cityWalls1_0_1" ||
    tileset === "cityWalls1_2_0" ||
    tileset === "cityTiles_0_1" ||
    tileset === "cityTiles_0_2" ||
    tileset === "cityTiles_0_3" ||
    tileset === "cityTiles_0_4" ||
    tileset === "muddyCave_0_0" ||
    tileset === "muddyCaveV2_0_0" ||
    tileset === "muddyCaveV3_0_0" ||
    tileset === "muddyCaveV4_0_0" ||
    tileset === "summerForest_0_0" ||
    tileset === "summerForest_0_1" ||
    tileset === "summerForest_1_0" ||
    tileset === "summerForest_0_2" ||
    tileset === "summerForest_0_3_0" ||
    tileset === "summerForest_0_3_1" ||
    tileset === "summerForest_0_3_2" ||
    tileset === "summerForestWater_0_0" ||
    tileset === "summerForestWater_0_1" ||
    tileset === "summerForestWater_0_2" ||
    tileset === "summerForestWater_0_3" ||
    tileset === "autumnForest_0_0" ||
    tileset === "autumnForest_0_1" ||
    tileset === "autumnForest_1_0" ||
    tileset === "autumnForest_0_2" ||
    tileset === "autumnForest_0_3_0" ||
    tileset === "autumnForest_0_3_1" ||
    tileset === "autumnForest_0_3_2" ||
    tileset === "autumnForestWater_0_0" ||
    tileset === "autumnForestWater_0_1" ||
    tileset === "autumnForestWater_0_2" ||
    tileset === "autumnForestWater_0_3" ||
    tileset === "winterForest_0_0" ||
    tileset === "winterForest_0_1" ||
    tileset === "winterForest_1_0" ||
    tileset === "winterForest_0_2" ||
    tileset === "winterForest_0_3_0" ||
    tileset === "winterForest_0_3_1" ||
    tileset === "winterForest_0_3_2" ||
    tileset === "winterForestWater_0_0" ||
    tileset === "winterForestWater_0_1" ||
    tileset === "winterForestWater_0_2" ||
    tileset === "winterForestWater_0_3" ||
    tileset === "winterSnowyForest_0_0" ||
    tileset === "winterSnowyForest_0_1" ||
    tileset === "winterSnowyForest_1_0" ||
    tileset === "winterSnowyForest_0_2" ||
    tileset === "winterSnowyForest_0_3_0" ||
    tileset === "winterSnowyForest_0_3_1" ||
    tileset === "winterSnowyForest_0_3_2" ||
    tileset === "winterSnowyForestWater_0_0" ||
    tileset === "winterSnowyForestWater_0_1" ||
    tileset === "winterSnowyForestWater_0_2" ||
    tileset === "winterSnowyForestWater_0_3" ||
    tileset === "springForest_0_0" ||
    tileset === "springForest_0_1" ||
    tileset === "springForest_1_0" ||
    tileset === "springForest_0_2" ||
    tileset === "springForest_0_3_0" ||
    tileset === "springForest_0_3_1" ||
    tileset === "springForest_0_3_2" ||
    tileset === "springForestWater_0_0" ||
    tileset === "springForestWater_0_1" ||
    tileset === "springForestWater_0_2" ||
    tileset === "springForestWater_0_3" ||
    tileset === "castleDungeonV01_0_0" ||
    tileset === "castleDungeonV01_0_1" ||
    tileset === "castleDungeonV02_0_0" ||
    tileset === "castleDungeonV02_0_1" ||
    tileset === "castleDungeonV03_0_0" ||
    tileset === "castleDungeonV03_0_1" ||
    tileset === "castleDungeonV04_0_0" ||
    tileset === "castleDungeonV04_0_1";
  const useDungeon1Autotile = tileset === "dungeon1";
  const useFortress1Autotile = tileset === "fortress1";

  let phaserTilesetKey;
  let renderGrid;
  let dungeon1FloorFrameValue;
  let composedFloorSlots = [0];

  if (useFortress1Autotile) {
    phaserTilesetKey = FORTRESS_AUTOTILE_SPRITESHEET.key;

    renderGrid = Array.from({ length: grid.length }, (_, y) =>
      new Array(grid[0].length).fill(0).map((_, x) => {
        const isWall = grid[y][x] === WALL;
        if (isWall) {
          const mask = computeMask(x, y, (nx, ny) => grid[ny]?.[nx] === WALL);
          return fortressAutotileFrame(FORTRESS1_TILESET.roles.wall, mask);
        }
        const mask = computeMask(x, y, (nx, ny) => grid[ny]?.[nx] !== WALL);
        return fortressAutotileFrame(FORTRESS1_TILESET.roles.floor, mask);
      }),
    );
  } else if (useDungeon1Autotile) {
    phaserTilesetKey = DUNGEON_AUTOTILE_SPRITESHEET.key;
    dungeon1FloorFrameValue = floorFrame(DUNGEON1_TILESET.roles.floor);

    renderGrid = Array.from({ length: grid.length }, () =>
      new Array(grid[0].length).fill(dungeon1FloorFrameValue),
    );
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === WALL) {
          renderGrid[y][x] = floorFrame(DUNGEON1_TILESET.roles.wall);
        }
      }
    }
  } else if (tileset === "desert") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT_AUTOTILE_SPRITESHEET,
      "desert",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desertMountain2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT_AUTOTILE_SPRITESHEET,
      "desert-mountain2",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desertMountain3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT_AUTOTILE_SPRITESHEET,
      "desert-mountain3",
      WALL_CORNER_INDEX_TO_FRAME_1_0,
      65, // <-- pareil, a confirmer
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desert2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT_AUTOTILE_SPRITESHEET,
      "desert2",
      WALL_CORNER_INDEX_TO_FRAME_2_0,
      65,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desert_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT2_AUTOTILE_SPRITESHEET,
      "desert_2",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desertMountain2_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT2_AUTOTILE_SPRITESHEET,
      "desert-mountain2_2",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desertMountain3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT2_AUTOTILE_SPRITESHEET,
      "desert-mountain3_2",
      WALL_CORNER_INDEX_TO_FRAME_1_0,
      65, // <-- pareil, a confirmer
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "desert2_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DESERT2_AUTOTILE_SPRITESHEET,
      "desert2_2",
      WALL_CORNER_INDEX_TO_FRAME_2_0,
      65,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DESERT2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS1_AUTOTILE_SPRITESHEET,
      "hills1",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls1_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS1_AUTOTILE_SPRITESHEET,
      "city-walls1_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_CITY_WALLS,
      113 || 17, // sol assorti a la ville - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls1_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS1_AUTOTILE_SPRITESHEET,
      "city-walls1_0_1",
      WALL_CORNER_INDEX_TO_FRAME_0_1_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls1_2_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS1_AUTOTILE_SPRITESHEET,
      "city-walls1_2_0",
      WALL_CORNER_INDEX_TO_FRAME_2_0_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls2_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS2_AUTOTILE_SPRITESHEET,
      "city-walls2_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_CITY_WALLS,
      113 || 17, // sol assorti a la ville - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls2_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS2_AUTOTILE_SPRITESHEET,
      "city-walls2_0_1",
      WALL_CORNER_INDEX_TO_FRAME_0_1_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls2_2_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS2_AUTOTILE_SPRITESHEET,
      "city-walls2_2_0",
      WALL_CORNER_INDEX_TO_FRAME_2_0_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls3_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS3_AUTOTILE_SPRITESHEET,
      "city-walls3_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_CITY_WALLS,
      113 || 17, // sol assorti a la ville - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls3_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS3_AUTOTILE_SPRITESHEET,
      "city-walls3_0_1",
      WALL_CORNER_INDEX_TO_FRAME_0_1_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityWalls3_2_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_WALLS3_AUTOTILE_SPRITESHEET,
      "city-walls3_2_0",
      WALL_CORNER_INDEX_TO_FRAME_2_0_CITY_WALLS,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_WALLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "tower1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      TOWER1_AUTOTILE_SPRITESHEET,
      "tower1",
      WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1,
      20, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = TOWER1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "tower2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      TOWER2_AUTOTILE_SPRITESHEET,
      "tower2",
      WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1,
      20, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = TOWER2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "tower3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      TOWER3_AUTOTILE_SPRITESHEET,
      "tower3",
      WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1,
      20, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = TOWER3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "tower4") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      TOWER4_AUTOTILE_SPRITESHEET,
      "tower4",
      WALL_CORNER_INDEX_TO_FRAME_0_0_TOWER1,
      20, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = TOWER4_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS1_AUTOTILE_SPRITESHEET,
      "hills2",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "mines1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MINES1_AUTOTILE_SPRITESHEET,
      "mines1",
      WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MINES1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "mines2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MINES2_AUTOTILE_SPRITESHEET,
      "mines2",
      WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2,
      17, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MINES2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "mines3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MINES3_AUTOTILE_SPRITESHEET,
      "mines3",
      WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2,
      17, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MINES3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills3",
      WALL_CORNER_INDEX_TO_FRAME_1_0_MOUNTAIN3B,
      65, // <-- pareil, a confirmer
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills4") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills4",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills5") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS2_AUTOTILE_SPRITESHEET,
      "hills5",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills6") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS2_AUTOTILE_SPRITESHEET,
      "hills6",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills7") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS2_AUTOTILE_SPRITESHEET,
      "hills7",
      WALL_CORNER_INDEX_TO_FRAME_1_0_MOUNTAIN3B,
      113, // <-- pareil, a confirmer
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills8") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS2_AUTOTILE_SPRITESHEET,
      "hills8",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills9") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills9",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills10") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills10",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills11") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills11",
      WALL_CORNER_INDEX_TO_FRAME_1_0_MOUNTAIN3B,
      113, // <-- pareil, a confirmer
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "hills12") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      HILLS3_AUTOTILE_SPRITESHEET,
      "hills12",
      WALL_CORNER_INDEX_TO_FRAME_0_1,
      20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = HILLS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "snow") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SNOW_AUTOTILE_SPRITESHEET,
      "snow",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SNOW_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "darkwoods_1_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DARKWOODS_AUTOTILE_SPRITESHEET,
      "darkwoods_1_1",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      [
        { tileId: 17, weight: 5 },
        { tileId: 65, weight: 3 },
        { tileId: 113, weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DARKWOODS_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "darkwoods_1_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DARKWOODS_AUTOTILE_SPRITESHEET,
      "darkwoods_1_2",
      WALL_CORNER_INDEX_TO_FRAME_0_1_MINES2,
      [
        { tileId: 20, weight: 5 },
        { tileId: 161, weight: 3 },
        { tileId: 113, weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DARKWOODS_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "darkwoods_1_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DARKWOODS_AUTOTILE_SPRITESHEET,
      "darkwoods_1_3",
      WALL_CORNER_INDEX_TO_FRAME_DARKWOODS_1_3,
      // [
      //   { tileId: 20, weight: 5 },
      //   { tileId: 161, weight: 3 },
      //   { tileId: 113, weight: 1 },
      // ],
      65,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DARKWOODS_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "darkwoods2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      DARKWOODS2_AUTOTILE_SPRITESHEET,
      "darkwoods2",
      WALL_CORNER_INDEX_TO_FRAME_0_0,
      17,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = DARKWOODS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityTiles_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_TILES_AUTOTILE_SPRITESHEET,
      "cityTiles_0_1",
      WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_1,
      225,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_TILES_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityTiles_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_TILES_AUTOTILE_SPRITESHEET,
      "cityTiles_0_2",
      WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_2,
      225,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_TILES_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityTiles_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_TILES_AUTOTILE_SPRITESHEET,
      "cityTiles_0_3",
      WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_3,
      225,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_TILES_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "cityTiles_0_4") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CITY_TILES_AUTOTILE_SPRITESHEET,
      "cityTiles_0_4",
      WALL_CORNER_INDEX_TO_FRAME_CITY_TILE_0_4,
      259,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CITY_TILES_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_1_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
      "standardFields_1_0_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_0_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_1_1_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
      "standardFields_1_1_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_1_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS1_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_2_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
      "standardFields_2_0_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_0_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_2_1_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
      "standardFields_2_1_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_1_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_3_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
      "standardFields_3_0_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_0_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "standardFields_3_1_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
      "standardFields_3_1_1",
      WALL_CORNER_INDEX_TO_FRAME_STANDARD_FIELDS_1_1,
      81,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = STANDARD_FIELDS3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "muddyCave_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MUDDY_CAVE_AUTOTILE_SPRITESHEET,
      "muddyCave_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_MUDDY_CAVE,
      101,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MUDDY_CAVE_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "muddyCaveV2_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MUDDY_CAVE_V2_AUTOTILE_SPRITESHEET,
      "muddyCaveV2_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_MUDDY_CAVE,
      101,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MUDDY_CAVE_V2_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "muddyCaveV3_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MUDDY_CAVE_V3_AUTOTILE_SPRITESHEET,
      "muddyCaveV3_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_MUDDY_CAVE,
      101,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MUDDY_CAVE_V3_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "muddyCaveV4_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      MUDDY_CAVE_V4_AUTOTILE_SPRITESHEET,
      "muddyCaveV4_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_MUDDY_CAVE,
      101,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = MUDDY_CAVE_V4_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_0,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1,
      // 32,
      [
        { tileId: 32, weight: 5 },
        { tileId: [32, 516], weight: 1 },
        { tileId: [32, 521], weight: 1 },
        { tileId: [32, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_1_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_1_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0,
      38,
      // [
      //   { tileId: 38, weight: 5 },
      //   { tileId: [38, 516], weight: 1 },
      //   { tileId: [38, 521], weight: 1 },
      //   { tileId: [38, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2,
      32,
      // [
      //   { tileId: 42, weight: 5 },
      //   { tileId: [42, 516], weight: 1 },
      //   { tileId: [42, 521], weight: 1 },
      //   { tileId: [42, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_3_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_3_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0,
      // 38,
      [
        { tileId: 34, weight: 5 },
        { tileId: [34, 516], weight: 1 },
        { tileId: [34, 521], weight: 1 },
        { tileId: [34, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_3_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_3_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1,
      // 38,
      [
        { tileId: 38, weight: 5 },
        { tileId: [38, 516], weight: 1 },
        { tileId: [38, 521], weight: 1 },
        { tileId: [38, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForest_0_3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForest_0_3_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2,
      42,
      // [
      //   { tileId: 42, weight: 5 },
      //   { tileId: [42, 516], weight: 1 },
      //   { tileId: [42, 521], weight: 1 },
      //   { tileId: [42, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForestWater_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForestWater_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForestWater_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForestWater_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForestWater_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForestWater_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "summerForestWater_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SUMMER_FOREST_AUTOTILE_SPRITESHEET,
      "summerForestWater_0_3",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SUMMER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_WINTER_SNOWY_FOREST,
      [
        { tileId: [32, 621], weight: 5 },
        { tileId: [64, 516, 621], weight: 1 },
        { tileId: [96, 521, 621], weight: 1 },
        { tileId: [128, 524, 621], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1,
      // 38,
      [
        { tileId: 32, weight: 5 },
        { tileId: 197, weight: 1 },
        { tileId: 229, weight: 1 },
        { tileId: 232, weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForestWater_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForestWater_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_1_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_1_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_3_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_3_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0,
      [
        { tileId: 34, weight: 5 },
        { tileId: [34, 516], weight: 1 },
        { tileId: [34, 521], weight: 1 },
        { tileId: [34, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_3_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_3_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1,
      [
        { tileId: 38, weight: 5 },
        { tileId: [38, 516], weight: 1 },
        { tileId: [38, 521], weight: 1 },
        { tileId: [38, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForest_0_3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForest_0_3_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2,
      42,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForestWater_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForestWater_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForestWater_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForestWater_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "springForestWater_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      SPRING_FOREST_AUTOTILE_SPRITESHEET,
      "springForestWater_0_3",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = SPRING_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_0,
      // 38,
      [
        { tileId: 32, weight: 5 },
        { tileId: 64, weight: 1 },
        { tileId: 96, weight: 1 },
        { tileId: 128, weight: 1 },
        { tileId: 160, weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1,
      // 38,
      [
        { tileId: 32, weight: 5 },
        { tileId: [32, 516], weight: 1 },
        { tileId: [32, 521], weight: 1 },
        { tileId: [32, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2,
      // 38,
      [
        { tileId: 32, weight: 5 },
        { tileId: [32, 516], weight: 1 },
        { tileId: [32, 521], weight: 1 },
        { tileId: [32, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_3_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_3_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1,
      // 38,
      [
        { tileId: 38, weight: 5 },
        { tileId: [38, 516], weight: 1 },
        { tileId: [38, 521], weight: 1 },
        { tileId: [38, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForestWater_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForestWater_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForestWater_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForestWater_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_1_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_1_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_3_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_3_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0,
      [
        { tileId: 34, weight: 5 },
        { tileId: [34, 516], weight: 1 },
        { tileId: [34, 521], weight: 1 },
        { tileId: [34, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForest_0_3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForest_0_3_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2,
      42,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForestWater_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForestWater_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "autumnForestWater_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
      "autumnForestWater_0_3",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = AUTUMN_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_0,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_3_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_3_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1,
      // 38,
      [
        { tileId: 38, weight: 5 },
        { tileId: [38, 516], weight: 1 },
        { tileId: [38, 521], weight: 1 },
        { tileId: [38, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1,
      32,
      // [
      //   { tileId: 38, weight: 5 },
      //   { tileId: [38, 516], weight: 1 },
      //   { tileId: [38, 521], weight: 1 },
      //   { tileId: [38, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_1_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_1_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0,
      38,
      // [
      //   { tileId: 38, weight: 5 },
      //   { tileId: [38, 516], weight: 1 },
      //   { tileId: [38, 521], weight: 1 },
      //   { tileId: [38, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForestWater_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForestWater_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForestWater_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForestWater_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_3_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_3_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0,
      [
        { tileId: 34, weight: 5 },
        { tileId: [34, 516], weight: 1 },
        { tileId: [34, 521], weight: 1 },
        { tileId: [34, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForest_0_3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForest_0_3_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2,
      42,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForestWater_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForestWater_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterForestWater_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_AUTOTILE_SPRITESHEET,
      "winterForestWater_0_3",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_0",
      WALL_CORNER_INDEX_TO_FRAME_0_0_WINTER_SNOWY_FOREST,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_1,
      // 38,
      [
        { tileId: 32, weight: 5 },
        { tileId: [32, 516], weight: 1 },
        { tileId: [32, 521], weight: 1 },
        { tileId: [32, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForestWater_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForestWater_0_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForestWater_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForestWater_0_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_1,
      38,
      // [
      //   { tileId: 38, weight: 5 },
      //   { tileId: [38, 516], weight: 1 },
      //   { tileId: [38, 521], weight: 1 },
      //   { tileId: [38, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForestWater_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForestWater_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForestWater_0_3") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForestWater_0_3",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_WATER_0_3,
      32,
      // [
      //   { tileId: 38, weight: 5 },
      //   { tileId: [38, 516], weight: 1 },
      //   { tileId: [38, 521], weight: 1 },
      //   { tileId: [38, 524], weight: 1 },
      // ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_1_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_1_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_1_0,
      38,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_2,
      32,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_3_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_3_0",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_0,
      [
        { tileId: 34, weight: 5 },
        { tileId: [34, 516], weight: 1 },
        { tileId: [34, 521], weight: 1 },
        { tileId: [34, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_3_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_3_1",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_1,
      [
        { tileId: 38, weight: 5 },
        { tileId: [38, 516], weight: 1 },
        { tileId: [38, 521], weight: 1 },
        { tileId: [38, 524], weight: 1 },
      ],
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "winterSnowyForest_0_3_2") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
      "winterSnowyForest_0_3_2",
      WALL_CORNER_INDEX_TO_FRAME_FOREST_0_3_2,
      42,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV01_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
      "castleDungeonV01_0_0",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_1,
      40,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV01_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
      "castleDungeonV01_0_1",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_2,
      36,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV02_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
      "castleDungeonV02_0_0",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_1,
      40,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV02_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
      "castleDungeonV02_0_1",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_2,
      36,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV03_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
      "castleDungeonV03_0_0",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_1,
      40,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV03_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
      "castleDungeonV03_0_1",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_2,
      36,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV04_0_0") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V04_AUTOTILE_SPRITESHEET,
      "castleDungeonV04_0_0",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_1,
      40,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V04_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else if (tileset === "castleDungeonV04_0_1") {
    const result = composeCornerAutotileTexture(
      scene,
      grid,
      CASTLE_DUNGEON_V04_AUTOTILE_SPRITESHEET,
      "castleDungeonV04_0_1",
      WALL_CORNER_INDEX_TO_FRAME_CASTLE_DUNGEON_0_2,
      36,
    );
    phaserTilesetKey = result.phaserTilesetKey;
    renderGrid = result.renderGrid;
    composedFloorSlots = result.floorSlotIndices;
    scene.currentFloorTileIndex = composedFloorSlots[0];
    scene.currentRawTilesetKey = CASTLE_DUNGEON_V04_AUTOTILE_SPRITESHEET.key; // adapte a la constante reellement utilisee dans CETTE branche precise
    scene.currentRenderGrid = renderGrid;
    scene.currentSlotSourceTileIds = result.slotSourceTileIds;
  } else {
    const colors = TILESET_COLORS[tileset] || TILESET_COLORS.cave;
    phaserTilesetKey = "tiles-" + tileset;
    if (scene.textures.exists(phaserTilesetKey))
      scene.textures.remove(phaserTilesetKey);
    const canvasTex = scene.textures.createCanvas(
      phaserTilesetKey,
      TILE_SIZE * 2,
      TILE_SIZE,
    );
    const ctx = canvasTex.getContext();

    const tileImages = TILE_IMAGE_REGISTRY[tileset];
    const hasRealFloor =
      tileImages &&
      tileImages.floorKey &&
      scene.textures.exists(tileImages.floorKey);
    const hasRealWall =
      tileImages &&
      tileImages.wallKey &&
      scene.textures.exists(tileImages.wallKey);

    if (hasRealFloor) {
      ctx.drawImage(
        scene.textures.get(tileImages.floorKey).getSourceImage(),
        0,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
    } else {
      ctx.fillStyle = Phaser.Display.Color.IntegerToColor(colors.floor).rgba;
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    }
    if (hasRealWall) {
      ctx.drawImage(
        scene.textures.get(tileImages.wallKey).getSourceImage(),
        TILE_SIZE,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
    } else {
      ctx.fillStyle = Phaser.Display.Color.IntegerToColor(colors.wall).rgba;
      ctx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    }
    canvasTex.refresh();

    renderGrid = grid;

    if (data.townBuildings && data.townBuildings.length > 0) {
      for (const building of data.townBuildings) {
        const houseDef = CITY_HOUSES[building.houseKey];
        if (!houseDef) continue;

        const houseTexKey = `house-${building.houseKey}`;
        if (!scene.textures.exists(houseTexKey)) {
          const sourceImg = scene.textures
            .get(CITY_TILES_AUTOTILE_SPRITESHEET.key)
            .getSourceImage();
          const houseTex = scene.textures.createCanvas(
            houseTexKey,
            houseDef.width,
            houseDef.height,
          );
          const hctx = houseTex.getContext();
          hctx.drawImage(
            sourceImg,
            houseDef.x,
            houseDef.y,
            houseDef.width,
            houseDef.height,
            0,
            0,
            houseDef.width,
            houseDef.height,
          );
          houseTex.refresh();
        }

        const houseSprite = scene.add.image(
          building.x * TILE_SIZE,
          building.y * TILE_SIZE,
          houseTexKey,
        );
        houseSprite.setOrigin(0, 0);
        const targetWidth = Math.ceil(houseDef.width / 16) * TILE_SIZE;
        const targetHeight = Math.ceil(houseDef.height / 16) * TILE_SIZE;
        houseSprite.setDisplaySize(targetWidth, targetHeight);
        houseSprite.setDepth(6); // sous le heros (10) et les ennemis (8) - pas de tri dynamique par Y dans ce moteur, simplification volontaire
        scene.townHouseSprites.push(houseSprite);
      }
    }
  }

  scene.map = scene.make.tilemap({
    data: renderGrid,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
  });
  const phaserTileset = scene.map.addTilesetImage(
    phaserTilesetKey,
    phaserTilesetKey,
    TILE_SIZE,
    TILE_SIZE,
    0,
    0,
  );
  scene.layer = scene.map.createLayer(0, phaserTileset, 0, 0);

  if (useFortress1Autotile) {
    const wallRowStart = FORTRESS1_TILESET.roles.wall * COLUMNS_PER_ROW;
    scene.layer.setCollisionBetween(wallRowStart, wallRowStart + 46, true);
  } else if (useDungeon1Autotile) {
    scene.layer.setCollisionByExclusion([dungeon1FloorFrameValue]);
  } else if (useRealAutotile) {
    scene.layer.setCollisionByExclusion(composedFloorSlots);
  } else {
    scene.layer.setCollision(WALL);
  }
  scene.layer.setDepth(0);
  if (
    data.secretRoom &&
    scene.discoveredSecretRoomDepths.includes(depth) &&
    data.secretRoom.triggerType !== "combat"
  ) {
    const door = data.secretRoom.doorTile;
    scene.layer.putTileAt(scene.currentFloorTileIndex ?? 0, door.x, door.y);
  }
}

/**
 * Place les decorations purement esthetiques d'un etage (rochers, buissons,
 * fleurs, clotures, lianes...) - AUCUN etat de jeu, juste des sprites; a ne
 * pas confondre avec les coffres/pieges/minerais/ressources recoltables
 * (spawnChests/spawnTraps/spawnMiningRocks/spawnForageNodes, floorEntities.js)
 * qui portent un etat (loot, hits, declenche...) et restent donc separes.
 *
 * Deplacee telle quelle depuis MainScene.loadLevel().
 *
 * @param {Phaser.Scene} scene
 * @param {object} data - la reponse complete de fetchLevel (utilise ici
 *   data.decorations)
 */
export function spawnFloorDecorations(scene, data) {
  // chaque entree porte desormais sa PROPRE spritesheet (plus seulement
  // ses frames) - necessaire depuis qu'un decor peut venir soit de
  // CITY_TILES_AUTOTILE_SPRITESHEET (16x16), soit de
  // OBJECTS_DUNGEON_01_SPRITESHEET (32x32, 12 colonnes x 8 lignes,
  // frame = ligne*12 + colonne, 0-indexe) - d'ou setScale qui se base
  // maintenant sur le frameWidth propre a chaque sheet plutot qu'un 16
  // fige.
  const DECOR_ENTRIES = {
    rock_small: {
      spriteSheet: CITY_TILES_AUTOTILE_SPRITESHEET,
      frames: [5, 6],
    },
    bush: {
      spriteSheet: CITY_TILES_AUTOTILE_SPRITESHEET,
      frames: [101, 228],
    },
    flower_patch: {
      spriteSheet: CITY_TILES_AUTOTILE_SPRITESHEET,
      frames: [69, 70, 71, 102, 103],
    },
    // OBJECTS_DUNGEON_01_SPRITESHEET - indices de depart a VERIFIER en
    // jeu et corriger selon le vrai contenu du fichier (je n'ai pas pu
    // lire les pixels exacts depuis l'image) :
    wooden_fence: {
      spriteSheet: OBJECTS_DUNGEON_01_SPRITESHEET,
      frames: [0, 1, 2],
    },
    crate: {
      spriteSheet: OBJECTS_DUNGEON_01_SPRITESHEET,
      frames: [3, 4, 5],
    },
    boulder: {
      spriteSheet: OBJECTS_DUNGEON_01_SPRITESHEET,
      frames: [6, 7, 8],
    },
    ground_crack: {
      spriteSheet: OBJECTS_DUNGEON_01_SPRITESHEET,
      frames: [
        9, 10, 11, 21, 22, 23, 33, 34, 35, 57, 58, 59, 69, 70, 71, 81, 82, 83,
      ],
    },
    vines: {
      spriteSheet: DETAILS_SPRITESHEET,
      frames: [38, 39],
    },
    flower: {
      spriteSheet: DETAILS_SPRITESHEET,
      frames: [240, 241, 242, 243, 244, 245, 246, 247],
    },
  };
  const decorVariantRng = createRng(`${scene.currentSeed}-decor-variants`);
  (data.decorations || []).forEach((decorData) => {
    const entry =
      DECOR_ENTRIES[decorData.decorType] || DECOR_ENTRIES.rock_small;
    const frame =
      entry.frames[Math.floor(decorVariantRng() * entry.frames.length)];

    const sprite = scene.add.sprite(
      decorData.x * TILE_SIZE + TILE_SIZE / 2,
      decorData.y * TILE_SIZE + TILE_SIZE / 2,
      entry.spriteSheet.key,
      frame,
    );
    sprite.setScale(TILE_SIZE / entry.spriteSheet.frameWidth);
    sprite.setDepth(4);
    scene.decorationSprites.push(sprite);
  });
}
