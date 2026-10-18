/**
 * Barriere du tutoriel : tant que le tuto de l'etage 0 n'est pas termine,
 * l'escalier vers la Tour (etage 1) est ferme et 2 soldats en gardent l'entree.
 *
 * - tuto termine = toutes les chaines de TUTORIAL_CHAIN_IDS sont "done"
 * - la vraie protection est isTowerGated() (teste dans MainScene.update) ;
 *   les soldats sont le decor + le message
 */
import { SPRITE_REGISTRY } from "../spriteRegistry";
import { TILE_SIZE } from "./gameConstants";

export const TUTORIAL_DEPTH = 0;
// chaines de quetes qui composent le tuto (ajoute-en ici si besoin)
export const TUTORIAL_CHAIN_IDS = ["copperSmith"];

// Cases des 2 soldats (coordonnees de l'editeur). Laisse [] pour un
// placement automatique pres de l'escalier - mais mieux vaut les fixer :
// const TOWER_GUARD_TILES = [{ x: 40, y: 20 }, { x: 42, y: 20 }];
const TOWER_GUARD_TILES = [
  { x: 75, y: 50 },
  { x: 76, y: 50 },
  { x: 77, y: 50 },
];
const GUARD_SPRITES = ["soldier1", "soldier2", "soldier3"];
const GUARD_LINES = [
  "Halte ! La Tour n'est pas pour les novices. Va d'abord voir le forgeron.",
  "Personne n'entre sans avoir fait ses preuves en ville.",
  "Seuls les aventuriers ayant prouvé leur valeur peuvent entrer.",
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
    scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
    scene.towerGuards.push({
      sprite,
      tile: t,
      line: GUARD_LINES[i % GUARD_LINES.length],
    });
  });
}

/** A appeler a chaque changement de case du heros. */
export function updateTowerGuards(scene, tileX, tileY) {
  const guards = scene.towerGuards;
  if (!guards || guards.length === 0) return;

  if (isTutorialDone(scene)) {
    scene.showLootToast("« Tu as fait tes preuves. Passe, la Tour t'attend. »");
    scene.towerGuards = [];
    guards.forEach((g) =>
      scene.tweens.add({
        targets: g.sprite,
        alpha: 0,
        duration: 800,
        onComplete: () => g.sprite.destroy(),
      }),
    );
    return;
  }

  for (const g of guards) {
    if (Math.hypot(g.tile.x - tileX, g.tile.y - tileY) <= 2) {
      toastOnce(scene, g.line, 4000);
      break;
    }
  }
}
