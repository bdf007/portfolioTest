import Phaser from "phaser";
import {
  getUniqueTexturesToLoad,
  getTileImagesToLoad,
} from "../spriteRegistry";

/**
 * Précharge tous les sprites listés dans spriteRegistry.js avant de
 * lancer MainScene. Charge chaque texture UNE seule fois même si
 * plusieurs entrées du registre la partagent (cf.
 * getUniqueTexturesToLoad, qui dédoublonne par `key`).
 *
 * Ajouter un nouveau sprite au jeu = ajouter une entrée dans
 * spriteRegistry.js, rien à toucher ici. Meme principe pour les images
 * de tuiles (getTileImagesToLoad) - chargees comme de simples images
 * (this.load.image), pas des spritesheets.
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
  }

  create() {
    this.scene.start("MainScene");
  }
}
