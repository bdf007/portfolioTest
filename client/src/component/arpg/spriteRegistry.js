// import hero
import hero1Spritesheet from "../../assets/hero1_walk.png";
import hero2Spritesheet from "../../assets/hero2_walk.png";
import hero3Spritesheet from "../../assets/hero3_walk.png";
import hero4Spritesheet from "../../assets/hero4_walk.png";
// import enemy
import enemy1Spritesheet from "../../assets/enemy1_walk.png";
import enemy2Spritesheet from "../../assets/enemy2_walk.png";
import goblin2Spritesheet from "../../assets/goblin2_walk.png";
import bat1Spritesheet from "../../assets/bat1_fly.png";
import kobold1Spritesheet from "../../assets/$Kobold_1.png";
import kobold2Spritesheet from "../../assets/$Kobold_2.png";
import kobold3Spritesheet from "../../assets/$Kobold_3.png";
import naga1Spritesheet from "../../assets/$Naga_1.png";
import naga2Spritesheet from "../../assets/$Naga_2.png";
import naga3Spritesheet from "../../assets/$Naga_3.png";
import naga4Spritesheet from "../../assets/$Naga_4.png";
import naga5Spritesheet from "../../assets/$Naga_5.png";
import naga6Spritesheet from "../../assets/$Naga_6.png";
import naga7Spritesheet from "../../assets/$Naga_7.png";
import orc1Spritesheet from "../../assets/$Orc_1.png";
import orc2Spritesheet from "../../assets/$Orc_2.png";
import orc3Spritesheet from "../../assets/$Orc_3.png";
import orc4Spritesheet from "../../assets/$Orc_4.png";
import orc5Spritesheet from "../../assets/$Orc_5.png";
import orc6Spritesheet from "../../assets/$Orc_6.png";
import orc7Spritesheet from "../../assets/$Orc_7.png";
import orc8Spritesheet from "../../assets/$Orc_8.png";
// import tiles
import wallCaveSprite from "../../assets/wall_cave.png";
import floorCaveSprite from "../../assets/floor_cave.png";
// import animation effects
import meleeSlashSpritesheet from "../../assets/melee_slash_effect.png";
// import town PNJ spritesheets here when available
import town1NPCf1Spritesheet from "../../assets/town1_F1_walk.png";
import town1NPCf2Spritesheet from "../../assets/town1_F2_walk.png";
import town1NPCf3Spritesheet from "../../assets/town1_F3_walk.png";
import town1NPCf4Spritesheet from "../../assets/town1_F4_walk.png";
import town1NPCf5Spritesheet from "../../assets/town1_F5_walk.png";
import town1NPCm1Spritesheet from "../../assets/town1_M1_walk.png";
import town1NPCm2Spritesheet from "../../assets/town1_M2_walk.png";
import town1NPCm3Spritesheet from "../../assets/town1_M3_walk.png";
import town1NPCm4Spritesheet from "../../assets/town1_M4_walk.png";
import town1NPCm5Spritesheet from "../../assets/town1_M5_walk.png";
import town2NPCf1Spritesheet from "../../assets/town2_F1_walk.png";
import town2NPCf2Spritesheet from "../../assets/town2_F2_walk.png";
import town2NPCf3Spritesheet from "../../assets/town2_F3_walk.png";
import town2NPCf4Spritesheet from "../../assets/town2_F4_walk.png";
import town2NPCf5Spritesheet from "../../assets/town2_F5_walk.png";
import town2NPCm1Spritesheet from "../../assets/town2_M1_walk.png";
import town2NPCm2Spritesheet from "../../assets/town2_M2_walk.png";
import town2NPCm3Spritesheet from "../../assets/town2_M3_walk.png";
import town2NPCm4Spritesheet from "../../assets/town2_M4_walk.png";
import town2NPCm5Spritesheet from "../../assets/town2_M5_walk.png";
import town3NPCf1Spritesheet from "../../assets/town3_F1_walk.png";
import town3NPCf2Spritesheet from "../../assets/town3_F2_walk.png";
import town3NPCf3Spritesheet from "../../assets/town3_F3_walk.png";
import town3NPCf4Spritesheet from "../../assets/town3_F4_walk.png";
import town3NPCf5Spritesheet from "../../assets/town3_F5_walk.png";
import town3NPCm1Spritesheet from "../../assets/town3_M1_walk.png";
import town3NPCm2Spritesheet from "../../assets/town3_M2_walk.png";
import town3NPCm3Spritesheet from "../../assets/town3_M3_walk.png";
import town3NPCm4Spritesheet from "../../assets/town3_M4_walk.png";
import town3NPCm5Spritesheet from "../../assets/town3_M5_walk.png";

/**
 * Registre centralisé des sprites du jeu. Chaque entrée porte ses PROPRES
 * dimensions de frame, son propre facteur d'échelle et sa propre hitbox -
 * rien n'est supposé uniforme entre les types. Un boss en 96x128 et un
 * insecte en 16x16 cohabitent sans problème, chacun avec une hitbox
 * calculée à partir de SES dimensions (cf. computeSafeHitbox), jamais de
 * constante partagée qui forcerait une taille commune.
 *
 * Le découpage des animations suit la convention 3 colonnes x 4 lignes
 * déjà établie pour hero1_walk.png (bas/gauche/droite/haut, frame du
 * milieu de chaque ligne = pose idle). Un sprite qui suit cette même
 * disposition peut réutiliser STANDARD_ANIMATION_FRAMES tel quel ; un
 * sprite structuré différemment définit ses propres indices de frames
 * dans son entrée `animations`.
 */

// taille de hitbox visée en ESPACE MONDE (apres mise a l'echelle), pas en
// local - c'est ce qui garantit une hitbox toujours sure sous 32px (la
// taille d'une case de la grille de niveau) quelle que soit la taille
// source du sprite ou son echelle d'affichage.
// Valeurs identiques a celles validees manuellement pour hero1_walk.png
// (cf. la correction du souci de blocage en diagonale dans les couloirs).
const SAFE_WORLD_WIDTH = 18;
const SAFE_WORLD_HEIGHT = 24;
const FEET_MARGIN = 2; // la hitbox reste ancree pres des pieds, pas centree

/**
 * Calcule une hitbox sûre pour n'importe quelle taille de frame/échelle.
 * Toujours sous 32px (une case) en espace monde, jamais plus grande que 90% de
 * la frame source (garde-fou pour les très petits sprites).
 *
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @param {number} scale
 * @returns {{width:number, height:number, offsetX:number, offsetY:number}}
 */
export function computeSafeHitbox(frameWidth, frameHeight, scale) {
  let width = SAFE_WORLD_WIDTH / scale;
  let height = SAFE_WORLD_HEIGHT / scale;

  width = Math.min(width, frameWidth * 0.9);
  height = Math.min(height, frameHeight * 0.9);

  const offsetX = Math.max(0, (frameWidth - width) / 2);
  const offsetY = Math.max(0, frameHeight - height - FEET_MARGIN);

  return {
    width: Math.round(width),
    height: Math.round(height),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
  };
}

/**
 * Indices de frames pour la disposition standard 3x4 (bas/gauche/droite/
 * haut). Réutilisable par tout sprite qui suit cette même disposition.
 */
export const STANDARD_ANIMATION_FRAMES = {
  walkDown: [0, 1, 2, 1],
  walkLeft: [3, 4, 5, 4],
  walkRight: [6, 7, 8, 7],
  walkUp: [9, 10, 11, 10],
  idleDown: 1,
  idleLeft: 4,
  idleRight: 7,
  idleUp: 10,
};

// Indices de frames pour la disposition 4X4 (bas/gauche/droite/haut) - réutilisable par tout sprite qui suit cette disposition.
export const STANDARD_ANIMATION_FRAMES_4X4 = {
  walkDown: [0, 1, 2, 3],
  walkLeft: [4, 5, 6, 7],
  walkRight: [8, 9, 10, 11],
  walkUp: [12, 13, 14, 15],
  idleDown: 1,
  idleLeft: 5,
  idleRight: 9,
  idleUp: 13,
};

/**
 * @typedef {Object} SpriteEntry
 * @property {string} key - clé de texture Phaser (this.load.spritesheet)
 * @property {*} path - asset importé (résolu par le bundler en URL)
 * @property {number} frameWidth
 * @property {number} frameHeight
 * @property {number} scale - facteur d'affichage (setScale)
 * @property {Object} animations - indices de frames (cf. STANDARD_ANIMATION_FRAMES)
 * @property {{width:number,height:number,offsetX:number,offsetY:number}} hitbox
 */

// les 4 heros de Skip the Dungeon, memes dimensions confirmees (78x144,
// grille 3x4 -> 26x36 par frame) - meme echelle que le heros actuel pour
// rester coherent visuellement entre eux tant qu'aucune raison de les
// differencier n'existe
const HERO_FRAME_W = 26;
const HERO_FRAME_H = 36;
const HERO_SCALE = 1.2;

function makeHeroEntry(key, path) {
  return {
    key,
    path,
    frameWidth: HERO_FRAME_W,
    frameHeight: HERO_FRAME_H,
    scale: HERO_SCALE,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(HERO_FRAME_W, HERO_FRAME_H, HERO_SCALE),
  };
}

export const SPRITE_REGISTRY = {
  hero1: makeHeroEntry("hero1", hero1Spritesheet),
  hero2: makeHeroEntry("hero2", hero2Spritesheet),
  hero3: makeHeroEntry("hero3", hero3Spritesheet),
  hero4: makeHeroEntry("hero4", hero4Spritesheet),

  // placeholder : reutilise la texture de hero1 teintee, en attendant de
  // vrais sprites d'ennemis. Le jour ou un vrai sprite (goblin.png,
  // boss.png...) est disponible, il suffit de changer `key`/`path`/
  // `frameWidth`/`frameHeight`/`scale` de cette entree (ou d'en ajouter
  // une nouvelle) - aucun autre fichier n'a besoin de changer, puisque
  // BootScene et MainScene lisent tout depuis ce registre.
  enemyDefault: {
    key: "hero1", // meme texture Phaser que 'hero1' - pas rechargee deux fois
    path: hero1Spritesheet,
    frameWidth: HERO_FRAME_W,
    frameHeight: HERO_FRAME_H,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(HERO_FRAME_W, HERO_FRAME_H, 1),
  },
  enemy1: {
    key: "enemy1",
    path: enemy1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  goblin: {
    key: "enemy2",
    path: enemy2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  goblin2: {
    key: "goblin2",
    path: goblin2Spritesheet,
    frameWidth: 32,
    frameHeight: 32,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 32, 0.8),
  },
  bat1: {
    key: "bat1",
    path: bat1Spritesheet,
    frameWidth: 16,
    frameHeight: 16,
    scale: 2,
    animations: STANDARD_ANIMATION_FRAMES_4X4,
    hitbox: computeSafeHitbox(16, 16, 2),
  },
  kobold1: {
    key: "kobold1",
    path: kobold1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  kobold2: {
    key: "kobold2",
    path: kobold2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  kobold3: {
    key: "kobold3",
    path: kobold3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga1: {
    key: "naga1",
    path: naga1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga2: {
    key: "naga2",
    path: naga2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga3: {
    key: "naga3",
    path: naga3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga4: {
    key: "naga4",
    path: naga4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga5: {
    key: "naga5",
    path: naga5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga6: {
    key: "naga6",
    path: naga6Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  naga7: {
    key: "naga7",
    path: naga7Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc1: {
    key: "orc1",
    path: orc1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc2: {
    key: "orc2",
    path: orc2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc3: {
    key: "orc3",
    path: orc3Spritesheet,
    frameWidth: 32,

    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc4: {
    key: "orc4",
    path: orc4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc5: {
    key: "orc5",
    path: orc5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc6: {
    key: "orc6",
    path: orc6Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc7: {
    key: "orc7",
    path: orc7Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },
  orc8: {
    key: "orc8",
    path: orc8Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 0.8,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 0.8),
  },

  NPC_town1_F1: {
    key: "NPC_town1_F1",
    path: town1NPCf1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_F2: {
    key: "NPC_town1_F2",
    path: town1NPCf2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_F3: {
    key: "NPC_town1_F3",
    path: town1NPCf3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_F4: {
    key: "NPC_town1_F4",
    path: town1NPCf4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_F5: {
    key: "NPC_town1_F5",
    path: town1NPCf5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_M1: {
    key: "NPC_town1_M1",
    path: town1NPCm1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_M2: {
    key: "NPC_town1_M2",
    path: town1NPCm2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_M3: {
    key: "NPC_town1_M3",
    path: town1NPCm3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_M4: {
    key: "NPC_town1_M4",
    path: town1NPCm4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town1_M5: {
    key: "NPC_town1_M5",
    path: town1NPCm5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_F1: {
    key: "NPC_town2_F1",
    path: town2NPCf1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_F2: {
    key: "NPC_town2_F2",
    path: town2NPCf2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_F3: {
    key: "NPC_town2_F3",
    path: town2NPCf3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_F4: {
    key: "NPC_town2_F4",
    path: town2NPCf4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_F5: {
    key: "NPC_town2_F5",
    path: town2NPCf5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_M1: {
    key: "NPC_town2_M1",
    path: town2NPCm1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_M2: {
    key: "NPC_town2_M2",
    path: town2NPCm2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_M3: {
    key: "NPC_town2_M3",
    path: town2NPCm3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_M4: {
    key: "NPC_town2_M4",
    path: town2NPCm4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town2_M5: {
    key: "NPC_town2_M5",
    path: town2NPCm5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_F1: {
    key: "NPC_town3_F1",
    path: town3NPCf1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_F2: {
    key: "NPC_town3_F2",
    path: town3NPCf2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_F3: {
    key: "NPC_town3_F3",
    path: town3NPCf3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_F4: {
    key: "NPC_town3_F4",
    path: town3NPCf4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_F5: {
    key: "NPC_town3_F5",
    path: town3NPCf5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_M1: {
    key: "NPC_town3_M1",
    path: town3NPCm1Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_M2: {
    key: "NPC_town3_M2",
    path: town3NPCm2Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_M3: {
    key: "NPC_town3_M3",
    path: town3NPCm3Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_M4: {
    key: "NPC_town3_M4",
    path: town3NPCm4Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },
  NPC_town3_M5: {
    key: "NPC_town3_M5",
    path: town3NPCm5Spritesheet,
    frameWidth: 32,
    frameHeight: 40,
    scale: 1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(32, 40, 1),
  },

  // effet visuel de coup en melee (eclair de griffe/lame qui s'estompe,
  // 4 lignes = 4 directions bas/gauche/droite/haut, 4 colonnes = frames
  // de l'estompage) - PAS une entite de jeu comme les heros/ennemis
  // ci-dessus : jamais resolue via resolveEnemySprite/resolveHeroSprite,
  // referencee directement par sa cle dans MainScene.performMeleeAttack.
  // `oneShot: true` fait jouer ses animations une seule fois (repeat: 0)
  // plutot qu'en boucle, cf. MainScene.createAnimationsForEntry - sans
  // ca, un cycle de marche infini n'aurait aucun sens pour un flash de
  // degats. Pas de hitbox : jamais de corps physique pour un effet
  // purement visuel.
  meleeSlashEffect: {
    key: "meleeSlashEffect",
    path: meleeSlashSpritesheet,
    frameWidth: 96,
    frameHeight: 96,
    scale: 0.5, // a ajuster une fois vu en jeu - frame source bien plus grande que le heros
    oneShot: true,
    animations: STANDARD_ANIMATION_FRAMES_4X4,
  },
};

/**
 * Liste des héros sélectionnables à l'écran de démarrage, dans l'ordre
 * d'affichage. `label` est un texte d'appoint (à remplacer par de vrais
 * noms de personnage le jour venu) - purement présentationnel, ne
 * touche à aucune logique de jeu.
 *
 * "À terme" (cf. /areas/phaser-arpg.md), chaque héros aura ses propres
 * stats/compétences - non construit ici volontairement (portée de cette
 * session = choisir un skin, pas encore le différencier mécaniquement).
 * Le champ `statsOverride` est un point d'extension prêt à l'emploi :
 * aujourd'hui `null` pour tous (stats identiques, cf. leveling.js), le
 * jour venu il suffira d'y mettre un objet de surcharge par héros sans
 * avoir à retoucher la structure.
 */
export const HERO_ROSTER = [
  { id: "hero1", label: "Héros 1", statsOverride: null },
  { id: "hero2", label: "Héros 2", statsOverride: null },
  { id: "hero3", label: "Héros 3", statsOverride: null },
  { id: "hero4", label: "Héros 4", statsOverride: null },
];

/**
 * Résout l'entrée du registre à utiliser pour un ennemi, à partir du
 * `type` renvoyé par le serveur (ArpgController.getLevel décide seul
 * quel archétype un ennemi utilise, cf. enemyStats.js - le client ne
 * choisit jamais ce type lui-même, il se contente d'afficher le sprite
 * qui correspond). Repli propre sur enemyDefault si le serveur renvoie
 * un type que ce client ne connaît pas encore (ex: nouveau type ajouté
 * côté serveur avant que l'art correspondant soit déployé côté client).
 *
 * @param {string} typeKey valeur reçue dans enemyData.type
 * @returns {{entry: SpriteEntry, spriteKey: string}}
 */
export function resolveEnemySprite(typeKey) {
  if (SPRITE_REGISTRY[typeKey]) {
    return { entry: SPRITE_REGISTRY[typeKey], spriteKey: typeKey };
  }
  return { entry: SPRITE_REGISTRY.enemyDefault, spriteKey: "enemyDefault" };
}

/**
 * Résout l'entrée du registre pour le héros choisi par le joueur. Repli
 * sur hero1 si l'id reçu (sauvegarde ancienne, valeur corrompue...) ne
 * correspond à aucune entrée connue.
 *
 * @param {string} heroId
 * @returns {{entry: SpriteEntry, spriteKey: string}}
 */
export function resolveHeroSprite(heroId) {
  if (SPRITE_REGISTRY[heroId]) {
    return { entry: SPRITE_REGISTRY[heroId], spriteKey: heroId };
  }
  return { entry: SPRITE_REGISTRY.hero1, spriteKey: "hero1" };
}

/**
 * Liste dédupliquée des textures à charger (this.load.spritesheet) -
 * plusieurs entrées du registre peuvent partager la même `key` (comme
 * hero1/enemyDefault aujourd'hui), il ne faut la charger qu'une fois.
 */
export function getUniqueTexturesToLoad() {
  const seen = new Map();
  for (const entry of Object.values(SPRITE_REGISTRY)) {
    if (!seen.has(entry.key)) {
      seen.set(entry.key, entry);
    }
  }
  return [...seen.values()];
}

/**
 * Registre des VRAIES images de tuiles (sol/mur), par biome - distinct
 * de SPRITE_REGISTRY (personnages) : une simple image, jamais de
 * spritesheet ni d'animation. Un biome absent d'ici continue d'afficher
 * des couleurs pleines (cf. TILESET_COLORS dans MainScene.js) - c'est le
 * repli normal, pas une erreur. Ajouter un biome ici = fournir
 * `wallKey`/`floorKey` correspondant a des imports ajoutes en haut de ce
 * fichier, et le tour est joue : MainScene.js detecte automatiquement
 * leur presence au chargement du niveau.
 */
export const TILE_IMAGE_REGISTRY = {
  cave: { wallKey: "wall_cave", floorKey: "floor_cave" },
};

const TILE_IMAGE_PATHS = {
  wall_cave: wallCaveSprite,
  floor_cave: floorCaveSprite,
};

/**
 * Liste {key, path} de toutes les images de tuiles a charger - separee
 * de getUniqueTexturesToLoad() (spritesheets) car il s'agit d'images
 * simples (this.load.image, pas this.load.spritesheet), cf. BootScene.js.
 */
export function getTileImagesToLoad() {
  const seen = new Map();
  for (const { wallKey, floorKey } of Object.values(TILE_IMAGE_REGISTRY)) {
    if (wallKey && !seen.has(wallKey))
      seen.set(wallKey, { key: wallKey, path: TILE_IMAGE_PATHS[wallKey] });
    if (floorKey && !seen.has(floorKey))
      seen.set(floorKey, { key: floorKey, path: TILE_IMAGE_PATHS[floorKey] });
  }
  return [...seen.values()];
}
