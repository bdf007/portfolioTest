import Phaser from "phaser";
import EasyStar from "easystarjs";
import { createRng } from "../rng";
import { createEnemyBehavior } from "../enemyBehavior";
import {
  computeDamage,
  applyDamage,
  createCooldown,
  rollCritical,
  CRIT_MULTIPLIER,
  applyDiceVariance,
  applyElementalResistance,
} from "../combat";
import { computeLevelFromXp, getPlayerStatsForLevel } from "../leveling";
import {
  SPRITE_REGISTRY,
  resolveEnemySprite,
  resolveHeroStatsOverride,
} from "../spriteRegistry";
import { resolveItemDef } from "../itemDefs";
import {
  computeEquipmentBonuses,
  computeEquipmentResistances,
} from "../equipment";
import { ABILITY_DEFS } from "../abilityDefs";
import { CRAFTING_RECIPES } from "../craftingRecipes";
import { resolveFuryDef } from "../furyDefs";
import { WALL } from "./floorRenderer";
import {
  descendStairs,
  goToDepth,
  openTravelHub,
  travelToDepth as travelToDepthImpl,
  closeTravelHub as closeTravelHubImpl,
  getShopRefreshCost as getShopRefreshCostImpl,
  refreshShop as refreshShopImpl,
  openShop,
  buyItem as buyItemImpl,
  sellItem as sellItemImpl,
  closeShop as closeShopImpl,
} from "./shopTravel";
import {
  attemptFreeCraft as attemptFreeCraftImpl,
  decraftItem as decraftItemImpl,
  craftItem as craftItemImpl,
} from "./craftingSystem";
import {
  rollStatusEffect,
  applyStatusEffect,
  updateStatusEffects,
  createEnemyVisualEffect,
  getEffectivePlayerMoveSpeed,
  getEffectivePlayerMeleeDamage,
  getEffectivePlayerRangedDamage,
  getEffectivePlayerVisionRadius,
} from "./statusEffects";
import {
  computeFamiliarGrowthScale,
  confirmResummon as confirmResummonImpl,
  cancelResummon as cancelResummonImpl,
  confirmSummonReplace as confirmSummonReplaceImpl,
  cancelSummonReplace as cancelSummonReplaceImpl,
  updateSummons,
  updateSummonProjectiles,
} from "./summons";
import {
  openQuestDialog,
  acceptQuest as acceptQuestImpl,
  turnInQuest as turnInQuestImpl,
  openAmbientDialog,
  closeDialog as closeDialogImpl,
  updateNpcMovement,
} from "./quests";
import {
  checkSecretWallInteraction,
  activateLever,
  grantSecretRoomReward,
  markSecretRoomDiscovered,
  forageNode,
  mineRock,
  checkFloorTraps,
  openChestScreen,
  takeChestItem as takeChestItemImpl,
  takeAllChestItems as takeAllChestItemsImpl,
  closeChestScreen as closeChestScreenImpl,
  spawnLootChest,
} from "./exploration";
import {
  updateEnemyDecisions,
  updateEnemyMovement,
  updateBossSummons,
  updateEnemyAttacks,
  updateEnemyProjectiles,
} from "./ai";
import {
  equipItem as equipItemImpl,
  unequipItem as unequipItemImpl,
  consumeItem as consumeItemImpl,
  triggerHotbarSlot as triggerHotbarSlotImpl,
  assignHotbarSlot as assignHotbarSlotImpl,
} from "./inventory";
import {
  toggleDebugTileIndices,
  getQuestNpcMinimapData,
  getSummonMinimapData,
  drawHpBars,
} from "./hud";
import {
  startGame,
  persistProgressAsync,
  saveAndQuit as saveAndQuitImpl,
} from "./save";
import {
  loadLevel as loadLevelImpl,
  retryLevel as retryLevelImpl,
} from "./levelLoader";

const TILE_SIZE = 32;

const VISION_RADIUS_DEFAULT = 6; // repli si le profil d'archetype (cf. HERO_STATS_PROFILES) ne definit pas visionRadius

// combat joueur - hp/degats/defense viennent desormais de leveling.js
// (varient avec le niveau), seuls porte/cooldown/vitesse restent fixes ici
const PLAYER_MELEE_RANGE_DEFAULT = 46; // repli si le profil d'archetype ne definit pas meleeRange
const PLAYER_MOVE_SPEED_DEFAULT = 150; // repli si le profil d'archetype ne definit pas moveSpeed
// produit scalaire minimal entre le vecteur heros->cible normalise et la
// direction de visee reelle (this.lastAimVector) pour qu'une cible soit
// consideree "devant" - 0.5 = cone de ~120 degres (±60° autour du centre).
// Un attaque au corps a corps ne doit toucher que devant le heros, pas
// tout autour (cf. le rapport correspondant).
const MELEE_CONE_DOT_THRESHOLD = 0.5;
// regeneration PASSIVE (hors combat comme pendant), TRES faible par
// design - grimpe legerement avec le niveau (base + croissance*n, meme
// esprit que les autres stats). Globales plutot que par archetype pour
// rester simple - a decliner par archetype plus tard si tu veux varier
// entre heros.
const HP_REGEN_PER_SEC_BASE = 0.3;
const HP_REGEN_PER_SEC_GROWTH = 0.05; // par niveau
const MANA_REGEN_PER_SEC_BASE = 0.2;
const MANA_REGEN_PER_SEC_GROWTH = 0.03;
const STAMINA_REGEN_PER_SEC_BASE = 1; // reprend ta valeur deja ajustee
const STAMINA_REGEN_PER_SEC_GROWTH = 0.1;
// detection d'aggro : le joueur est dans l'angle mort d'un ennemi si le
// produit scalaire entre la direction ou l'ennemi fait face (lastDir) et
// le vecteur ennemi->joueur tombe sous ce seuil - -0.5 correspond a un
// angle mort de 120 degres centre pile derriere l'ennemi (60 de chaque
// cote), ni trop etroit (la furtivite deviendrait quasi impossible) ni
// trop large (ca reviendrait a ne quasiment jamais pouvoir approcher de
// face non plus)
const PLAYER_MELEE_COOLDOWN = 420;
const PLAYER_HARVEST_COOLDOWN = 600; // exemple de valeur, ajustable selon le design
const PLAYER_RANGED_COOLDOWN = 650;
const PROJECTILE_SPEED = 320;
const PROJECTILE_MAX_DISTANCE_DEFAULT = 380; // repli si le profil d'archetype ne definit pas rangedRange
const PROJECTILE_RADIUS = 5;
const FURY_KILLS_REQUIRED = 10; // ajustable
// combat ennemi
const ENEMY_ATTACK_COOLDOWN = 900;

// const WALL_CORNER_INDEX_TO_FRAME_FORTRESS2 = [
//   32, 0, 32, 18, 34, 32, 33, 7, 2, 1, 34, 23, 16, 22, 6, 70,
// ];

const ATTACK_ANIM_DURATION_MS = 400;

const ATTRIBUTE_POINTS_PER_LEVEL = 5;
const DEFAULT_ATTRIBUTES = {
  force: 0,
  dexterite: 0,
  intelligence: 0,
  vitalite: 0,
  constitution: 0,
  endurance: 0,
  chance: 0,
};

function createParticleTexture(scene, key, color) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(color, 1);
  g.fillCircle(4, 4, 4);
  g.generateTexture(key, 8, 8);
  g.destroy();
}
const INFLICTS_TO_VISUAL_EFFECT = {
  burn: "fire",
  acid: "gas",
  slow: "ice",
};

function resolveVisualEffect(enemyData) {
  if (enemyData.visualEffect) return enemyData.visualEffect;
  const inflictsType = enemyData.inflictsEffect?.type;
  return INFLICTS_TO_VISUAL_EFFECT[inflictsType] || null;
}

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  createAnimationsForEntry(entryKey, entry) {
    const prefix = entryKey + "-";
    if (this.anims.exists(prefix + "walk-down")) return;

    const { key: textureKey, animations: f } = entry;
    const walkRepeat = entry.oneShot ? 0 : -1;
    this.anims.create({
      key: prefix + "walk-down",
      frames: this.anims.generateFrameNumbers(textureKey, {
        frames: f.walkDown,
      }),
      frameRate: 8,
      repeat: walkRepeat,
    });
    this.anims.create({
      key: prefix + "walk-left",
      frames: this.anims.generateFrameNumbers(textureKey, {
        frames: f.walkLeft,
      }),
      frameRate: 8,
      repeat: walkRepeat,
    });
    this.anims.create({
      key: prefix + "walk-right",
      frames: this.anims.generateFrameNumbers(textureKey, {
        frames: f.walkRight,
      }),
      frameRate: 8,
      repeat: walkRepeat,
    });
    this.anims.create({
      key: prefix + "walk-up",
      frames: this.anims.generateFrameNumbers(textureKey, { frames: f.walkUp }),
      frameRate: 8,
      repeat: walkRepeat,
    });
    this.anims.create({
      key: prefix + "idle-down",
      frames: [{ key: textureKey, frame: f.idleDown }],
      frameRate: 1,
    });
    this.anims.create({
      key: prefix + "idle-left",
      frames: [{ key: textureKey, frame: f.idleLeft }],
      frameRate: 1,
    });
    this.anims.create({
      key: prefix + "idle-right",
      frames: [{ key: textureKey, frame: f.idleRight }],
      frameRate: 1,
    });
    this.anims.create({
      key: prefix + "idle-up",
      frames: [{ key: textureKey, frame: f.idleUp }],
      frameRate: 1,
    });
    if (f.attackDown) {
      this.anims.create({
        key: prefix + "attack-down",
        frames: this.anims.generateFrameNumbers(textureKey, {
          frames: f.attackDown,
        }),
        frameRate: 10,
        repeat: 0,
      });
      this.anims.create({
        key: prefix + "attack-left",
        frames: this.anims.generateFrameNumbers(textureKey, {
          frames: f.attackLeft,
        }),
        frameRate: 10,
        repeat: 0,
      });
      this.anims.create({
        key: prefix + "attack-right",
        frames: this.anims.generateFrameNumbers(textureKey, {
          frames: f.attackRight,
        }),
        frameRate: 10,
        repeat: 0,
      });
      this.anims.create({
        key: prefix + "attack-up",
        frames: this.anims.generateFrameNumbers(textureKey, {
          frames: f.attackUp,
        }),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  buildPathfindingGrid() {
    const width = this.map.width;
    const height = this.map.height;
    const grid = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        const tile = this.layer.getTileAt(x, y);
        row.push(tile && tile.collides ? 1 : 0);
      }
      grid.push(row);
    }
    this.easystar.setGrid(grid);
  }

  requestPath(fromX, fromY, toX, toY, callback) {
    // clamp dans les bornes de la grille - sans ca, une destination
    // calculee en dehors du niveau (ex : invocation visant un point
    // d'orbite autour d'un ennemi proche du bord de la carte, offset qui
    // deborde de la grille meme si l'ennemi lui-meme est bien dedans)
    // fait planter EasyStar ("start or end point is outside the scope of
    // your grid") au lieu de simplement viser le bord le plus proche
    const maxTileX = this.map.width - 1;
    const maxTileY = this.map.height - 1;
    const clamp = (v, max) => Math.min(Math.max(v, 0), max);

    const fromTileX = clamp(Math.floor(fromX / TILE_SIZE), maxTileX);
    const fromTileY = clamp(Math.floor(fromY / TILE_SIZE), maxTileY);
    const toTileX = clamp(Math.floor(toX / TILE_SIZE), maxTileX);
    const toTileY = clamp(Math.floor(toY / TILE_SIZE), maxTileY);

    if (fromTileX === toTileX && fromTileY === toTileY) {
      callback([{ x: toX, y: toY }]);
      return;
    }

    this.easystar.findPath(fromTileX, fromTileY, toTileX, toTileY, (path) => {
      if (!path || path.length === 0) {
        callback(null);
        return;
      }
      callback(
        path.map((p) => ({
          x: p.x * TILE_SIZE + TILE_SIZE / 2,
          y: p.y * TILE_SIZE + TILE_SIZE / 2,
        })),
      );
    });
  }

  followPathStep(entity, speed) {
    if (!entity.path || entity.pathIndex >= entity.path.length) return null;

    const wp = entity.path[entity.pathIndex];
    const dx = wp.x - entity.sprite.x;
    const dy = wp.y - entity.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      entity.pathIndex += 1;
      if (entity.pathIndex >= entity.path.length) {
        entity.path = null;
        return null;
      }
      return this.followPathStep(entity, speed);
    }

    const nx = dx / dist;
    const ny = dy / dist;
    return { vx: nx * speed, vy: ny * speed, nx, ny };
  }

  create() {
    createParticleTexture(this, "particle-fire", 0xff6600);
    createParticleTexture(this, "particle-ice", 0x99ddff);
    createParticleTexture(this, "particle-gas", 0x88cc44);
    for (const [entryKey, entry] of Object.entries(SPRITE_REGISTRY)) {
      this.createAnimationsForEntry(entryKey, entry);
    }
    this.heroSpriteKey = this.registry.get("heroId") || "hero1";

    const heroProfile = resolveHeroStatsOverride(this.heroSpriteKey);
    this.playerMoveSpeed = heroProfile?.moveSpeed ?? PLAYER_MOVE_SPEED_DEFAULT;
    this.playerVisionRadius =
      heroProfile?.visionRadius ?? VISION_RADIUS_DEFAULT;
    this.playerMeleeRange =
      heroProfile?.base?.meleeRange ?? PLAYER_MELEE_RANGE_DEFAULT;
    this.playerRangedRange =
      heroProfile?.rangedRange ?? PROJECTILE_MAX_DISTANCE_DEFAULT;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyboardLayout = "azerty";
    this.keys = this.input.keyboard.addKeys({
      upAzerty: Phaser.Input.Keyboard.KeyCodes.Z,
      leftAzerty: Phaser.Input.Keyboard.KeyCodes.Q,
      upQwerty: Phaser.Input.Keyboard.KeyCodes.W,
      leftQwerty: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      melee: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ranged: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      action: Phaser.Input.Keyboard.KeyCodes.E,
      fury: Phaser.Input.Keyboard.KeyCodes.X,
    });

    this.hero = null;
    this.layer = null;
    this.easystar = new EasyStar.js();
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();
    this.easystar.disableCornerCutting();
    this.easystar.setIterationsPerCalculation(1000);
    this.fogLayer = null;
    this.fogState = null;
    this.fogGrid = null;
    this.lastPlayerTile = null;
    this.lastDir = "down";
    this.lastAimVector = { x: 0, y: 1 };
    this.touchMoveVector = { x: 0, y: 0 };
    this.touchMeleeRequested = false;
    this.touchRangedRequested = false;
    this.touchActionRequested = false;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.abilityProjectiles = [];
    this.summonProjectiles = [];
    this.zones = [];
    this.traps = [];
    this.boomerangs = [];
    this.wasStealthed = false;
    this.stealthUntil = 0;
    this.riposteUntil = 0;
    this.riposteReflectPercent = 0;
    this.parryUntil = 0;
    this.parryDamageReduction = 0;
    this.visionBonusUntil = 0;
    this.visionBonusAmount = 0;

    this.xp = 0;
    this.playerLevel = 1;
    this.playerAttributes = { ...DEFAULT_ATTRIBUTES };
    this.unspentAttributePoints = 0;
    this.equipped = {
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
    };
    this.recalculatePlayerStats();
    this.playerHp = this.playerMaxHp;
    this.playerMana = this.playerMaxMana;
    this.playerStamina = this.playerMaxStamina;
    this.playerStatusEffects = [];
    this.meleeCooldown = createCooldown(PLAYER_MELEE_COOLDOWN);
    this.harvestCooldown = createCooldown(PLAYER_HARVEST_COOLDOWN);
    this.rangedCooldown = createCooldown(PLAYER_RANGED_COOLDOWN);
    this.isDead = false;
    this.currentDepth = 1;

    this.hpBarGraphics = this.add.graphics();
    this.hpBarGraphics.setDepth(20);

    this.enemyGroup = this.physics.add.group();
    this.pendingResummonDef = null;
    this.pendingResummonTarget = null;
    this.pendingSummonReplaceDef = null;
    this.pendingSummonReplaceVictim = null;
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.summonGroup = this.physics.add.group();
    this.physics.add.collider(this.summonGroup, this.summonGroup);
    this.physics.add.collider(this.summonGroup, this.enemyGroup);
    this.physics.add.collider(this.summonGroup, this.hero);
    this.levelColliders = [];
    this.activeChest = null;
    this.currentFloorChestRemainingLoot = {}; // { chestIndex: [{itemId, quantity}] } - ce qu'il reste a prendre dans un coffre partiellement loote, pour survivre a une sauvegarde+reprise SUR LE MEME etage

    this.debugTileIndicesVisible = false;
    this.debugTileIndexTexts = [];
    this.currentRenderGrid = null;

    this.input.keyboard.on("keydown-F3", () => toggleDebugTileIndices(this));

    const fogTilesetKey = "fog-tiles";
    const fogCanvasTex = this.textures.createCanvas(
      fogTilesetKey,
      TILE_SIZE * 2,
      TILE_SIZE,
    );
    const fogCtx = fogCanvasTex.getContext();
    fogCtx.fillStyle = "rgba(5,5,10,1)";
    fogCtx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    fogCtx.fillStyle = "rgba(5,5,10,0.65)";
    fogCtx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    fogCanvasTex.refresh();
    this.fogTilesetKey = fogTilesetKey;

    this.currentSeed = null;
    this.currentGameId = null;
    this.visitedFloors = [];
    this.discoveredLandmarks = {};
    this.floorFogCache = {};
    this.currentFloorKills = [];
    this.currentFloorOpenedChests = [];
    this.floorTraps = [];
    this.townHouseSprites = [];
    this.currentFloorTriggeredTraps = [];
    this.currentFloorRevealedTraps = [];
    this.secretRoomData = null;
    this.secretDoorOpened = false;
    this.secretLevers = [];
    this.secretWallMarker = null;
    this.miningRocks = []; // tableau de {index, data, sprite, hits, depleted}
    this.forageNodes = [];
    this.decorationSprites = [];
    this.discoveredSecretRoomDepths = [];
    this.floorsWithSecretRoom = [];
    this.quests = {};
    this.unlockedAbilities = [];
    this.unlockedRecipes = [];
    this.discoveredLockedRecipes = [];
    this.furyKillCount = 0;
    this.pendingBossRoomOpen = false;
    this.pendingBossAlive = null;
    this.pendingWeaponImbue = null;
    this.dashState = null;
    this.summons = [];
    this.obtainedUniqueItems = [];
    this.touchFuryRequested = false;
    this.hotbarSlots = new Array(9).fill(null);
    this.abilityCooldowns = {};
    this.itemCooldowns = {};
    this.activeDialogQuestKey = null;
    this.activeTalkingNpc = null;
    this.shopSoldItems = {}; // { depth: [{itemId, quantity}] } - objets vendus a la boutique de CETTE ville precise, rachetables uniquement ici
    this.shopRerollSeed = {}; // { depth: nombre de rafraichissements utilises sur CETTE boutique } - 0/absent = stock d'origine (this.shopData.stock)
    this.inventory = [];
    this.gamePaused = false;
    this.pauseReasons = new Set();

    this.timePlayedBaseline = 0;
    this.sessionStartedAt = Date.now();

    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => this.persistProgress(),
    });

    startGame(this);
  }

  addItemToInventory(itemId, quantity = 1) {
    if (!itemId || quantity <= 0) return;
    const def = resolveItemDef(itemId);

    if (def.unique) {
      if (this.obtainedUniqueItems.includes(itemId)) return; // deja obtenu une fois - jamais une deuxieme, meme vendu/perdu depuis
      this.obtainedUniqueItems.push(itemId);
      quantity = 1; // un objet unique ne peut jamais etre obtenu en plusieurs exemplaires d'un coup non plus
    }

    if (def.stackable) {
      const existing = this.inventory.find((i) => i.itemId === itemId);
      if (existing) existing.quantity += quantity;
      else this.inventory.push({ itemId, quantity });
    } else {
      for (let i = 0; i < quantity; i++) {
        this.inventory.push({ itemId, quantity: 1 });
      }
    }

    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  showLootToast(text) {
    this.events.emit("loot-toast", text);
  }

  setTouchMoveVector(x, y) {
    this.touchMoveVector = { x, y };
  }

  requestTouchMelee() {
    this.touchMeleeRequested = true;
  }

  requestTouchRanged() {
    this.touchRangedRequested = true;
  }

  requestTouchAction() {
    this.touchActionRequested = true;
  }

  requestTouchFury() {
    this.touchFuryRequested = true;
  }

  setKeyboardLayout(layout) {
    this.keyboardLayout = layout === "qwerty" ? "qwerty" : "azerty";
  }

  computeAttributeBonuses() {
    const a = this.playerAttributes;
    return {
      meleeDamage: a.force * 1,
      rangedDamage: a.dexterite * 1,
      maxMana: a.intelligence * 2,
      maxHp: a.vitalite * 5,
      defense: a.constitution * 0.5,
      maxStamina: a.endurance * 2,
      hpRegenBonus: a.vitalite * 0.02,
      manaRegenBonus: a.intelligence * 0.02,
      staminaRegenBonus: a.endurance * 0.05,
    };
  }

  recalculatePlayerStats() {
    const heroProfile = resolveHeroStatsOverride(this.heroSpriteKey);

    const base = getPlayerStatsForLevel(this.playerLevel, heroProfile);

    const bonus = computeEquipmentBonuses(this.equipped);
    this.equipmentBonuses = bonus;
    const attrBonus = this.computeAttributeBonuses();

    this.playerMaxHp = base.maxHp + bonus.maxHp + attrBonus.maxHp;
    this.playerMeleeDamage =
      base.meleeDamage + bonus.meleeDamage + attrBonus.meleeDamage;
    this.playerRangedDamage =
      base.rangedDamage + bonus.rangedDamage + attrBonus.rangedDamage;
    this.playerDefense = base.defense + bonus.defense + attrBonus.defense;
    this.playerResistances = computeEquipmentResistances(this.equipped);

    this.playerMaxMana = base.mana + bonus.mana + attrBonus.maxMana;
    this.playerMaxStamina =
      base.stamina + (bonus.stamina ?? 0) + attrBonus.maxStamina;

    this.playerMeleeRange =
      (heroProfile?.meleeRange ?? PLAYER_MELEE_RANGE_DEFAULT) +
      (bonus.meleeRange ?? 0);

    this.playerRangedRange =
      (heroProfile?.rangedRange ?? PROJECTILE_MAX_DISTANCE_DEFAULT) +
      (bonus.rangedRange ?? 0);

    this.playerVisionRadius =
      (heroProfile?.visionRadius ?? VISION_RADIUS_DEFAULT) +
      (bonus.visionRadius ?? 0);

    this.playerMoveSpeed =
      (heroProfile?.moveSpeed ?? PLAYER_MOVE_SPEED_DEFAULT) +
      (bonus.moveSpeed ?? 0);
    const n = this.playerLevel - 1;
    this.playerHpRegen =
      HP_REGEN_PER_SEC_BASE +
      HP_REGEN_PER_SEC_GROWTH * n +
      attrBonus.hpRegenBonus +
      (bonus.hpRegen ?? 0);
    this.playerManaRegen =
      MANA_REGEN_PER_SEC_BASE +
      MANA_REGEN_PER_SEC_GROWTH * n +
      attrBonus.manaRegenBonus +
      (bonus.manaRegen ?? 0);
    this.playerStaminaRegen =
      STAMINA_REGEN_PER_SEC_BASE +
      STAMINA_REGEN_PER_SEC_GROWTH * n +
      attrBonus.staminaRegenBonus +
      (bonus.staminaRegen ?? 0);

    this.events.emit("player-stats-changed", {
      level: this.playerLevel,
      maxHp: this.playerMaxHp,
      meleeDamage: this.playerMeleeDamage,
      rangedDamage: this.playerRangedDamage,
      defense: this.playerDefense,
      maxMana: this.playerMaxMana,
      maxStamina: this.playerMaxStamina,
      moveSpeed: this.playerMoveSpeed,
      visionRadius: this.playerVisionRadius,
      rangedRange: this.playerRangedRange,
      hpRegen: this.playerHpRegen,
      manaRegen: this.playerManaRegen,
      staminaRegen: this.playerStaminaRegen,
    });
  }

  /**
   * Traduit une definition de competence/arme en degats reels, en tenant
   * compte d'une eventuelle composante proportionnelle aux stats
   * ACTUELLES du heros (def.damagePercent + def.scalesFrom). Absence de
   * damagePercent = comportement inchange (juste def.damage brut).
   */
  computeAbilityDamage(def) {
    let dmg = def.damage || 0;
    if (def.damagePercent) {
      const base =
        def.scalesFrom === "melee"
          ? getEffectivePlayerMeleeDamage(this)
          : getEffectivePlayerRangedDamage(this);
      dmg += base * def.damagePercent;
    }
    return dmg;
  }

  adjustHpAfterMaxHpChange(oldMaxHp) {
    const delta = this.playerMaxHp - oldMaxHp;
    this.playerHp = Math.max(
      1,
      Math.min(this.playerMaxHp, this.playerHp + delta),
    );
    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
  }

  equipItem(index) {
    equipItemImpl(this, index);
  }

  unequipItem(slot) {
    unequipItemImpl(this, slot);
  }

  useConsumable(index) {
    consumeItemImpl(this, index);
  }

  persistProgress() {
    persistProgressAsync(this);
  }

  saveAndQuit() {
    saveAndQuitImpl(this);
  }

  async loadLevel(
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
    return loadLevelImpl(
      this,
      depth,
      seed,
      hpOverride,
      killedIndices,
      openedChestIndices,
      lootSeed,
      savedFogState,
      savedPlayerPosition,
      savedChestRemainingLoot,
      savedTriggeredTraps,
      savedRevealedTraps,
      savedLeverActivations,
      savedMiningRocksState,
      savedEphemeralChests,
      savedForageNodesState,
    );
  }
  retryLevel() {
    retryLevelImpl(this);
  }

  travelToDepth(targetDepth) {
    travelToDepthImpl(this, targetDepth);
  }

  closeTravelHub() {
    closeTravelHubImpl(this);
  }

  getShopRefreshCost() {
    return getShopRefreshCostImpl(this);
  }

  refreshShop() {
    refreshShopImpl(this);
  }

  buyItem(shopItemIndex, quantity = 1) {
    buyItemImpl(this, shopItemIndex, quantity);
  }

  sellItem(itemId, quantity = 1) {
    sellItemImpl(this, itemId, quantity);
  }

  closeShop() {
    closeShopImpl(this);
  }

  openBossDoor() {
    this.bossRoomOpen = true;

    const { x, y } = this.bossDoorTile;
    this.layer.putTileAt(this.currentFloorTileIndex ?? 0, x, y);
    this.fogGrid[y][x] = 0;
    this.buildPathfindingGrid();

    if (this.bossDoorMarker) {
      this.bossDoorMarker.destroy();
      this.bossDoorMarker = null;
    }

    this.spawnBossEncounter();

    this.events.emit("boss-room-opened");
  }

  spawnBossEncounter(
    hpOverride = null,
    positionOverride = null,
    stateOverride = null,
  ) {
    const { entry: bossSprite, spriteKey } = resolveEnemySprite(
      this.bossData.type,
    );
    const spawnPx = positionOverride
      ? positionOverride.x
      : this.bossData.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnPy = positionOverride
      ? positionOverride.y
      : this.bossData.y * TILE_SIZE + TILE_SIZE / 2;
    const sprite = this.enemyGroup.create(
      spawnPx,
      spawnPy,
      bossSprite.key,
      bossSprite.animations.idleDown,
    );
    sprite.setScale(bossSprite.scale);
    const hb = bossSprite.hitbox;
    sprite.body.setSize(hb.width, hb.height).setOffset(hb.offsetX, hb.offsetY);
    sprite.setDepth(8);
    sprite.anims.play(spriteKey + "-idle-down");

    const behaviorTileX = positionOverride
      ? Math.floor(spawnPx / TILE_SIZE)
      : this.bossData.x;
    const behaviorTileY = positionOverride
      ? Math.floor(spawnPy / TILE_SIZE)
      : this.bossData.y;
    const behaviorRng = createRng(this.currentSeed + "-boss-behavior");
    const behavior = createEnemyBehavior(
      this.fogGrid,
      { x: behaviorTileX, y: behaviorTileY },
      behaviorRng,
      { guard: 1 },
    );
    const resolvedEffect = resolveVisualEffect(this.bossData);
    const visualEmitter = resolvedEffect
      ? createEnemyVisualEffect(this, sprite, resolvedEffect)
      : null;
    this.enemies.push({
      sprite,
      spriteKey,
      spawnIndex: -1,
      isBoss: true,
      archetype: this.bossData.type,
      type: behavior.type,
      state: stateOverride || behavior.state,
      home: behavior.home,
      aggroRadius: behavior.aggroRadius,
      patrolPath: behavior.patrolPath,
      patrolIndex: 0,
      patrolDirection: 1,
      path: null,
      pathIndex: 0,
      lastDir: "down",
      hp: hpOverride ?? this.bossData.hp,
      maxHp: this.bossData.hp,
      damage: this.bossData.damage,
      defense: this.bossData.defense,
      xpReward: this.bossData.xpReward,
      attackType: this.bossData.attackType || "melee",
      inflictsEffect: this.bossData.inflictsEffect || null,
      visualEmitter,
      statusEffects: [],
      drop: this.bossData.drop || null,
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      summonAbility: this.bossData.summonAbility || null,
      summonCooldownReadyAt: 0,
      summonedMinions: [],
      varianceDice: this.bossData.varianceDice || null,
    });
  }

  pauseGame(reason) {
    const wasAlreadyPaused = this.gamePaused;
    this.pauseReasons.add(reason);
    this.gamePaused = true;
    if (this.hero) this.hero.setVelocity(0, 0);

    if (!wasAlreadyPaused) {
      this.pauseStartedAt = this.time.now;
    }

    const freeze = (obj) => {
      if (obj?.sprite && typeof obj.sprite.setVelocity === "function") {
        obj.sprite.setVelocity(0, 0);
      }
    };

    for (const enemy of this.enemies) freeze(enemy);
    for (const npc of this.questNpcs || []) freeze(npc);
    for (const npc of this.ambientNpcs || []) freeze(npc);
    for (const proj of this.projectiles) freeze(proj);
    for (const proj of this.enemyProjectiles) freeze(proj);
    for (const proj of this.abilityProjectiles || []) freeze(proj);
    for (const b of this.boomerangs || []) freeze(b); // <-- absent jusqu'ici, meme souci potentiel
    for (const summon of this.summons) freeze(summon); // fix : evite le "drift" (velocite residuelle jamais remise a zero pendant la pause)
  }
  unpauseGame(reason) {
    this.pauseReasons.delete(reason);
    const stillPaused = this.pauseReasons.size > 0;

    if (this.gamePaused && !stillPaused) {
      const pausedDuration = this.time.now - this.pauseStartedAt;
      for (const key of Object.keys(this.abilityCooldowns)) {
        this.abilityCooldowns[key] += pausedDuration;
      }
      for (const key of Object.keys(this.itemCooldowns)) {
        this.itemCooldowns[key] += pausedDuration;
      }
    }

    this.gamePaused = stillPaused;
  }

  showUpstairsPrompt() {
    if (this.pauseReasons.has("upstairs")) return;
    this.pauseGame("upstairs");
    const remainingEnemies = this.enemies.length;
    const unopenedChests = this.chests.filter((c) => !c.opened).length;
    this.events.emit("upstairs-prompt", { remainingEnemies, unopenedChests });
  }

  confirmGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
    goToDepth(this, this.currentDepth - 1);
  }

  cancelGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
  }

  showExitPrompt() {
    if (this.pauseReasons.has("exit")) return;
    this.pauseGame("exit");
    const remainingEnemies = this.enemies.length;
    const unopenedChests = this.chests.filter(
      (c) => !c.opened && c.lootItems.length > 0,
    ).length;
    const partiallyLootedChests = this.chests.filter(
      (c) => c.opened && c.lootItems.length > 0,
    ).length;
    this.events.emit("exit-prompt", {
      remainingEnemies,
      unopenedChests,
      partiallyLootedChests,
    });
  }
  confirmDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
    descendStairs(this);
  }

  cancelDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
  }

  acceptQuest() {
    acceptQuestImpl(this);
  }

  turnInQuest() {
    turnInQuestImpl(this);
  }

  closeDialog() {
    closeDialogImpl(this);
  }

  update(time, delta) {
    if (!this.hero || this.isDead) return;
    if (this.gamePaused) return;
    this.updateRegen(delta);

    if (this.dashState) {
      this.updateShieldBash();
    } else {
      const speed = getEffectivePlayerMoveSpeed(this);
      let vx = 0,
        vy = 0;
      vy = 0;
      const azertyLayout = this.keyboardLayout !== "qwerty";
      const left =
        this.cursors.left.isDown ||
        (azertyLayout
          ? this.keys.leftAzerty.isDown
          : this.keys.leftQwerty.isDown);
      const right = this.cursors.right.isDown || this.keys.right.isDown;
      const up =
        this.cursors.up.isDown ||
        (azertyLayout ? this.keys.upAzerty.isDown : this.keys.upQwerty.isDown);
      const down = this.cursors.down.isDown || this.keys.down.isDown;

      if (left) vx -= 1;
      if (right) vx += 1;
      if (up) vy -= 1;
      if (down) vy += 1;

      vx += this.touchMoveVector.x;
      vy += this.touchMoveVector.y;

      const mag = Math.hypot(vx, vy);
      if (mag > 1) {
        vx /= mag;
        vy /= mag;
      }
      vx *= speed;
      vy *= speed;

      this.hero.setVelocity(vx, vy);

      let dir = this.lastDir;
      const moving = vx !== 0 || vy !== 0;
      if (moving) {
        dir =
          Math.abs(vx) > Math.abs(vy)
            ? vx > 0
              ? "right"
              : "left"
            : vy > 0
              ? "down"
              : "up";
      }

      if (this.time.now < this.attackAnimUntil) {
      } else if (moving) {
        this.hero.anims.play(this.heroSpriteKey + "-walk-" + dir, true);
        this.lastDir = dir;
        // en diagonale (haut/bas ET un mouvement horizontal significatif en
        // meme temps), retourne le sprite selon vx - donne l'illusion d'une
        // vraie 8e direction sans avoir besoin de dessiner des frames dediees
        if ((dir === "up" || dir === "down") && Math.abs(vx) > 0.01) {
          this.hero.setFlipX(vx < 0);
        } else if (dir === "left" || dir === "right") {
          this.hero.setFlipX(false); // walk-left/walk-right ont deja leurs propres frames, jamais besoin de retourner
        }
      } else {
        this.hero.anims.play(
          this.heroSpriteKey + "-idle-" + this.lastDir,
          true,
        );
      }

      if (moving) {
        const len = Math.hypot(vx, vy);
        this.lastAimVector = { x: vx / len, y: vy / len };
      }
    }
    const tileX = Math.floor(this.hero.x / TILE_SIZE);
    const tileY = Math.floor(this.hero.y / TILE_SIZE);
    if (
      !this.lastPlayerTile ||
      tileX !== this.lastPlayerTile.x ||
      tileY !== this.lastPlayerTile.y
    ) {
      this.lastPlayerTile = { x: tileX, y: tileY };
      if (!this.fogDisabled) {
        const changes = this.fogState.update(
          tileX,
          tileY,
          getEffectivePlayerVisionRadius(this),
        );
        this.applyFogChanges(changes);
      }
      updateEnemyDecisions(this, tileX, tileY);

      if (
        this.exitTile &&
        tileX === this.exitTile.x &&
        tileY === this.exitTile.y &&
        this.bossAlive !== true
      ) {
        this.showExitPrompt();
      }

      if (
        this.upstairsTile &&
        tileX === this.upstairsTile.x &&
        tileY === this.upstairsTile.y
      ) {
        this.showUpstairsPrompt();
      }
    }

    const now = this.time.now;
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.melee) ||
      this.touchMeleeRequested
    ) {
      this.touchMeleeRequested = false;
      this.performMeleeAttack(now);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.ranged) ||
      this.touchRangedRequested
    ) {
      this.touchRangedRequested = false;
      this.performRangedAttack(now);
    }
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.action) ||
      this.touchActionRequested
    ) {
      this.touchActionRequested = false;
      this.performInteraction();
    }
    if (this.gamePaused) return;

    updateEnemyMovement(this);
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.fury) ||
      this.touchFuryRequested
    ) {
      this.touchFuryRequested = false;
      this.useFury();
    }

    updateEnemyMovement(this);

    for (const chest of this.chests) {
      if (!chest.sprite) continue;
      const chestTileX = Math.floor(chest.sprite.x / TILE_SIZE);
      const chestTileY = Math.floor(chest.sprite.y / TILE_SIZE);
      const state = this.fogState.state;
      const chestVisible =
        chestTileY >= 0 &&
        chestTileX >= 0 &&
        chestTileY < state.length &&
        chestTileX < state[0].length &&
        state[chestTileY][chestTileX] === 2;
      chest.sprite.setVisible(chestVisible);
    }
    for (const rock of this.miningRocks) {
      if (!rock.sprite) continue; // gisement deja epuise - plus de sprite a afficher
      const rockTileX = Math.floor(rock.sprite.x / TILE_SIZE);
      const rockTileY = Math.floor(rock.sprite.y / TILE_SIZE);
      const state = this.fogState.state;
      const rockVisible =
        rockTileY >= 0 &&
        rockTileX >= 0 &&
        rockTileY < state.length &&
        rockTileX < state[0].length &&
        state[rockTileY][rockTileX] === 2;
      rock.sprite.setVisible(rockVisible);
    }
    for (const node of this.forageNodes) {
      if (!node.sprite) continue;
      const nodeTileX = Math.floor(node.sprite.x / TILE_SIZE);
      const nodeTileY = Math.floor(node.sprite.y / TILE_SIZE);
      const state = this.fogState.state;
      const nodeVisible =
        nodeTileY >= 0 &&
        nodeTileX >= 0 &&
        nodeTileY < state.length &&
        nodeTileX < state[0].length &&
        state[nodeTileY][nodeTileX] === 2;
      node.sprite.setVisible(nodeVisible);
    }
    for (const sprite of this.decorationSprites) {
      const tileX = Math.floor(sprite.x / TILE_SIZE);
      const tileY = Math.floor(sprite.y / TILE_SIZE);
      const state = this.fogState.state;
      const visible =
        tileY >= 0 &&
        tileX >= 0 &&
        tileY < state.length &&
        tileX < state[0].length &&
        state[tileY][tileX] === 2;
      sprite.setVisible(visible);
    }
    const fogStateForSecrets = this.fogState.state;
    function isTileCurrentlyVisible(tileX, tileY) {
      return (
        tileY >= 0 &&
        tileX >= 0 &&
        tileY < fogStateForSecrets.length &&
        tileX < fogStateForSecrets[0].length &&
        fogStateForSecrets[tileY][tileX] === 2
      );
    }

    for (const lever of this.secretLevers) {
      if (lever.activated) continue; // deja actionne - reste visible en permanence, meme hors du champ de vision actuel
      const visible = isTileCurrentlyVisible(lever.x, lever.y);
      lever.sprite.setVisible(visible);
    }

    if (
      this.secretWallMarker &&
      this.secretRoomData &&
      !this.secretDoorOpened
    ) {
      const door = this.secretRoomData.doorTile;
      this.secretWallMarker.setVisible(isTileCurrentlyVisible(door.x, door.y));
    }
    updateEnemyAttacks(this, now);
    updateBossSummons(this);
    this.updateProjectiles();
    updateEnemyProjectiles(this);
    updateSummonProjectiles(this);
    this.updateAbilityProjectiles();
    updateStatusEffects(this, now);
    updateNpcMovement(this, this.questNpcs);
    updateNpcMovement(this, this.ambientNpcs);
    updateSummons(this, this.time.now);
    this.easystar.calculate();
    checkFloorTraps(this);
    if (this.wasStealthed && this.time.now >= this.stealthUntil) {
      this.tweens.add({
        targets: this.hero,
        alpha: 1,
        duration: 250,
        ease: "Cubic.easeIn",
      });
    }
    this.wasStealthed = this.time.now < this.stealthUntil;
    this.updateZones(this.time.now);
    this.updateTraps(this.time.now);
    this.updateBoomerangs();
    drawHpBars(this);

    if (this.playerHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.hero.setVelocity(0, 0);
      this.hero.anims.play(this.heroSpriteKey + "-idle-" + this.lastDir, true);
      this.events.emit("game-over", { xp: this.xp, depth: this.currentDepth });
      this.persistProgress();
    }
  }

  applyFogChanges(changes) {
    for (const { x, y } of changes) {
      const s = this.fogState.state[y][x];

      if (s === 2) {
        this.fogLayer.removeTileAt(x, y);
      } else if (s === 1) {
        this.fogLayer.putTileAt(1, x, y);
      } else {
        this.fogLayer.putTileAt(0, x, y);
      }
    }

    const landmarks = this.discoveredLandmarks[this.currentDepth];

    if (landmarks) {
      if (
        landmarks.exitTile &&
        this.fogState.state[landmarks.exitTile.y]?.[landmarks.exitTile.x] >= 1
      ) {
        landmarks.exitDiscovered = true;
      }

      if (
        landmarks.upstairsTile &&
        this.fogState.state[landmarks.upstairsTile.y]?.[
          landmarks.upstairsTile.x
        ] >= 1
      ) {
        landmarks.upstairsDiscovered = true;
      }
    }

    const questNpcs = getQuestNpcMinimapData(this);
    const summons = getSummonMinimapData(this);

    this.events.emit("fog-changed", {
      grid: this.fogGrid,
      fogState: this.fogState.state,
      playerTile: this.lastPlayerTile,
      exitTile: this.exitTile,
      upstairsTile: this.upstairsTile,
      questNpcs,
      summons,
      bossDoorTile: this.bossDoorTile,
      bossRoomOpen: this.bossRoomOpen,
    });
  }

  isEnemyVisible(enemy) {
    const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
    const ey = Math.floor(enemy.sprite.y / TILE_SIZE);
    const state = this.fogState.state;
    if (ey < 0 || ex < 0 || ey >= state.length || ex >= state[0].length)
      return false;
    return state[ey][ex] === 2;
  }
  isEnemyStunned(enemy) {
    return enemy.statusEffects.some((e) => e.type === "stun");
  }

  isEnemyRooted(enemy) {
    return enemy.statusEffects.some((e) => e.type === "root");
  }

  moveEnemyToward(enemy, waypointTile, speed, onArrive) {
    const targetX = waypointTile.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = waypointTile.y * TILE_SIZE + TILE_SIZE / 2;
    const dx = targetX - enemy.sprite.x;
    const dy = targetY - enemy.sprite.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 4) {
      enemy.stuckCheck = null;
      onArrive();
      return;
    }

    const now = this.time.now;
    if (!enemy.stuckCheck || now - enemy.stuckCheck.time > 500) {
      if (enemy.stuckCheck) {
        const moved = Math.hypot(
          enemy.sprite.x - enemy.stuckCheck.x,
          enemy.sprite.y - enemy.stuckCheck.y,
        );
        if (moved < 3) {
          enemy.stuckCheck = null;
          onArrive();
          return;
        }
      }
      enemy.stuckCheck = { x: enemy.sprite.x, y: enemy.sprite.y, time: now };
    }

    const nx = dx / dist,
      ny = dy / dist;
    enemy.sprite.setVelocity(nx * speed, ny * speed);
    const edir =
      Math.abs(nx) > Math.abs(ny)
        ? nx > 0
          ? "right"
          : "left"
        : ny > 0
          ? "down"
          : "up";
    enemy.sprite.anims.play(enemy.spriteKey + "-walk-" + edir, true);
    enemy.lastDir = edir;
  }

  updateRegen(deltaMs) {
    const deltaSec = deltaMs / 1000;

    if (this.playerHp < this.playerMaxHp) {
      this.playerHp = Math.min(
        this.playerMaxHp,
        this.playerHp + this.playerHpRegen * deltaSec,
      );
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });
    }

    if (this.playerMana < this.playerMaxMana) {
      this.playerMana = Math.min(
        this.playerMaxMana,
        this.playerMana + this.playerManaRegen * deltaSec,
      );
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    if (this.playerStamina < this.playerMaxStamina) {
      this.playerStamina = Math.min(
        this.playerMaxStamina,
        this.playerStamina + this.playerStaminaRegen * deltaSec,
      );
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }
  }

  performInteraction() {
    const heroX = this.hero.body.center.x;
    const heroY = this.hero.body.center.y;

    if (checkSecretWallInteraction(this)) return;
    if (mineRock(this)) return;
    if (forageNode(this)) return;

    if (this.secretLevers.length > 0) {
      const nearbyLever = this.secretLevers.find(
        (l) =>
          !l.activated &&
          Math.hypot(l.sprite.x - heroX, l.sprite.y - heroY) <=
            this.playerMeleeRange,
      );
      if (nearbyLever) {
        activateLever(this, nearbyLever);
        return;
      }
    }

    if (!this.dialogOpen) {
      const npc = this.questNpcs.find(
        (n) =>
          Math.hypot(n.sprite.x - heroX, n.sprite.y - heroY) <=
          this.playerMeleeRange,
      );
      if (npc) {
        openQuestDialog(this, npc);
        return;
      }
    }

    if (!this.dialogOpen) {
      const ambient = this.ambientNpcs.find(
        (n) =>
          Math.hypot(n.sprite.x - heroX, n.sprite.y - heroY) <=
          this.playerMeleeRange,
      );
      if (ambient) {
        openAmbientDialog(this, ambient);
        return;
      }
    }

    if (this.travelHubTile && !this.dialogOpen) {
      const hubPx = this.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2;
      const hubPy = this.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distHub = Math.hypot(hubPx - heroX, hubPy - heroY);
      if (distHub <= this.playerMeleeRange) {
        openTravelHub(this);
        return;
      }
    }

    if (this.shopData && !this.dialogOpen) {
      const shopPx = this.shopData.x * TILE_SIZE + TILE_SIZE / 2;
      const shopPy = this.shopData.y * TILE_SIZE + TILE_SIZE / 2;
      const distShop = Math.hypot(shopPx - heroX, shopPy - heroY);
      if (distShop <= this.playerMeleeRange) {
        openShop(this);
        return;
      }
    }

    if (this.bossDoorTile && !this.bossRoomOpen && !this.dialogOpen) {
      const doorPx = this.bossDoorTile.x * TILE_SIZE + TILE_SIZE / 2;
      const doorPy = this.bossDoorTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distDoor = Math.hypot(doorPx - heroX, doorPy - heroY);
      if (distDoor <= this.playerMeleeRange) {
        this.dialogOpen = true;
        this.events.emit("npc-dialog", {
          text: "Des ennemis sont encore présents aux alentours, la salle du boss n'est pas accessible...",
          canAccept: false,
        });
        return;
      }
    }

    if (!this.dialogOpen) {
      const chest = this.chests.find((c) => {
        // vide uniquement APRES ouverture = plus rien a faire, on l'ignore.
        // Jamais encore ouvert (meme s'il se revelera vide une fois ouvert,
        // coffre normal comme caisse) = toujours interagissable, le joueur
        // decouvre en l'ouvrant
        if (c.opened && c.lootItems.length === 0) return false;
        const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
        return Math.hypot(cx - heroX, cy - heroY) <= this.playerMeleeRange;
      });
      if (chest) {
        openChestScreen(this, chest);
        return;
      }
    }
  }

  takeChestItem(itemIndex) {
    takeChestItemImpl(this, itemIndex);
  }

  takeAllChestItems() {
    takeAllChestItemsImpl(this);
  }

  closeChestScreen() {
    closeChestScreenImpl(this);
  }

  playAttackAnim(now) {
    const key = this.heroSpriteKey + "-attack-" + this.lastDir;
    if (this.anims.exists(key)) {
      this.hero.anims.play(key, true);
      this.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
    }
  }

  playSlashEffect() {
    const aimDir =
      Math.abs(this.lastAimVector.x) > Math.abs(this.lastAimVector.y)
        ? this.lastAimVector.x > 0
          ? "right"
          : "left"
        : this.lastAimVector.y > 0
          ? "down"
          : "up";
    const slashOffset = 10;
    const slash = this.add.sprite(
      this.hero.x + this.lastAimVector.x * slashOffset,
      this.hero.y + this.lastAimVector.y * slashOffset,
      SPRITE_REGISTRY.meleeSlashEffect.key,
    );
    slash.setScale(SPRITE_REGISTRY.meleeSlashEffect.scale);
    slash.setDepth(15);
    slash.play("meleeSlashEffect-walk-" + aimDir);
    slash.once("animationcomplete", () => slash.destroy());
  }

  performMeleeAttack(now) {
    if (!this.meleeCooldown.isReady(now)) return;
    this.meleeCooldown.trigger(now);

    const meleeWeaponDef = this.equipped.mainHand
      ? resolveItemDef(this.equipped.mainHand)
      : null;

    this.playAttackAnim(now);

    const imbue = this.pendingWeaponImbue;
    this.pendingWeaponImbue = null;
    // direction figee au moment du swing (celle utilisee par l'anim
    // lancee dans playAttackAnim) - pas celle au moment de la resolution,
    // sinon tourner sur soi pendant l'anim changerait retroactivement le cone de frappe
    const aimVector = { x: this.lastAimVector.x, y: this.lastAimVector.y };

    // les degats sont resolus a la FIN de l'anim (pas au lancer du coup),
    // pour laisser le temps a la cible de sortir de portee/du cone et
    // esquiver - coherent avec le mouvement de l'animation d'attaque
    this.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
      if (!this.hero) return; // scene/etage change entre-temps

      let anyHit = false;

      for (const enemy of this.enemies) {
        const dx = enemy.sprite.x - this.hero.x;
        const dy = enemy.sprite.y - this.hero.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.playerMeleeRange || !this.isEnemyVisible(enemy))
          continue;

        if (dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = nx * aimVector.x + ny * aimVector.y;
          if (dot < MELEE_CONE_DOT_THRESHOLD) continue;
        }

        const isCrit = rollCritical(
          enemy.state !== "chase",
          imbue?.critChanceBonus || 0,
        );
        let rawDamage =
          getEffectivePlayerMeleeDamage(this) * (isCrit ? CRIT_MULTIPLIER : 1);

        if (meleeWeaponDef?.varianceDice) {
          rawDamage = applyDiceVariance(rawDamage, meleeWeaponDef.varianceDice);
        }
        rawDamage = applyElementalResistance(
          rawDamage,
          meleeWeaponDef?.damageType,
          enemy.resistances,
        );
        if (
          imbue?.executeThreshold &&
          enemy.hp / enemy.maxHp <= imbue.executeThreshold
        ) {
          rawDamage *= imbue.executeBonusMultiplier;
        }
        if (imbue) rawDamage += imbue.bonusDamage;

        const dealt = computeDamage(rawDamage, enemy.defense);
        this.damageEnemy(enemy, dealt);
        anyHit = true;

        if (imbue?.healPercent) {
          this.playerHp = Math.min(
            this.playerMaxHp,
            this.playerHp + dealt * imbue.healPercent,
          );
          this.events.emit("player-hp-changed", {
            hp: this.playerHp,
            maxHp: this.playerMaxHp,
          });
        }

        if (enemy.hp > 0) {
          applyStatusEffect(this,
            enemy.statusEffects,
            rollStatusEffect(meleeWeaponDef),
          );
          if (imbue) {
            applyStatusEffect(this,
              enemy.statusEffects,
              rollStatusEffect(imbue),
            );
          }
        }
      }

      if (imbue && !anyHit) {
        this.pendingWeaponImbue = imbue;
      }
    });
  }

  getActiveRangedWeaponDef() {
    const mainDef = this.equipped.mainHand
      ? resolveItemDef(this.equipped.mainHand)
      : null;
    if (mainDef && mainDef.grantsRanged) return mainDef;
    const offDef = this.equipped.offHand
      ? resolveItemDef(this.equipped.offHand)
      : null;
    if (offDef && offDef.grantsRanged) return offDef;
    return null;
  }

  canUseRangedAttack() {
    return !!this.getActiveRangedWeaponDef();
  }

  performRangedAttack(now) {
    if (!this.rangedCooldown.isReady(now)) return;
    const weaponDef = this.getActiveRangedWeaponDef();
    if (!weaponDef) {
      this.showLootToast("Aucune arme à distance équipée");
      return;
    }

    if (weaponDef.requiresAmmo) {
      const requiredAmmoId = weaponDef.requiresAmmo;

      if (!this.equipped.quiver) {
        this.showLootToast("Aucune munition équipée");
        return;
      }

      const ammoAllowed = Array.isArray(requiredAmmoId)
        ? requiredAmmoId.includes(this.equipped.quiver)
        : this.equipped.quiver === requiredAmmoId;

      if (!ammoAllowed) {
        this.showLootToast("Mauvaise munition équipée");
        return;
      }

      const ammoEntry = this.inventory.find(
        (i) => i.itemId === this.equipped.quiver,
      );

      if (!ammoEntry || ammoEntry.quantity <= 0) {
        this.showLootToast("Plus de munitions !");
        return;
      }

      ammoEntry.quantity -= 1;

      if (ammoEntry.quantity <= 0) {
        const idx = this.inventory.indexOf(ammoEntry);
        this.inventory.splice(idx, 1);
        this.equipped.quiver = null;

        const oldMaxHp = this.playerMaxHp;
        this.recalculatePlayerStats();
        this.adjustHpAfterMaxHpChange(oldMaxHp);
        this.events.emit("equipment-updated", { ...this.equipped });
      }

      this.events.emit("inventory-updated", [...this.inventory]);
    }

    if (weaponDef.manaCost) {
      if (this.playerMana < weaponDef.manaCost) {
        this.showLootToast("Plus assez de mana !");
        return;
      }
      this.playerMana -= weaponDef.manaCost;
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    this.rangedCooldown.trigger(now);
    const hasAttackAnim = this.anims.exists(
      this.heroSpriteKey + "-attack-" + this.lastDir,
    );
    if (hasAttackAnim) {
      this.hero.anims.play(
        this.heroSpriteKey + "-attack-" + this.lastDir,
        true,
      );
      this.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
    }

    const ammoDef = this.equipped.quiver
      ? resolveItemDef(this.equipped.quiver)
      : null;
    const imbue = this.pendingWeaponImbue;
    this.pendingWeaponImbue = null;

    // munitions/mana/cooldown deja consommes ci-dessus (l'action est
    // engagee des le debut de l'anim) - seul le TIR effectif (spawn du
    // projectile) est repousse a la fin de l'anim, pour que la fleche/le
    // sort parte visuellement au moment ou le geste se termine plutot
    // qu'instantanement au clic
    this.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
      if (!this.hero) return; // scene/etage change entre-temps

      let v = this.lastAimVector;
      let nearestDist = Infinity;
      for (const enemy of this.enemies) {
        if (!this.isEnemyVisible(enemy)) continue;
        const dx = enemy.sprite.x - this.hero.x;
        const dy = enemy.sprite.y - this.hero.y;
        const dist = Math.hypot(dx, dy);
        if (dist > this.playerRangedRange || dist >= nearestDist) continue;
        nearestDist = dist;
        const mag = dist || 1;
        v = { x: dx / mag, y: dy / mag };
      }

      const sprite = this.add.circle(
        this.hero.x,
        this.hero.y,
        PROJECTILE_RADIUS,
        0x66ccff,
      );
      this.physics.add.existing(sprite);
      sprite.setDepth(12);
      sprite.body.setVelocity(v.x * PROJECTILE_SPEED, v.y * PROJECTILE_SPEED);

      this.projectiles.push({
        sprite,
        startX: this.hero.x,
        startY: this.hero.y,
        weaponDef,
        ammoDef,
        imbue,
      });
    });
  }

  updateProjectiles() {
    const grid = this.fogGrid;
    const remaining = [];

    for (const proj of this.projectiles) {
      const traveled = Math.hypot(
        proj.sprite.x - proj.startX,
        proj.sprite.y - proj.startY,
      );
      const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
      const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
      const outOfBounds =
        tileX < 0 ||
        tileY < 0 ||
        tileY >= grid.length ||
        tileX >= grid[0].length;
      const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

      const fogState = this.fogState.state;
      const projVisible = !outOfBounds && fogState[tileY][tileX] === 2;
      proj.sprite.setVisible(projVisible);

      if (traveled >= this.playerRangedRange || outOfBounds || hitWall) {
        proj.sprite.destroy();
        if (proj.imbue && !this.pendingWeaponImbue) {
          this.pendingWeaponImbue = proj.imbue;
        }
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        const dist = Math.hypot(
          enemy.sprite.x - proj.sprite.x,
          enemy.sprite.y - proj.sprite.y,
        );
        if (dist <= PROJECTILE_RADIUS + 14 && this.isEnemyVisible(enemy)) {
          const isCrit = rollCritical(
            enemy.state !== "chase",
            proj.imbue?.critChanceBonus || 0,
          );
          let rawDamage =
            getEffectivePlayerRangedDamage(this) *
            (isCrit ? CRIT_MULTIPLIER : 1);

          if (proj.weaponDef?.varianceDice) {
            rawDamage = applyDiceVariance(
              rawDamage,
              proj.weaponDef.varianceDice,
            );
          }

          rawDamage = applyElementalResistance(
            rawDamage,
            proj.weaponDef?.damageType,
            enemy.resistances,
          );

          this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));

          if (enemy.hp > 0) {
            applyStatusEffect(this,
              enemy.statusEffects,
              rollStatusEffect(proj.weaponDef),
            );
            applyStatusEffect(this,
              enemy.statusEffects,
              rollStatusEffect(proj.ammoDef),
            );
            if (proj.imbue)
              applyStatusEffect(this,
                enemy.statusEffects,
                rollStatusEffect(proj.imbue),
              );
          }
          hit = true;
          break;
        }
      }
      if (hit) {
        proj.sprite.destroy();
        continue;
      }

      remaining.push(proj);
    }

    this.projectiles = remaining;
  }

  useHotbarSlot(slotIndex) {
    triggerHotbarSlotImpl(this, slotIndex);
  }

  confirmResummon() {
    confirmResummonImpl(this);
  }

  cancelResummon() {
    cancelResummonImpl(this);
  }

  confirmSummonReplace() {
    confirmSummonReplaceImpl(this);
  }

  cancelSummonReplace() {
    cancelSummonReplaceImpl(this);
  }

  knockbackEnemyIfClear(enemy, dx, dy) {
    const newX = enemy.sprite.x + dx;
    const newY = enemy.sprite.y + dy;
    const tileX = Math.floor(newX / TILE_SIZE);
    const tileY = Math.floor(newY / TILE_SIZE);
    const grid = this.fogGrid;
    if (
      tileY < 0 ||
      tileX < 0 ||
      tileY >= grid.length ||
      tileX >= grid[0].length
    )
      return;
    if (grid[tileY][tileX] === WALL) return;
    enemy.sprite.x = newX;
    enemy.sprite.y = newY;
  }

  updateShieldBash() {
    const ds = this.dashState;
    const traveled = Math.hypot(
      this.hero.x - ds.startX,
      this.hero.y - ds.startY,
    );
    const abilityDamage = this.computeAbilityDamage(ds.def);

    for (const enemy of this.enemies) {
      if (ds.hitEnemyIds.has(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist <= 24) {
        const rawDamage = applyElementalResistance(
          abilityDamage,
          ds.def.damageType,
          enemy.resistances,
        );
        this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
        ds.hitEnemyIds.add(enemy);
        this.knockbackEnemyIfClear(
          enemy,
          ds.dirX * ds.def.knockbackDistance,
          ds.dirY * ds.def.knockbackDistance,
        );
      }
    }

    const stoppedByWall =
      this.hero.body.velocity.x === 0 && this.hero.body.velocity.y === 0;
    if (traveled >= ds.def.dashDistance || stoppedByWall) {
      this.hero.setVelocity(0, 0);
      this.dashState = null;
    }
  }

  computeReachableFloorTiles(originX, originY) {
    const grid = this.fogGrid;
    const height = grid.length;
    const width = grid[0].length;
    const visited = new Set();
    const queue = [{ x: originX, y: originY }];
    visited.add(originX + "," + originY);

    while (queue.length > 0) {
      const { x, y } = queue.shift();
      for (const [dx, dy] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const key = nx + "," + ny;
        if (visited.has(key) || grid[ny][nx] === WALL) continue;
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
    return visited;
  }

  explodeAbilityProjectile(def, x, y) {
    const abilityDamage = this.computeAbilityDamage(def);
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(enemy.sprite.x - x, enemy.sprite.y - y);
      if (dist > def.radius) continue;
      const rawDamage = applyElementalResistance(
        abilityDamage,
        def.damageType,
        enemy.resistances,
      );
      this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      if (enemy.hp > 0) {
        applyStatusEffect(this, enemy.statusEffects, rollStatusEffect(def));
      }
    }

    const circle = this.add.circle(x, y, 10, 0xff6600, 0.5);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });
  }

  computeBossRoomTiles() {
    if (!this.bossDoorTile || this.bossRoomOpen) return new Set();

    const centerTileX = Math.floor(this.hero.x / TILE_SIZE);
    const centerTileY = Math.floor(this.hero.y / TILE_SIZE);

    const reachableNow = this.computeReachableFloorTiles(
      centerTileX,
      centerTileY,
    );

    const { x: dx, y: dy } = this.bossDoorTile;
    const original = this.fogGrid[dy][dx];
    this.fogGrid[dy][dx] = 0;
    const reachableIfOpen = this.computeReachableFloorTiles(
      centerTileX,
      centerTileY,
    );
    this.fogGrid[dy][dx] = original;

    const bossRoomTiles = new Set();
    for (const key of reachableIfOpen) {
      if (!reachableNow.has(key)) bossRoomTiles.add(key);
    }
    return bossRoomTiles;
  }

  updateAbilityProjectiles() {
    const grid = this.fogGrid;
    const remaining = [];

    for (const proj of this.abilityProjectiles) {
      const traveled = Math.hypot(
        proj.sprite.x - proj.startX,
        proj.sprite.y - proj.startY,
      );
      const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
      const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
      const outOfBounds =
        tileX < 0 ||
        tileY < 0 ||
        tileY >= grid.length ||
        tileX >= grid[0].length;
      const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

      const fogState = this.fogState.state;
      proj.sprite.setVisible(!outOfBounds && fogState[tileY][tileX] === 2);

      if (
        traveled >= (proj.def.maxDistance ?? this.playerRangedRange) ||
        outOfBounds ||
        hitWall
      ) {
        proj.sprite.destroy();
        continue;
      }

      if (proj.def.effectType === "pierce") {
        for (const enemy of this.enemies) {
          if (proj.hitEnemyIds.has(enemy)) continue;
          const dist = Math.hypot(
            enemy.sprite.x - proj.sprite.x,
            enemy.sprite.y - proj.sprite.y,
          );
          if (dist <= 14 && this.isEnemyVisible(enemy)) {
            const abilityDamage = this.computeAbilityDamage(proj.def);
            const rawDamage = applyElementalResistance(
              abilityDamage,
              proj.def.damageType,
              enemy.resistances,
            );
            this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
            if (enemy.hp > 0) {
              applyStatusEffect(this,
                enemy.statusEffects,
                rollStatusEffect(proj.def),
              );
            }
            proj.hitEnemyIds.add(enemy);
            proj.pierceCount++;
          }
        }
        if (
          proj.def.maxPierceCount &&
          proj.pierceCount >= proj.def.maxPierceCount
        ) {
          proj.sprite.destroy();
          continue;
        }
        remaining.push(proj);
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        const dist = Math.hypot(
          enemy.sprite.x - proj.sprite.x,
          enemy.sprite.y - proj.sprite.y,
        );
        if (dist <= 14 && this.isEnemyVisible(enemy)) {
          this.explodeAbilityProjectile(proj.def, proj.sprite.x, proj.sprite.y);
          hit = true;
          break;
        }
      }
      if (hit) {
        proj.sprite.destroy();
        continue;
      }

      remaining.push(proj);
    }

    this.abilityProjectiles = remaining;
  }

  updateZones(now) {
    const remaining = [];
    for (const zone of this.zones) {
      if (now >= zone.expiresAt) {
        zone.sprite.destroy();
        continue;
      }
      if (now >= zone.nextTickAt) {
        zone.nextTickAt = now + zone.tickIntervalMs;
        for (const enemy of this.enemies) {
          const dist = Math.hypot(
            enemy.sprite.x - zone.x,
            enemy.sprite.y - zone.y,
          );
          if (dist <= zone.radius) {
            const dmg = applyElementalResistance(
              zone.damagePerTick,
              zone.damageType,
              enemy.resistances,
            );
            this.damageEnemy(enemy, dmg);
          }
        }
      }
      remaining.push(zone);
    }
    this.zones = remaining;
  }

  updateTraps(now) {
    const remaining = [];
    for (const trap of this.traps) {
      if (now >= trap.expiresAt) {
        trap.sprite.destroy();
        continue;
      }
      let triggered = false;
      for (const enemy of this.enemies) {
        const dist = Math.hypot(
          enemy.sprite.x - trap.x,
          enemy.sprite.y - trap.y,
        );
        if (dist <= trap.triggerRadius) {
          applyStatusEffect(this,
            enemy.statusEffects,
            rollStatusEffect({ inflictsEffect: trap.inflictsEffect }),
          );
          trap.sprite.destroy();
          triggered = true;
          break;
        }
      }
      if (!triggered) remaining.push(trap);
    }
    this.traps = remaining;
  }

  updateBoomerangs() {
    const remaining = [];
    for (const b of this.boomerangs) {
      if (!b.returning) {
        const traveled = Math.hypot(
          b.sprite.x - b.startX,
          b.sprite.y - b.startY,
        );
        if (traveled >= b.def.maxDistance) b.returning = true;
      } else {
        const dx = this.hero.x - b.sprite.x;
        const dy = this.hero.y - b.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 20) {
          b.sprite.destroy();
          continue;
        }
        const mag = dist || 1;
        b.sprite.body.setVelocity(
          (dx / mag) * b.def.projectileSpeed,
          (dy / mag) * b.def.projectileSpeed,
        );
      }
      for (const enemy of this.enemies) {
        if (b.hitEnemyIds.has(enemy)) continue;
        const dist = Math.hypot(
          enemy.sprite.x - b.sprite.x,
          enemy.sprite.y - b.sprite.y,
        );
        if (dist <= 14 && this.isEnemyVisible(enemy)) {
          const abilityDamage = this.computeAbilityDamage(b.def);
          const rawDamage = applyElementalResistance(
            abilityDamage,
            b.def.damageType,
            enemy.resistances,
          );
          this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
          b.hitEnemyIds.add(enemy);
        }
      }
      remaining.push(b);
    }
    this.boomerangs = remaining;
  }

  assignHotbarSlot(slotIndex, payload) {
    assignHotbarSlotImpl(this, slotIndex, payload);
  }

  useFury() {
    if (this.furyKillCount < FURY_KILLS_REQUIRED) {
      this.showLootToast(
        `Furie pas encore prête (${this.furyKillCount}/${FURY_KILLS_REQUIRED} ennemis)`,
      );
      return;
    }

    const heroArchetype = resolveHeroStatsOverride(
      this.heroSpriteKey,
    )?.archetype;
    const fury = resolveFuryDef(heroArchetype);
    if (!fury) {
      this.showLootToast("Aucune furie pour cet archétype");
      return;
    }

    this.furyKillCount = 0;
    this.events.emit("fury-progress", {
      count: 0,
      required: FURY_KILLS_REQUIRED,
    });

    if (fury.aoeDamage) {
      for (const enemy of this.enemies) {
        if (!this.isEnemyVisible(enemy)) continue;
        const dist = Math.hypot(
          enemy.sprite.x - this.hero.x,
          enemy.sprite.y - this.hero.y,
        );
        if (dist > fury.aoeRadius) continue;
        const rawDamage = applyElementalResistance(
          fury.aoeDamage,
          fury.damageType,
          enemy.resistances,
        );
        this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      }
      const circle = this.add.circle(
        this.hero.x,
        this.hero.y,
        10,
        0xff2200,
        0.5,
      );
      circle.setDepth(14);
      this.tweens.add({
        targets: circle,
        radius: fury.aoeRadius,
        alpha: 0,
        duration: 400,
        onComplete: () => circle.destroy(),
      });
    }

    if (fury.buffStatModifiers) {
      applyStatusEffect(this, this.playerStatusEffects, {
        type: fury.id,
        kind: "modifier",
        statModifiers: fury.buffStatModifiers,
        durationMs: fury.buffDurationMs,
      });
    }

    if (fury.healPercent) {
      this.playerHp = Math.min(
        this.playerMaxHp,
        this.playerHp + (this.playerMaxHp - this.playerHp) * fury.healPercent,
      );
      this.playerMana = Math.min(
        this.playerMaxMana,
        this.playerMana +
          (this.playerMaxMana - this.playerMana) * fury.healPercent,
      );
      this.playerStamina = Math.min(
        this.playerMaxStamina,
        this.playerStamina +
          (this.playerMaxStamina - this.playerStamina) * fury.healPercent,
      );
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }

    this.showLootToast(`${fury.name} déclenchée !`);
  }

  damageEnemy(enemy, amount) {
    if (enemy.state !== "chase") {
      enemy.state = "chase";
      this.requestPath(
        enemy.sprite.x,
        enemy.sprite.y,
        this.hero.x,
        this.hero.y,
        (path) => {
          enemy.path = path;
          enemy.pathIndex = 0;
        },
      );
    }
    this.showDamageNumber(enemy.sprite, amount, "#ffffff");
    const result = applyDamage(enemy, amount);
    enemy.hp = result.hp;

    if (result.died) {
      this.xp += enemy.xpReward;
      this.events.emit("xp-changed", { xp: this.xp });
      this.checkLevelUp();
      this.currentFloorKills.push(enemy.spawnIndex);
      if (this.furyKillCount < FURY_KILLS_REQUIRED) {
        this.furyKillCount++;
        this.events.emit("fury-progress", {
          count: this.furyKillCount,
          required: FURY_KILLS_REQUIRED,
        });
        if (this.furyKillCount >= FURY_KILLS_REQUIRED) {
          this.showLootToast("Furie prête !");
        }
      }
      const lootItems = [...(enemy.drops || [])];

      if (!enemy.isBoss && enemy.questLoot) {
        for (const questKey of Object.keys(this.quests)) {
          const qs = this.quests[questKey];
          if (qs.questId !== "obtainItem" || !qs.accepted || qs.completed)
            continue;
          if (qs.targetItemId !== enemy.questLoot) continue;
          const haveQty = this.inventory
            .filter((i) => i.itemId === enemy.questLoot)
            .reduce((sum, i) => sum + i.quantity, 0);
          if (haveQty >= (qs.targetQuantity || 1)) continue;

          lootItems.push({ itemId: enemy.questLoot, quantity: 1 });
          break;
        }
      }

      if (lootItems.length > 0) {
        spawnLootChest(this, enemy.sprite.x, enemy.sprite.y, lootItems);
      }

      if (enemy.isSecretRoomGuard && this.secretRewardLocked) {
        const anyGuardAlive = this.enemies.some(
          (e) => e.isSecretRoomGuard && e !== enemy,
        );
        if (!anyGuardAlive) {
          this.secretRewardLocked = false;
          grantSecretRoomReward(this);
          this.showLootToast("La voie est libre !");
          markSecretRoomDiscovered(this);
        }
      }

      if (enemy.isBoss) {
        const neededCounts = {};
        for (const questKey of Object.keys(this.quests)) {
          const qs = this.quests[questKey];
          if (qs.questId !== "obtainItem" || !qs.accepted || qs.completed)
            continue;
          if (!qs.isBossItem) continue; // <-- nouveau : jamais un objet issu d'un ennemi normal
          neededCounts[qs.targetItemId] =
            (neededCounts[qs.targetItemId] || 0) + 1;
        }
        const bossLootItems = [];
        for (const [itemId, neededCount] of Object.entries(neededCounts)) {
          const haveCount = this.inventory
            .filter((i) => i.itemId === itemId)
            .reduce((sum, i) => sum + i.quantity, 0);
          const toGrant = neededCount - haveCount;
          if (toGrant > 0) bossLootItems.push({ itemId, quantity: toGrant });
        }
        if (enemy.drop) {
          bossLootItems.push({
            itemId: enemy.drop.itemId,
            quantity: enemy.drop.quantity,
          });
        }
        if (bossLootItems.length > 0) {
          spawnLootChest(this, enemy.sprite.x, enemy.sprite.y, bossLootItems);
          this.showLootToast("Le boss a laissé tomber un coffre de butin !");
        }

        let anyDefeatBossUpdated = false;
        for (const questKey of Object.keys(this.quests)) {
          const qs = this.quests[questKey];
          if (
            qs.questId !== "defeatBoss" ||
            !qs.accepted ||
            qs.completed ||
            qs.bossDefeated
          )
            continue;
          if (qs.targetBossDepth !== this.currentDepth) continue;
          qs.bossDefeated = true;
          anyDefeatBossUpdated = true;
        }
        if (anyDefeatBossUpdated) {
          this.events.emit("quests-updated", { ...this.quests });
          this.persistProgress();
        }
      }

      let anyQuestUpdated = false;
      for (const questKey of Object.keys(this.quests)) {
        const qs = this.quests[questKey];
        if (!qs.accepted || qs.completed) continue;
        if (qs.targetEnemyType && qs.targetEnemyType !== enemy.archetype)
          continue;
        if (qs.killCount < qs.target) {
          qs.killCount++;
          if (qs.killCount === qs.target) {
            this.showLootToast("Quête prête : reviens voir le PNJ !");
          }
          anyQuestUpdated = true;
        }
      }
      if (anyQuestUpdated) {
        this.events.emit("quests-updated", { ...this.quests });
        this.persistProgress();
      }
      if (enemy.visualEmitter) enemy.visualEmitter.destroy();

      enemy.sprite.destroy();
      this.enemies = this.enemies.filter((e) => e !== enemy);

      if (enemy.isBoss) {
        this.bossAlive = false;
        this.events.emit("boss-defeated");
      } else if (
        this.bossDoorTile &&
        !this.bossRoomOpen &&
        this.enemies.length === 0
      ) {
        this.openBossDoor();
      }
    } else {
      enemy.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(80, () => {
        if (enemy.sprite.active) {
          enemy.sprite.clearTint();
          enemy.sprite.setTintMode(Phaser.TintModes.MULTIPLY);
        }
      });
    }
  }

  checkLevelUp() {
    const { level } = computeLevelFromXp(this.xp);
    if (level <= this.playerLevel) return;
    this.events.emit("levelup-available", { available: true });
  }

  openLevelUpScreen() {
    const inCombat = this.enemies.some((e) => e.state === "chase");
    if (inCombat) {
      this.showLootToast("Impossible en plein combat");
      return;
    }

    const { level } = computeLevelFromXp(this.xp);
    if (level > this.playerLevel) {
      this.applyPendingLevelUp(level);
    }

    this.draftAttributes = { ...this.playerAttributes };
    this.draftUnspentPoints = this.unspentAttributePoints;

    this.pauseGame("levelup");
    this.events.emit("levelup-screen-open", {
      attributes: { ...this.playerAttributes }, // confirme - le plancher pour le bouton "-"
      draftAttributes: { ...this.draftAttributes },
      unspent: this.draftUnspentPoints,
      level: this.playerLevel,
    });
  }

  closeLevelUpScreen() {
    this.unpauseGame("levelup");
    this.events.emit("levelup-screen-open", null);
  }

  applyPendingLevelUp(level) {
    const levelsGained = level - this.playerLevel;
    this.playerLevel = level;
    this.unspentAttributePoints += ATTRIBUTE_POINTS_PER_LEVEL * levelsGained;
    this.recalculatePlayerStats();
    this.playerHp = this.playerMaxHp;
    this.playerMana = this.playerMaxMana;
    this.playerStamina = this.playerMaxStamina;

    let anyAbilityUnlocked = false;
    const heroArchetype = resolveHeroStatsOverride(
      this.heroSpriteKey,
    )?.archetype;
    for (const def of Object.values(ABILITY_DEFS)) {
      if (
        def.archetypes &&
        def.archetypes.length > 0 &&
        !def.archetypes.includes(heroArchetype)
      )
        continue;
      if (def.unlockLevel == null || def.unlockLevel > level) continue;
      if (this.unlockedAbilities.includes(def.id)) continue;
      if (def.staminaCost && this.playerMaxStamina <= 0) continue;
      if (def.manaCost && this.playerMaxMana <= 0) continue;
      this.unlockedAbilities.push(def.id);
      anyAbilityUnlocked = true;
      this.showLootToast(`Nouvelle compétence débloquée : ${def.name} !`);
    }
    if (anyAbilityUnlocked)
      this.events.emit("abilities-updated", [...this.unlockedAbilities]);
    let anyRecipeUnlocked = false;
    for (const recipe of Object.values(CRAFTING_RECIPES)) {
      if (recipe.unlockLevel == null || recipe.unlockLevel > level) continue;
      if (recipe.discoveryOnly) continue;
      if (this.unlockedRecipes.includes(recipe.id)) continue;
      this.unlockedRecipes.push(recipe.id);
      anyRecipeUnlocked = true;
      this.showLootToast(`Nouvelle recette débloquée : ${recipe.name} !`);
    }
    if (anyRecipeUnlocked)
      this.events.emit("recipes-updated", [...this.unlockedRecipes]);

    const stillLocked = this.discoveredLockedRecipes.filter(
      (id) => !this.unlockedRecipes.includes(id),
    );
    if (stillLocked.length !== this.discoveredLockedRecipes.length) {
      this.discoveredLockedRecipes = stillLocked;
      this.events.emit("locked-recipes-updated", [
        ...this.discoveredLockedRecipes,
      ]);
    }

    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
    this.events.emit("player-stamina-changed", {
      stamina: this.playerStamina,
      maxStamina: this.playerMaxStamina,
    });
    for (const summon of this.summons) {
      if (summon.growthConfig) {
        const growthScale = computeFamiliarGrowthScale(this, summon.growthConfig);
        const baseSpriteInfo = SPRITE_REGISTRY[summon.spriteKey];
        if (baseSpriteInfo)
          summon.sprite.setScale(baseSpriteInfo.scale * growthScale);
      }
    }

    this.events.emit("level-up", { level });
    this.events.emit("levelup-available", { available: false });
    this.persistProgress();
  }
  /**
   * Debloque tout ce qui a unlockLevel <= niveau actuel - separee
   * d'applyPendingLevelUp car appelee aussi a la CREATION du personnage
   * (niveau 1), moment ou aucune vraie "montee de niveau" ne se produit
   * jamais (on demarre deja a ce niveau, on ne le "franchit" pas).
   */
  unlockAvailableAbilitiesAndRecipes() {
    const heroArchetype = resolveHeroStatsOverride(
      this.heroSpriteKey,
    )?.archetype;
    for (const def of Object.values(ABILITY_DEFS)) {
      if (
        def.archetypes &&
        def.archetypes.length > 0 &&
        !def.archetypes.includes(heroArchetype)
      )
        continue;
      if (def.unlockLevel == null || def.unlockLevel > this.playerLevel)
        continue;
      if (this.unlockedAbilities.includes(def.id)) continue;
      if (def.staminaCost && this.playerMaxStamina <= 0) continue;
      if (def.manaCost && this.playerMaxMana <= 0) continue;
      this.unlockedAbilities.push(def.id);
    }
    for (const recipe of Object.values(CRAFTING_RECIPES)) {
      if (recipe.unlockLevel == null || recipe.unlockLevel > this.playerLevel)
        continue;
      if (recipe.discoveryOnly) continue; // <-- nouveau, meme garde qu'applyPendingLevelUp
      if (this.unlockedRecipes.includes(recipe.id)) continue;
      this.unlockedRecipes.push(recipe.id);
    }
  }

  allocateAttributePoint(attribute) {
    if (this.draftUnspentPoints <= 0) return;
    if (!(attribute in this.draftAttributes)) return;
    const inCombat = this.enemies.some((e) => e.state === "chase");
    if (inCombat) {
      this.showLootToast("Impossible en plein combat");
      return;
    }

    this.draftAttributes[attribute]++;
    this.draftUnspentPoints--;

    this.events.emit("levelup-draft-updated", {
      attributes: { ...this.draftAttributes },
      unspent: this.draftUnspentPoints,
    });
  }

  /**
   * Retire un point du brouillon - UNIQUEMENT si ce point a ete ajoute
   * CETTE session (jamais en dessous de this.playerAttributes, deja
   * confirme lors d'une session precedente).
   */
  deallocateAttributePoint(attribute) {
    if (!(attribute in this.draftAttributes)) return;
    if (this.draftAttributes[attribute] <= this.playerAttributes[attribute])
      return;

    this.draftAttributes[attribute]--;
    this.draftUnspentPoints++;

    this.events.emit("levelup-draft-updated", {
      attributes: { ...this.draftAttributes },
      unspent: this.draftUnspentPoints,
    });
  }

  /**
   * Applique reellement le brouillon - stats recalculees (proportions de
   * ressources preservees, meme principe qu'avant), sauvegarde. Tant que
   * cette methode n'est pas appelee, rien n'est definitif - fermer l'ecran
   * sans valider abandonne silencieusement le brouillon (this.playerAttributes
   * n'a jamais ete touche entre-temps).
   */
  confirmAttributeAllocation() {
    this.playerAttributes = { ...this.draftAttributes };
    this.unspentAttributePoints = this.draftUnspentPoints;

    const previousHpRatio = this.playerHp / this.playerMaxHp;
    const previousManaRatio =
      this.playerMaxMana > 0 ? this.playerMana / this.playerMaxMana : 1;
    const previousStaminaRatio =
      this.playerMaxStamina > 0
        ? this.playerStamina / this.playerMaxStamina
        : 1;

    this.recalculatePlayerStats();

    this.playerHp = Math.round(this.playerMaxHp * previousHpRatio);
    this.playerMana = Math.round(this.playerMaxMana * previousManaRatio);
    this.playerStamina = Math.round(
      this.playerMaxStamina * previousStaminaRatio,
    );

    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
    this.events.emit("player-stamina-changed", {
      stamina: this.playerStamina,
      maxStamina: this.playerMaxStamina,
    });
    this.events.emit("attributes-updated", {
      attributes: { ...this.playerAttributes },
      unspent: this.unspentAttributePoints,
    });
    this.showLootToast("Attributs confirmés !");
    this.persistProgress();
  }

  attemptFreeCraft(selectedItems) {
    return attemptFreeCraftImpl(this, selectedItems);
  }

  decraftItem(inventoryIndex) {
    decraftItemImpl(this, inventoryIndex);
  }

  craftItem(recipeId, flexAllocations = {}) {
    craftItemImpl(this, recipeId, flexAllocations);
  }

  showDamageNumber(sprite, amount, color = "#ffffff", prefix = "-") {
    const text = this.add.text(
      sprite.x,
      sprite.y - 20,
      `${prefix}${Math.round(amount)}`,
      {
        fontSize: "25px",
        fontFamily: "monospace",
        color,
        stroke: "#000000",
        strokeThickness: 3,
      },
    );
    text.setOrigin(0.5, 0.5);
    text.setDepth(16);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}
