/**
 * Barriere du tutoriel : tant que le tuto de l'etage 0 n'est pas termine,
 * l'escalier vers la Tour (etage 1) est ferme et des soldats en gardent l'entree.
 *
 * - tuto termine = toutes les chaines de TUTORIAL_CHAIN_IDS sont "done"
 * - la vraie protection est isTowerGated() (teste dans MainScene.update) ;
 *   les soldats sont le decor + le message
 * - la replique des gardes depend de l'etape en cours de la chaine du tuto
 *   (cf. GUARD_LINES_BY_STEP) : ils renvoient toujours vers le bon PNJ
 */
import { SPRITE_REGISTRY } from "../spriteRegistry";
import { TILE_SIZE } from "./gameConstants";

export const TUTORIAL_DEPTH = 0;
// chaines de quetes qui composent le tuto (ajoute-en ici si besoin)
export const TUTORIAL_CHAIN_IDS = ["novice"];

// Cases des soldats (coordonnees de l'editeur). Laisse [] pour un
// placement automatique pres de l'escalier (2 soldats) - mais mieux vaut les fixer.
const TOWER_GUARD_TILES = [
  { x: 75, y: 50 },
  { x: 76, y: 50 },
  { x: 77, y: 50 },
];
const GUARD_SPRITES = ["soldier1", "soldier2", "soldier3"];

// Replique selon l'etape en cours de la chaine "novice" (index de l'etape).
// 0 mairesse | 1-2 Garrick | 3 Thorin | 4-5 Brenn
const TUTORIAL_MAIN_CHAIN = "novice";
const GUARD_LINES_BY_STEP = {
  0: [
    "Halte ! La Tour n'est pas pour les novices. Va voir la mairesse, elle a besoin d'aide sur la plage.",
    "Personne n'entre sans avoir fait ses preuves. La mairesse te dira par où commencer.",
  ],
  1: [
    "Pas si vite ! Garrick le bûcheron attend quelqu'un à qui confier sa hache.",
    "Va d'abord voir Garrick, le bûcheron.",
  ],
  2: [
    "Garrick a encore besoin de toi. Va le voir avant de songer à la Tour.",
    "Tu n'as pas fini avec le bûcheron. Retourne le voir.",
  ],
  3: [
    "Tu progresses. Thorin, le maître d'arme, t'attend pour parfaire ton entraînement.",
    "Va voir Thorin, le maître d'arme. Il n'a pas fini avec toi.",
  ],
  4: [
    "Presque prêt ! Brenn le forgeron a une tâche pour toi.",
    "Le forgeron te cherche. Va le voir avant de monter.",
  ],
  5: [
    "Dernière étape : Brenn le forgeron a encore besoin de toi.",
    "Termine ce que le forgeron t'a demandé, et la Tour sera à toi.",
  ],
};
const GUARD_LINES_FALLBACK = [
  "Halte ! La Tour n'est pas pour les novices.",
  "Personne n'entre sans avoir fait ses preuves en ville.",
];
const GATE_TOAST = "Les gardes te barrent la route.";

export function isTutorialDone(scene) {
  if (typeof window !== "undefined" && window.__skipTuto) return true;
  return TUTORIAL_CHAIN_IDS.every((id) => scene.questChains?.[id]?.done);
}

export function isTowerGated(scene) {
  return scene.currentDepth === TUTORIAL_DEPTH && !isTutorialDone(scene);
}

function toastOnce(scene, text, cooldownMs = 2500) {
  const now = scene.time.now;
  if (scene._gateToastAt && now - scene._gateToastAt < cooldownMs) return;
  scene._gateToastAt = now;
  scene.showLootToast(text);
}

/** Appele quand le heros marche sur l'escalier et que la barriere est active. */
export function notifyGateBlocked(scene) {
  toastOnce(scene, GATE_TOAST);
}

// replique du garde numero `i`, selon l'etape en cours (lue a chaque fois)
function guardLine(scene, i) {
  const state = scene.questChains?.[TUTORIAL_MAIN_CHAIN];
  const lines =
    (state && !state.done && GUARD_LINES_BY_STEP[state.step]) ||
    GUARD_LINES_FALLBACK;
  return lines[i % lines.length];
}

function pickGuardTiles(scene) {
  if (TOWER_GUARD_TILES.length > 0) return TOWER_GUARD_TILES;
  const grid = scene.fogGrid;
  const e = scene.exitTile;
  if (!grid || !e) return [];
  const out = [];
  for (let y = e.y - 3; y <= e.y + 3; y++) {
    for (let x = e.x - 3; x <= e.x + 3; x++) {
      if (x === e.x && y === e.y) continue;
      if (grid[y]?.[x] === 0)
        out.push({ x, y, d: Math.hypot(x - e.x, y - e.y) });
    }
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, 2).map(({ x, y }) => ({ x, y }));
}

export function destroyTowerGuards(scene) {
  (scene.towerGuards || []).forEach((g) => g.sprite.destroy());
  scene.towerGuards = [];
}

export function createTowerGuards(scene) {
  destroyTowerGuards(scene);
  if (!isTowerGated(scene)) return;
  const tiles = pickGuardTiles(scene);
  tiles.forEach((t, i) => {
    const key = GUARD_SPRITES[i % GUARD_SPRITES.length];
    const entry = SPRITE_REGISTRY[key] || SPRITE_REGISTRY.soldier1;
    if (!entry) return;
    const sprite = scene.physics.add.sprite(
      t.x * TILE_SIZE + TILE_SIZE / 2,
      t.y * TILE_SIZE + TILE_SIZE / 2,
      entry.key,
      entry.animations.idleDown,
    );
    sprite.setScale(entry.scale);
    const hb = entry.hitbox;
    sprite.body.setSize(hb.width, hb.height).setOffset(hb.offsetX, hb.offsetY);
    sprite.setImmovable(true);
    sprite.setDepth(9);
    const animKey = `${SPRITE_REGISTRY[key] ? key : "soldier1"}-idle-down`;
    if (scene.anims.exists(animKey)) sprite.anims.play(animKey);
    const collider = scene.physics.add.collider(scene.hero, sprite);
    scene.levelColliders.push(collider);
    scene.towerGuards.push({
      sprite,
      tile: t,
      index: i,
      collider,
      released: false,
    });
  });
}

/** A appeler a chaque changement de case du heros. */
export function updateTowerGuards(scene, tileX, tileY) {
  const guards = scene.towerGuards;
  if (!guards || guards.length === 0) return;

  const near = guards.find(
    (g) => Math.hypot(g.tile.x - tileX, g.tile.y - tileY) <= 3,
  );
  if (!near) return;

  if (!isTutorialDone(scene)) {
    toastOnce(scene, guardLine(scene, near.index), 4000);
    return;
  }

  const pending = guards.filter((g) => !g.released);
  if (pending.length === 0) return;
  scene.showLootToast("« Tu as fait tes preuves. Passe, la Tour t'attend. »");
  const centerX = guards.reduce((s, g) => s + g.tile.x, 0) / guards.length;
  for (const g of pending) {
    g.released = true;
    // plus d'obstacle : on desactive (sans detruire : levelLoader detruit
    // lui-meme tous les levelColliders au prochain chargement)
    g.collider.active = false;
    if (g.sprite.body) g.sprite.body.enable = false;
    const side = Math.sign(g.tile.x - centerX);
    if (side !== 0) {
      scene.tweens.add({
        targets: g.sprite,
        x: g.sprite.x + side * TILE_SIZE,
        duration: 600,
      });
    }
  }
}
