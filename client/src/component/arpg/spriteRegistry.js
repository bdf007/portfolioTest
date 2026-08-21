import hero1Spritesheet from "../../assets/hero1_walk.png";
import hero2Spritesheet from "../../assets/hero2_walk.png";
import hero3Spritesheet from "../../assets/hero3_walk.png";
import hero4Spritesheet from "../../assets/hero4_walk.png";
import enemy1Spritesheet from "../../assets/enemy1_walk.png";
import enemy2Spritesheet from "../../assets/enemy2_walk.png";
import goblin2Spritesheet from "../../assets/goblin2_walk.png";
import bat1Spritesheet from "../../assets/bat1_fly.png";
// import wallCaveSprite from "../../assets/wall_cave.png";
// import floorCaveSprite from "../../assets/floor_cave.png";

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
    scale: 1.1,
    animations: STANDARD_ANIMATION_FRAMES,
    hitbox: computeSafeHitbox(HERO_FRAME_W, HERO_FRAME_H, 1.1),
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
  // wallCave: {
  //   key: "wallCave",
  //   path: wallCaveSprite,
  //   frameWidth: 32,
  //   frameHeight: 32,
  //   scale: 1,
  //   animations: null,
  //   hitbox: computeSafeHitbox(32, 32, 1),
  // },
  // floorCave: {
  //   key: "floorCave",
  //   path: floorCaveSprite,
  //   frameWidth: 32,
  //   frameHeight: 32,
  //   scale: 1,
  //   animations: null,
  //   hitbox: computeSafeHitbox(32, 32, 1),
  // },
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
