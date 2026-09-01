/**
 * fortress1.js — config du tileset "Set_A5_Fortress1" converti par Splitiler.
 *
 * Même moteur générique que dungeon1.js (blob47.js) — seule cette config
 * change. Image source : client/src/assets/tilesets/fortress1_splitiler.png
 * 1504×1568px = 47 colonnes × 49 lignes de tuiles 32×32.
 *
 * Contrairement au tileset dungeon1 (dont les murs n'avaient aucune vraie
 * forme, vérifié pixel par pixel), CELUI-CI a été vérifié comme ayant une
 * vraie composition de coins (mélange couleur mur/sol dans la tuile,
 * opaque, comme RPG Maker le fait réellement) sur la plupart des lignes.
 * ⚠️ Reste à confirmer via DebugTilesetScene (row 6 ou 10) avant de brancher
 * dans MainScene.js — voir README du kit blob47.
 */

import { shapeIndex } from "../blob47";

export const COLUMNS_PER_ROW = 47;
export const TILE_SIZE = 32;

export const FORTRESS1_TILESET = {
  spriteKey: "fortressAutotile",
  tileSize: TILE_SIZE,

  // row_index tirés de materials.json (voir fortress_materials_contact_sheet.png)
  roles: {
    wall: 6, // mur pierre/brique brune (A) - proche teinte Dungeon1, vraie forme confirmee
    floor: 32, // sol pierre/brique brune (A) - vraie forme confirmee
    wallAlt: 32, // mur pierre/brique claire (A) - variante optionnelle, vraie forme confirmee
    wallTrim: 22, // mur pierre bleu-gris avec liseret - variante optionnelle
    water: 14, // eau bleue profonde (pleine)
    waterEdge: 13, // eau bleue profonde (bord vague)
  },
};

export function floorFrame(roleRowIndex, col = 46) {
  return roleRowIndex * COLUMNS_PER_ROW + col;
}

export function autotileFrame(roleRowIndex, neighborMask) {
  const col = shapeIndex(neighborMask);
  return roleRowIndex * COLUMNS_PER_ROW + col;
}
