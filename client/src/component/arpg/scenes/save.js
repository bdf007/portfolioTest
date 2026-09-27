import {
  computeFamiliarGrowthScale,
  spawnSummonSprite,
} from "./summons";
import { giveStartingKit } from "./inventory";
import { saveProgress } from "../../../api/arpgClient";
import { getPlayerStatsForLevel } from "../leveling";
import { resolveHeroStatsOverride, CHEST_VARIANTS } from "../spriteRegistry";
import { createCooldown } from "../combat";
import { ABILITY_DEFS } from "../abilityDefs";

// ENEMY_ATTACK_COOLDOWN et DEFAULT_ATTRIBUTES dupliques volontairement
// (identiques a ceux de MainScene.js) - meme logique que dans
// summons.js/quests.js/exploration.js/ai.js/inventory.js/hud.js.
const ENEMY_ATTACK_COOLDOWN = 900;
const DEFAULT_ATTRIBUTES = {
  force: 0,
  dexterite: 0,
  intelligence: 0,
  vitalite: 0,
  constitution: 0,
  endurance: 0,
  chance: 0,
};

export async function startGame(scene) {
  const resumeSave = scene.registry.get("resumeSave");
  if (resumeSave) {
    await resumeFromSave(scene, resumeSave);
    return;
  }
  giveStartingKit(scene);
  scene.loadLevel(scene.currentDepth);
}

export async function resumeFromSave(scene, save) {
  scene.currentGameId = save.gameId || null;
  scene.visitedFloors = save.floors || [];
  const ps = save.playerState || {};
  scene.discoveredLandmarks = ps.discoveredLandmarks || {};
  scene.xp = ps.xp || 0;
  scene.playerLevel = ps.level || 1;
  scene.playerAttributes = ps.playerAttributes || { ...DEFAULT_ATTRIBUTES };
  scene.unspentAttributePoints = ps.unspentAttributePoints || 0;
  scene.quests = ps.quests || {};
  for (const qs of Object.values(scene.quests)) {
    if (
      qs.questId === "obtainItem" &&
      qs.isBossItem === undefined &&
      !qs.targetEnemyType
    ) {
      qs.isBossItem = true; // rattrape une quete acceptee avant l'ajout de ce champ
    }
  }
  scene.inventory = ps.inventory || [];
  scene.hotbarSlots = ps.hotbarSlots || new Array(9).fill(null);
  scene.unlockedAbilities = ps.unlockedAbilities || [];
  scene.unlockedRecipes = ps.unlockedRecipes || [];
  scene.discoveredLockedRecipes = ps.discoveredLockedRecipes || [];
  scene.shopSoldItems = ps.shopSoldItems || {};
  scene.shopRerollSeed = ps.shopRerollSeed || {};
  scene.obtainedUniqueItems = ps.obtainedUniqueItems || [];
  scene.furyKillCount = ps.furyKillCount || 0;
  scene.pendingBossRoomOpen = ps.bossRoomOpen || false;
  scene.pendingBossAlive = ps.bossAlive ?? null;
  scene.pendingBossHp = ps.bossCurrentHp ?? null;
  scene.pendingBossPosition = ps.bossPosition ?? null;
  scene.pendingBossState = ps.bossState ?? null;
  scene.equipped = {
    mainHand: null,
    offHand: null,
    armor: null,
    helmet: null,
    pants: null,
    boots: null,
    belt: null,
    ring1: null,
    ring2: null,
    necklace: null,
    quiver: null,
    ...(ps.equipped || {}),
  };
  scene.timePlayedBaseline = ps.timePlayedSeconds || 0;

  const stats = getPlayerStatsForLevel(
    scene.playerLevel,
    resolveHeroStatsOverride(scene.heroSpriteKey),
  );
  scene.recalculatePlayerStats();
  scene.playerMana = ps.mana ?? scene.playerMaxMana;

  scene.floorFogCache = ps.floorFogCache || {};
  scene.discoveredSecretRoomDepths = ps.discoveredSecretRoomDepths || [];
  scene.floorsWithSecretRoom = ps.floorsWithSecretRoom || [];

  await scene.loadLevel(
    save.depth,
    save.seed,
    ps.hp,
    ps.currentFloorKills || [],
    ps.currentFloorOpenedChests || [],
    ps.currentFloorLootSeed || null,
    null,
    ps.playerPosition || null,
    ps.currentFloorChestRemainingLoot || {},
    ps.currentFloorTriggeredTraps || [],
    ps.currentFloorRevealedTraps || [],
    ps.currentFloorLeverActivations || [],
    ps.currentFloorMiningRocksState || [],
    ps.currentFloorEphemeralChests || [],
    ps.currentFloorForageNodesState || [],
  );
  for (const savedSummon of ps.summons || []) {
    const sourceAbilityDef = ABILITY_DEFS[savedSummon.sourceAbilityId];
    const growthConfig = sourceAbilityDef?.growthConfig || null;
    const growthScale = computeFamiliarGrowthScale(scene, growthConfig);
    const sprite = spawnSummonSprite(scene,
      savedSummon.spriteKey,
      scene.hero.x + (Math.random() - 0.5) * 40,
      scene.hero.y + (Math.random() - 0.5) * 40,
      growthScale,
    );
    scene.summonIdCounter = (scene.summonIdCounter || 0) + 1;
    scene.summons.push({
      id: scene.summonIdCounter,
      sprite,
      spriteKey: savedSummon.spriteKey,
      sourceAbilityId: savedSummon.sourceAbilityId,
      isEscort: savedSummon.isEscort || false,
      escortQuestKey: savedSummon.escortQuestKey || null,
      path: null,
      pathIndex: 0,
      nextPathRequestAt: 0,
      pathDestX: null,
      pathDestY: null,
      hp: savedSummon.hp,
      maxHp: savedSummon.maxHp,
      damage: savedSummon.damage,
      defense: savedSummon.defense,
      damageType: savedSummon.damageType,
      resistances: savedSummon.resistances,
      persistent: savedSummon.persistent,
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      expiresAt:
        savedSummon.remainingMs != null
          ? scene.time.now + savedSummon.remainingMs
          : null,
      lastDir: "down",
      growthConfig,
      stuckCheckPos: { x: sprite.x, y: sprite.y },
      stuckCheckAt: scene.time.now,
      stuckJitterUntil: 0,
      stuckStreak: 0,
      // <-- le champ qui manquait et causait le bug : sans lui, isRanged
      // valait toujours false au rechargement et l'invocation fonçait au
      // contact comme un summon corps a corps
      attackType: sourceAbilityDef?.attackType || "melee",
    });
  }
  scene.events.emit("xp-changed", { xp: scene.xp });
  scene.events.emit("player-mana-changed", {
    mana: scene.playerMana,
    maxMana: scene.playerMaxMana,
  });
  scene.events.emit("level-up", { level: scene.playerLevel, stats });
  scene.events.emit("attributes-updated", {
    attributes: { ...scene.playerAttributes },
    unspent: scene.unspentAttributePoints,
  });
  scene.events.emit("quests-updated", { ...scene.quests });
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.events.emit("equipment-updated", { ...scene.equipped });
  scene.events.emit("hotbar-updated", [...scene.hotbarSlots]);
  scene.events.emit("abilities-updated", [...scene.unlockedAbilities]);
  scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
  scene.events.emit("locked-recipes-updated", [
    ...scene.discoveredLockedRecipes,
  ]);
}

export function getTotalTimePlayed(scene) {
  return (
    scene.timePlayedBaseline +
    Math.floor((Date.now() - scene.sessionStartedAt) / 1000)
  );
}

export async function persistProgressAsync(scene) {
  if (!scene.currentSeed) return;

  try {
    const currentFloorTiles = [];
    if (scene.fogState?.state) {
      for (let y = 0; y < scene.fogState.state.length; y++) {
        for (let x = 0; x < scene.fogState.state[y].length; x++) {
          if (scene.fogState.state[y][x] !== 0) {
            currentFloorTiles.push(`${x},${y}`);
          }
        }
      }
    }
    const floorFogCacheToSave = {
      ...scene.floorFogCache,
      ...(scene.currentDepth != null
        ? { [scene.currentDepth]: currentFloorTiles }
        : {}),
    };

    const res = await saveProgress(
      scene.currentGameId,
      scene.currentDepth,
      scene.currentSeed,
      scene.visitedFloors,
      {
        xp: scene.xp,
        level: scene.playerLevel,
        playerAttributes: { ...scene.playerAttributes },
        unspentAttributePoints: scene.unspentAttributePoints,
        hp: scene.playerHp,
        mana: scene.playerMana,
        heroId: scene.heroSpriteKey,
        currentFloorKills: scene.currentFloorKills,
        currentFloorOpenedChests: scene.currentFloorOpenedChests,
        currentFloorTriggeredTraps: scene.currentFloorTriggeredTraps,
        currentFloorRevealedTraps: scene.currentFloorRevealedTraps,
        discoveredSecretRoomDepths: scene.discoveredSecretRoomDepths,
        floorsWithSecretRoom: scene.floorsWithSecretRoom,
        currentFloorLeverActivations: scene.secretLevers
          .filter((l) => l.activated)
          .map((l) => `${l.x},${l.y}`),
        currentFloorMiningRocksState: scene.miningRocks.map((r) => ({
          index: r.index,
          hits: r.hits,
          depleted: r.depleted,
        })),
        currentFloorForageNodesState: scene.forageNodes.map((n) => ({
          index: n.index,
          hits: n.hits,
          depleted: n.depleted,
        })),
        currentFloorEphemeralChests: scene.chests
          .filter((c) => c.ephemeral)
          .map((c) => ({
            index: c.index,
            x: c.x,
            y: c.y,
            variantIndex: CHEST_VARIANTS.indexOf(c.variant),
            opened: c.opened,
          })),
        currentFloorChestRemainingLoot: scene.currentFloorChestRemainingLoot,
        currentFloorLootSeed: scene.currentFloorLootSeed,
        quests: scene.quests,
        inventory: scene.inventory,
        hotbarSlots: scene.hotbarSlots,
        unlockedRecipes: scene.unlockedRecipes,
        discoveredLockedRecipes: scene.discoveredLockedRecipes,
        shopSoldItems: scene.shopSoldItems,
        shopRerollSeed: scene.shopRerollSeed,
        obtainedUniqueItems: scene.obtainedUniqueItems,
        summons: scene.summons.map((s) => ({
          spriteKey: s.spriteKey,
          hp: s.hp,
          maxHp: s.maxHp,
          damage: s.damage,
          defense: s.defense,
          damageType: s.damageType,
          resistances: s.resistances,
          persistent: s.persistent,
          sourceAbilityId: s.sourceAbilityId,
          isEscort: s.isEscort || false,
          escortQuestKey: s.escortQuestKey || null,
          remainingMs: s.expiresAt
            ? Math.max(0, s.expiresAt - scene.time.now)
            : null,
        })),
        furyKillCount: scene.furyKillCount,
        bossRoomOpen: scene.bossRoomOpen,
        bossCurrentHp: (() => {
          if (!scene.bossRoomOpen || scene.bossAlive === false) return null;
          const bossEnemy = scene.enemies.find((e) => e.isBoss);
          return bossEnemy ? bossEnemy.hp : null;
        })(),
        bossPosition: (() => {
          if (!scene.bossRoomOpen || scene.bossAlive === false) return null;
          const bossEnemy = scene.enemies.find((e) => e.isBoss);
          return bossEnemy
            ? { x: bossEnemy.sprite.x, y: bossEnemy.sprite.y }
            : null;
        })(),
        bossState: (() => {
          if (!scene.bossRoomOpen || scene.bossAlive === false) return null;
          const bossEnemy = scene.enemies.find((e) => e.isBoss);
          return bossEnemy ? bossEnemy.state : null;
        })(),
        bossAlive: scene.bossAlive,
        unlockedAbilities: scene.unlockedAbilities,
        equipped: scene.equipped,
        discoveredLandmarks: scene.discoveredLandmarks,
        timePlayedSeconds: getTotalTimePlayed(scene),
        floorFogCache: floorFogCacheToSave,
        playerPosition: scene.lastPlayerTile,
      },
    );

    if (res && res.gameId) scene.currentGameId = res.gameId;
  } catch (err) {
    console.warn("[MainScene] echec de sauvegarde", err);
  }
}

export async function saveAndQuit(scene) {
  await persistProgressAsync(scene);
  scene.events.emit("quit-to-menu");
}
