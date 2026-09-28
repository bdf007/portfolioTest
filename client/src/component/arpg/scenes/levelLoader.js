/**
 * Chargement d'un etage (loadLevel) et rechargement apres mort (retryLevel).
 *
 * Fonction la plus transverse du refacto : elle orchestre a peu pres TOUT
 * ce qui a deja ete extrait dans les autres modules mixin (fetch du niveau
 * cote serveur, reconstruction complete de la scene Phaser - tilemap,
 * brouillard de guerre, ennemis, coffres, pieges, gisements, PNJ de quete/
 * ambiants, salle secrete, marqueurs de sortie/boss/hub/boutique...) avant
 * de rendre la main. C'est pour ca qu'elle avait ete explicitement exclue
 * du chantier Sauvegarde (trop transverse pour y etre traitee au passage).
 */
import { fetchLevel } from "../../../api/arpgClient";
import { createRng } from "../rng";
import { createFogState } from "../fogOfWar";
import { createEnemyBehavior } from "../enemyBehavior";
import { createCooldown } from "../combat";
import {
  SPRITE_REGISTRY,
  resolveEnemySprite,
  LEVER_SPRITESHEET,
} from "../spriteRegistry";
import { buildFloorTilemap, spawnFloorDecorations } from "./floorRenderer";
import {
  spawnChests,
  spawnTraps,
  spawnMiningRocks,
  spawnForageNodes,
} from "./floorEntities";
import { createQuestNpcs, createAmbientNpcs } from "./quests";
import {
  createEnemyVisualEffect,
  getEffectivePlayerVisionRadius,
} from "./statusEffects";
import { spawnSummonSprite } from "./summons";
import { clearDebugTileIndices } from "./hud";

import {
  TILE_SIZE,
  ENEMY_ATTACK_COOLDOWN,
  FURY_KILLS_REQUIRED,
  resolveVisualEffect,
} from "./gameConstants";

export async function loadLevel(
  scene,
  depth,
  seed,
  hpOverride,
  killedIndices = [],
  openedChestIndices = [],
  lootSeed = null,
  savedFogState = null,
  savedPlayerPosition = null,
  savedChestRemainingLoot = {},
  savedTriggeredTraps = [],
  savedRevealedTraps = [],
  savedLeverActivations = [],
  savedMiningRocksState = [],
  savedEphemeralChests = [],
  savedForageNodesState = [],
) {
  scene.currentFloorChestRemainingLoot = savedChestRemainingLoot || {};
  scene.currentFloorTriggeredTraps = savedTriggeredTraps || [];
  scene.currentFloorRevealedTraps = savedRevealedTraps || [];

  if (scene.fogState?.state && scene.currentDepth != null) {
    const discoveredTiles = [];
    for (let y = 0; y < scene.fogState.state.length; y++) {
      for (let x = 0; x < scene.fogState.state[y].length; x++) {
        if (scene.fogState.state[y][x] !== 0)
          discoveredTiles.push(`${x},${y}`);
      }
    }
    scene.floorFogCache[scene.currentDepth] = discoveredTiles;
  }

  scene.events.emit("level-loading", { depth });
  const effectiveLootSeed = lootSeed || `${Date.now()}-${Math.random()}`;
  scene.currentFloorLootSeed = effectiveLootSeed;

  let data;
  try {
    const previousFloors = scene.visitedFloors
      .filter((f) => f.depth < depth)
      .map((f) => ({ depth: f.depth, seed: f.seed }));
    data = await fetchLevel(
      depth,
      seed,
      effectiveLootSeed,
      previousFloors,
      scene.discoveredSecretRoomDepths,
      scene.obtainedUniqueItems,
    );
  } catch (err) {
    scene.events.emit("level-load-error", { depth, error: err.message });
    return;
  }

  const {
    grid,
    playerSpawn,
    exitTile,
    upstairsTile,
    boss,
    bossDoorTile,
    travelHubTile,
    shop,
    ambientNpcs: ambientNpcData,
    enemies,
    chests,
    traps,
    tileset,
  } = data;

  const effectiveSavedFogState =
    savedFogState || scene.floorFogCache[depth] || null;

  scene.currentDepth = depth;
  scene.currentBiomeId = data.biome;
  scene.currentSeed = data.seed;
  if (!scene.discoveredLandmarks[depth]) {
    scene.discoveredLandmarks[depth] = {
      exitTile: exitTile ? { ...exitTile } : null,
      exitDiscovered: false,

      upstairsTile: upstairsTile ? { ...upstairsTile } : null,
      upstairsDiscovered: false,

      questNpcs: {},
    };
  } else {
    scene.discoveredLandmarks[depth].exitTile = exitTile
      ? { ...exitTile }
      : null;

    scene.discoveredLandmarks[depth].upstairsTile = upstairsTile
      ? { ...upstairsTile }
      : null;
  }
  scene.fogGrid = grid;
  scene.currentFloorKills = [...killedIndices];
  scene.currentFloorOpenedChests = [...openedChestIndices];
  scene.bossData = boss || null;
  scene.travelHubTile = travelHubTile || null;
  scene.shopData = shop || null;
  scene.bossDoorTile = bossDoorTile || null;
  scene.bossRoomOpen = false;
  scene.bossAlive = scene.bossData ? true : null;

  if (!scene.visitedFloors.find((f) => f.depth === depth)) {
    scene.visitedFloors.push({ depth, seed: data.seed });
  }

  scene.levelColliders.forEach((c) => c.destroy());
  scene.levelColliders = [];

  if (scene.layer) {
    scene.layer.destroy();
    scene.layer = null;
  }
  if (scene.fogLayer) {
    scene.fogLayer.destroy();
    scene.fogLayer = null;
  }
  if (scene.map) {
    scene.map.destroy();
    scene.map = null;
  }
  if (scene.hero) {
    scene.hero.destroy();
    scene.hero = null;
  }
  if (scene.exitMarker) {
    scene.exitMarker.destroy();
    scene.exitMarker = null;
  }
  if (scene.upstairsMarker) {
    scene.upstairsMarker.destroy();
    scene.upstairsMarker = null;
  }
  if (scene.bossDoorMarker) {
    scene.bossDoorMarker.destroy();
    scene.bossDoorMarker = null;
  }
  if (scene.travelHubMarker) {
    scene.travelHubMarker.destroy();
    scene.travelHubMarker = null;
  }
  if (scene.shopMarker) {
    scene.shopMarker.destroy();
    scene.shopMarker = null;
  }
  if (scene.questNpcs) {
    scene.questNpcs.forEach((n) => n.sprite.destroy());
  }
  scene.questNpcs = [];
  if (scene.ambientNpcs) {
    scene.ambientNpcs.forEach((n) => n.sprite.destroy());
  }
  scene.ambientNpcs = [];
  scene.activeTalkingNpc = null;
  if (scene.chests) {
    scene.chests.forEach((c) => {
      if (c.sprite) c.sprite.destroy();
    });
  }
  scene.chests = [];
  scene.nextLootChestId = 0;
  scene.activeChest = null;
  scene.floorTraps.forEach((t) => {
    t.sprite.destroy();
    t.spikeSprite.destroy();
  });
  scene.floorTraps = [];
  scene.townHouseSprites.forEach((s) => s.destroy());
  scene.townHouseSprites = [];
  scene.secretLevers.forEach((l) => l.sprite.destroy());
  scene.secretLevers = [];
  if (scene.secretWallMarker) {
    scene.secretWallMarker.destroy();
    scene.secretWallMarker = null;
  }
  scene.miningRocks.forEach((r) => {
    if (r.sprite) r.sprite.destroy();
  });
  scene.miningRocks = [];
  scene.forageNodes.forEach((n) => {
    if (n.sprite) n.sprite.destroy();
  });
  scene.forageNodes = [];
  scene.decorationSprites.forEach((s) => s.destroy());
  scene.decorationSprites = [];
  scene.secretRoomData = null;
  scene.secretDoorOpened = false;
  scene.dialogOpen = false;
  scene.gamePaused = false;
  scene.pauseReasons.clear();
  scene.enemies.forEach((e) => {
    if (e.visualEmitter) e.visualEmitter.destroy();
    e.sprite.destroy();
  });
  if (scene.enemyGroup) scene.enemyGroup.clear(false, false);
  scene.enemies = [];
  scene.projectiles.forEach((p) => p.sprite.destroy());
  scene.projectiles = [];
  scene.enemyProjectiles.forEach((p) => p.sprite.destroy());
  scene.enemyProjectiles = [];
  scene.abilityProjectiles.forEach((p) => p.sprite.destroy());
  scene.abilityProjectiles = [];
  scene.summonProjectiles.forEach((p) => p.sprite.destroy());
  scene.summonProjectiles = [];
  if (scene.summonGroup) scene.summonGroup.clear(false, false);
  const persistentSummons = scene.summons.filter((s) => s.persistent);
  scene.summons.forEach((s) => {
    s.sprite.destroy(); // detruit TOUJOURS l'ancien sprite - meme pour un persistant, qui en recevra un nouveau juste apres (spawnSummonSprite)
  });
  scene.summons = [];
  scene.playerStatusEffects = [];
  scene.pendingWeaponImbue = null;
  scene.zones.forEach((z) => z.sprite.destroy());
  scene.zones = [];
  scene.traps.forEach((t) => t.sprite.destroy());
  scene.traps = [];
  scene.boomerangs.forEach((b) => b.sprite.destroy());
  scene.boomerangs = [];
  scene.stealthUntil = 0;
  scene.riposteUntil = 0;
  scene.parryUntil = 0;
  scene.visionBonusUntil = 0;

  clearDebugTileIndices(scene);

  scene.playerHp =
    typeof hpOverride === "number"
      ? Math.min(hpOverride, scene.playerMaxHp)
      : Math.min(scene.playerHp, scene.playerMaxHp);
  scene.isDead = false;
  scene.events.emit("player-hp-changed", {
    hp: scene.playerHp,
    maxHp: scene.playerMaxHp,
  });
  scene.events.emit("player-mana-changed", {
    mana: scene.playerMana,
    maxMana: scene.playerMaxMana,
  });
  scene.events.emit("player-stamina-changed", {
    stamina: scene.playerStamina,
    maxStamina: scene.playerMaxStamina,
  });

  const worldW = grid[0].length * TILE_SIZE;
  const worldH = grid.length * TILE_SIZE;

  buildFloorTilemap(scene, { grid, tileset, data, depth });

  const startPosition = savedPlayerPosition || playerSpawn;

  const heroSprite = SPRITE_REGISTRY[scene.heroSpriteKey];

  scene.hero = scene.physics.add.sprite(
    startPosition.x * TILE_SIZE + TILE_SIZE / 2,
    startPosition.y * TILE_SIZE + TILE_SIZE / 2,
    heroSprite.key,
    heroSprite.animations.idleDown,
  );

  scene.lastPlayerTile = {
    x: startPosition.x,
    y: startPosition.y,
  };
  for (const ps of persistentSummons) {
    ps.sprite = spawnSummonSprite(scene,
      ps.spriteKey,
      playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
      playerSpawn.y * TILE_SIZE + TILE_SIZE / 2,
    );
    scene.summons.push(ps);
  }
  scene.hero.setScale(heroSprite.scale);
  scene.hero.setCollideWorldBounds(true);
  const hb = heroSprite.hitbox;
  scene.hero.body
    .setSize(hb.width, hb.height)
    .setOffset(hb.offsetX, hb.offsetY);
  scene.hero.setDepth(10);
  scene.hero.anims.play(scene.heroSpriteKey + "-idle-down");
  scene.lastDir = "down";
  scene.lastAimVector = { x: 0, y: 1 };

  scene.levelColliders.push(scene.physics.add.collider(scene.hero, scene.layer));
  scene.levelColliders.push(
    scene.physics.add.collider(scene.enemyGroup, scene.layer),
  );
  scene.physics.world.setBounds(0, 0, worldW, worldH);
  scene.cameras.main.setBounds(0, 0, worldW, worldH);
  scene.cameras.main.startFollow(scene.hero, true, 0.1, 0.1);

  if (scene.registry.get("isMobile")) {
    const visionDiameterPx = scene.playerVisionRadius * TILE_SIZE * 2;
    const targetFraction = 0.85;
    const smallerDimension = Math.min(
      scene.cameras.main.width,
      scene.cameras.main.height,
    );
    scene.cameras.main.setZoom(
      (smallerDimension * targetFraction) / visionDiameterPx,
    );
  }

  scene.exitTile = exitTile;
  scene.exitMarker = scene.add.image(
    exitTile.x * TILE_SIZE + TILE_SIZE / 2,
    exitTile.y * TILE_SIZE + TILE_SIZE / 2,
    "stair_up",
  );
  scene.exitMarker.setDepth(2);

  scene.upstairsTile = upstairsTile;
  if (upstairsTile) {
    scene.upstairsMarker = scene.add.image(
      upstairsTile.x * TILE_SIZE + TILE_SIZE / 2,
      upstairsTile.y * TILE_SIZE + TILE_SIZE / 2,
      "stair_down",
    );
    scene.upstairsMarker.setDepth(2);
  }

  if (scene.bossDoorTile) {
    scene.bossDoorMarker = scene.add.circle(
      scene.bossDoorTile.x * TILE_SIZE + TILE_SIZE / 2,
      scene.bossDoorTile.y * TILE_SIZE + TILE_SIZE / 2,
      10,
      0x6a1b9a,
    );
    scene.bossDoorMarker.setDepth(2);
    scene.bossDoorMarker.setStrokeStyle(2, 0xffffff);
    scene.tweens.add({
      targets: scene.bossDoorMarker,
      scale: { from: 0.7, to: 1.15 },
      alpha: { from: 0.6, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }
  if (scene.pendingBossRoomOpen && scene.bossDoorTile) {
    scene.bossRoomOpen = true;
    const { x, y } = scene.bossDoorTile;
    scene.layer.putTileAt(scene.currentFloorTileIndex ?? 0, x, y);
    scene.fogGrid[y][x] = 0;
    if (scene.bossDoorMarker) {
      scene.bossDoorMarker.destroy();
      scene.bossDoorMarker = null;
    }
    if (scene.pendingBossAlive === false) {
      scene.bossAlive = false; // deja vaincu avant l'interruption - ne jamais le refaire apparaitre
    } else {
      // porte deja ouverte ET boss pas encore vaincu au moment de la
      // sauvegarde - il faut le recreer explicitement ici : bossRoomOpen
      // etant deja a true, le declenchement habituel (enemies.length===0)
      // ne se produira plus jamais, donc rien d'autre ne le ferait
      // reapparaitre
      scene.spawnBossEncounter(
        scene.pendingBossHp,
        scene.pendingBossPosition,
        scene.pendingBossState,
      );
    }
  }
  scene.pendingBossRoomOpen = false;
  scene.pendingBossAlive = null;
  scene.pendingBossHp = null;
  scene.pendingBossPosition = null;
  scene.pendingBossState = null;

  scene.buildPathfindingGrid();

  if (scene.travelHubTile) {
    scene.travelHubMarker = scene.add.circle(
      scene.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2,
      scene.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2,
      10,
      0x1ba8c9,
    );
    scene.travelHubMarker.setDepth(2);
    scene.travelHubMarker.setStrokeStyle(2, 0xffffff);
    scene.tweens.add({
      targets: scene.travelHubMarker,
      scale: { from: 0.7, to: 1.15 },
      alpha: { from: 0.6, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  if (scene.shopData) {
    scene.shopMarker = scene.add.circle(
      scene.shopData.x * TILE_SIZE + TILE_SIZE / 2,
      scene.shopData.y * TILE_SIZE + TILE_SIZE / 2,
      10,
      0xd4af37,
    );
    scene.shopMarker.setDepth(2);
    scene.shopMarker.setStrokeStyle(2, 0xffffff);
    scene.tweens.add({
      targets: scene.shopMarker,
      scale: { from: 0.7, to: 1.15 },
      alpha: { from: 0.6, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  const behaviorRng = createRng(data.seed + "-behaviors");
  enemies.forEach((enemyData, spawnIndex) => {
    const spawnPos = { x: enemyData.x, y: enemyData.y };

    const behavior = createEnemyBehavior(grid, spawnPos, behaviorRng);

    if (scene.currentFloorKills.includes(spawnIndex)) return;

    const { entry: enemySprite, spriteKey } = resolveEnemySprite(
      enemyData.type,
    );

    const sprite = scene.enemyGroup.create(
      spawnPos.x * TILE_SIZE + TILE_SIZE / 2,
      spawnPos.y * TILE_SIZE + TILE_SIZE / 2,
      enemySprite.key,
      enemySprite.animations.idleDown,
    );
    sprite.setScale(enemySprite.scale);
    const ehb = enemySprite.hitbox;
    sprite.body
      .setSize(ehb.width, ehb.height)
      .setOffset(ehb.offsetX, ehb.offsetY);
    sprite.setDepth(8);
    sprite.anims.play(spriteKey + "-idle-down");
    const resolvedEffect = resolveVisualEffect(enemyData);
    const visualEmitter = resolvedEffect
      ? createEnemyVisualEffect(scene, sprite, resolvedEffect)
      : null;
    scene.enemies.push({
      sprite,
      spriteKey,
      spawnIndex,
      archetype: enemyData.type,
      type: behavior.type,
      state: behavior.state,
      home: behavior.home,
      aggroRadius: behavior.aggroRadius,
      patrolPath: behavior.patrolPath,
      patrolIndex: 0,
      patrolDirection: 1,
      path: null,
      pathIndex: 0,
      lastDir: "down",
      hp: enemyData.hp,
      maxHp: enemyData.maxHp,
      damage: enemyData.damage,
      defense: enemyData.defense,
      xpReward: enemyData.xpReward,
      attackType: enemyData.attackType || "melee",
      questLoot: enemyData.questLoot || null,
      inflictsEffect: enemyData.inflictsEffect || null,
      resistances: enemyData.resistances || {},
      damageType: enemyData.damageType || "physical",
      visualEmitter,
      statusEffects: [],
      drops: enemyData.drops || [],
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
    });
  });

  spawnChests(scene, { chests, savedEphemeralChests });
  spawnTraps(scene, { traps });
  spawnMiningRocks(scene, { data, savedMiningRocksState });
  spawnForageNodes(scene, { data, savedForageNodesState });

  spawnFloorDecorations(scene, data);

  scene.secretRoomData = data.secretRoom || null;
  const alreadyDiscovered = scene.discoveredSecretRoomDepths.includes(depth);

  if (scene.secretRoomData && !scene.floorsWithSecretRoom.includes(depth)) {
    scene.floorsWithSecretRoom.push(depth);
  }

  if (scene.secretRoomData) {
    if (alreadyDiscovered) {
      // deja trouvee au moins une fois - la salle reste DEFINITIVEMENT
      // ouverte, ne se referme jamais : ni levier ni combat a refaire,
      // juste une partie normale de l'etage desormais
      scene.secretDoorOpened = true;
    } else if (scene.secretRoomData.triggerType === "lever") {
      for (const leverTile of scene.secretRoomData.leverTiles) {
        const wasActivated = savedLeverActivations.includes(
          `${leverTile.x},${leverTile.y}`,
        );
        const sprite = scene.add.sprite(
          leverTile.x * TILE_SIZE + TILE_SIZE / 2,
          leverTile.y * TILE_SIZE + TILE_SIZE / 2,
          LEVER_SPRITESHEET.key,
          wasActivated ? 2 : 0, // 0 = position de repos, 2 = actionne (etat final apres animation)
        );
        sprite.setScale(TILE_SIZE / 16);
        sprite.setDepth(4);
        sprite.setVisible(true);
        sprite.setAlpha(wasActivated ? 1 : 0.22);
        scene.secretLevers.push({
          sprite,
          x: leverTile.x,
          y: leverTile.y,
          activated: wasActivated,
        });
      }
      if (
        scene.secretLevers.length > 0 &&
        scene.secretLevers.every((l) => l.activated)
      ) {
        scene.secretDoorOpened = true;
      }
    } else if (scene.secretRoomData.triggerType === "wall") {
      const door = scene.secretRoomData.doorTile;
      const marker = scene.add.circle(
        door.x * TILE_SIZE + TILE_SIZE / 2,
        door.y * TILE_SIZE + TILE_SIZE / 2,
        5,
        0xffcc00,
      );
      marker.setDepth(4);
      marker.setAlpha(0.22); // meme discretion que les leviers - PLACEHOLDER, remplace par une texture de fissure sur le mur une fois identifiee sur une planche
      scene.secretWallMarker = marker;
    } else if (scene.secretRoomData.triggerType === "combat") {
      const secretRoomEnemyRng = createRng(
        `${scene.currentSeed}-secret-room-enemies`,
      );
      for (const enemyData of scene.secretRoomData.enemySpawns) {
        const { entry: enemySprite, spriteKey } = resolveEnemySprite(
          enemyData.type,
        );
        const sprite = scene.enemyGroup.create(
          enemyData.x * TILE_SIZE + TILE_SIZE / 2,
          enemyData.y * TILE_SIZE + TILE_SIZE / 2,
          enemySprite.key,
          enemySprite.animations.idleDown,
        );
        sprite.setScale(enemySprite.scale);
        const ehb = enemySprite.hitbox;
        sprite.body
          .setSize(ehb.width, ehb.height)
          .setOffset(ehb.offsetX, ehb.offsetY);
        sprite.setDepth(8);
        sprite.anims.play(spriteKey + "-idle-down");

        const behavior = createEnemyBehavior(
          scene.fogGrid,
          { x: enemyData.x, y: enemyData.y },
          secretRoomEnemyRng,
          { guard: 1 },
        );

        scene.enemies.push({
          sprite,
          spriteKey,
          spawnIndex: -1,
          archetype: enemyData.type,
          type: behavior.type,
          state: behavior.state,
          home: behavior.home,
          aggroRadius: behavior.aggroRadius,
          patrolPath: null,
          patrolIndex: 0,
          patrolDirection: 1,
          path: null,
          pathIndex: 0,
          lastDir: "down",
          hp: enemyData.hp,
          maxHp: enemyData.maxHp,
          damage: enemyData.damage,
          defense: enemyData.defense,
          xpReward: enemyData.xpReward,
          attackType: enemyData.attackType || "melee",
          questLoot: null,
          inflictsEffect: null,
          resistances: enemyData.resistances || {},
          damageType: enemyData.damageType || "physical",
          statusEffects: [],
          drops: [],
          attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
          isSecretRoomGuard: true,
        });
      }
      scene.secretRewardLocked = true;
    }
  }

  if (data.questNpcs && data.questNpcs.length > 0) {
    createQuestNpcs(scene, data.questNpcs);
  }

  if (ambientNpcData && ambientNpcData.length > 0) {
    createAmbientNpcs(scene, ambientNpcData);
  }

  scene.fogState = createFogState(grid);

  if (effectiveSavedFogState) {
    for (const tile of effectiveSavedFogState) {
      const [x, y] = tile.split(",").map(Number);

      if (
        y >= 0 &&
        y < scene.fogState.state.length &&
        x >= 0 &&
        x < scene.fogState.state[y].length
      ) {
        scene.fogState.state[y][x] = 1;
      }
    }
  }
  scene.lastPlayerTile = { x: startPosition.x, y: startPosition.y };

  scene.fogDisabled = data.tileset === "town";

  const fogTileset = scene.map.addTilesetImage(
    scene.fogTilesetKey,
    scene.fogTilesetKey,
    TILE_SIZE,
    TILE_SIZE,
    0,
    0,
  );

  scene.fogLayer = scene.map.createBlankLayer("fog", fogTileset, 0, 0);
  scene.fogLayer.fill(0);
  scene.fogLayer.setDepth(5);

  if (scene.fogDisabled) {
    const allChanges = [];

    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        scene.fogState.state[y][x] = 2;
        allChanges.push({ x, y });
      }
    }

    scene.applyFogChanges(allChanges);
  } else {
    if (effectiveSavedFogState) {
      for (const tile of effectiveSavedFogState) {
        const [x, y] = tile.split(",").map(Number);

        if (
          y >= 0 &&
          y < scene.fogState.state.length &&
          x >= 0 &&
          x < scene.fogState.state[y].length
        ) {
          scene.fogState.state[y][x] = 1;
          scene.fogLayer.putTileAt(1, x, y);
        }
      }
    }

    const initialChanges = scene.fogState.update(
      startPosition.x,
      startPosition.y,
      getEffectivePlayerVisionRadius(scene),
    );

    scene.applyFogChanges(initialChanges);
  }

  scene.events.emit("level-loaded", { depth, biome: data.biome });
  scene.events.emit("inventory-updated", [...scene.inventory]);
  scene.events.emit("equipment-updated", { ...scene.equipped });
  scene.events.emit("hotbar-updated", [...scene.hotbarSlots]);
  scene.events.emit("recipes-updated", [...scene.unlockedRecipes]);
  scene.events.emit("locked-recipes-updated", [
    ...scene.discoveredLockedRecipes,
  ]);
  scene.events.emit("fury-progress", {
    count: scene.furyKillCount,
    required: FURY_KILLS_REQUIRED,
  });
  scene.events.emit("abilities-updated", [...scene.unlockedAbilities]);
  scene.events.emit("attributes-updated", {
    attributes: { ...scene.playerAttributes },
    unspent: scene.unspentAttributePoints,
  });
  scene.persistProgress();
}

export function retryLevel(scene) {
  scene.playerHp = scene.playerMaxHp;
  delete scene.floorFogCache[scene.currentDepth];
  const newLootSeed = "retry-" + Date.now();
  loadLevel(
    scene,
    scene.currentDepth,
    scene.currentSeed,
    null,
    [],
    [],
    newLootSeed,
  );
}
