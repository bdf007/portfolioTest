import { createRng } from "../rng";
import { pickPatrolRoute } from "../enemyBehavior";
import { createCooldown } from "../combat";
import {
  SPRITE_REGISTRY,
  resolveEnemyDisplayName,
  resolveEnemyTargetName,
  resolveHeroStatsOverride,
} from "../spriteRegistry";
import { resolveItemDef } from "../itemDefs";
import { findPath } from "../pathfinding";
import {
  installChainQuests,
  advanceQuestChain,
  getPendingChainStepFor,
  getChainTargetKeys,
} from "./questChains";

import { TILE_SIZE, ENEMY_SPEED, ENEMY_ATTACK_COOLDOWN } from "./gameConstants";

const ESCORT_NPC_HP = 40; // fragile - pas cense encaisser des coups longtemps, purement passif

const RESCUE_XP_REWARD = 50;
const RESCUE_GOLD_REWARD_RANGE = [35, 65];
const RESCUE_INJECT_CHANCE = 0.15;
// etages ou aucun captif ne doit apparaitre (ex: etages de boss) - a remplir
const RESCUE_EXCLUDED_DEPTHS = new Set([]);
const AMBIENT_NPC_GREETINGS = [
  "Bonjour, voyageur !",
  "Belle journée, n'est-ce pas ?",
  "Fais attention à toi si tu décides de gravir la tour.",
  "J'ai entendu dire qu'il y avait un trésor par ici...",
  "Content de voir un nouveau visage en ville.",
  "Les affaires sont calmes en ce moment.",
  "On en a gros!",
];

const EXTRA_NPC_INDEX_BASE = 100; // indices des PNJ d'accueil ajoutes (jamais ceux du serveur)

// case de sol (3 a 8 cases du point d'arrivee du heros) pour un PNJ d'accueil
function pickExtraReceiverSpot(scene, n) {
  const grid = scene.fogGrid;
  const from = scene.lastPlayerTile;
  if (!grid || !from) return null;
  const rng = createRng(`${scene.currentSeed}-extra-receiver-${n}`);
  const candidates = [];
  const minY = Math.max(0, from.y - 8);
  const maxY = Math.min(grid.length - 1, from.y + 8);
  const minX = Math.max(0, from.x - 8);
  const maxX = Math.min(grid[0].length - 1, from.x + 8);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.hypot(x - from.x, y - from.y);
      if (grid[y][x] === 0 && d >= 3 && d <= 8) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

// pnj d'accueil deja crees dans cette ville (retrouves a partir des quetes)
function collectExtraReceiverNpcs(scene) {
  const prefix = `${scene.currentDepth}-`;
  const out = [];
  for (const [key, q] of Object.entries(scene.quests)) {
    if (!key.startsWith(prefix) || key.includes("~") || !q.extraPos) continue;
    out.push({
      npcIndex: Number(key.slice(prefix.length)),
      x: q.extraPos.x,
      y: q.extraPos.y,
    });
  }
  return out;
}

export function createQuestNpcs(scene, npcDataArray) {
  const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
    key.startsWith("NPC_town"),
  );
  const spriteRng = createRng(`${scene.currentSeed}-quest-npc-sprites`);
  const patrolRng = createRng(`${scene.currentSeed}-quest-npc-patrol`);
  scene.questNpcs = [];

  installChainQuests(
    scene,
    npcDataArray.map((n) => n.npcIndex),
  );

  let nextReceiverIndex = 0;
  let nextExtraIndex = 0;
  for (const questKey of Object.keys(scene.quests)) {
    const giverQs = scene.quests[questKey];
    if (
      (giverQs.questId !== "delivery" && giverQs.questId !== "escort") ||
      giverQs.role !== "giver"
    )
      continue;
    if (
      !giverQs.accepted ||
      giverQs.completed ||
      giverQs.failed ||
      giverQs.receiverKey
    )
      continue;
    if (giverQs.targetDepth !== scene.currentDepth) continue;

    // cherche le PROCHAIN pnj de cet etage qui n'a PAS deja de quete
    // assignee - ne jamais ecraser un pnj existant (cf. le bug ou un pnj
    // avec deja une quete tuer/looter se retrouvait transforme en
    // destinataire de colis)
    while (
      nextReceiverIndex < npcDataArray.length &&
      scene.quests[`${scene.currentDepth}-${nextReceiverIndex}`]
    ) {
      nextReceiverIndex++;
    }
    let receiverNpcIndex;
    let extraPos = null;
    if (nextReceiverIndex < npcDataArray.length) {
      receiverNpcIndex = nextReceiverIndex++;
    } else {
      // plus aucun PNJ libre dans cette ville : PNJ d'accueil supplementaire
      while (
        scene.quests[
          `${scene.currentDepth}-${EXTRA_NPC_INDEX_BASE + nextExtraIndex}`
        ]
      ) {
        nextExtraIndex++;
      }
      extraPos = pickExtraReceiverSpot(scene, nextExtraIndex);
      if (!extraPos) continue;
      receiverNpcIndex = EXTRA_NPC_INDEX_BASE + nextExtraIndex++;
    }
    const receiverKey = `${scene.currentDepth}-${receiverNpcIndex}`;
    scene.quests[receiverKey] =
      giverQs.questId === "escort"
        ? {
            questId: "escort",
            role: "receiver",
            linkedKey: questKey,
            xpReward: giverQs.xpReward,
            goldReward: giverQs.goldReward,
            accepted: true,
            completed: false,
          }
        : {
            questId: "delivery",
            role: "receiver",
            linkedKey: questKey,
            itemId: giverQs.itemId,
            xpReward: giverQs.xpReward,
            goldReward: giverQs.goldReward,
            accepted: true,
            completed: false,
          };
    if (extraPos) scene.quests[receiverKey].extraPos = extraPos;
    giverQs.receiverKey = receiverKey;
  }

  const freshlyCreatedKeys = [];

  // PNJ du serveur + PNJ d'accueil supplementaires (persistes via extraPos)
  const allNpcData = [...npcDataArray, ...collectExtraReceiverNpcs(scene)];

  for (const npcData of allNpcData) {
    const questKey = `${scene.currentDepth}-${npcData.npcIndex}`;

    // une quete d'escorte deja acceptee (role "giver") a deja transforme
    // son PNJ physique en invocation qui suit le heros (cf. acceptQuest) -
    // ne JAMAIS recreer un second PNJ a sa position d'origine au
    // rechargement de l'etage (F5/resumeFromSave/retryLevel re-fetchent
    // les memes donnees de niveau, seedees identiquement), sinon
    // duplication du PNJ ET reoffre indefiniment la meme quete deja en
    // cours (qs.completed reste false jusqu'au bout du voyage)
    const existingQuest = scene.quests[questKey];
    if (
      existingQuest &&
      existingQuest.questId === "escort" &&
      existingQuest.role === "giver"
    ) {
      continue;
    }

    // le tirage est TOUJOURS effectue (les autres pnj gardent leur sprite),
    // puis remplace si la quete du pnj impose un sprite (pnj de chaine)
    const randomSpriteKey =
      npcSpritePool.length > 0
        ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
        : "hero1";
    const forcedSpriteKey = scene.quests[questKey]?.npcSpriteKey;
    const npcSpriteKey =
      forcedSpriteKey && SPRITE_REGISTRY[forcedSpriteKey]
        ? forcedSpriteKey
        : randomSpriteKey;
    const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

    const sprite = scene.physics.add.sprite(
      npcData.x * TILE_SIZE + TILE_SIZE / 2,
      npcData.y * TILE_SIZE + TILE_SIZE / 2,
      npcSprite.key,
      npcSprite.animations.idleDown,
    );
    sprite.setScale(npcSprite.scale);
    const nhb = npcSprite.hitbox;
    sprite.body
      .setSize(nhb.width, nhb.height)
      .setOffset(nhb.offsetX, nhb.offsetY);
    sprite.anims.play(`${npcSpriteKey}-idle-down`);
    sprite.setDepth(9);
    scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
    // scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
    scene.levelColliders.push(
      scene.physics.add.collider(scene.enemyGroup, sprite),
    );

    const route = pickPatrolRoute(
      scene.fogGrid,
      { x: npcData.x, y: npcData.y },
      patrolRng,
    );

    scene.questNpcs.push({
      sprite,
      npcIndex: npcData.npcIndex,
      questKey,
      spriteKey: npcSpriteKey,
      lastDir: "down",
      patrolPath: route ? route.path : null,
      patrolIndex: 0,
      patrolDirection: 1,
      talking: false,
      homeTile: { x: npcData.x, y: npcData.y },
    });

    if (!scene.quests[questKey]) {
      scene.quests[questKey] = {
        questId: npcData.questId,
        target: npcData.target,
        xpReward: npcData.xpReward,
        goldReward: npcData.goldReward,
        itemReward: npcData.itemReward || null,
        targetEnemyType: npcData.targetEnemyType,
        targetItemId: npcData.targetItemId,
        targetQuantity: npcData.targetQuantity,
        targetBossDepth: npcData.targetBossDepth,
        targetBossType: npcData.targetBossType,
        dialogText: npcData.dialogText || null,
        accepted: false,
        completed: false,
        killCount: 0,
        bossDefeated: false,
      };
      freshlyCreatedKeys.push(questKey);
    }
  }

  maybeInjectDeliveryQuest(scene, freshlyCreatedKeys);
  maybeInjectRescueQuest(
    scene,
    Object.keys(scene.quests).filter((k) =>
      k.startsWith(`${scene.currentDepth}-`),
    ),
  );
}
export function maybeInjectDeliveryQuest(scene, eligibleKeys) {
  // jamais une quete liee a un boss (obtainItem garanti ou defeatBoss) -
  // l'ecraser silencieusement briserait la garantie d'objet de boss
  // (isBossItem, verifiee dans damageEnemy) avant meme que le joueur
  // ait pu la voir
  const chainTargetKeys = getChainTargetKeys(scene);
  eligibleKeys = eligibleKeys.filter((k) => !chainTargetKeys.has(k));
  const safeKeys = eligibleKeys.filter((k) => {
    const q = scene.quests[k];
    if (!q || q.accepted || q.completed || q.failed || q.chainId) return false;
    if (q.questId === "defeatBoss") return false;
    if (q.questId === "obtainItem" && q.isBossItem) return false;
    return true;
  });
  if (safeKeys.length === 0) return;
  if (scene.currentBiomeId !== "town") return;

  const injectRng = createRng(`${scene.currentSeed}-delivery-inject`);
  if (injectRng() >= 0.2) return;

  const giverKey = safeKeys[Math.floor(injectRng() * safeKeys.length)];

  const firstFutureTown = Math.floor(scene.currentDepth / 10) * 10 + 10;
  const futureCandidates = [];
  for (let d = firstFutureTown; d <= 100; d += 10) {
    if (!scene.visitedFloors.find((f) => f.depth === d))
      futureCandidates.push(d);
  }
  const canSameTown = eligibleKeys.length >= 2;

  let style, targetDepth;
  if (futureCandidates.length > 0 && (!canSameTown || injectRng() < 0.7)) {
    style = "crossTown";
    targetDepth =
      futureCandidates[Math.floor(injectRng() * futureCandidates.length)];
  } else if (canSameTown) {
    style = "sameTown";
    targetDepth = scene.currentDepth;
  } else {
    return;
  }

  const goldReward = 20 + Math.floor(injectRng() * 21);

  const giverQs = scene.quests[giverKey];
  giverQs.questId = "delivery";
  giverQs.role = "giver";
  giverQs.style = style;
  giverQs.targetDepth = targetDepth;
  giverQs.receiverKey = null;
  giverQs.itemId = "sealedPackage";
  giverQs.xpReward = 35;
  giverQs.goldReward = goldReward;
  giverQs.accepted = false;
  giverQs.completed = false;

  if (style === "sameTown") {
    const otherKeys = safeKeys.filter((k) => k !== giverKey);
    const receiverKey = otherKeys[Math.floor(injectRng() * otherKeys.length)];
    scene.quests[receiverKey] = {
      questId: "delivery",
      role: "receiver",
      linkedKey: giverKey,
      itemId: "sealedPackage",
      xpReward: giverQs.xpReward,
      goldReward: giverQs.goldReward,
      accepted: true,
      completed: false,
    };
    giverQs.receiverKey = receiverKey;
  }
}
export function maybeInjectRescueQuest(scene, eligibleKeys) {
  if (scene.currentBiomeId !== "town") return;

  // une seule quete de sauvetage par ville (a l'injection ou deja existante)
  const prefix = `${scene.currentDepth}-`;
  if (
    Object.entries(scene.quests).some(
      ([k, q]) => k.startsWith(prefix) && q.questId === "rescue",
    )
  )
    return;

  const chainTargetKeys = getChainTargetKeys(scene);
  const safeKeys = eligibleKeys.filter((k) => {
    const q = scene.quests[k];
    if (!q || q.accepted || q.completed || q.failed) return false;
    if (q.chainId || chainTargetKeys.has(k)) return false; // jamais sur une quete de chaine
    if (["defeatBoss", "delivery", "escort", "rescue"].includes(q.questId))
      return false;
    if (q.questId === "obtainItem" && q.isBossItem) return false;
    return true;
  });
  if (safeKeys.length === 0) return;

  const rescueRng = createRng(`${scene.currentSeed}-rescue-inject`);
  if (rescueRng() >= RESCUE_INJECT_CHANCE) return;

  // etages deja visites entre la ville precedente (exclue) et celle-ci
  const candidates = [];
  for (
    let d = Math.max(1, scene.currentDepth - 9);
    d < scene.currentDepth;
    d++
  ) {
    if (RESCUE_EXCLUDED_DEPTHS.has(d)) continue;
    if (scene.visitedFloors.find((f) => f.depth === d)) candidates.push(d);
  }
  if (candidates.length === 0) return;

  const giverKey = safeKeys[Math.floor(rescueRng() * safeKeys.length)];
  const targetDepth = candidates[Math.floor(rescueRng() * candidates.length)];
  const [minGold, maxGold] = RESCUE_GOLD_REWARD_RANGE;

  const giverQs = scene.quests[giverKey];
  giverQs.questId = "rescue";
  giverQs.role = "giver";
  giverQs.townDepth = scene.currentDepth;
  giverQs.targetDepth = targetDepth;
  giverQs.captiveFreed = false;
  giverQs.failed = false;
  giverQs.xpReward = RESCUE_XP_REWARD;
  giverQs.goldReward =
    minGold + Math.floor(rescueRng() * (maxGold - minGold + 1));
  giverQs.itemReward = null;
  giverQs.dialogText = null;
  giverQs.accepted = false;
  giverQs.completed = false;
}

/**
 * Fait apparaitre le PNJ captif d'une quete "rescue" acceptee, a l'etage
 * cible, tant qu'il n'a pas ete libere. Appelee par levelLoader apres
 * createQuestNpcs (qui n'est lui-meme appele que si l'etage a des PNJ).
 */
export function spawnRescueCaptive(scene) {
  if (!scene.questNpcs) scene.questNpcs = [];
  const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
    key.startsWith("NPC_town"),
  );

  for (const questKey of Object.keys(scene.quests)) {
    const qs = scene.quests[questKey];
    if (qs.questId !== "rescue" || qs.role !== "giver") continue;
    if (!qs.accepted || qs.completed || qs.failed || qs.captiveFreed) continue;
    if (qs.targetDepth !== scene.currentDepth) continue;
    if (scene.questNpcs.some((n) => n.isCaptive && n.questKey === questKey))
      continue;

    const rng = createRng(`${scene.currentSeed}-rescue-captive-${questKey}`);
    const grid = scene.fogGrid;
    const candidates = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === 0) candidates.push({ x, y });
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // premiere case de sol ATTEIGNABLE depuis le point d'arrivee du heros
    const from = scene.lastPlayerTile;
    let spot = null;
    for (let i = 0; i < Math.min(40, candidates.length); i++) {
      if (findPath(grid, from, candidates[i], 2000)) {
        spot = candidates[i];
        break;
      }
    }
    if (!spot) continue;

    const npcSpriteKey =
      npcSpritePool.length > 0
        ? npcSpritePool[Math.floor(rng() * npcSpritePool.length)]
        : "hero1";
    const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

    const sprite = scene.physics.add.sprite(
      spot.x * TILE_SIZE + TILE_SIZE / 2,
      spot.y * TILE_SIZE + TILE_SIZE / 2,
      npcSprite.key,
      npcSprite.animations.idleDown,
    );
    sprite.setScale(npcSprite.scale);
    const nhb = npcSprite.hitbox;
    sprite.body
      .setSize(nhb.width, nhb.height)
      .setOffset(nhb.offsetX, nhb.offsetY);
    sprite.anims.play(`${npcSpriteKey}-idle-down`);
    sprite.setDepth(9);
    scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
    scene.levelColliders.push(
      scene.physics.add.collider(scene.enemyGroup, sprite),
    );

    scene.questNpcs.push({
      sprite,
      npcIndex: -1,
      questKey, // cle de la quete "rescue" du PNJ de ville
      spriteKey: npcSpriteKey,
      lastDir: "down",
      patrolPath: null,
      patrolIndex: 0,
      patrolDirection: 1,
      talking: false,
      isCaptive: true,
    });
  }
}

// transforme un PNJ en invocation d'escorte qui suit le heros (meme objet
// que celui de la quete d'escorte, factorise ici)
function convertNpcToEscortSummon(scene, npc, questKey) {
  scene.summonIdCounter = (scene.summonIdCounter || 0) + 1;
  scene.summons.push({
    id: scene.summonIdCounter,
    sprite: npc.sprite,
    spriteKey: npc.spriteKey,
    sourceAbilityId: null,
    isEscort: true,
    escortQuestKey: questKey,
    path: null,
    pathIndex: 0,
    nextPathRequestAt: 0,
    pathDestX: null,
    pathDestY: null,
    hp: ESCORT_NPC_HP,
    maxHp: ESCORT_NPC_HP,
    damage: 0,
    defense: 0,
    damageType: "physical",
    resistances: {},
    persistent: true,
    attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
    expiresAt: null,
    lastDir: npc.lastDir || "down",
    growthConfig: null,
    stuckCheckPos: { x: npc.sprite.x, y: npc.sprite.y },
    stuckCheckAt: scene.time.now,
    stuckJitterUntil: 0,
    stuckStreak: 0,
    attackType: "melee",
  });
  if (scene.summonGroup) scene.summonGroup.add(npc.sprite);
}

const RESCUED_GREETINGS = [
  "Je n'oublierai jamais ce que tu as fait pour moi !",
  "Sans toi, je serais encore là-dessous... Merci !",
  "Ici, au moins, je me sens en sécurité. Merci encore !",
];

// fait apparaitre UN pnj sauve comme pnj ambiant (patrouille + dialogue)
function spawnRescuedNpc(scene, entry) {
  if (!scene.ambientNpcs) scene.ambientNpcs = [];
  const info = SPRITE_REGISTRY[entry.spriteKey];
  if (!info) return;

  const sprite = scene.physics.add.sprite(
    entry.x * TILE_SIZE + TILE_SIZE / 2,
    entry.y * TILE_SIZE + TILE_SIZE / 2,
    info.key,
    info.animations.idleDown,
  );
  sprite.setScale(info.scale);
  const nhb = info.hitbox;
  sprite.body
    .setSize(nhb.width, nhb.height)
    .setOffset(nhb.offsetX, nhb.offsetY);
  sprite.anims.play(`${entry.spriteKey}-idle-down`);
  sprite.setDepth(9);
  scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
  scene.levelColliders.push(
    scene.physics.add.collider(scene.enemyGroup, sprite),
  );

  const route = pickPatrolRoute(
    scene.fogGrid,
    { x: entry.x, y: entry.y },
    createRng(`${scene.currentSeed}-rescued-${entry.questKey}`),
  );

  scene.ambientNpcs.push({
    sprite,
    spriteKey: entry.spriteKey,
    lastDir: "down",
    patrolPath: route ? route.path : null,
    patrolIndex: 0,
    patrolDirection: 1,
    talking: false,
    greetingText: entry.greeting,
  });
}

// recree, dans la ville courante, tous les pnj sauves qui y vivent
// (appelee par levelLoader apres createAmbientNpcs)
export function spawnRescuedNpcs(scene) {
  for (const entry of scene.rescuedNpcs || []) {
    if (entry.townDepth === scene.currentDepth) spawnRescuedNpc(scene, entry);
  }
}

export function createAmbientNpcs(scene, npcDataArray) {
  const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
    key.startsWith("NPC_town"),
  );
  const spriteRng = createRng(`${scene.currentSeed}-ambient-npc-sprites`);
  const greetingRng = createRng(`${scene.currentSeed}-ambient-npc-greetings`);
  const patrolRng = createRng(`${scene.currentSeed}-ambient-npc-patrol`);
  scene.ambientNpcs = [];

  for (const npcData of npcDataArray) {
    const npcSpriteKey =
      npcSpritePool.length > 0
        ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
        : "hero1";
    const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

    const sprite = scene.physics.add.sprite(
      npcData.x * TILE_SIZE + TILE_SIZE / 2,
      npcData.y * TILE_SIZE + TILE_SIZE / 2,
      npcSprite.key,
      npcSprite.animations.idleDown,
    );
    sprite.setScale(npcSprite.scale);
    const nhb = npcSprite.hitbox;
    sprite.body
      .setSize(nhb.width, nhb.height)
      .setOffset(nhb.offsetX, nhb.offsetY);
    sprite.anims.play(`${npcSpriteKey}-idle-down`);
    sprite.setDepth(9);
    scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
    // scene.levelColliders.push(scene.physics.add.collider(scene.hero, sprite));
    scene.levelColliders.push(
      scene.physics.add.collider(scene.enemyGroup, sprite),
    );

    const route = pickPatrolRoute(
      scene.fogGrid,
      { x: npcData.x, y: npcData.y },
      patrolRng,
    );
    const greeting =
      AMBIENT_NPC_GREETINGS[
        Math.floor(greetingRng() * AMBIENT_NPC_GREETINGS.length)
      ];

    scene.ambientNpcs.push({
      sprite,
      spriteKey: npcSpriteKey,
      lastDir: "down",
      patrolPath: route ? route.path : null,
      patrolIndex: 0,
      patrolDirection: 1,
      talking: false,
      greetingText: greeting,
    });
  }
}

export function openQuestDialog(scene, npc) {
  const questKey = npc.questKey;
  scene.dialogOpen = true;
  scene.pauseGame("dialog");
  scene.activeDialogQuestKey = questKey;
  scene.activeTalkingNpc = npc;
  npc.talking = true;
  // une quete precedente a pu se terminer depuis le chargement de l'etage :
  // pose maintenant l'etape de chaine qui attend ce pnj (si elle existe)
  installChainQuests(
    scene,
    (scene.questNpcs || []).map((n) => n.npcIndex),
  );
  const qs = scene.quests[questKey];
  if (!qs) return;
  // pnj de chaine dont l'etape n'est pas encore arrivee : simple phrase
  if (qs.questId === "chainIdle") {
    scene.events.emit("npc-dialog", {
      text:
        (qs.npcName ? `${qs.npcName} : ` : "") +
        (qs.idleText || "Reviens me voir un peu plus tard."),
      canAccept: false,
      canTurnIn: false,
    });
    return;
  }
  // une etape de chaine DEJA rendue : on affiche son texte "after" (ou un
  // remerciement generique), pas le texte "complete" qui annonce la suite
  const custom =
    qs.chainId && qs.completed
      ? {
          ...(qs.dialogText || {}),
          complete:
            (qs.dialogText && qs.dialogText.after) ||
            "Merci encore pour ton aide !",
        }
      : qs.dialogText || {};
  let text;

  const secretHintSuffix = (() => {
    if (
      scene.secretRoomData &&
      !scene.discoveredSecretRoomDepths.includes(scene.currentDepth)
    ) {
      return " Au fait... on raconte qu'un passage secret se cache quelque part sur cet étage.";
    }
    const knownUndiscovered = scene.floorsWithSecretRoom.filter(
      (d) =>
        d !== scene.currentDepth &&
        !scene.discoveredSecretRoomDepths.includes(d),
    );
    if (knownUndiscovered.length > 0) {
      const hintRng = createRng(`${scene.currentSeed}-town-secret-hint`);
      const pickedDepth =
        knownUndiscovered[Math.floor(hintRng() * knownUndiscovered.length)];
      return ` Au fait... on raconte qu'un passage secret se cache quelque part à l'étage ${pickedDepth}.`;
    }
    return "";
  })();
  let canAccept = false;
  let canTurnIn = false;

  if (qs.questId === "obtainItem") {
    const itemName = resolveItemDef(qs.targetItemId).name;
    const requiredQty = qs.targetQuantity || 1;
    const haveQty = scene.inventory
      .filter((i) => i.itemId === qs.targetItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    const hasEnough = haveQty >= requiredQty;
    const qtyLabel = requiredQty > 1 ? `${requiredQty} ${itemName}` : itemName;

    if (qs.completed) {
      text = custom.complete || `Merci pour ${qtyLabel} !`;
    } else if (qs.accepted && hasEnough) {
      text =
        custom.ready ||
        `Tu en as assez ! Rends-moi ${qtyLabel} contre une récompense.`;
      canTurnIn = true;
    } else if (qs.accepted) {
      text =
        custom.progress ||
        `Toujours à la recherche de ${qtyLabel} (tu en as ${haveQty}/${requiredQty}) - reviens me voir une fois que tu en auras assez.`;
    } else {
      const bossHint =
        qs.bossDepth && qs.bossType
          ? ` Le ${resolveEnemyDisplayName(qs.bossType)} de l'étage ${qs.bossDepth} le détient.`
          : "";
      const enemyHint = qs.targetEnemyType
        ? ` On en trouve parfois sur les ${resolveEnemyDisplayName(qs.targetEnemyType)}.`
        : "";
      text =
        custom.offer ||
        `Peux-tu me rapporter ${qtyLabel} ?${bossHint}${enemyHint}`;
      canAccept = true;
    }
  } else if (qs.questId === "defeatBoss") {
    const bossName = resolveEnemyDisplayName(qs.targetBossType);
    if (qs.completed) {
      text = custom.complete || `Merci d'avoir vaincu ${bossName} !`;
    } else if (qs.accepted && qs.bossDefeated) {
      text = custom.ready || `Tu l'as vaincu ! Tu peux réclamer ta récompense.`;
      canTurnIn = true;
    } else if (qs.accepted) {
      text =
        custom.progress ||
        `${bossName} rôde toujours à l'étage ${qs.targetBossDepth} - reviens me voir une fois qu'il sera vaincu.`;
    } else {
      text =
        custom.offer ||
        `Peux-tu vaincre ${bossName} à l'étage ${qs.targetBossDepth} et revenir m'en informer ?`;
      canAccept = true;
    }
  } else if (qs.questId === "delivery") {
    if (qs.role === "receiver" && !scene.quests[qs.linkedKey]?.accepted) {
      text = "Bonjour, voyageur !";
      scene.events.emit("npc-dialog", {
        text,
        canAccept: false,
        canTurnIn: false,
      });
      return;
    }
    if (qs.role === "giver") {
      if (qs.completed) {
        text = custom.complete || `Merci d'avoir livré mon colis !`;
      } else if (qs.accepted) {
        text =
          custom.progress ||
          (qs.style === "sameTown"
            ? `Le colis est en route vers son destinataire, juste à côté.`
            : `Le colis est en route vers l'étage ${qs.targetDepth}.`);
      } else {
        text =
          custom.offer ||
          (qs.style === "sameTown"
            ? `Porte ce colis à quelqu'un juste à côté. Non, je ne peux pas y aller moi-même, ne pose pas de questions.`
            : `Porte ce colis à quelqu'un à l'étage ${qs.targetDepth}.`);
        canAccept = true;
      }
    } else {
      if (qs.completed) {
        text = custom.complete || `Merci pour le colis !`;
      } else {
        const hasItem = scene.inventory.some((i) => i.itemId === qs.itemId);
        if (hasItem) {
          text =
            custom.ready || `Tu as mon colis ! Merci de me l'avoir apporté.`;
          canTurnIn = true;
        } else {
          text = custom.progress || `J'attends toujours mon colis...`;
        }
      }
    }
  } else if (qs.questId === "escort") {
    // role "receiver" : uniquement assigne explicitement par
    // createQuestNpcs (jamais par defaut) - toute quete d'escorte SANS
    // ce role explicite est encore au stade "giver" (offre initiale, pas
    // encore acceptee), meme si qs.role vaut undefined a ce stade (mis a
    // "giver" seulement dans acceptQuest, apres coup). Verifier
    // qs.role === "receiver" explicitement (plutot qu'un else fourre-tout)
    // evite qu'une quete d'escorte fraiche ne tombe par erreur dans la
    // branche "receiver" et n'affiche que "Bonjour, voyageur !" sans
    // jamais proposer l'acceptation.
    if (qs.role === "receiver") {
      if (!scene.quests[qs.linkedKey]?.accepted) {
        text = "Bonjour, voyageur !";
        scene.events.emit("npc-dialog", {
          text,
          canAccept: false,
          canTurnIn: false,
        });
        return;
      }
      if (qs.completed) {
        text =
          custom.complete || `Merci de m'avoir aidé à retrouver mes proches !`;
      } else {
        const escortArrived = scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === qs.linkedKey,
        );
        if (escortArrived) {
          text =
            custom.ready ||
            `Te voilà enfin ! Merci de m'avoir escorté jusqu'ici.`;
          canTurnIn = true;
        } else {
          text =
            custom.progress || `J'attends toujours l'arrivée de mon protégé...`;
        }
      }
    } else {
      // role "giver" (ou undefined, avant acceptation)
      if (qs.completed) {
        text = custom.complete || `Merci de m'avoir escorté !`;
      } else {
        text = custom.offer;
        canAccept = true;
      }
    }
  } else if (qs.questId === "rescue") {
    if (npc.isCaptive) {
      text =
        custom.captive ||
        `Tu es venu me chercher ? Merci ! Je te suis, sortons d'ici avant que quelque chose ne nous trouve.`;
      canAccept = true;
    } else if (qs.completed) {
      text =
        custom.complete || `Merci de m'avoir ramené mon ami sain et sauf !`;
    } else if (qs.failed) {
      text =
        custom.failed ||
        `Tu n'as pas pu le sauver... Je n'ai plus rien à te dire.`;
    } else if (qs.accepted && qs.captiveFreed) {
      const escortPresent = scene.summons.some(
        (s) => s.isEscort && s.escortQuestKey === questKey,
      );
      if (escortPresent) {
        text = custom.ready || `Tu l'as retrouvé ! Merci infiniment.`;
        canTurnIn = true;
      } else {
        text = `Où est mon ami ? Ramène-le moi en vie !`;
      }
    } else if (qs.accepted) {
      text = `Mon ami est resté coincé à l'étage ${qs.targetDepth}. Je t'en prie, ramène-le !`;
    } else {
      text =
        custom.offer ||
        `Un de mes amis s'est perdu à l'étage ${qs.targetDepth}, là où tu es déjà passé. Peux-tu y retourner pour le sauver et me le ramener ?`;
      canAccept = true;
    }
  } else if (qs.completed) {
    const enemyName = resolveEnemyTargetName(qs.targetEnemyType);
    text = custom.complete || `Merci d'avoir tué ces ${enemyName} pour moi !`;
  } else if (qs.accepted && qs.killCount >= qs.target) {
    text = custom.ready || `C'est fait ! Tu peux réclamer ta récompense.`;
    canTurnIn = true;
  } else if (qs.accepted) {
    const enemyName = resolveEnemyTargetName(qs.targetEnemyType);
    text =
      custom.progress ||
      `Progression : ${qs.killCount} / ${qs.target} ${enemyName} tués. Reviens me voir une fois terminé !`;
  } else {
    const enemyName = resolveEnemyTargetName(qs.targetEnemyType);
    text = custom.offer || `Peux-tu tuer ${qs.target} ${enemyName} pour toi ?`;
    canAccept = true;
  }
  scene.events.emit("npc-dialog", {
    text: (qs.npcName ? `${qs.npcName} : ` : "") + text + secretHintSuffix,
    canAccept,
    canTurnIn,
  });
}

export function acceptQuest(scene) {
  const qs = scene.quests[scene.activeDialogQuestKey];
  if (!qs) return;
  qs.accepted = true;
  if (qs.chainId) {
    delete scene.quests[`${scene.activeDialogQuestKey}~lead`];
  }
  if (qs.questId === "delivery" && qs.role === "giver") {
    scene.addItemToInventory(qs.itemId, 1);
  }
  if (qs.questId === "rescue") {
    const npc = scene.activeTalkingNpc;
    if (npc && npc.isCaptive) {
      // libere le captif : il devient une escorte rattachee a la quete du
      // PNJ de ville (meme cle que celle ouverte dans openQuestDialog)
      scene.questNpcs = scene.questNpcs.filter((n) => n !== npc);
      clearNpcMarkers(npc);
      const alreadyEscorting = scene.summons.some(
        (s) => s.isEscort && s.escortQuestKey === scene.activeDialogQuestKey,
      );
      if (alreadyEscorting) {
        npc.sprite.destroy();
      } else {
        convertNpcToEscortSummon(scene, npc, scene.activeDialogQuestKey);
      }
      qs.captiveFreed = true;
      scene.showLootToast(
        `Captif libéré ! Ramène-le à l'étage ${qs.townDepth}.`,
      );
    }
  }
  if (qs.questId === "escort") {
    // meme calcul de ville future que maybeInjectDeliveryQuest - seul
    // le client connait scene.visitedFloors, jamais decide cote serveur
    const firstFutureTown = Math.floor(scene.currentDepth / 10) * 10 + 10;
    const futureCandidates = [];
    // la prochaine ville devant le joueur, visitee ou non : une escorte
    // doit toujours aller a la ville la plus proche (cf. plus bas)
    for (let d = firstFutureTown; d <= 100; d += 10) {
      futureCandidates.push(d);
    }

    if (futureCandidates.length === 0) {
      // aucune ville future disponible - annule silencieusement
      // l'acceptation plutot que de creer une quete impossible a rendre
      qs.accepted = false;
      scene.showLootToast("Aucune ville à escorter pour l'instant");
    } else {
      // toujours LA PLUS PROCHE ville future non visitee (futureCandidates
      // est deja trie par profondeur croissante, cf. la boucle
      // ci-dessus) - jamais un tirage aleatoire parmi toutes les villes
      // futures : contrairement a un colis (maybeInjectDeliveryQuest), le
      // PNJ escorte est vivant et vulnerable a chaque etage traverse, une
      // destination lointaine le condamnerait presque a coup sur avant
      // meme d'y arriver
      qs.targetDepth = futureCandidates[0];
      qs.role = "giver";
      qs.receiverKey = null;

      // le PNJ physique quitte questNpcs (patrouille) et devient une
      // invocation speciale (isEscort) qui suit le heros - reutilise
      // TOUT le systeme d'invocation (pathfinding, separation,
      // persistance cross-etage, ciblage par les ennemis) sans code
      // duplique, cf. discussion de conception
      const npc = scene.activeTalkingNpc;
      if (npc) {
        scene.questNpcs = scene.questNpcs.filter((n) => n !== npc);
        clearNpcMarkers(npc);

        // garde-fou supplementaire (en plus de celui de createQuestNpcs) :
        // ne jamais creer une deuxieme invocation d'escorte pour la meme
        // quete, meme si un ancien bug de duplication a deja laisse
        // trainer un PNJ en trop dans une sauvegarde existante - on
        // detruit simplement ce PNJ surnumeraire sans le transformer
        const alreadyEscorting = scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === scene.activeDialogQuestKey,
        );

        if (alreadyEscorting) {
          npc.sprite.destroy();
        } else {
          scene.summonIdCounter = (scene.summonIdCounter || 0) + 1;
          scene.summons.push({
            id: scene.summonIdCounter,
            sprite: npc.sprite,
            spriteKey: npc.spriteKey,
            sourceAbilityId: null,
            isEscort: true,
            escortQuestKey: scene.activeDialogQuestKey,
            path: null,
            pathIndex: 0,
            nextPathRequestAt: 0,
            pathDestX: null,
            pathDestY: null,
            hp: ESCORT_NPC_HP,
            maxHp: ESCORT_NPC_HP,
            damage: 0,
            defense: 0,
            damageType: "physical",
            resistances: {},
            persistent: true, // jamais remplacable par une vraie invocation (cf. performSummonAbility)
            attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
            expiresAt: null,
            lastDir: npc.lastDir || "down",
            growthConfig: null,
            stuckCheckPos: { x: npc.sprite.x, y: npc.sprite.y },
            stuckCheckAt: scene.time.now,
            stuckJitterUntil: 0,
            stuckStreak: 0,
            attackType: "melee",
          });
          if (scene.summonGroup) scene.summonGroup.add(npc.sprite);
        }
      }
    }
  }
  scene.dialogOpen = false;
  scene.unpauseGame("dialog");
  scene.activeDialogQuestKey = null;
  releaseTalkingNpc(scene);
  scene.events.emit("npc-dialog", null);
  scene.events.emit("quests-updated", { ...scene.quests });
  // fait apparaitre les ennemis lies a cette quete (cf. levelLoader)
  if (scene.spawnGatedEnemies) scene.spawnGatedEnemies();
  scene.persistProgress();
}

export function turnInQuest(scene) {
  const qs = scene.quests[scene.activeDialogQuestKey];
  if (!qs || qs.completed) return;
  if (
    qs.questId !== "obtainItem" &&
    qs.questId !== "defeatBoss" &&
    qs.questId !== "killEnemies" &&
    !(qs.questId === "delivery" && qs.role === "receiver") &&
    !(qs.questId === "escort" && qs.role === "receiver") &&
    !(qs.questId === "rescue" && qs.role === "giver")
  )
    return;

  if (qs.questId === "obtainItem") {
    const requiredQty = qs.targetQuantity || 1;
    const haveQty = scene.inventory
      .filter((i) => i.itemId === qs.targetItemId)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (haveQty < requiredQty) return;

    let remaining = requiredQty;
    for (let i = scene.inventory.length - 1; i >= 0 && remaining > 0; i--) {
      const entry = scene.inventory[i];
      if (entry.itemId !== qs.targetItemId) continue;
      const take = Math.min(entry.quantity, remaining);
      entry.quantity -= take;
      remaining -= take;
      if (entry.quantity <= 0) scene.inventory.splice(i, 1);
    }
  } else if (qs.questId === "defeatBoss") {
    if (!qs.bossDefeated) return;
  } else if (qs.questId === "killEnemies") {
    if (qs.killCount < qs.target) return;
  } else if (qs.questId === "escort" && qs.role === "receiver") {
    // retire TOUS les summons lies a cette quete, pas seulement le
    // premier trouve - une sauvegarde touchee par l'ancien bug de
    // duplication (cf. createQuestNpcs/acceptQuest) a pu accumuler
    // plusieurs invocations pour la meme escorte ; sans ca, les doublons
    // continueraient a suivre le heros indefiniment meme apres la remise
    const matchingEscorts = scene.summons.filter(
      (s) => s.isEscort && s.escortQuestKey === qs.linkedKey,
    );
    if (matchingEscorts.length === 0) return; // pas encore arrive (ou deja mort)
    for (const escort of matchingEscorts) escort.sprite.destroy();
    scene.summons = scene.summons.filter(
      (s) => !(s.isEscort && s.escortQuestKey === qs.linkedKey),
    );

    const giverQs = scene.quests[qs.linkedKey];
    if (giverQs) giverQs.completed = true;
  } else if (qs.questId === "rescue" && qs.role === "giver") {
    const rescued = scene.summons.filter(
      (s) => s.isEscort && s.escortQuestKey === scene.activeDialogQuestKey,
    );
    if (rescued.length === 0) return; // pas (ou plus) avec le heros

    // le sauve devient un pnj ambiant PERSISTANT de cette ville
    const savedKey = scene.activeDialogQuestKey;
    const first = rescued[0];
    const entry = {
      questKey: savedKey,
      townDepth: scene.currentDepth,
      spriteKey: first.spriteKey,
      x: Math.floor(first.sprite.x / TILE_SIZE),
      y: Math.floor(first.sprite.y / TILE_SIZE),
      greeting:
        RESCUED_GREETINGS[Math.floor(Math.random() * RESCUED_GREETINGS.length)],
    };

    for (const r of rescued) r.sprite.destroy();
    scene.summons = scene.summons.filter(
      (s) => !(s.isEscort && s.escortQuestKey === savedKey),
    );

    scene.rescuedNpcs = scene.rescuedNpcs || [];
    if (!scene.rescuedNpcs.some((r) => r.questKey === savedKey)) {
      scene.rescuedNpcs.push(entry);
      spawnRescuedNpc(scene, entry);
    }
  } else {
    const itemIndex = scene.inventory.findIndex((i) => i.itemId === qs.itemId);
    if (itemIndex === -1) return;

    const item = scene.inventory[itemIndex];
    item.quantity -= 1;
    if (item.quantity <= 0) scene.inventory.splice(itemIndex, 1);

    const giverQs = scene.quests[qs.linkedKey];
    if (giverQs) giverQs.completed = true;
  }

  qs.completed = true;
  scene.xp += qs.xpReward;
  scene.events.emit("xp-changed", { xp: scene.xp });

  // recompenses reellement donnees (memes regles qu'avant), pour le popup
  const rewardLines = [];
  if (qs.xpReward) rewardLines.push(`${qs.xpReward} XP`);

  if (qs.chainId && !qs.role) {
    // etape de chaine : or ET objet, puis la chaine avance
    if (qs.goldReward) {
      scene.addItemToInventory("gold", qs.goldReward);
      rewardLines.push(`${qs.goldReward} or`);
    }
    if (qs.itemReward) {
      scene.addItemToInventory(qs.itemReward.itemId, qs.itemReward.quantity);
      const itemDef = resolveItemDef(qs.itemReward.itemId);
      rewardLines.push(`${itemDef.name} x${qs.itemReward.quantity}`);
    }
    // recette fixe, ou recette choisie selon l'archetype du heros
    let recipeId = qs.recipeReward;
    let recipeLabel = qs.recipeName;
    if (qs.recipeRewardByArchetype) {
      const archetype = resolveHeroStatsOverride(
        scene.heroSpriteKey,
      )?.archetype;
      const byArch = qs.recipeRewardByArchetype[archetype];
      recipeId = byArch ? byArch.id : null;
      recipeLabel = byArch ? byArch.name : null;
    }
    if (recipeId) {
      if (!scene.unlockedRecipes.includes(recipeId)) {
        scene.unlockedRecipes.push(recipeId);
      }
      // la recette n'est plus "decouverte mais verrouillee"
      scene.discoveredLockedRecipes = (
        scene.discoveredLockedRecipes || []
      ).filter((id) => id !== recipeId);
      scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
      scene.events.emit("locked-recipes-updated", [
        ...scene.discoveredLockedRecipes,
      ]);
      rewardLines.push(`Recette : ${recipeLabel || recipeId}`);
    }
  } else if (qs.questId === "killEnemies") {
    if (qs.itemReward) {
      scene.addItemToInventory(qs.itemReward.itemId, qs.itemReward.quantity);
      const itemDef = resolveItemDef(qs.itemReward.itemId);
      rewardLines.push(`${itemDef.name} x${qs.itemReward.quantity}`);
    }
  } else {
    scene.addItemToInventory("gold", qs.goldReward);
    if (qs.goldReward) rewardLines.push(`${qs.goldReward} or`);
  }

  // la chaine avance APRES l'ajout des recompenses (pose l'etape suivante)
  if (qs.chainId && !qs.role) {
    advanceQuestChain(scene, qs);
    relocateChainNpcs(scene);
  }

  scene.events.emit("quests-updated", { ...scene.quests });

  // le dialogue reste ouvert et affiche les gains (bouton "Fermer" seul) ;
  // closeDialog() se charge de liberer le PNJ et de relancer le jeu
  scene.events.emit("npc-dialog", {
    text:
      (qs.dialogText && qs.dialogText.complete
        ? `${qs.dialogText.complete}\n\n`
        : "") +
      (rewardLines.length > 0
        ? `Quête terminée ! Récompenses : ${rewardLines.join(" · ")}`
        : "Quête terminée !"),
    canAccept: false,
    canTurnIn: false,
  });
}

// a appeler apres l'ajout d'un objet a l'inventaire : previent le joueur quand
// une quete "rapporter" vient de devenir remettable
export function notifyItemQuestProgress(scene, itemId, addedQty) {
  if (!itemId || itemId === "gold") return;
  const haveQty = scene.inventory
    .filter((i) => i.itemId === itemId)
    .reduce((sum, i) => sum + i.quantity, 0);
  for (const qs of Object.values(scene.quests)) {
    if (qs.questId !== "obtainItem" || !qs.accepted || qs.completed) continue;
    if (qs.targetItemId !== itemId) continue;
    const target = qs.targetQuantity || 1;
    // seulement au moment ou le seuil est franchi (pas a chaque ramassage)
    if (haveQty >= target && haveQty - addedQty < target) {
      const message = qs.npcName
        ? `Quête prête : reviens voir ${qs.npcName} !`
        : "Quête prête : reviens voir le PNJ !";
      // retarde : le message de recolte (minage, cueillette, butin) est affiche
      // juste apres l'ajout a l'inventaire et remplacerait celui-ci
      if (scene.time) {
        scene.time.delayedCall(1500, () => scene.showLootToast(message));
      } else {
        scene.showLootToast(message);
      }
      break;
    }
  }
}

export function openAmbientDialog(scene, npc) {
  scene.dialogOpen = true;
  scene.pauseGame("dialog");
  scene.activeTalkingNpc = npc;
  npc.talking = true;
  scene.events.emit("npc-dialog", {
    text: npc.greetingText,
    canAccept: false,
    canTurnIn: false,
  });
}

export function releaseTalkingNpc(scene) {
  if (scene.activeTalkingNpc) {
    scene.activeTalkingNpc.talking = false;
    scene.activeTalkingNpc = null;
  }
}

export function closeDialog(scene) {
  scene.dialogOpen = false;
  scene.unpauseGame("dialog");
  scene.activeDialogQuestKey = null;
  releaseTalkingNpc(scene);
  scene.events.emit("npc-dialog", null);
}

// decalage (px) pour compenser les marges transparentes d'une frame de
// sprite - a ajuster si le texte flotte trop haut ou touche la tete
const NPC_MARKER_HEAD_PAD = 8;
const NPC_MARKER_IMAGE_HEIGHT = 22; // hauteur affichee (px) quand le marqueur est un sprite
const NPC_MARKER_STYLES = {
  // textureKey : cle d'image (cf. TILE_IMAGE_REGISTRY dans spriteRegistry.js) ;
  // tant qu'elle n'est pas chargee, le texte (char/color) sert de repli
  offer: { char: "!", color: "#ffd700", textureKey: "marker_offer" }, // quete a prendre
  progress: { char: "?", color: "#ffd700", textureKey: "marker_progress" }, // quete en cours
  ready: { char: "?", color: "#44dd44", textureKey: "marker_ready" }, // quete a rendre
};

/**
 * Etat de la quete d'un pnj pour le marqueur au-dessus de sa tete :
 * "offer" | "progress" | "ready" | null (rien a afficher), + son nom
 * (quetes de chaine, cf. qs.npcName / CHAIN_NPCS).
 */
function getNpcQuestStatus(scene, npc) {
  if (npc.isCaptive) return { status: null, name: null };
  const qs = scene.quests[npc.questKey];
  const pending = getPendingChainStepFor(scene, npc.npcIndex);
  const name = (qs && qs.npcName) || (pending && pending.name) || null;

  if (!qs || qs.completed || qs.failed) {
    return { status: pending ? "offer" : null, name };
  }

  const countItem = (itemId) =>
    scene.inventory
      .filter((i) => i.itemId === itemId)
      .reduce((sum, i) => sum + i.quantity, 0);

  let status = null;
  switch (qs.questId) {
    case "obtainItem":
      if (!qs.accepted) status = "offer";
      else if (countItem(qs.targetItemId) >= (qs.targetQuantity || 1))
        status = "ready";
      else status = "progress";
      break;
    case "defeatBoss":
      if (!qs.accepted) status = "offer";
      else status = qs.bossDefeated ? "ready" : "progress";
      break;
    case "delivery":
      if (qs.role === "receiver") {
        if (scene.quests[qs.linkedKey]?.accepted && countItem(qs.itemId) > 0)
          status = "ready";
      } else {
        status = qs.accepted ? "progress" : "offer";
      }
      break;
    case "escort":
      if (qs.role === "receiver") {
        const arrived = scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === qs.linkedKey,
        );
        if (scene.quests[qs.linkedKey]?.accepted && arrived) status = "ready";
      } else {
        status = "offer";
      }
      break;
    case "rescue":
      if (!qs.accepted) status = "offer";
      else if (
        qs.captiveFreed &&
        scene.summons.some(
          (s) => s.isEscort && s.escortQuestKey === npc.questKey,
        )
      )
        status = "ready";
      else status = "progress";
      break;
    case "chainIdle":
      status = null; // pnj en attente : pas de "!" tant que son etape n'est pas la
      break;
    default:
      // killEnemies et autres
      if (!qs.accepted) status = "offer";
      else status = qs.killCount >= qs.target ? "ready" : "progress";
  }
  return { status, name };
}

function ensureNpcTexts(scene, npc) {
  if (npc.markerText) return;
  npc.nameText = scene.add
    .text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    })
    .setOrigin(0.5, 1)
    .setDepth(11)
    .setVisible(false);
  npc.markerText = scene.add
    .text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffd700",
      stroke: "#000000",
      strokeThickness: 4,
    })
    .setOrigin(0.5, 1)
    .setDepth(11)
    .setVisible(false);
  npc.markerImage = scene.add
    .image(0, 0, "__DEFAULT")
    .setOrigin(0.5, 1)
    .setDepth(11)
    .setVisible(false);
  // les textes/images suivent la vie du sprite (changement d'etage, escorte...)
  npc.sprite.once("destroy", () => {
    if (npc.nameText) npc.nameText.destroy();
    if (npc.markerText) npc.markerText.destroy();
    if (npc.markerImage) npc.markerImage.destroy();
    npc.nameText = null;
    npc.markerText = null;
    npc.markerImage = null;
  });
}

function updateNpcMarkers(scene, npc, forcedInfo = null) {
  if (!npc.sprite || !npc.sprite.active) return;
  // pnj ambiants : pas de questKey, donc ni marqueur ni nom (sauf si l'etat
  // est impose, cf. updateEscortMarkers)
  if (!forcedInfo && !npc.questKey) return;
  ensureNpcTexts(scene, npc);
  const now = scene.time.now;
  // l'etat n'est recalcule que toutes les 300 ms (pas a chaque frame)
  if (!npc.markerCheckAt || now >= npc.markerCheckAt) {
    npc.markerCheckAt = now + 300;
    const info = forcedInfo || getNpcQuestStatus(scene, npc);
    const style = info.status ? NPC_MARKER_STYLES[info.status] : null;
    npc.nameText.setText(info.name || "");
    // sprite si l'image est chargee, sinon repli sur le texte "!" / "?"
    const useImage = !!style && scene.textures.exists(style.textureKey);
    npc.markerKind = !style ? null : useImage ? "image" : "text";
    if (useImage) {
      npc.markerImage.setTexture(style.textureKey);
      npc.markerImage.setScale(
        NPC_MARKER_IMAGE_HEIGHT / npc.markerImage.height,
      );
    }
    if (style && !useImage)
      npc.markerText.setText(style.char).setColor(style.color);
    else npc.markerText.setText("");
  }
  const show = npc.sprite.visible; // suit le brouillard de guerre
  const hasName = !!npc.nameText.text;
  const markerOn = !!npc.markerKind && !npc.talking && show;
  const top = npc.sprite.y - npc.sprite.displayHeight / 2 + NPC_MARKER_HEAD_PAD;
  npc.nameText.setVisible(show && hasName).setPosition(npc.sprite.x, top);
  const nameHeight = hasName ? npc.nameText.height : 0;
  const markerY = top - nameHeight - 2 + Math.sin(now / 250) * 2;
  npc.markerImage
    .setVisible(markerOn && npc.markerKind === "image")
    .setPosition(npc.sprite.x, markerY);
  npc.markerText
    .setVisible(markerOn && npc.markerKind === "text")
    .setPosition(npc.sprite.x, markerY);
}

// retire les marqueurs/nom d'un pnj (ex. quand il devient une escorte)
function clearNpcMarkers(npc) {
  if (npc.nameText) npc.nameText.destroy();
  if (npc.markerText) npc.markerText.destroy();
  if (npc.markerImage) npc.markerImage.destroy();
  npc.nameText = null;
  npc.markerText = null;
  npc.markerImage = null;
}

// "?" jaune au-dessus d'un pnj escorte (ou d'un captif libere) qui suit le heros
function updateEscortMarkers(scene) {
  for (const summon of scene.summons || []) {
    if (!summon.isEscort) continue;
    updateNpcMarkers(scene, summon, { status: "progress", name: null });
  }
}

/**
 * Apres l'avancee d'une chaine : un pnj de chaine dont la case a change
 * (step.at.tile differente d'une etape a l'autre) marche jusqu'a sa nouvelle
 * case au lieu de rester a l'ancienne.
 */
export function relocateChainNpcs(scene) {
  for (const npc of scene.questNpcs || []) {
    const qs = scene.quests[npc.questKey];
    if (!qs || !qs.extraPos || !npc.homeTile || !npc.sprite?.active) continue;
    const dest = qs.extraPos;
    if (npc.homeTile.x === dest.x && npc.homeTile.y === dest.y) continue;
    npc.homeTile = { x: dest.x, y: dest.y };
    npc.patrolPath = null;
    const from = {
      x: Math.floor(npc.sprite.x / TILE_SIZE),
      y: Math.floor(npc.sprite.y / TILE_SIZE),
    };
    const path = findPath(scene.fogGrid, from, dest, 4000);
    if (path && path.length > 0) {
      npc.relocatePath = path;
      npc.relocateIndex = 0;
    } else {
      // pas de chemin : on le place directement
      npc.sprite.setPosition(
        dest.x * TILE_SIZE + TILE_SIZE / 2,
        dest.y * TILE_SIZE + TILE_SIZE / 2,
      );
      const route = pickPatrolRoute(
        scene.fogGrid,
        dest,
        createRng(`${scene.currentSeed}-relocate-${npc.npcIndex}`),
      );
      npc.patrolPath = route ? route.path : null;
      npc.patrolIndex = 0;
      npc.patrolDirection = 1;
    }
  }
}

export function updateNpcMovement(scene, npcList) {
  // marqueurs des escortes (invocations) : une seule fois par frame, cette
  // fonction etant appelee pour les pnj de quete ET les pnj ambiants
  if (scene._escortMarkerFrame !== scene.time.now) {
    scene._escortMarkerFrame = scene.time.now;
    updateEscortMarkers(scene);
  }
  if (!npcList) return;
  const state = scene.fogState.state;

  for (const npc of npcList) {
    const npcTileX = Math.floor(npc.sprite.x / TILE_SIZE);
    const npcTileY = Math.floor(npc.sprite.y / TILE_SIZE);
    const npcVisible =
      npcTileY >= 0 &&
      npcTileX >= 0 &&
      npcTileY < state.length &&
      npcTileX < state[0].length &&
      state[npcTileY][npcTileX] === 2;
    npc.sprite.setVisible(npcVisible);
    updateNpcMarkers(scene, npc);

    if (npc.talking) {
      npc.sprite.setVelocity(0, 0);
      npc.sprite.anims.play(`${npc.spriteKey}-idle-${npc.lastDir}`, true);
      continue;
    }
    if (npc.relocatePath) {
      const wp = npc.relocatePath[npc.relocateIndex];
      scene.moveEnemyToward(npc, wp, ENEMY_SPEED * 0.8, () => {
        npc.relocateIndex += 1;
        if (npc.relocateIndex >= npc.relocatePath.length) {
          npc.relocatePath = null;
          // arrive : reprend une patrouille autour de la nouvelle case
          const route = pickPatrolRoute(
            scene.fogGrid,
            npc.homeTile,
            createRng(`${scene.currentSeed}-relocate-${npc.npcIndex}`),
          );
          npc.patrolPath = route ? route.path : null;
          npc.patrolIndex = 0;
          npc.patrolDirection = 1;
        }
      });
      continue;
    }
    if (npc.patrolPath && npc.patrolPath.length > 1) {
      const waypoint = npc.patrolPath[npc.patrolIndex];
      scene.moveEnemyToward(npc, waypoint, ENEMY_SPEED * 0.5, () => {
        if (
          npc.patrolIndex + npc.patrolDirection < 0 ||
          npc.patrolIndex + npc.patrolDirection >= npc.patrolPath.length
        ) {
          npc.patrolDirection *= -1;
        }
        npc.patrolIndex += npc.patrolDirection;
      });
      continue;
    }

    npc.sprite.setVelocity(0, 0);
    npc.sprite.anims.play(`${npc.spriteKey}-idle-${npc.lastDir}`, true);
  }
}
