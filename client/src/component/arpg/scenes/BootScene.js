import Phaser from "phaser";
import { getUniqueTexturesToLoad } from "../spriteRegistry";

/**
 * Précharge tous les sprites listés dans spriteRegistry.js avant de
 * lancer MainScene. Charge chaque texture UNE seule fois même si
 * plusieurs entrées du registre la partagent (cf.
 * getUniqueTexturesToLoad, qui dédoublonne par `key`).
 *
 * Ajouter un nouveau sprite au jeu = ajouter une entrée dans
 * spriteRegistry.js, rien à toucher ici.
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
  }

  create() {
    this.scene.start("MainScene");
  }
}
