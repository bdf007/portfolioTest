import Phaser from "phaser";
import {
  getUniqueTexturesToLoad,
  getTileImagesToLoad,
  CHEST_SPRITESHEET,
  ICON_SPRITESHEET,
} from "../spriteRegistry";
import {
  DUNGEON_AUTOTILE_SPRITESHEET,
  DESERT_AUTOTILE_SPRITESHEET,
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
CITY_WALLSE2_AUTOTILE_SPRITESHEET,
CITY_WALLSE3_AUTOTILE_SPRITESHEET,
FORTRESS1_AUTOTILE_SPRITESHEET,
FORTRESS2_AUTOTILE_SPRITESHEET,
FORTRESS3_AUTOTILE_SPRITESHEET,
FORTRESSE1_AUTOTILE_SPRITESHEET,
FORTRESSE2_AUTOTILE_SPRITESHEET,
FORTRESSE3_AUTOTILE_SPRITESHEET,
TECH_FORTRESS1_AUTOTILE_SPRITESHEET,
TECH_FORTRESS2_AUTOTILE_SPRITESHEET,
TECH_FORTRESSE1_AUTOTILE_SPRITESHEET,
TECH_FORTRESSE2_AUTOTILE_SPRITESHEET,
TOWER1_AUTOTILE_SPRITESHEET,
TOWER2_AUTOTILE_SPRITESHEET,
TOWERE1_AUTOTILE_SPRITESHEET,
TOWERE2_AUTOTILE_SPRITESHEET,
MINES1_AUTOTILE_SPRITESHEET,
MINES2_AUTOTILE_SPRITESHEET,
DESERT_TOWNE1_AUTOTILE_SPRITESHEET,
DESERT_TOWNE2_AUTOTILE_SPRITESHEET,
ROUFTOPSF_AUTOTILE_SPRITESHEET,
} from "../spriteRegistry";

/**
 * Précharge tous les sprites listés dans spriteRegistry.js avant de
 * lancer MainScene. Charge chaque texture UNE seule fois même si
 * plusieurs entrées du registre la partagent (cf.
 * getUniqueTexturesToLoad, qui dédoublonne par `key`).
 *
 * Ajouter un nouveau sprite au jeu = ajouter une entrée dans
 * spriteRegistry.js, rien à toucher ici. Meme principe pour les images
 * de tuiles ET les icones de repere - toutes deux passent par
 * getTileImagesToLoad (generalisee pour scanner n'importe quelle forme
 * d'entree de TILE_IMAGE_REGISTRY, cf. spriteRegistry.js) - chargees
 * comme de simples images (this.load.image), pas des spritesheets.
 *
 * CHEST_SPRITESHEET est charge a part (this.load.spritesheet, comme les
 * personnages) - distinct de SPRITE_REGISTRY car sans structure
 * d'animation (cf. le commentaire dans spriteRegistry.js).
 */
export default class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    for (const entry of getUniqueTexturesToLoad()) {
      this.load.spritesheet(entry.key, entry.path, {
        frameWidth: entry.frameWidth,
        frameHeight: entry.frameHeight,
      });
    }
    for (const { key, path } of getTileImagesToLoad()) {
      this.load.image(key, path);
    }
    this.load.spritesheet(
      DUNGEON_AUTOTILE_SPRITESHEET.key,
      DUNGEON_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: DUNGEON_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: DUNGEON_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      FORTRESS_AUTOTILE_SPRITESHEET.key,
      FORTRESS_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: FORTRESS_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: FORTRESS_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      SNOW_AUTOTILE_SPRITESHEET.key,
      SNOW_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: SNOW_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: SNOW_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      DARKWOODS_AUTOTILE_SPRITESHEET.key,
      DARKWOODS_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: DARKWOODS_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: DARKWOODS_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      DESERT_AUTOTILE_SPRITESHEET.key,
      DESERT_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: DESERT_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: DESERT_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      HILLS_AUTOTILE_SPRITESHEET.key,
      HILLS_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: HILLS_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: HILLS_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.key,
      STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: STANDARD_FIELDS2_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(
      DARKWOODS2_AUTOTILE_SPRITESHEET.key,
      DARKWOODS2_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: DARKWOODS2_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: DARKWOODS2_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
    this.load.spritesheet(CHEST_SPRITESHEET.key, CHEST_SPRITESHEET.path, {
      frameWidth: CHEST_SPRITESHEET.frameWidth,
      frameHeight: CHEST_SPRITESHEET.frameHeight,
    });
    this.load.spritesheet(ICON_SPRITESHEET.key, ICON_SPRITESHEET.path, {
      frameWidth: ICON_SPRITESHEET.frameWidth,
      frameHeight: ICON_SPRITESHEET.frameHeight,
    });
  }

  create() {
    this.scene.start("MainScene");
  }
}
