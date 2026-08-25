import Phaser from "phaser";
import {
  getUniqueTexturesToLoad,
  getTileImagesToLoad,
  CHEST_SPRITESHEET,
  ICON_SPRITESHEET,
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
