/**
 * DebugTilesetScene.js — scène temporaire pour visualiser toutes les frames
 * d'une ligne (matériau) du spritesheet chargé, numérotées.
 *
 * USAGE :
 *  - Ajoute-la à la config Phaser (scene: [BootScene, MainScene, DebugTilesetScene])
 *  - Démarre-la depuis la console navigateur (une fois le jeu chargé) :
 *      window.game.scene.start('DebugTilesetScene', { row: 59 })
 *    (ou depuis un bouton/raccourci clavier temporaire, comme tu préfères)
 *  - Compare avec row59_water_labeled.png : si l'ordre visuel des formes est
 *    identique, le col index correspond bien à ce que produit blob47.js.
 *    Sinon, note quelle case affiche quelle forme (isolée, pleine, ligne
 *    droite...) et on ajuste l'ordre dans blob47.js en un seul endroit.
 *
 * Supprime ce fichier (et la ligne qui l'enregistre dans la scene list)
 * une fois la calibration terminée — c'est un outil de mise au point, pas
 * une brique du jeu final.
 */
import Phaser from "phaser";
import { FORTRESS_AUTOTILE_SPRITESHEET } from "../spriteRegistry";

const COLUMNS_PER_ROW = 47;
const TILE_SIZE = 32;
const DISPLAY_SCALE = 2;

export default class DebugTilesetScene extends Phaser.Scene {
  constructor() {
    super("DebugTilesetScene");
  }

  init(data) {
    this.row = data?.row ?? 0;
  }

  preload() {
    // si BootScene a deja charge la spritesheet, ce load est un no-op
    this.load.spritesheet(
      FORTRESS_AUTOTILE_SPRITESHEET.key,
      FORTRESS_AUTOTILE_SPRITESHEET.path,
      {
        frameWidth: FORTRESS_AUTOTILE_SPRITESHEET.frameWidth,
        frameHeight: FORTRESS_AUTOTILE_SPRITESHEET.frameHeight,
      },
    );
  }

  create() {
    this.cameras.main.setBackgroundColor("#2a2a30");
    const cols = 12;
    const cell = TILE_SIZE * DISPLAY_SCALE + 16;

    for (let col = 0; col < COLUMNS_PER_ROW; col++) {
      const frameIndex = this.row * COLUMNS_PER_ROW + col;
      const sx = (col % cols) * cell + 16;
      const sy = Math.floor(col / cols) * cell + 16;

      this.add
        .image(sx, sy, FORTRESS_AUTOTILE_SPRITESHEET.key, frameIndex)
        .setOrigin(0, 0)
        .setScale(DISPLAY_SCALE);

      this.add.text(sx, sy + TILE_SIZE * DISPLAY_SCALE + 2, String(col), {
        fontSize: "14px",
        color: "#ffff00",
      });
    }

    this.add.text(16, 4, `row=${this.row} (frameIndex = row*47 + col)`, {
      fontSize: "12px",
      color: "#ffffff",
    });
  }
}
