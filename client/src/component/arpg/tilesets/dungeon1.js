/**
 * dungeon1.js — config du tileset "Set_A2_Dungeons1" converti par Splitiler.
 *
 * Ne contient AUCUNE logique d'autotiling (ça, c'est le rôle de blob47.js,
 * générique et partagé par tous les tilesets). Ce fichier fait juste le
 * lien entre les rôles sémantiques dont MainScene.js a besoin (wall, floor...)
 * et les numéros de ligne (row_index) du fichier materials.json généré à
 * partir de dungeon1_splitiler.png.
 *
 * Image source : client/src/assets/tilesets/dungeon1_splitiler.png
 * 1504×2336px = 47 colonnes × 73 lignes de tuiles 32×32.
 * Chargée en spritesheet Phaser (frameWidth/frameHeight = 32), donc Phaser
 * numérote les frames en row-major sur TOUTE la largeur de l'image :
 *   frameIndex = row_index * COLUMNS_PER_ROW + col
 *
 * ⚠️ Rappel non résolu (voir README du kit blob47) : l'ordre exact des 47
 * colonnes (quelle colonne = quelle forme) suit en principe le template
 * GameMaker Studio 2 utilisé par Splitiler, mais n'a pas été calibré
 * pixel par pixel. Si les murs/sols s'affichent avec les mauvais raccords
 * une fois en jeu, c'est ici (implicitement, via blob47.js) qu'il faut
 * corriger l'ordre — pas dans MainScene.js.
 */

import { shapeIndex } from "../blob47";

export const COLUMNS_PER_ROW = 47;
export const TILE_SIZE = 32;

export const DUNGEON1_TILESET = {
  spriteKey: "dungeonAutotile",
  tileSize: TILE_SIZE,

  // row_index tirés de materials.json (voir materials_contact_sheet.png
  // pour vérifier visuellement / ajuster ces choix)
  roles: {
    wall: 1, // mur brique brune (variante A)
    wallAlt: 13, // mur brique brune (variante C) — variante optionnelle
    floor: 30, // sol carrelage orange/sable (A)
    floorAlt: 37, // sol dallage teal/vert (A)
    floorStone: 30, // sol dallage bleu-gris (A)
    water: 60, // eau profonde pleine (sans vague)
    waterEdge: 47, // eau profonde bleue (bord/vague)
    pit: 5, // trou noir / fosse
  },
};

/**
 * Frame Phaser (index unique dans le spritesheet) pour une case de sol
 * plate (pas d'autotiling — un seul visuel, comme floorFrame dans l'ancien
 * buildAutotileRenderGrid).
 */
export function floorFrame(roleRowIndex, col = 46) {
  // col=46 = tuile "pleine" par construction (voir blob47.js / SHAPES),
  // le bon choix par défaut pour une case de sol sans variation de forme.
  return roleRowIndex * COLUMNS_PER_ROW + col;
}

/**
 * Frame Phaser pour une case autotilée (mur, eau...) à partir du masque de
 * voisinage 8-directionnel déjà calculé par blob47.computeMask().
 */
export function autotileFrame(roleRowIndex, neighborMask) {
  const col = shapeIndex(neighborMask);
  return roleRowIndex * COLUMNS_PER_ROW + col;
}
