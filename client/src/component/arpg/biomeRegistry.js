/**
 * Registre des biomes/tilesets pour BiomeGalleryScreen.js - liste
 * exhaustive des chaines `tileset` gerees par `buildFloorTilemap`
 * (floorRenderer.js), extraite mecaniquement du gros if/else if de cette
 * fonction (97 branches a autotile "coins" reel + composeCornerAutotileTexture,
 * plus les 10 biomes de secours a couleur plate/image simple geres par la
 * branche `else` - cf. TILESET_COLORS dans floorRenderer.js).
 *
 * dungeon1/fortress1 VOLONTAIREMENT EXCLUS (passent par blob47.js, cf.
 * demande explicite du 30/09 - "ca ne marche pas, il faudra que je le
 * vire").
 *
 * `spritesheet: null` = biome de secours (branche `else` de
 * buildFloorTilemap) - pas de spritesheet dediee, juste une couleur unie
 * ou, pour cave/tree, une image simple via TILE_IMAGE_REGISTRY
 * (getTileImagesToLoad() les charge toutes, peu couteux).
 *
 * displayName est un libelle BRUT derive mecaniquement de la cle
 * technique (pas de nom soigne choisi a la main, contrairement au
 * bestiaire) - purement un outil de debug pour l'instant.
 */

import {
  AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
  CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
  CITY_TILES_AUTOTILE_SPRITESHEET,
  CITY_WALLS1_AUTOTILE_SPRITESHEET,
  CITY_WALLS2_AUTOTILE_SPRITESHEET,
  CITY_WALLS3_AUTOTILE_SPRITESHEET,
  DARKWOODS2_AUTOTILE_SPRITESHEET,
  DARKWOODS_AUTOTILE_SPRITESHEET,
  DESERT_AUTOTILE_SPRITESHEET,
  HILLS1_AUTOTILE_SPRITESHEET,
  HILLS2_AUTOTILE_SPRITESHEET,
  HILLS3_AUTOTILE_SPRITESHEET,
  MINES1_AUTOTILE_SPRITESHEET,
  MINES2_AUTOTILE_SPRITESHEET,
  MUDDY_CAVE_AUTOTILE_SPRITESHEET,
  MUDDY_CAVE_V2_AUTOTILE_SPRITESHEET,
  SNOW_AUTOTILE_SPRITESHEET,
  SPRING_FOREST_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
  SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  TOWER1_AUTOTILE_SPRITESHEET,
  TOWER2_AUTOTILE_SPRITESHEET,
  TOWER3_AUTOTILE_SPRITESHEET,
  WINTER_FOREST_AUTOTILE_SPRITESHEET,
  WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
} from "./spriteRegistry";

export const BIOME_REGISTRY = [
  {
    tilesetKey: "desert",
    displayName: "Desert",
    spritesheet: DESERT_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "desertMountain2",
    displayName: "Desert Mountain 2",
    spritesheet: DESERT_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "desertMountain3",
    displayName: "Desert Mountain 3",
    spritesheet: DESERT_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "desert2",
    displayName: "Desert 2",
    spritesheet: DESERT_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills1",
    displayName: "Hills 1",
    spritesheet: HILLS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls1_0_0",
    displayName: "City Walls1_0_0",
    spritesheet: CITY_WALLS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls1_0_1",
    displayName: "City Walls1_0_1",
    spritesheet: CITY_WALLS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls1_2_0",
    displayName: "City Walls1_2_0",
    spritesheet: CITY_WALLS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls2_0_0",
    displayName: "City Walls2_0_0",
    spritesheet: CITY_WALLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls2_0_1",
    displayName: "City Walls2_0_1",
    spritesheet: CITY_WALLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls2_2_0",
    displayName: "City Walls2_2_0",
    spritesheet: CITY_WALLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls3_0_0",
    displayName: "City Walls3_0_0",
    spritesheet: CITY_WALLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls3_0_1",
    displayName: "City Walls3_0_1",
    spritesheet: CITY_WALLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityWalls3_2_0",
    displayName: "City Walls3_2_0",
    spritesheet: CITY_WALLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "tower1",
    displayName: "Tower 1",
    spritesheet: TOWER1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "tower2",
    displayName: "Tower 2",
    spritesheet: TOWER2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "tower3",
    displayName: "Tower 3",
    spritesheet: TOWER3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills2",
    displayName: "Hills 2",
    spritesheet: HILLS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "mines1",
    displayName: "Mines 1",
    spritesheet: MINES1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "mines2",
    displayName: "Mines 2",
    spritesheet: MINES2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills3",
    displayName: "Hills 3",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills4",
    displayName: "Hills 4",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills5",
    displayName: "Hills 5",
    spritesheet: HILLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills6",
    displayName: "Hills 6",
    spritesheet: HILLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills7",
    displayName: "Hills 7",
    spritesheet: HILLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills8",
    displayName: "Hills 8",
    spritesheet: HILLS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills9",
    displayName: "Hills 9",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills10",
    displayName: "Hills 10",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills11",
    displayName: "Hills 11",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "hills12",
    displayName: "Hills 12",
    spritesheet: HILLS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "snow",
    displayName: "Snow",
    spritesheet: SNOW_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "darkwoods_1_1",
    displayName: "Darkwoods 1 1",
    spritesheet: DARKWOODS_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "darkwoods_1_2",
    displayName: "Darkwoods 1 2",
    spritesheet: DARKWOODS_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "darkwoods_1_3",
    displayName: "Darkwoods 1 3",
    spritesheet: DARKWOODS_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "darkwoods2",
    displayName: "Darkwoods 2",
    spritesheet: DARKWOODS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityTiles_0_1",
    displayName: "City Tiles 0 1",
    spritesheet: CITY_TILES_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityTiles_0_2",
    displayName: "City Tiles 0 2",
    spritesheet: CITY_TILES_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityTiles_0_3",
    displayName: "City Tiles 0 3",
    spritesheet: CITY_TILES_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "cityTiles_0_4",
    displayName: "City Tiles 0 4",
    spritesheet: CITY_TILES_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_1_0_1",
    displayName: "Standard Fields 1 0 1",
    spritesheet: STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_1_1_1",
    displayName: "Standard Fields 1 1 1",
    spritesheet: STANDARD_FIELDS1_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_2_0_1",
    displayName: "Standard Fields 2 0 1",
    spritesheet: STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_2_1_1",
    displayName: "Standard Fields 2 1 1",
    spritesheet: STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_3_0_1",
    displayName: "Standard Fields 3 0 1",
    spritesheet: STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "standardFields_3_1_1",
    displayName: "Standard Fields 3 1 1",
    spritesheet: STANDARD_FIELDS3_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "muddyCave_0_0",
    displayName: "Muddy Cave 0 0",
    spritesheet: MUDDY_CAVE_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "muddyCaveV2_0_0",
    displayName: "Muddy Cave V 2 0 0",
    spritesheet: MUDDY_CAVE_V2_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_0",
    displayName: "Summer Forest 0 0",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_1",
    displayName: "Summer Forest 0 1",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_1_0",
    displayName: "Summer Forest 1 0",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_2",
    displayName: "Summer Forest 0 2",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_3_0",
    displayName: "Summer Forest 0 3 0",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_3_1",
    displayName: "Summer Forest 0 3 1",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForest_0_3_2",
    displayName: "Summer Forest 0 3 2",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForestWater_0_0",
    displayName: "Summer Forest Water 0 0",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForestWater_0_1",
    displayName: "Summer Forest Water 0 1",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForestWater_0_2",
    displayName: "Summer Forest Water 0 2",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "summerForestWater_0_3",
    displayName: "Summer Forest Water 0 3",
    spritesheet: SUMMER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_0",
    displayName: "Spring Forest 0 0",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_1",
    displayName: "Spring Forest 0 1",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForestWater_0_0",
    displayName: "Spring Forest Water 0 0",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_1_0",
    displayName: "Spring Forest 1 0",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_2",
    displayName: "Spring Forest 0 2",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_3_0",
    displayName: "Spring Forest 0 3 0",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_3_1",
    displayName: "Spring Forest 0 3 1",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForest_0_3_2",
    displayName: "Spring Forest 0 3 2",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForestWater_0_1",
    displayName: "Spring Forest Water 0 1",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForestWater_0_2",
    displayName: "Spring Forest Water 0 2",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "springForestWater_0_3",
    displayName: "Spring Forest Water 0 3",
    spritesheet: SPRING_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_0",
    displayName: "Autumn Forest 0 0",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_1",
    displayName: "Autumn Forest 0 1",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_2",
    displayName: "Autumn Forest 0 2",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_3_1",
    displayName: "Autumn Forest 0 3 1",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForestWater_0_0",
    displayName: "Autumn Forest Water 0 0",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForestWater_0_1",
    displayName: "Autumn Forest Water 0 1",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_1_0",
    displayName: "Autumn Forest 1 0",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_3_0",
    displayName: "Autumn Forest 0 3 0",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForest_0_3_2",
    displayName: "Autumn Forest 0 3 2",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForestWater_0_2",
    displayName: "Autumn Forest Water 0 2",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "autumnForestWater_0_3",
    displayName: "Autumn Forest Water 0 3",
    spritesheet: AUTUMN_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_0",
    displayName: "Winter Forest 0 0",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_3_1",
    displayName: "Winter Forest 0 3 1",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_1",
    displayName: "Winter Forest 0 1",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_1_0",
    displayName: "Winter Forest 1 0",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForestWater_0_0",
    displayName: "Winter Forest Water 0 0",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForestWater_0_1",
    displayName: "Winter Forest Water 0 1",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_2",
    displayName: "Winter Forest 0 2",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_3_0",
    displayName: "Winter Forest 0 3 0",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForest_0_3_2",
    displayName: "Winter Forest 0 3 2",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForestWater_0_2",
    displayName: "Winter Forest Water 0 2",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterForestWater_0_3",
    displayName: "Winter Forest Water 0 3",
    spritesheet: WINTER_FOREST_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_0",
    displayName: "Winter Snowy Forest 0 0",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_1",
    displayName: "Winter Snowy Forest 0 1",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForestWater_0_0",
    displayName: "Winter Snowy Forest Water 0 0",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForestWater_0_1",
    displayName: "Winter Snowy Forest Water 0 1",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForestWater_0_2",
    displayName: "Winter Snowy Forest Water 0 2",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForestWater_0_3",
    displayName: "Winter Snowy Forest Water 0 3",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_1_0",
    displayName: "Winter Snowy Forest 1 0",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_2",
    displayName: "Winter Snowy Forest 0 2",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_3_0",
    displayName: "Winter Snowy Forest 0 3 0",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_3_1",
    displayName: "Winter Snowy Forest 0 3 1",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "winterSnowyForest_0_3_2",
    displayName: "Winter Snowy Forest 0 3 2",
    spritesheet: WINTER_FOREST_SNOWY_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV01_0_0",
    displayName: "Castle Dungeon V 01 0 0",
    spritesheet: CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV01_0_1",
    displayName: "Castle Dungeon V 01 0 1",
    spritesheet: CASTLE_DUNGEON_V01_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV02_0_0",
    displayName: "Castle Dungeon V 02 0 0",
    spritesheet: CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV02_0_1",
    displayName: "Castle Dungeon V 02 0 1",
    spritesheet: CASTLE_DUNGEON_V02_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV03_0_0",
    displayName: "Castle Dungeon V 03 0 0",
    spritesheet: CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
  },
  {
    tilesetKey: "castleDungeonV03_0_1",
    displayName: "Castle Dungeon V 03 0 1",
    spritesheet: CASTLE_DUNGEON_V03_AUTOTILE_SPRITESHEET,
  },
  { tilesetKey: "cave", displayName: "Cave", spritesheet: null },
  { tilesetKey: "ruins", displayName: "Ruins", spritesheet: null },
  { tilesetKey: "cavechain", displayName: "Cavechain", spritesheet: null },
  {
    tilesetKey: "drunkardwalk",
    displayName: "Drunkardwalk",
    spritesheet: null,
  },
  { tilesetKey: "maze", displayName: "Maze", spritesheet: null },
  { tilesetKey: "noise", displayName: "Noise", spritesheet: null },
  { tilesetKey: "voronoi", displayName: "Voronoi", spritesheet: null },
  { tilesetKey: "tree", displayName: "Tree", spritesheet: null },
  { tilesetKey: "temple", displayName: "Temple", spritesheet: null },
  { tilesetKey: "town", displayName: "Town", spritesheet: null },
];
