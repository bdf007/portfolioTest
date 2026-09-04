import Phaser from "phaser";
import { fetchLevel, saveProgress } from "../../../api/arpgClient";
import { createRng } from "../rng";
import {
  hasClearLineOfSight,
  createFogState,
  computeVisibleTiles,
} from "../fogOfWar";
import { findPath } from "../pathfinding";
import {
  createEnemyBehavior,
  decideNextState,
  pickPatrolRoute,
} from "../enemyBehavior";
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
  resolveEnemyDisplayName,
  resolveHeroStatsOverride,
  TILE_IMAGE_REGISTRY,
  CHEST_SPRITESHEET,
  CHEST_VARIANTS,
} from "../spriteRegistry";
import { resolveItemDef } from "../itemDefs";
import {
  computeEquipmentBonuses,
  computeEquipmentResistances,
} from "../equipment";
import { resolveAbilityDef, ABILITY_DEFS } from "../abilityDefs";
import { resolveCraftingRecipe, CRAFTING_RECIPES } from "../craftingRecipes";
import { resolveFuryDef } from "../furyDefs";
import { computeWallCornerIndex } from "../autotile";
import { computeMask } from "../blob47";
import {
  DUNGEON1_TILESET,
  floorFrame,
  // autotileFrame,
} from "../tilesets/dungeon1";
import {
  FORTRESS1_TILESET,
  COLUMNS_PER_ROW,
  // floorFrame as fortressFloorFrame,
  autotileFrame as fortressAutotileFrame,
} from "../tilesets/fortress1";

import {
  DUNGEON_AUTOTILE_SPRITESHEET,
  DESERT_AUTOTILE_SPRITESHEET,
  HILLS_AUTOTILE_SPRITESHEET,
  SNOW_AUTOTILE_SPRITESHEET,
  DARKWOODS_AUTOTILE_SPRITESHEET,
  DARKWOODS2_AUTOTILE_SPRITESHEET,
  STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
  FORTRESS_AUTOTILE_SPRITESHEET,
} from "../spriteRegistry";

const TILE_SIZE = 32;
const WALL = 1;

const VISION_RADIUS_DEFAULT = 6; // repli si le profil d'archetype (cf. HERO_STATS_PROFILES) ne definit pas visionRadius
const ENEMY_SPEED = 90;
const SELL_PRICE_RATIO = 0.5; // moitie du prix d'achat - cf. sellItem
const ENEMY_STOP_DISTANCE = 28; // attackType 'melee' - juste en dessous de ENEMY_ATTACK_RANGE (34)
const ENEMY_RANGED_STOP_DISTANCE = 180; // attackType 'ranged' - confortablement dans ENEMY_RANGED_ATTACK_RANGE (260), mais loin de la melee - sans ca, un ennemi a distance marcherait jusqu'a bout portant avant de tirer
const ENEMY_RANGED_RETREAT_DISTANCE = 100; // en dessous de cette distance, un ennemi a distance recule ACTIVEMENT plutot que de simplement s'arreter - recule et tire en meme temps (les deux systemes sont deja decouples, cf. updateEnemyAttacks), jamais besoin de s'arreter pour viser

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
const DETECTION_BEHIND_DOT_THRESHOLD = -0.5;
const ENEMY_DIR_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const PLAYER_MELEE_COOLDOWN = 420;
const PLAYER_RANGED_COOLDOWN = 650;
const PROJECTILE_SPEED = 320;
const PROJECTILE_MAX_DISTANCE_DEFAULT = 380; // repli si le profil d'archetype ne definit pas rangedRange
const PROJECTILE_RADIUS = 5;
const CONSUMABLE_COOLDOWN_MS = 2000; // ajustable - meme delai pour toutes les potions pour l'instant
const FURY_KILLS_REQUIRED = 10; // ajustable
const MAX_SUMMONS = 3;
const STATUS_EFFECT_COLORS = {
  burn: 0xff8800, // orange
  bleed: 0xcc0000, // rouge
  slow: 0x4488ff, // bleu - coherent avec l'explosion de performAoeDebuffAbility
  haste: 0x44ff88, // vert clair - pour un futur flash sur soi-meme si besoin
  acid: 0x88ff00, // vert
  stun: 0xffff00, // jaune
};
// combat ennemi
const ENEMY_ATTACK_COOLDOWN = 900;
const ENEMY_ATTACK_RANGE = 34; // portee de contact (attackType 'melee')
const ENEMY_RANGED_ATTACK_RANGE = 260; // portee de declenchement (attackType 'ranged') - plus large que le contact, sinon un ennemi a distance se comporterait comme un ennemi de melee qui rate juste sa portee
const ENEMY_PROJECTILE_SPEED = 220; // plus lent que celui du joueur (PROJECTILE_SPEED=320) - laisse une vraie chance d'esquiver
const ENEMY_PROJECTILE_MAX_DISTANCE = 300;

const AMBIENT_NPC_GREETINGS = [
  "Bonjour, voyageur !",
  "Belle journée, n'est-ce pas ?",
  "Fais attention à toi là-dessous.",
  "J'ai entendu dire qu'il y avait un trésor par ici...",
  "Content de voir un nouveau visage en ville.",
  "Les affaires sont calmes en ce moment.",
  "On en a gros!",
];

const TILESET_COLORS = {
  cave: { wall: 0x3a3542, floor: 0xc8be9e },
  ruins: { wall: 0x372f38, floor: 0xd2b48c },
  cavechain: { wall: 0x2f3a34, floor: 0xa8c0a0 },
  drunkardwalk: { wall: 0x3a2f2a, floor: 0xb89878 },
  maze: { wall: 0x28282f, floor: 0x8a8a9a },
  noise: { wall: 0x2a3540, floor: 0x94b0a8 },
  voronoi: { wall: 0x3a2f3a, floor: 0xb090a0 },
  tree: { wall: 0x2e4a2a, floor: 0x5a7a4a },
  temple: { wall: 0x32303c, floor: 0xbec8d7 },
  town: { wall: 0x5a4a3a, floor: 0xc8bfa0 },
};

const WALL_CORNER_INDEX_TO_FRAME = [
  0, 32, 0, 16, 2, 32, 1, 23, 34, 33, 2, 7, 18, 6, 22, 17,
];
const WALL_CORNER_INDEX_TO_FRAME_MOUNTAIN2 = [
  3, 35, 3, 19, 5, 35, 4, 39, 37, 36, 5, 39, 21, 38, 38, 20,
];
const WALL_CORNER_INDEX_TO_FRAME_MOUNTAIN3 = [
  48, 80, 48, 64, 50, 80, 49, 68, 82, 81, 50, 52, 66, 51, 67, 65,
];
const WALL_CORNER_INDEX_TO_FRAME_DESERT2 = [
  96, 128, 96, 112, 98, 128, 97, 100, 130, 129, 98, 115, 114, 116, 100, 113,
];

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

  create() {
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
    this.rangedCooldown = createCooldown(PLAYER_RANGED_COOLDOWN);
    this.isDead = false;
    this.currentDepth = 1;

    this.hpBarGraphics = this.add.graphics();
    this.hpBarGraphics.setDepth(20);

    this.enemyGroup = this.physics.add.group();
    this.pendingResummonDef = null;
    this.pendingResummonTarget = null;
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    this.summonGroup = this.physics.add.group();
    this.physics.add.collider(this.summonGroup, this.summonGroup);
    this.physics.add.collider(this.summonGroup, this.enemyGroup);
    this.physics.add.collider(this.summonGroup, this.hero);
    this.levelColliders = [];

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
    this.quests = {};
    this.unlockedAbilities = [];
    this.unlockedRecipes = [];
    this.furyKillCount = 0;
    this.pendingWeaponImbue = null;
    this.dashState = null;
    this.summons = [];
    this.touchFuryRequested = false;
    this.hotbarSlots = new Array(9).fill(null);
    this.abilityCooldowns = {};
    this.itemCooldowns = {};
    this.activeDialogQuestKey = null;
    this.activeTalkingNpc = null;
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

    this.startGame();
  }

  async startGame() {
    const resumeSave = this.registry.get("resumeSave");
    if (resumeSave) {
      await this.resumeFromSave(resumeSave);
      return;
    }
    this.giveStartingKit();
    this.loadLevel(this.currentDepth);
  }

  giveStartingKit() {
    const profile = resolveHeroStatsOverride(this.heroSpriteKey);
    if (!profile) return;

    for (const itemId of profile.startingEquipment || []) {
      this.addItemToInventory(itemId, 1);
      const newIndex = this.inventory.length - 1;
      this.equipItem(newIndex);
    }

    if (profile.startingAmmo) {
      this.addItemToInventory(
        profile.startingAmmo.itemId,
        profile.startingAmmo.quantity,
      );
      this.equipped.quiver = profile.startingAmmo.itemId;
      this.events.emit("equipment-updated", { ...this.equipped });
    }
    if (profile.startingAbilities) {
      for (const abilityId of profile.startingAbilities) {
        this.unlockedAbilities.push(abilityId);
      }
      this.events.emit("abilities-updated", [...this.unlockedAbilities]);
    }
  }

  async resumeFromSave(save) {
    this.currentGameId = save.gameId || null;
    this.visitedFloors = save.floors || [];
    const ps = save.playerState || {};
    this.discoveredLandmarks = ps.discoveredLandmarks || {};
    this.xp = ps.xp || 0;
    this.playerLevel = ps.level || 1;
    this.playerAttributes = ps.playerAttributes || { ...DEFAULT_ATTRIBUTES };
    this.unspentAttributePoints = ps.unspentAttributePoints || 0;
    this.quests = ps.quests || {};
    this.inventory = ps.inventory || [];
    this.hotbarSlots = ps.hotbarSlots || new Array(9).fill(null);
    this.unlockedAbilities = ps.unlockedAbilities || [];
    this.unlockedRecipes = ps.unlockedRecipes || [];
    this.furyKillCount = ps.furyKillCount || 0;
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
      ...(ps.equipped || {}),
    };
    this.timePlayedBaseline = ps.timePlayedSeconds || 0;

    const stats = getPlayerStatsForLevel(
      this.playerLevel,
      resolveHeroStatsOverride(this.heroSpriteKey),
    );
    this.recalculatePlayerStats();
    this.playerMana = ps.mana ?? this.playerMaxMana;

    this.floorFogCache = ps.floorFogCache || {};

    await this.loadLevel(
      save.depth,
      save.seed,
      ps.hp,
      ps.currentFloorKills || [],
      ps.currentFloorOpenedChests || [],
      ps.currentFloorLootSeed || null,
      null,
      ps.playerPosition || null,
    );
    for (const savedSummon of ps.summons || []) {
      const sprite = this.spawnSummonSprite(
        savedSummon.spriteKey,
        this.hero.x + (Math.random() - 0.5) * 40,
        this.hero.y + (Math.random() - 0.5) * 40,
      );
      this.summons.push({
        sprite,
        spriteKey: savedSummon.spriteKey,
        sourceAbilityId: savedSummon.sourceAbilityId,
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
            ? this.time.now + savedSummon.remainingMs
            : null,
        lastDir: "down",
      });
    }
    this.events.emit("xp-changed", { xp: this.xp });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
    this.events.emit("level-up", { level: this.playerLevel, stats });
    this.events.emit("attributes-updated", {
      attributes: { ...this.playerAttributes },
      unspent: this.unspentAttributePoints,
    });
  }

  getTotalTimePlayed() {
    return (
      this.timePlayedBaseline +
      Math.floor((Date.now() - this.sessionStartedAt) / 1000)
    );
  }

  addItemToInventory(itemId, quantity = 1) {
    if (!itemId || quantity <= 0) return;
    const def = resolveItemDef(itemId);

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
          ? this.getEffectivePlayerMeleeDamage()
          : this.getEffectivePlayerRangedDamage();
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
    const item = this.inventory[index];
    if (!item) return;
    const def = resolveItemDef(item.itemId);
    if (def.archetypes && def.archetypes.length > 0) {
      const heroArchetype = resolveHeroStatsOverride(
        this.heroSpriteKey,
      )?.archetype;
      if (!heroArchetype || !def.archetypes.includes(heroArchetype)) {
        this.showLootToast("Cet objet ne convient pas à ton archétype");
        return;
      }
    }
    if (def.unlockLevel && this.playerLevel < def.unlockLevel) {
      this.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
      return;
    }
    if (def.category === "ammo") {
      this.equipped[def.slot] = item.itemId;
      const oldMaxHp = this.playerMaxHp;
      this.recalculatePlayerStats();
      this.adjustHpAfterMaxHpChange(oldMaxHp);
      this.events.emit("equipment-updated", { ...this.equipped });
      this.persistProgress();
      return;
    }

    if (def.category !== "equipment" || !def.slot) return;

    let targetSlot = def.slot;

    if (targetSlot === "ring") {
      targetSlot = !this.equipped.ring1
        ? "ring1"
        : !this.equipped.ring2
          ? "ring2"
          : "ring1";
    }

    if (targetSlot === "mainHand" && !def.twoHanded) {
      const mainOccupantId = this.equipped.mainHand;
      const mainOccupantDef = mainOccupantId
        ? resolveItemDef(mainOccupantId)
        : null;
      const mainHandHoldsCompatibleWeapon =
        mainOccupantDef && !mainOccupantDef.twoHanded;
      if (mainHandHoldsCompatibleWeapon && !this.equipped.offHand) {
        targetSlot = "offHand";
      }
    }

    const itemsToReturnToInventory = [];
    const previousInTarget = this.equipped[targetSlot];
    if (previousInTarget) itemsToReturnToInventory.push(previousInTarget);

    if (def.twoHanded && targetSlot === "mainHand") {
      const previousOffHand = this.equipped.offHand;
      if (previousOffHand) itemsToReturnToInventory.push(previousOffHand);
      this.equipped.offHand = null;
    }

    if (targetSlot === "offHand") {
      const mainHandItemId = this.equipped.mainHand;
      if (mainHandItemId) {
        const mainHandDef = resolveItemDef(mainHandItemId);
        if (mainHandDef.twoHanded) {
          itemsToReturnToInventory.push(mainHandItemId);
          this.equipped.mainHand = null;
        }
      }
    }

    this.inventory.splice(index, 1);
    for (const returnedId of itemsToReturnToInventory) {
      this.inventory.push({ itemId: returnedId, quantity: 1 });
    }
    this.equipped[targetSlot] = item.itemId;

    const oldMaxHp = this.playerMaxHp;
    this.recalculatePlayerStats();
    this.adjustHpAfterMaxHpChange(oldMaxHp);

    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  unequipItem(slot) {
    const itemId = this.equipped[slot];
    if (!itemId) return;
    this.equipped[slot] = null;

    if (slot !== "quiver") {
      this.inventory.push({ itemId, quantity: 1 });
    }

    const oldMaxHp = this.playerMaxHp;
    this.recalculatePlayerStats();
    this.adjustHpAfterMaxHpChange(oldMaxHp);

    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  useConsumable(index) {
    const item = this.inventory[index];
    if (!item) return;
    const def = resolveItemDef(item.itemId);

    if (def.category === "abilityScroll") {
      const abilityDef = resolveAbilityDef(def.grantsAbility);
      const heroArchetype = resolveHeroStatsOverride(
        this.heroSpriteKey,
      )?.archetype;
      if (
        abilityDef.archetypes &&
        abilityDef.archetypes.length > 0 &&
        !abilityDef.archetypes.includes(heroArchetype)
      ) {
        this.showLootToast("Ce parchemin ne convient pas à ton archétype");
        return;
      }
      if (def.unlockLevel && this.playerLevel < def.unlockLevel) {
        this.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
        return;
      }
      if (abilityDef.staminaCost && this.playerMaxStamina <= 0) {
        this.showLootToast(
          "Tu n'as pas de stamina à dépenser pour cette compétence",
        );
        return;
      }
      if (abilityDef.manaCost && this.playerMaxMana <= 0) {
        this.showLootToast(
          "Tu n'as pas de mana à dépenser pour cette compétence",
        );
        return;
      }
      if (this.unlockedAbilities.includes(def.grantsAbility)) {
        this.showLootToast(`Tu connais déjà ${abilityDef.name}`);
        return;
      }

      this.unlockedAbilities.push(def.grantsAbility);
      this.events.emit("abilities-updated", [...this.unlockedAbilities]);
      this.showLootToast(`Compétence apprise : ${abilityDef.name} !`);

      item.quantity -= 1;
      if (item.quantity <= 0) this.inventory.splice(index, 1);

      this.events.emit("inventory-updated", [...this.inventory]);
      this.persistProgress();
      return;
    }

    if (def.category === "recipeScroll") {
      const recipe = resolveCraftingRecipe(def.grantsRecipe);
      if (!recipe) return;
      if (this.unlockedRecipes.includes(recipe.id)) {
        this.showLootToast(`Tu connais déjà la recette : ${recipe.name}`);
        return;
      }

      this.unlockedRecipes.push(recipe.id);
      this.events.emit("recipes-updated", [...this.unlockedRecipes]);
      this.showLootToast(`Recette apprise : ${recipe.name} !`);

      item.quantity -= 1;
      if (item.quantity <= 0) this.inventory.splice(index, 1);

      this.events.emit("inventory-updated", [...this.inventory]);
      this.persistProgress();
      return;
    }

    if (def.category !== "consumable" || !def.effect) return;
    if (def.unlockLevel && this.playerLevel < def.unlockLevel) {
      this.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
      return;
    }

    const now = this.time.now;
    const cooldownKey = `item:${item.itemId}`;
    const readyAt = this.itemCooldowns[cooldownKey] || 0;
    if (now < readyAt) {
      this.showLootToast("Objet en recharge");
      return;
    }
    this.itemCooldowns[cooldownKey] = now + CONSUMABLE_COOLDOWN_MS;
    this.events.emit("hotbar-cooldown-started", {
      key: cooldownKey,
      cooldownMs: CONSUMABLE_COOLDOWN_MS,
      startedAt: Date.now(),
    });

    if (def.effect.heal) {
      this.playerHp = Math.min(
        this.playerMaxHp,
        this.playerHp + def.effect.heal,
      );
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });
      this.showDamageNumber(this.hero, def.effect.heal, "#44ff44", "+");
    }

    if (def.effect.mana) {
      this.playerMana = Math.min(
        this.playerMaxMana,
        this.playerMana + def.effect.mana,
      );
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(index, 1);

    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  async persistProgressAsync() {
    if (!this.currentSeed) return;

    try {
      const currentFloorTiles = [];
      if (this.fogState?.state) {
        for (let y = 0; y < this.fogState.state.length; y++) {
          for (let x = 0; x < this.fogState.state[y].length; x++) {
            if (this.fogState.state[y][x] !== 0) {
              currentFloorTiles.push(`${x},${y}`);
            }
          }
        }
      }
      const floorFogCacheToSave = {
        ...this.floorFogCache,
        ...(this.currentDepth != null
          ? { [this.currentDepth]: currentFloorTiles }
          : {}),
      };

      const res = await saveProgress(
        this.currentGameId,
        this.currentDepth,
        this.currentSeed,
        this.visitedFloors,
        {
          xp: this.xp,
          level: this.playerLevel,
          playerAttributes: { ...this.playerAttributes },
          unspentAttributePoints: this.unspentAttributePoints,
          hp: this.playerHp,
          mana: this.playerMana,
          heroId: this.heroSpriteKey,
          currentFloorKills: this.currentFloorKills,
          currentFloorOpenedChests: this.currentFloorOpenedChests,
          currentFloorLootSeed: this.currentFloorLootSeed,
          quests: this.quests,
          inventory: this.inventory,
          hotbarSlots: this.hotbarSlots,
          unlockedRecipes: this.unlockedRecipes,
          summons: this.summons.map((s) => ({
            spriteKey: s.spriteKey,
            hp: s.hp,
            maxHp: s.maxHp,
            damage: s.damage,
            defense: s.defense,
            damageType: s.damageType,
            resistances: s.resistances,
            persistent: s.persistent,
            sourceAbilityId: s.sourceAbilityId,
            remainingMs: s.expiresAt
              ? Math.max(0, s.expiresAt - this.time.now)
              : null,
          })),
          furyKillCount: this.furyKillCount,
          unlockedAbilities: this.unlockedAbilities,
          equipped: this.equipped,
          discoveredLandmarks: this.discoveredLandmarks,
          timePlayedSeconds: this.getTotalTimePlayed(),
          floorFogCache: floorFogCacheToSave,
          playerPosition: this.lastPlayerTile,
        },
      );

      if (res && res.gameId) this.currentGameId = res.gameId;
    } catch (err) {
      console.warn("[MainScene] echec de sauvegarde", err);
    }
  }

  persistProgress() {
    this.persistProgressAsync();
  }

  async saveAndQuit() {
    await this.persistProgressAsync();
    this.events.emit("quit-to-menu");
  }

  /**
   * Compose une texture de tileset a 4 coins (identite d'ordre - meme
   * WALL_CORNER_INDEX_TO_FRAME que Desert) a partir d'une spritesheet
   * source generique - reutilisable pour tout tileset partageant EXACTEMENT
   * la meme disposition de sprites (juste une teinte differente), comme
   * Hills vis-a-vis de Desert.
   */
  composeCornerAutotileTexture(
    grid,
    sourceSpritesheet,
    cacheKeySuffix,
    cornerTable = WALL_CORNER_INDEX_TO_FRAME,
    floorTileId = 113,
  ) {
    const phaserTilesetKey = `${cacheKeySuffix}-autotile-composed`;
    if (this.textures.exists(phaserTilesetKey))
      this.textures.remove(phaserTilesetKey);

    const SLOT_COUNT = 17;
    const composedTex = this.textures.createCanvas(
      phaserTilesetKey,
      TILE_SIZE * SLOT_COUNT,
      TILE_SIZE,
    );
    const cctx = composedTex.getContext();
    cctx.imageSmoothingEnabled = false;
    const sourceImg = this.textures.get(sourceSpritesheet.key).getSourceImage();
    const SOURCE_COLS = 16;

    const drawSourceTileAt = (tileid, slotIndex) => {
      const sx = (tileid % SOURCE_COLS) * 16;
      const sy = Math.floor(tileid / SOURCE_COLS) * 16;
      const floorSx = (floorTileId % SOURCE_COLS) * 16;
      const floorSy = Math.floor(floorTileId / SOURCE_COLS) * 16;
      cctx.drawImage(
        sourceImg,
        floorSx,
        floorSy,
        16,
        16,
        slotIndex * TILE_SIZE,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
      cctx.drawImage(
        sourceImg,
        sx,
        sy,
        16,
        16,
        slotIndex * TILE_SIZE,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
    };

    drawSourceTileAt(floorTileId, 0);
    for (let bitmask = 0; bitmask < 16; bitmask++) {
      drawSourceTileAt(cornerTable[bitmask], bitmask + 1);
    }
    composedTex.refresh();

    const renderGrid = Array.from({ length: grid.length }, () =>
      new Array(grid[0].length).fill(0),
    );
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] === 1) {
          renderGrid[y][x] = computeWallCornerIndex(grid, x, y) + 1;
        }
      }
    }

    return { phaserTilesetKey, renderGrid };
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
  ) {
    if (this.fogState?.state && this.currentDepth != null) {
      const discoveredTiles = [];
      for (let y = 0; y < this.fogState.state.length; y++) {
        for (let x = 0; x < this.fogState.state[y].length; x++) {
          if (this.fogState.state[y][x] !== 0)
            discoveredTiles.push(`${x},${y}`);
        }
      }
      this.floorFogCache[this.currentDepth] = discoveredTiles;
    }

    this.events.emit("level-loading", { depth });
    const effectiveLootSeed = lootSeed || `${Date.now()}-${Math.random()}`;
    this.currentFloorLootSeed = effectiveLootSeed;

    let data;
    try {
      data = await fetchLevel(depth, seed, effectiveLootSeed);
    } catch (err) {
      this.events.emit("level-load-error", { depth, error: err.message });
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
      tileset,
    } = data;

    const effectiveSavedFogState =
      savedFogState || this.floorFogCache[depth] || null;

    this.currentDepth = depth;
    this.currentBiomeId = data.biome;
    this.currentSeed = data.seed;
    if (!this.discoveredLandmarks[depth]) {
      this.discoveredLandmarks[depth] = {
        exitTile: exitTile ? { ...exitTile } : null,
        exitDiscovered: false,

        upstairsTile: upstairsTile ? { ...upstairsTile } : null,
        upstairsDiscovered: false,

        questNpcs: {},
      };
    } else {
      this.discoveredLandmarks[depth].exitTile = exitTile
        ? { ...exitTile }
        : null;

      this.discoveredLandmarks[depth].upstairsTile = upstairsTile
        ? { ...upstairsTile }
        : null;
    }
    this.fogGrid = grid;
    this.currentFloorKills = [...killedIndices];
    this.currentFloorOpenedChests = [...openedChestIndices];
    this.bossData = boss || null;
    this.travelHubTile = travelHubTile || null;
    this.shopData = shop || null;
    this.bossDoorTile = bossDoorTile || null;
    this.bossRoomOpen = false;
    this.bossAlive = this.bossData ? true : null;

    if (!this.visitedFloors.find((f) => f.depth === depth)) {
      this.visitedFloors.push({ depth, seed: data.seed });
    }

    this.levelColliders.forEach((c) => c.destroy());
    this.levelColliders = [];

    if (this.layer) {
      this.layer.destroy();
      this.layer = null;
    }
    if (this.fogLayer) {
      this.fogLayer.destroy();
      this.fogLayer = null;
    }
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
    if (this.hero) {
      this.hero.destroy();
      this.hero = null;
    }
    if (this.exitMarker) {
      this.exitMarker.destroy();
      this.exitMarker = null;
    }
    if (this.upstairsMarker) {
      this.upstairsMarker.destroy();
      this.upstairsMarker = null;
    }
    if (this.bossDoorMarker) {
      this.bossDoorMarker.destroy();
      this.bossDoorMarker = null;
    }
    if (this.travelHubMarker) {
      this.travelHubMarker.destroy();
      this.travelHubMarker = null;
    }
    if (this.shopMarker) {
      this.shopMarker.destroy();
      this.shopMarker = null;
    }
    if (this.questNpcs) {
      this.questNpcs.forEach((n) => n.sprite.destroy());
    }
    this.questNpcs = [];
    if (this.ambientNpcs) {
      this.ambientNpcs.forEach((n) => n.sprite.destroy());
    }
    this.ambientNpcs = [];
    this.activeTalkingNpc = null;
    if (this.chests) {
      this.chests.forEach((c) => c.sprite.destroy());
    }
    this.chests = [];
    this.nextLootChestId = 0;
    this.dialogOpen = false;
    this.gamePaused = false;
    this.pauseReasons.clear();
    this.enemies.forEach((e) => e.sprite.destroy());
    if (this.enemyGroup) this.enemyGroup.clear(false, false);
    this.enemies = [];
    this.projectiles.forEach((p) => p.sprite.destroy());
    this.projectiles = [];
    this.enemyProjectiles.forEach((p) => p.sprite.destroy());
    this.enemyProjectiles = [];
    this.abilityProjectiles.forEach((p) => p.sprite.destroy());
    this.abilityProjectiles = [];
    if (this.summonGroup) this.summonGroup.clear(false, false);
    const persistentSummons = this.summons.filter((s) => s.persistent);
    this.summons.forEach((s) => {
      if (!s.persistent) s.sprite.destroy();
    });
    this.summons = [];
    this.playerStatusEffects = [];
    this.pendingWeaponImbue = null;
    this.zones.forEach((z) => z.sprite.destroy());
    this.zones = [];
    this.traps.forEach((t) => t.sprite.destroy());
    this.traps = [];
    this.boomerangs.forEach((b) => b.sprite.destroy());
    this.boomerangs = [];
    this.stealthUntil = 0;
    this.riposteUntil = 0;
    this.parryUntil = 0;
    this.visionBonusUntil = 0;

    this.playerHp =
      typeof hpOverride === "number"
        ? Math.min(hpOverride, this.playerMaxHp)
        : Math.min(this.playerHp, this.playerMaxHp);
    this.isDead = false;
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

    const worldW = grid[0].length * TILE_SIZE;
    const worldH = grid.length * TILE_SIZE;

    const useRealAutotile =
      tileset === "desert" ||
      tileset === "hills" ||
      tileset === "snow" ||
      tileset === "darkwoods" ||
      tileset === "darkwoods2" ||
      tileset === "standardFields2" ||
      tileset === "desertMountain2" ||
      tileset === "desertMountain3" ||
      tileset === "desert2";
    const useDungeon1Autotile = tileset === "dungeon1";
    const useFortress1Autotile = tileset === "fortress1";

    let phaserTilesetKey;
    let renderGrid;
    let dungeon1FloorFrameValue;

    if (useFortress1Autotile) {
      phaserTilesetKey = FORTRESS_AUTOTILE_SPRITESHEET.key;

      renderGrid = Array.from({ length: grid.length }, (_, y) =>
        new Array(grid[0].length).fill(0).map((_, x) => {
          const isWall = grid[y][x] === WALL;
          if (isWall) {
            const mask = computeMask(x, y, (nx, ny) => grid[ny]?.[nx] === WALL);
            return fortressAutotileFrame(FORTRESS1_TILESET.roles.wall, mask);
          }
          const mask = computeMask(x, y, (nx, ny) => grid[ny]?.[nx] !== WALL);
          return fortressAutotileFrame(FORTRESS1_TILESET.roles.floor, mask);
        }),
      );
    } else if (useDungeon1Autotile) {
      phaserTilesetKey = DUNGEON_AUTOTILE_SPRITESHEET.key;
      dungeon1FloorFrameValue = floorFrame(DUNGEON1_TILESET.roles.floor);

      renderGrid = Array.from({ length: grid.length }, () =>
        new Array(grid[0].length).fill(dungeon1FloorFrameValue),
      );
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          if (grid[y][x] === WALL) {
            renderGrid[y][x] = floorFrame(DUNGEON1_TILESET.roles.wall);
          }
        }
      }
    } else if (tileset === "desert") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DESERT_AUTOTILE_SPRITESHEET,
        "desert",
        WALL_CORNER_INDEX_TO_FRAME,
        17, // sol assorti a la montagne 1 - explicite maintenant, meme si c'etait deja la valeur par defaut
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "desertMountain2") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DESERT_AUTOTILE_SPRITESHEET,
        "desert-mountain2",
        WALL_CORNER_INDEX_TO_FRAME_MOUNTAIN2,
        20, // <-- a remplacer par le vrai numero de sol assorti a montagne2, une fois identifie
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "desertMountain3") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DESERT_AUTOTILE_SPRITESHEET,
        "desert-mountain3",
        WALL_CORNER_INDEX_TO_FRAME_MOUNTAIN3,
        65, // <-- pareil, a confirmer
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "desert2") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DESERT_AUTOTILE_SPRITESHEET,
        "desert2",
        WALL_CORNER_INDEX_TO_FRAME_DESERT2,
        17,
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "hills") {
      const result = this.composeCornerAutotileTexture(
        grid,
        HILLS_AUTOTILE_SPRITESHEET,
        "hills",
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "snow") {
      const result = this.composeCornerAutotileTexture(
        grid,
        SNOW_AUTOTILE_SPRITESHEET,
        "snow",
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "darkwoods") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DARKWOODS_AUTOTILE_SPRITESHEET,
        "darkwoods",
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "darkwoods2") {
      const result = this.composeCornerAutotileTexture(
        grid,
        DARKWOODS2_AUTOTILE_SPRITESHEET,
        "darkwoods2",
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else if (tileset === "standardFields2") {
      const result = this.composeCornerAutotileTexture(
        grid,
        STANDARD_FIELDS2_AUTOTILE_SPRITESHEET,
        "standardFields2",
      );
      phaserTilesetKey = result.phaserTilesetKey;
      renderGrid = result.renderGrid;
    } else {
      const colors = TILESET_COLORS[tileset] || TILESET_COLORS.cave;
      phaserTilesetKey = "tiles-" + tileset;
      if (this.textures.exists(phaserTilesetKey))
        this.textures.remove(phaserTilesetKey);
      const canvasTex = this.textures.createCanvas(
        phaserTilesetKey,
        TILE_SIZE * 2,
        TILE_SIZE,
      );
      const ctx = canvasTex.getContext();

      const tileImages = TILE_IMAGE_REGISTRY[tileset];
      const hasRealFloor =
        tileImages &&
        tileImages.floorKey &&
        this.textures.exists(tileImages.floorKey);
      const hasRealWall =
        tileImages &&
        tileImages.wallKey &&
        this.textures.exists(tileImages.wallKey);

      if (hasRealFloor) {
        ctx.drawImage(
          this.textures.get(tileImages.floorKey).getSourceImage(),
          0,
          0,
          TILE_SIZE,
          TILE_SIZE,
        );
      } else {
        ctx.fillStyle = Phaser.Display.Color.IntegerToColor(colors.floor).rgba;
        ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      }
      if (hasRealWall) {
        ctx.drawImage(
          this.textures.get(tileImages.wallKey).getSourceImage(),
          TILE_SIZE,
          0,
          TILE_SIZE,
          TILE_SIZE,
        );
      } else {
        ctx.fillStyle = Phaser.Display.Color.IntegerToColor(colors.wall).rgba;
        ctx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      }
      canvasTex.refresh();

      renderGrid = grid;
    }

    this.map = this.make.tilemap({
      data: renderGrid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const phaserTileset = this.map.addTilesetImage(
      phaserTilesetKey,
      phaserTilesetKey,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    );
    this.layer = this.map.createLayer(0, phaserTileset, 0, 0);

    if (useFortress1Autotile) {
      const wallRowStart = FORTRESS1_TILESET.roles.wall * COLUMNS_PER_ROW;
      this.layer.setCollisionBetween(wallRowStart, wallRowStart + 46, true);
    } else if (useDungeon1Autotile) {
      this.layer.setCollisionByExclusion([dungeon1FloorFrameValue]);
    } else if (useRealAutotile) {
      this.layer.setCollisionByExclusion([0]);
    } else {
      this.layer.setCollision(WALL);
    }
    this.layer.setDepth(0);

    const startPosition = savedPlayerPosition || playerSpawn;

    const heroSprite = SPRITE_REGISTRY[this.heroSpriteKey];

    this.hero = this.physics.add.sprite(
      startPosition.x * TILE_SIZE + TILE_SIZE / 2,
      startPosition.y * TILE_SIZE + TILE_SIZE / 2,
      heroSprite.key,
      heroSprite.animations.idleDown,
    );

    this.lastPlayerTile = {
      x: startPosition.x,
      y: startPosition.y,
    };
    for (const ps of persistentSummons) {
      ps.sprite = this.spawnSummonSprite(
        ps.spriteKey,
        playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
        playerSpawn.y * TILE_SIZE + TILE_SIZE / 2,
      );
      this.summons.push(ps);
    }
    this.hero.setScale(heroSprite.scale);
    this.hero.setCollideWorldBounds(true);
    const hb = heroSprite.hitbox;
    this.hero.body
      .setSize(hb.width, hb.height)
      .setOffset(hb.offsetX, hb.offsetY);
    this.hero.setDepth(10);
    this.hero.anims.play(this.heroSpriteKey + "-idle-down");
    this.lastDir = "down";
    this.lastAimVector = { x: 0, y: 1 };

    this.levelColliders.push(this.physics.add.collider(this.hero, this.layer));
    this.levelColliders.push(
      this.physics.add.collider(this.enemyGroup, this.layer),
    );
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);

    if (this.registry.get("isMobile")) {
      const visionDiameterPx = this.playerVisionRadius * TILE_SIZE * 2;
      const targetFraction = 0.85;
      const smallerDimension = Math.min(
        this.cameras.main.width,
        this.cameras.main.height,
      );
      this.cameras.main.setZoom(
        (smallerDimension * targetFraction) / visionDiameterPx,
      );
    }

    this.exitTile = exitTile;
    this.exitMarker = this.add.image(
      exitTile.x * TILE_SIZE + TILE_SIZE / 2,
      exitTile.y * TILE_SIZE + TILE_SIZE / 2,
      "stair_up",
    );
    this.exitMarker.setDepth(2);

    this.upstairsTile = upstairsTile;
    if (upstairsTile) {
      this.upstairsMarker = this.add.image(
        upstairsTile.x * TILE_SIZE + TILE_SIZE / 2,
        upstairsTile.y * TILE_SIZE + TILE_SIZE / 2,
        "stair_down",
      );
      this.upstairsMarker.setDepth(2);
    }

    if (this.bossDoorTile) {
      this.bossDoorMarker = this.add.circle(
        this.bossDoorTile.x * TILE_SIZE + TILE_SIZE / 2,
        this.bossDoorTile.y * TILE_SIZE + TILE_SIZE / 2,
        10,
        0x6a1b9a,
      );
      this.bossDoorMarker.setDepth(2);
      this.bossDoorMarker.setStrokeStyle(2, 0xffffff);
      this.tweens.add({
        targets: this.bossDoorMarker,
        scale: { from: 0.7, to: 1.15 },
        alpha: { from: 0.6, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    if (this.travelHubTile) {
      this.travelHubMarker = this.add.circle(
        this.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2,
        this.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2,
        10,
        0x1ba8c9,
      );
      this.travelHubMarker.setDepth(2);
      this.travelHubMarker.setStrokeStyle(2, 0xffffff);
      this.tweens.add({
        targets: this.travelHubMarker,
        scale: { from: 0.7, to: 1.15 },
        alpha: { from: 0.6, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    if (this.shopData) {
      this.shopMarker = this.add.circle(
        this.shopData.x * TILE_SIZE + TILE_SIZE / 2,
        this.shopData.y * TILE_SIZE + TILE_SIZE / 2,
        10,
        0xd4af37,
      );
      this.shopMarker.setDepth(2);
      this.shopMarker.setStrokeStyle(2, 0xffffff);
      this.tweens.add({
        targets: this.shopMarker,
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

      if (this.currentFloorKills.includes(spawnIndex)) return;

      const { entry: enemySprite, spriteKey } = resolveEnemySprite(
        enemyData.type,
      );

      const sprite = this.enemyGroup.create(
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

      this.enemies.push({
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
        statusEffects: [],
        drops: enemyData.drops || [],
        attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      });
    });

    const chestVariantRng = createRng(`${this.currentSeed}-chest-variants`);
    (chests || []).forEach((chestData, index) => {
      const alreadyOpened = this.currentFloorOpenedChests.includes(index);
      const variant =
        CHEST_VARIANTS[Math.floor(chestVariantRng() * CHEST_VARIANTS.length)];
      const sprite = this.add.sprite(
        chestData.x * TILE_SIZE + TILE_SIZE / 2,
        chestData.y * TILE_SIZE + TILE_SIZE / 2,
        CHEST_SPRITESHEET.key,
        alreadyOpened ? variant.openFrame : variant.closedFrame,
      );
      sprite.setDepth(7);
      this.physics.add.existing(sprite, true);
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      if (alreadyOpened) sprite.body.checkCollision.none = true;

      this.chests.push({
        sprite,
        index,
        opened: alreadyOpened,
        loot: chestData.loot,
        x: chestData.x,
        y: chestData.y,
        variant,
      });
    });

    if (data.questNpcs && data.questNpcs.length > 0) {
      this.createQuestNpcs(data.questNpcs);
    }

    if (ambientNpcData && ambientNpcData.length > 0) {
      this.createAmbientNpcs(ambientNpcData);
    }

    this.fogState = createFogState(grid);

    if (effectiveSavedFogState) {
      for (const tile of effectiveSavedFogState) {
        const [x, y] = tile.split(",").map(Number);

        if (
          y >= 0 &&
          y < this.fogState.state.length &&
          x >= 0 &&
          x < this.fogState.state[y].length
        ) {
          this.fogState.state[y][x] = 1;
        }
      }
    }
    this.lastPlayerTile = { x: startPosition.x, y: startPosition.y };

    this.fogDisabled = data.tileset === "town";

    const fogTileset = this.map.addTilesetImage(
      this.fogTilesetKey,
      this.fogTilesetKey,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    );

    this.fogLayer = this.map.createBlankLayer("fog", fogTileset, 0, 0);
    this.fogLayer.fill(0);
    this.fogLayer.setDepth(5);

    if (this.fogDisabled) {
      const allChanges = [];

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
          this.fogState.state[y][x] = 2;
          allChanges.push({ x, y });
        }
      }

      this.applyFogChanges(allChanges);
    } else {
      if (effectiveSavedFogState) {
        for (const tile of effectiveSavedFogState) {
          const [x, y] = tile.split(",").map(Number);

          if (
            y >= 0 &&
            y < this.fogState.state.length &&
            x >= 0 &&
            x < this.fogState.state[y].length
          ) {
            this.fogState.state[y][x] = 1;
            this.fogLayer.putTileAt(1, x, y);
          }
        }
      }

      const initialChanges = this.fogState.update(
        startPosition.x,
        startPosition.y,
        this.getEffectivePlayerVisionRadius(),
      );

      this.applyFogChanges(initialChanges);
    }

    this.events.emit("level-loaded", { depth, biome: data.biome });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("hotbar-updated", [...this.hotbarSlots]);
    this.events.emit("recipes-updated", [...this.unlockedRecipes]);
    this.events.emit("fury-progress", {
      count: this.furyKillCount,
      required: FURY_KILLS_REQUIRED,
    });
    this.events.emit("abilities-updated", [...this.unlockedAbilities]);
    this.events.emit("attributes-updated", {
      attributes: { ...this.playerAttributes },
      unspent: this.unspentAttributePoints,
    });
    this.persistProgress();
  }

  retryLevel() {
    this.playerHp = this.playerMaxHp;
    this.loadLevel(this.currentDepth, "retry-" + Date.now());
  }

  descendStairs() {
    this.goToDepth(this.currentDepth + 1);
  }

  goToDepth(targetDepth) {
    const existing = this.visitedFloors.find((f) => f.depth === targetDepth);
    this.loadLevel(targetDepth, existing ? existing.seed : undefined);
  }

  openTravelHub() {
    this.pauseGame("travelHub");
    const destinations = this.visitedFloors.filter(
      (f) => f.depth !== this.currentDepth,
    );
    this.events.emit("travel-hub", destinations);
  }

  travelToDepth(targetDepth) {
    this.unpauseGame("travelHub");
    this.events.emit("travel-hub", null);
    this.goToDepth(targetDepth);
  }

  closeTravelHub() {
    this.unpauseGame("travelHub");
    this.events.emit("travel-hub", null);
  }

  openShop() {
    this.pauseGame("shop");
    this.events.emit("shop", this.shopData.stock);
  }

  buyItem(shopItemIndex) {
    const shopItem = this.shopData?.stock?.[shopItemIndex];
    if (!shopItem) return;

    const goldEntry = this.inventory.find((i) => i.itemId === "gold");
    const currentGold = goldEntry ? goldEntry.quantity : 0;
    if (currentGold < shopItem.price) return;

    goldEntry.quantity -= shopItem.price;
    if (goldEntry.quantity <= 0)
      this.inventory = this.inventory.filter((i) => i !== goldEntry);

    this.addItemToInventory(shopItem.itemId, 1);
  }

  sellItem(inventoryIndex) {
    const item = this.inventory[inventoryIndex];
    if (!item) return;
    const def = resolveItemDef(item.itemId);
    if (!def.price) return;

    const sellPrice = Math.floor(def.price * SELL_PRICE_RATIO);

    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(inventoryIndex, 1);

    this.addItemToInventory("gold", sellPrice);
  }

  closeShop() {
    this.unpauseGame("shop");
    this.events.emit("shop", null);
  }

  openBossDoor() {
    this.bossRoomOpen = true;

    const { x, y } = this.bossDoorTile;
    this.layer.putTileAt(0, x, y);
    this.fogGrid[y][x] = 0;

    if (this.bossDoorMarker) {
      this.bossDoorMarker.destroy();
      this.bossDoorMarker = null;
    }

    const { entry: bossSprite, spriteKey } = resolveEnemySprite(
      this.bossData.type,
    );
    const sprite = this.enemyGroup.create(
      this.bossData.x * TILE_SIZE + TILE_SIZE / 2,
      this.bossData.y * TILE_SIZE + TILE_SIZE / 2,
      bossSprite.key,
      bossSprite.animations.idleDown,
    );
    sprite.setScale(bossSprite.scale);
    const hb = bossSprite.hitbox;
    sprite.body.setSize(hb.width, hb.height).setOffset(hb.offsetX, hb.offsetY);
    sprite.setDepth(8);
    sprite.anims.play(spriteKey + "-idle-down");

    const behaviorRng = createRng(this.currentSeed + "-boss-behavior");
    const behavior = createEnemyBehavior(
      this.fogGrid,
      { x: this.bossData.x, y: this.bossData.y },
      behaviorRng,
      { guard: 1 },
    );

    this.enemies.push({
      sprite,
      spriteKey,
      spawnIndex: -1,
      isBoss: true,
      archetype: this.bossData.type,
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
      hp: this.bossData.hp,
      maxHp: this.bossData.hp,
      damage: this.bossData.damage,
      defense: this.bossData.defense,
      xpReward: this.bossData.xpReward,
      attackType: this.bossData.attackType || "melee",
      inflictsEffect: this.bossData.inflictsEffect || null,
      statusEffects: [],
      drop: this.bossData.drop || null,
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
    });

    this.events.emit("boss-room-opened");
  }

  pauseGame(reason) {
    const wasAlreadyPaused = this.gamePaused;
    this.pauseReasons.add(reason);
    this.gamePaused = true;
    if (this.hero) this.hero.setVelocity(0, 0);

    if (!wasAlreadyPaused) {
      this.pauseStartedAt = this.time.now;
    }

    for (const enemy of this.enemies) {
      if (enemy.sprite?.body) enemy.sprite.setVelocity(0, 0);
    }
    for (const npc of this.questNpcs || []) {
      if (npc.sprite?.body) npc.sprite.setVelocity(0, 0);
    }
    for (const npc of this.ambientNpcs || []) {
      if (npc.sprite?.body) npc.sprite.setVelocity(0, 0);
    }
    for (const proj of this.projectiles) {
      if (proj.sprite?.body) proj.sprite.setVelocity(0, 0);
    }
    for (const proj of this.enemyProjectiles) {
      if (proj.sprite?.body) proj.sprite.setVelocity(0, 0);
    }
    for (const proj of this.abilityProjectiles || []) {
      if (proj.sprite?.body) proj.sprite.setVelocity(0, 0);
    }
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
    this.events.emit("upstairs-prompt", true);
  }

  confirmGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
    this.goToDepth(this.currentDepth - 1);
  }

  cancelGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
  }

  showExitPrompt() {
    if (this.pauseReasons.has("exit")) return;
    this.pauseGame("exit");
    this.events.emit("exit-prompt", true);
  }

  confirmDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
    this.descendStairs();
  }

  cancelDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
  }

  createQuestNpcs(npcDataArray) {
    const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
      key.startsWith("NPC_town"),
    );
    const spriteRng = createRng(`${this.currentSeed}-quest-npc-sprites`);
    const patrolRng = createRng(`${this.currentSeed}-quest-npc-patrol`);
    this.questNpcs = [];

    let nextReceiverIndex = 0;
    for (const questKey of Object.keys(this.quests)) {
      const giverQs = this.quests[questKey];
      if (giverQs.questId !== "delivery" || giverQs.role !== "giver") continue;
      if (!giverQs.accepted || giverQs.completed || giverQs.receiverKey)
        continue;
      if (giverQs.targetDepth !== this.currentDepth) continue;
      if (nextReceiverIndex >= npcDataArray.length) continue;

      const receiverNpcIndex = nextReceiverIndex++;
      const receiverKey = `${this.currentDepth}-${receiverNpcIndex}`;
      this.quests[receiverKey] = {
        questId: "delivery",
        role: "receiver",
        linkedKey: questKey,
        itemId: giverQs.itemId,
        xpReward: giverQs.xpReward,
        goldReward: giverQs.goldReward,
        accepted: true,
        completed: false,
      };
      giverQs.receiverKey = receiverKey;
    }

    const freshlyCreatedKeys = [];

    for (const npcData of npcDataArray) {
      const questKey = `${this.currentDepth}-${npcData.npcIndex}`;

      const npcSpriteKey =
        npcSpritePool.length > 0
          ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
          : "hero1";
      const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

      const sprite = this.physics.add.sprite(
        npcData.x * TILE_SIZE + TILE_SIZE / 2,
        npcData.y * TILE_SIZE + TILE_SIZE / 2,
        npcSprite.key,
        npcSprite.animations.idleDown,
      );
      sprite.setScale(npcSprite.scale);
      sprite.anims.play(`${npcSpriteKey}-idle-down`);
      sprite.setDepth(9);
      this.levelColliders.push(this.physics.add.collider(sprite, this.layer));
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      );

      const route = pickPatrolRoute(
        this.fogGrid,
        { x: npcData.x, y: npcData.y },
        patrolRng,
      );

      this.questNpcs.push({
        sprite,
        npcIndex: npcData.npcIndex,
        questKey,
        spriteKey: npcSpriteKey,
        lastDir: "down",
        patrolPath: route ? route.path : null,
        patrolIndex: 0,
        patrolDirection: 1,
        talking: false,
      });

      if (!this.quests[questKey]) {
        this.quests[questKey] = {
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

    this.maybeInjectDeliveryQuest(freshlyCreatedKeys);
  }

  maybeInjectDeliveryQuest(eligibleKeys) {
    if (eligibleKeys.length === 0) return;

    const injectRng = createRng(`${this.currentSeed}-delivery-inject`);
    if (injectRng() >= 0.2) return;

    const giverKey =
      eligibleKeys[Math.floor(injectRng() * eligibleKeys.length)];

    const firstFutureTown = Math.floor(this.currentDepth / 10) * 10 + 10;
    const futureCandidates = [];
    for (let d = firstFutureTown; d <= 100; d += 10) {
      if (!this.visitedFloors.find((f) => f.depth === d))
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
      targetDepth = this.currentDepth;
    } else {
      return;
    }

    const goldReward = 20 + Math.floor(injectRng() * 21);

    const giverQs = this.quests[giverKey];
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
      const otherKeys = eligibleKeys.filter((k) => k !== giverKey);
      const receiverKey = otherKeys[Math.floor(injectRng() * otherKeys.length)];
      this.quests[receiverKey] = {
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

  createAmbientNpcs(npcDataArray) {
    const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
      key.startsWith("NPC_town"),
    );
    const spriteRng = createRng(`${this.currentSeed}-ambient-npc-sprites`);
    const greetingRng = createRng(`${this.currentSeed}-ambient-npc-greetings`);
    const patrolRng = createRng(`${this.currentSeed}-ambient-npc-patrol`);
    this.ambientNpcs = [];

    for (const npcData of npcDataArray) {
      const npcSpriteKey =
        npcSpritePool.length > 0
          ? npcSpritePool[Math.floor(spriteRng() * npcSpritePool.length)]
          : "hero1";
      const npcSprite = SPRITE_REGISTRY[npcSpriteKey];

      const sprite = this.physics.add.sprite(
        npcData.x * TILE_SIZE + TILE_SIZE / 2,
        npcData.y * TILE_SIZE + TILE_SIZE / 2,
        npcSprite.key,
        npcSprite.animations.idleDown,
      );
      sprite.setScale(npcSprite.scale);
      sprite.anims.play(`${npcSpriteKey}-idle-down`);
      sprite.setDepth(9);
      this.levelColliders.push(this.physics.add.collider(sprite, this.layer));
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      );

      const route = pickPatrolRoute(
        this.fogGrid,
        { x: npcData.x, y: npcData.y },
        patrolRng,
      );
      const greeting =
        AMBIENT_NPC_GREETINGS[
          Math.floor(greetingRng() * AMBIENT_NPC_GREETINGS.length)
        ];

      this.ambientNpcs.push({
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

  openQuestDialog(npc) {
    const questKey = npc.questKey;
    this.dialogOpen = true;
    this.pauseGame("dialog");
    this.activeDialogQuestKey = questKey;
    this.activeTalkingNpc = npc;
    npc.talking = true;
    const qs = this.quests[questKey];
    if (!qs) return;
    const custom = qs.dialogText || {};
    let text;
    let canAccept = false;
    let canTurnIn = false;

    if (qs.questId === "obtainItem") {
      const itemName = resolveItemDef(qs.targetItemId).name;
      const requiredQty = qs.targetQuantity || 1;
      const haveQty = this.inventory
        .filter((i) => i.itemId === qs.targetItemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      const hasEnough = haveQty >= requiredQty;
      const qtyLabel =
        requiredQty > 1 ? `${requiredQty} ${itemName}` : itemName;

      if (qs.completed) {
        text = custom.complete || `Merci pour ${qtyLabel} !`;
      } else if (qs.accepted && hasEnough) {
        text =
          custom.progress ||
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
        text = custom.offer || `Peux-tu me rapporter ${qtyLabel} ?${bossHint}`;
        canAccept = true;
      }
    } else if (qs.questId === "defeatBoss") {
      const bossName = resolveEnemyDisplayName(qs.targetBossType);
      if (qs.completed) {
        text = custom.complete || `Merci d'avoir vaincu ${bossName} !`;
      } else if (qs.accepted && qs.bossDefeated) {
        text =
          custom.progress ||
          `Tu l'as vaincu ! Reviens me voir pour ta récompense.`;
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
          const hasItem = this.inventory.some((i) => i.itemId === qs.itemId);
          if (hasItem) {
            text =
              custom.progress ||
              `Tu as mon colis ! Merci de me l'avoir apporté.`;
            canTurnIn = true;
          } else {
            text = custom.progress || `J'attends toujours mon colis...`;
          }
        }
      }
    } else if (qs.completed) {
      const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
      text = custom.complete || `Merci d'avoir tué ces ${enemyName} pour moi !`;
    } else if (qs.accepted && qs.killCount >= qs.target) {
      text =
        custom.progress || `C'est fait ! Reviens me voir pour ta récompense.`;
      canTurnIn = true;
    } else if (qs.accepted) {
      const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
      text =
        custom.progress ||
        `Progression : ${qs.killCount} / ${qs.target} ${enemyName} tués. Reviens me voir une fois terminé !`;
    } else {
      const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
      text =
        custom.offer || `Peux-tu tuer ${qs.target} ${enemyName} pour toi ?`;
      canAccept = true;
    }
    this.events.emit("npc-dialog", { text, canAccept, canTurnIn });
  }

  acceptQuest() {
    const qs = this.quests[this.activeDialogQuestKey];
    if (!qs) return;
    qs.accepted = true;
    if (qs.questId === "delivery" && qs.role === "giver") {
      this.addItemToInventory(qs.itemId, 1);
    }
    this.dialogOpen = false;
    this.unpauseGame("dialog");
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
    this.events.emit("quests-updated", { ...this.quests });
    this.persistProgress();
  }

  turnInQuest() {
    const qs = this.quests[this.activeDialogQuestKey];
    if (!qs || qs.completed) return;
    if (
      qs.questId !== "obtainItem" &&
      qs.questId !== "defeatBoss" &&
      qs.questId !== "killEnemies" &&
      !(qs.questId === "delivery" && qs.role === "receiver")
    )
      return;

    if (qs.questId === "obtainItem") {
      const requiredQty = qs.targetQuantity || 1;
      const haveQty = this.inventory
        .filter((i) => i.itemId === qs.targetItemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (haveQty < requiredQty) return;

      let remaining = requiredQty;
      for (let i = this.inventory.length - 1; i >= 0 && remaining > 0; i--) {
        const entry = this.inventory[i];
        if (entry.itemId !== qs.targetItemId) continue;
        const take = Math.min(entry.quantity, remaining);
        entry.quantity -= take;
        remaining -= take;
        if (entry.quantity <= 0) this.inventory.splice(i, 1);
      }
    } else if (qs.questId === "defeatBoss") {
      if (!qs.bossDefeated) return;
    } else if (qs.questId === "killEnemies") {
      if (qs.killCount < qs.target) return;
    } else {
      const itemIndex = this.inventory.findIndex((i) => i.itemId === qs.itemId);
      if (itemIndex === -1) return;

      const item = this.inventory[itemIndex];
      item.quantity -= 1;
      if (item.quantity <= 0) this.inventory.splice(itemIndex, 1);

      const giverQs = this.quests[qs.linkedKey];
      if (giverQs) giverQs.completed = true;
    }

    qs.completed = true;
    this.xp += qs.xpReward;
    this.events.emit("xp-changed", { xp: this.xp });

    this.dialogOpen = false;
    this.unpauseGame("dialog");
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
    this.events.emit("quests-updated", { ...this.quests });

    if (qs.questId === "killEnemies") {
      if (qs.itemReward) {
        this.addItemToInventory(qs.itemReward.itemId, qs.itemReward.quantity);
        const itemDef = resolveItemDef(qs.itemReward.itemId);
        this.showLootToast(`Reçu : ${itemDef.name} x${qs.itemReward.quantity}`);
      }
    } else {
      this.addItemToInventory("gold", qs.goldReward);
    }
  }

  openAmbientDialog(npc) {
    this.dialogOpen = true;
    this.pauseGame("dialog");
    this.activeTalkingNpc = npc;
    npc.talking = true;
    this.events.emit("npc-dialog", {
      text: npc.greetingText,
      canAccept: false,
      canTurnIn: false,
    });
  }

  releaseTalkingNpc() {
    if (this.activeTalkingNpc) {
      this.activeTalkingNpc.talking = false;
      this.activeTalkingNpc = null;
    }
  }

  closeDialog() {
    this.dialogOpen = false;
    this.unpauseGame("dialog");
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
  }

  update(time, delta) {
    if (!this.hero || this.isDead) return;
    if (this.gamePaused) return;
    this.updateRegen(delta);

    if (this.dashState) {
      this.updateShieldBash();
    } else {
      const speed = this.getEffectivePlayerMoveSpeed();
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
          this.getEffectivePlayerVisionRadius(),
        );
        this.applyFogChanges(changes);
      }
      this.updateEnemyDecisions(tileX, tileY);

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

    this.updateEnemyMovement();
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.fury) ||
      this.touchFuryRequested
    ) {
      this.touchFuryRequested = false;
      this.useFury();
    }

    this.updateEnemyMovement();

    for (const chest of this.chests) {
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
    this.updateEnemyAttacks(now);
    this.updateProjectiles();
    this.updateEnemyProjectiles();
    this.updateAbilityProjectiles();
    this.updateStatusEffects(now);
    this.updateNpcMovement(this.questNpcs);
    this.updateNpcMovement(this.ambientNpcs);
    this.updateSummons(this.time.now);
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
    this.drawHpBars();

    if (this.playerHp <= 0 && !this.isDead) {
      this.isDead = true;
      this.hero.setVelocity(0, 0);
      this.hero.anims.play(this.heroSpriteKey + "-idle-" + this.lastDir, true);
      this.events.emit("game-over", { xp: this.xp, depth: this.currentDepth });
      this.persistProgress();
    }
  }

  getQuestNpcMinimapData() {
    if (!this.questNpcs || !this.fogState?.state) return [];

    const state = this.fogState.state;
    const landmarks = this.discoveredLandmarks?.[this.currentDepth];

    if (!landmarks) return [];

    if (!landmarks.questNpcs) {
      landmarks.questNpcs = {};
    }

    for (const npc of this.questNpcs) {
      if (npc.npcIndex === undefined || !npc.sprite) continue;

      if (landmarks.questNpcs[npc.npcIndex]?.discovered) {
        continue;
      }

      const x = Math.floor(npc.sprite.x / TILE_SIZE);
      const y = Math.floor(npc.sprite.y / TILE_SIZE);

      if (x < 0 || y < 0 || y >= state.length || x >= state[0].length) {
        continue;
      }

      if (state[y][x] >= 1) {
        landmarks.questNpcs[npc.npcIndex] = {
          x,
          y,
          discovered: true,
        };
      }
    }

    return Object.entries(landmarks.questNpcs)
      .filter(([, npc]) => npc?.discovered)
      .map(([npcIndex, npc]) => ({
        npcIndex: Number(npcIndex),
        x: npc.x,
        y: npc.y,
      }));
  }

  getSummonMinimapData() {
    return this.summons.map((s) => ({
      x: Math.floor(s.sprite.x / TILE_SIZE),
      y: Math.floor(s.sprite.y / TILE_SIZE),
    }));
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

    const questNpcs = this.getQuestNpcMinimapData();
    const summons = this.getSummonMinimapData();

    this.events.emit("fog-changed", {
      grid: this.fogGrid,
      fogState: this.fogState.state,
      playerTile: this.lastPlayerTile,
      exitTile: this.exitTile,
      upstairsTile: this.upstairsTile,
      questNpcs,
      summons,
    });
  }

  isPlayerBehindEnemy(enemy, ex, ey, playerTileX, playerTileY) {
    const facing = ENEMY_DIR_VECTORS[enemy.lastDir] || ENEMY_DIR_VECTORS.down;
    const dx = playerTileX - ex;
    const dy = playerTileY - ey;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return false;
    const dot = (dx / dist) * facing.x + (dy / dist) * facing.y;
    return dot < DETECTION_BEHIND_DOT_THRESHOLD;
  }

  updateEnemyDecisions(playerTileX, playerTileY) {
    const grid = this.fogGrid;
    const width = grid[0].length,
      height = grid.length;
    const isStealthed = this.time.now < this.stealthUntil;

    for (const enemy of this.enemies) {
      if (isStealthed && enemy.state !== "chase") continue;

      const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
      const ey = Math.floor(enemy.sprite.y / TILE_SIZE);

      let targetTileX = playerTileX;
      let targetTileY = playerTileY;
      let targetType = "player";
      let targetRef = null;
      let bestDist = Math.hypot(ex - playerTileX, ey - playerTileY);

      for (const summon of this.summons) {
        const sx = Math.floor(summon.sprite.x / TILE_SIZE);
        const sy = Math.floor(summon.sprite.y / TILE_SIZE);
        const d = Math.hypot(ex - sx, ey - sy);
        if (d < bestDist) {
          bestDist = d;
          targetTileX = sx;
          targetTileY = sy;
          targetType = "summon";
          targetRef = summon;
        }
      }

      enemy.chaseTargetType = targetType;
      enemy.chaseTargetRef = targetRef;

      const distanceToPlayer = bestDist;
      const losClear = hasClearLineOfSight(
        grid,
        width,
        height,
        ex,
        ey,
        targetTileX,
        targetTileY,
      );
      const arrivedAtHome =
        Math.hypot(ex - enemy.home.x, ey - enemy.home.y) < 1;
      const isPlayerBehind =
        targetType === "player"
          ? this.isPlayerBehindEnemy(enemy, ex, ey, playerTileX, playerTileY)
          : false;

      const nextState = decideNextState(enemy.state, {
        distanceToPlayer,
        losClear,
        aggroRadius: enemy.aggroRadius,
        arrivedAtHome,
        isPlayerBehind,
      });

      if (nextState === "home") {
        enemy.state = enemy.type;
        enemy.patrolIndex = 0;
        enemy.patrolDirection = 1;
        enemy.path = null;
        continue;
      }

      enemy.state = nextState;

      if (nextState === "chase") {
        const path = findPath(
          grid,
          { x: ex, y: ey },
          { x: targetTileX, y: targetTileY },
        );
        enemy.path = path;
        enemy.pathIndex = path ? 1 : 0;
      } else if (nextState === "returning") {
        const path = findPath(grid, { x: ex, y: ey }, enemy.home);
        enemy.path = path;
        enemy.pathIndex = path ? 1 : 0;
      }
    }
  }

  updateEnemyMovement() {
    for (const enemy of this.enemies) {
      enemy.visible = this.isEnemyVisible(enemy);
      enemy.sprite.setVisible(enemy.visible);

      if (this.time.now < (enemy.attackAnimUntil || 0)) {
        continue;
      }

      if (this.isEnemyStunned(enemy) || this.isEnemyRooted(enemy)) {
        enemy.sprite.setVelocity(0, 0);
        enemy.sprite.anims.play(
          enemy.spriteKey + "-idle-" + enemy.lastDir,
          true,
        );
        continue;
      }

      if (enemy.state === "chase" || enemy.state === "returning") {
        let targetType = enemy.chaseTargetType;
        let targetRef = enemy.chaseTargetRef;
        if (
          targetType === "summon" &&
          (!targetRef || !this.summons.includes(targetRef))
        ) {
          targetType = "player";
          targetRef = null;
        }
        const targetX =
          targetType === "summon" ? targetRef.sprite.x : this.hero.x;
        const targetY =
          targetType === "summon" ? targetRef.sprite.y : this.hero.y;

        const distToTarget = Math.hypot(
          targetX - enemy.sprite.x,
          targetY - enemy.sprite.y,
        );
        const isRanged = enemy.attackType === "ranged";
        const stopDistance = isRanged
          ? ENEMY_RANGED_STOP_DISTANCE
          : ENEMY_STOP_DISTANCE;
        const stopForMelee =
          enemy.state === "chase" && distToTarget < stopDistance;

        if (
          enemy.state === "chase" &&
          isRanged &&
          distToTarget < ENEMY_RANGED_RETREAT_DISTANCE
        ) {
          const dx = enemy.sprite.x - targetX;
          const dy = enemy.sprite.y - targetY;
          const mag = Math.hypot(dx, dy) || 1;
          const speed = this.getEffectiveEnemySpeed(enemy);
          const vx = (dx / mag) * speed;
          const vy = (dy / mag) * speed;
          enemy.sprite.setVelocity(vx, vy);
          const edir =
            Math.abs(vx) > Math.abs(vy)
              ? vx > 0
                ? "right"
                : "left"
              : vy > 0
                ? "down"
                : "up";
          enemy.sprite.anims.play(enemy.spriteKey + "-walk-" + edir, true);
          enemy.lastDir = edir;
          continue;
        }

        if (
          !enemy.path ||
          enemy.pathIndex >= enemy.path.length ||
          stopForMelee
        ) {
          enemy.sprite.setVelocity(0, 0);
          enemy.sprite.anims.play(
            enemy.spriteKey + "-idle-" + enemy.lastDir,
            true,
          );
          continue;
        }
        this.moveEnemyToward(
          enemy,
          enemy.path[enemy.pathIndex],
          this.getEffectiveEnemySpeed(enemy),
          () => enemy.pathIndex++,
        );
        continue;
      }

      if (
        enemy.state === "patrol" &&
        enemy.patrolPath &&
        enemy.patrolPath.length > 1
      ) {
        const waypoint = enemy.patrolPath[enemy.patrolIndex];
        this.moveEnemyToward(
          enemy,
          waypoint,
          this.getEffectiveEnemySpeed(enemy) * 0.6,
          () => {
            if (
              enemy.patrolIndex + enemy.patrolDirection < 0 ||
              enemy.patrolIndex + enemy.patrolDirection >=
                enemy.patrolPath.length
            ) {
              enemy.patrolDirection *= -1;
            }
            enemy.patrolIndex += enemy.patrolDirection;
          },
        );
        continue;
      }

      enemy.sprite.setVelocity(0, 0);
      enemy.sprite.anims.play(enemy.spriteKey + "-idle-" + enemy.lastDir, true);
    }
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
    const n = this.playerLevel - 1;
    const deltaSec = deltaMs / 1000;
    const attrBonus = this.computeAttributeBonuses();

    if (this.playerHp < this.playerMaxHp) {
      const rate =
        HP_REGEN_PER_SEC_BASE +
        HP_REGEN_PER_SEC_GROWTH * n +
        attrBonus.hpRegenBonus;
      this.playerHp = Math.min(
        this.playerMaxHp,
        this.playerHp + rate * deltaSec,
      );
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });
    }

    if (this.playerMana < this.playerMaxMana) {
      const rate =
        MANA_REGEN_PER_SEC_BASE +
        MANA_REGEN_PER_SEC_GROWTH * n +
        attrBonus.manaRegenBonus;
      this.playerMana = Math.min(
        this.playerMaxMana,
        this.playerMana + rate * deltaSec,
      );
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    if (this.playerStamina < this.playerMaxStamina) {
      const rate =
        STAMINA_REGEN_PER_SEC_BASE +
        STAMINA_REGEN_PER_SEC_GROWTH * n +
        attrBonus.staminaRegenBonus;
      this.playerStamina = Math.min(
        this.playerMaxStamina,
        this.playerStamina + rate * deltaSec,
      );
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }
  }

  updateNpcMovement(npcList) {
    if (!npcList) return;
    const state = this.fogState.state;

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

      if (npc.talking) {
        npc.sprite.setVelocity(0, 0);
        npc.sprite.anims.play(`${npc.spriteKey}-idle-${npc.lastDir}`, true);
        continue;
      }

      if (npc.patrolPath && npc.patrolPath.length > 1) {
        const waypoint = npc.patrolPath[npc.patrolIndex];
        this.moveEnemyToward(npc, waypoint, ENEMY_SPEED * 0.5, () => {
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

  performInteraction() {
    if (!this.dialogOpen) {
      const npc = this.questNpcs.find(
        (n) =>
          Math.hypot(n.sprite.x - this.hero.x, n.sprite.y - this.hero.y) <=
          this.playerMeleeRange,
      );
      if (npc) {
        this.openQuestDialog(npc);
        return;
      }
    }

    if (!this.dialogOpen) {
      const ambient = this.ambientNpcs.find(
        (n) =>
          Math.hypot(n.sprite.x - this.hero.x, n.sprite.y - this.hero.y) <=
          this.playerMeleeRange,
      );
      if (ambient) {
        this.openAmbientDialog(ambient);
        return;
      }
    }

    if (this.travelHubTile && !this.dialogOpen) {
      const hubPx = this.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2;
      const hubPy = this.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distHub = Math.hypot(hubPx - this.hero.x, hubPy - this.hero.y);
      if (distHub <= this.playerMeleeRange) {
        this.openTravelHub();
        return;
      }
    }

    if (this.shopData && !this.dialogOpen) {
      const shopPx = this.shopData.x * TILE_SIZE + TILE_SIZE / 2;
      const shopPy = this.shopData.y * TILE_SIZE + TILE_SIZE / 2;
      const distShop = Math.hypot(shopPx - this.hero.x, shopPy - this.hero.y);
      if (distShop <= this.playerMeleeRange) {
        this.openShop();
        return;
      }
    }

    if (this.bossDoorTile && !this.bossRoomOpen && !this.dialogOpen) {
      const doorPx = this.bossDoorTile.x * TILE_SIZE + TILE_SIZE / 2;
      const doorPy = this.bossDoorTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distDoor = Math.hypot(doorPx - this.hero.x, doorPy - this.hero.y);
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
        if (c.opened) return false;
        const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
        return (
          Math.hypot(cx - this.hero.x, cy - this.hero.y) <=
          this.playerMeleeRange
        );
      });
      if (chest) {
        chest.opened = true;
        chest.sprite.setFrame(chest.variant.openFrame);
        chest.sprite.body.checkCollision.none = true;
        if (!chest.ephemeral) this.currentFloorOpenedChests.push(chest.index);

        if (chest.loot) {
          this.addItemToInventory(chest.loot.itemId, chest.loot.quantity);
          const itemDef = resolveItemDef(chest.loot.itemId);
          this.showLootToast(
            `Trouvé : ${itemDef.name} x${chest.loot.quantity}`,
          );
        } else if (chest.lootItems && chest.lootItems.length > 0) {
          for (const drop of chest.lootItems) {
            this.addItemToInventory(drop.itemId, drop.quantity);
          }
          const summary = chest.lootItems
            .map(
              (drop) => `${resolveItemDef(drop.itemId).name} x${drop.quantity}`,
            )
            .join(", ");
          this.showLootToast(`Trouvé : ${summary}`);
        }
        return;
      }
    }
  }

  performMeleeAttack(now) {
    if (!this.meleeCooldown.isReady(now)) return;
    this.meleeCooldown.trigger(now);

    const meleeWeaponDef = this.equipped.mainHand
      ? resolveItemDef(this.equipped.mainHand)
      : null;

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

    const imbue = this.pendingWeaponImbue;
    this.pendingWeaponImbue = null;
    let anyHit = false;

    for (const enemy of this.enemies) {
      const dx = enemy.sprite.x - this.hero.x;
      const dy = enemy.sprite.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.playerMeleeRange || !this.isEnemyVisible(enemy)) continue;

      if (dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = nx * this.lastAimVector.x + ny * this.lastAimVector.y;
        if (dot < MELEE_CONE_DOT_THRESHOLD) continue;
      }

      const isCrit = rollCritical(enemy.state !== "chase");
      let rawDamage =
        this.getEffectivePlayerMeleeDamage() * (isCrit ? CRIT_MULTIPLIER : 1);

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
        this.applyStatusEffect(
          enemy.statusEffects,
          this.rollStatusEffect(meleeWeaponDef),
        );
        if (imbue) {
          this.applyStatusEffect(
            enemy.statusEffects,
            this.rollStatusEffect(imbue),
          );
        }
      }
    }

    if (imbue && !anyHit) {
      this.pendingWeaponImbue = imbue;
    }

    const aimDir =
      Math.abs(this.lastAimVector.x) > Math.abs(this.lastAimVector.y)
        ? this.lastAimVector.x > 0
          ? "right"
          : "left"
        : this.lastAimVector.y > 0
          ? "down"
          : "up";
    const slashOffset = 22;
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

    const ammoDef = this.equipped.quiver
      ? resolveItemDef(this.equipped.quiver)
      : null;
    const imbue = this.pendingWeaponImbue;
    this.pendingWeaponImbue = null;
    this.projectiles.push({
      sprite,
      startX: this.hero.x,
      startY: this.hero.y,
      weaponDef,
      ammoDef,
      imbue,
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
          const isCrit = rollCritical(enemy.state !== "chase");
          let rawDamage =
            this.getEffectivePlayerRangedDamage() *
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
            this.applyStatusEffect(
              enemy.statusEffects,
              this.rollStatusEffect(proj.weaponDef),
            );
            this.applyStatusEffect(
              enemy.statusEffects,
              this.rollStatusEffect(proj.ammoDef),
            );
            if (proj.imbue)
              this.applyStatusEffect(
                enemy.statusEffects,
                this.rollStatusEffect(proj.imbue),
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

  spawnLootChest(pixelX, pixelY, lootItems) {
    if (!lootItems || lootItems.length === 0) return;

    const variantRng = createRng(
      `${this.currentSeed}-enemy-chest-${this.nextLootChestId}`,
    );
    const variant =
      CHEST_VARIANTS[Math.floor(variantRng() * CHEST_VARIANTS.length)];
    const sprite = this.add.sprite(
      pixelX,
      pixelY,
      CHEST_SPRITESHEET.key,
      variant.closedFrame,
    );
    sprite.setDepth(7);
    this.physics.add.existing(sprite, true);
    this.levelColliders.push(this.physics.add.collider(this.hero, sprite));

    this.chests.push({
      sprite,
      index: -1 - this.nextLootChestId,
      opened: false,
      lootItems,
      x: Math.round(pixelX / TILE_SIZE - 0.5),
      y: Math.round(pixelY / TILE_SIZE - 0.5),
      variant,
      ephemeral: true,
    });
    this.nextLootChestId++;
  }

  useHotbarSlot(slotIndex) {
    const slot = this.hotbarSlots[slotIndex];
    if (!slot) return;

    if (slot.type === "item") {
      const def = resolveItemDef(slot.itemId);

      if (def.category === "abilityScroll") {
        this.useScrollFromHotbar(slot.itemId);
        return;
      }

      const invIndex = this.inventory.findIndex(
        (i) => i.itemId === slot.itemId,
      );
      if (invIndex === -1) {
        this.showLootToast("Objet épuisé");
        return;
      }
      this.useConsumable(invIndex);
      return;
    }

    this.performAbility(slot.id);
  }

  useScrollFromHotbar(itemId) {
    const invIndex = this.inventory.findIndex((i) => i.itemId === itemId);
    if (invIndex === -1) {
      this.showLootToast("Parchemin épuisé");
      return;
    }

    const def = resolveItemDef(itemId);
    if (def.unlockLevel && this.playerLevel < def.unlockLevel) {
      this.showLootToast(`Nécessite le niveau ${def.unlockLevel}`);
      return;
    }
    const abilityDef = resolveAbilityDef(def.grantsAbility);
    const heroArchetype = resolveHeroStatsOverride(
      this.heroSpriteKey,
    )?.archetype;

    const archetypeMatches =
      !abilityDef.archetypes ||
      abilityDef.archetypes.length === 0 ||
      abilityDef.archetypes.includes(heroArchetype);
    const resourceAvailable =
      (!abilityDef.staminaCost || this.playerMaxStamina > 0) &&
      (!abilityDef.manaCost || this.playerMaxMana > 0);

    if (archetypeMatches && resourceAvailable) {
      this.useConsumable(invIndex);
      return;
    }

    if (
      abilityDef.disabledBiomes &&
      abilityDef.disabledBiomes.includes(this.currentBiomeId)
    ) {
      this.showLootToast(
        `${abilityDef.name} est désactivée sur ce type de niveau`,
      );
      return;
    }

    const now = this.time.now;
    const cooldownKey = `item:${itemId}`;
    const readyAt = this.itemCooldowns[cooldownKey] || 0;
    if (now < readyAt) {
      this.showLootToast("Parchemin en recharge");
      return;
    }

    if (abilityDef.effectType === "aoe") {
      this.performAoeAbility(abilityDef);
    } else if (abilityDef.effectType === "projectileAoe") {
      this.performProjectileAoeAbility(abilityDef);
    } else if (abilityDef.effectType === "selfBuff") {
      this.performSelfBuffAbility(abilityDef);
    } else if (abilityDef.effectType === "aoeDebuff") {
      this.performAoeDebuffAbility(abilityDef);
    } else if (abilityDef.effectType === "pierce") {
      this.performPierceAbility(abilityDef);
    } else {
      this.showLootToast(`${abilityDef.name} : effet pas encore implémenté`);
      return;
    }

    this.itemCooldowns[cooldownKey] = now + CONSUMABLE_COOLDOWN_MS;
    this.events.emit("hotbar-cooldown-started", {
      key: cooldownKey,
      cooldownMs: CONSUMABLE_COOLDOWN_MS,
      startedAt: Date.now(),
    });

    const item = this.inventory[invIndex];
    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(invIndex, 1);
    this.events.emit("inventory-updated", [...this.inventory]);
    this.showLootToast(`${abilityDef.name} utilisé (usage unique) !`);
    this.persistProgress();
  }

  performAbility(abilityId) {
    if (!this.unlockedAbilities.includes(abilityId)) return;

    const def = resolveAbilityDef(abilityId);
    if (
      def.hpThresholdPercent != null &&
      this.playerHp / this.playerMaxHp > def.hpThresholdPercent
    ) {
      this.showLootToast(
        `Nécessite d'être sous ${Math.round(def.hpThresholdPercent * 100)}% PV`,
      );
      return;
    }
    if (
      def.disabledBiomes &&
      def.disabledBiomes.includes(this.currentBiomeId)
    ) {
      this.showLootToast(`${def.name} est désactivée sur ce type de niveau`);
      return;
    }

    const now = this.time.now;
    const readyAt = this.abilityCooldowns[abilityId] || 0;
    if (now < readyAt) {
      this.showLootToast("Compétence en recharge");
      return;
    }

    if (def.effectType === "summon" && def.persistent) {
      const existing = this.summons.find(
        (s) => s.persistent && s.sourceAbilityId === def.id,
      );
      if (existing) {
        this.pendingResummonDef = def;
        this.pendingResummonTarget = existing;
        this.pauseGame("resummon");
        this.events.emit("resummon-prompt", { name: def.name });
        return;
      }
    }

    if (def.staminaCost && this.playerStamina < def.staminaCost) {
      this.showLootToast("Pas assez de stamina !");
      return;
    }
    if (def.manaCost && this.playerMana < def.manaCost) {
      this.showLootToast("Pas assez de mana !");
      return;
    }

    if (def.effectType === "aoe") {
      this.performAoeAbility(def);
    } else if (def.effectType === "projectileAoe") {
      this.performProjectileAoeAbility(def);
    } else if (def.effectType === "selfBuff") {
      this.performSelfBuffAbility(def);
    } else if (def.effectType === "aoeDebuff") {
      this.performAoeDebuffAbility(def);
    } else if (def.effectType === "pierce") {
      this.performPierceAbility(def);
    } else if (def.effectType === "weaponImbue") {
      this.performWeaponImbueAbility(def);
    } else if (def.effectType === "fogPulse") {
      this.performFogPulseAbility(def);
    } else if (def.effectType === "shieldBash") {
      this.performShieldBashAbility(def);
    } else if (def.effectType === "taunt") {
      this.performTauntAbility(def);
    } else if (def.effectType === "repel") {
      this.performRepelAbility(def);
    } else if (def.effectType === "aoeStun") {
      this.performAoeStunAbility(def);
    } else if (def.effectType === "summon") {
      this.performSummonAbility(def);
    } else if (def.effectType === "teleportDash") {
      this.performTeleportDashAbility(def);
    } else if (def.effectType === "randomTeleport") {
      this.performRandomTeleportAbility(def);
    } else if (def.effectType === "stealth") {
      this.performStealthAbility(def);
    } else if (def.effectType === "chainLightning") {
      this.performChainLightningAbility(def);
    } else if (def.effectType === "zone") {
      this.performZoneAbility(def);
    } else if (def.effectType === "aoeCurse") {
      this.performAoeCurseAbility(def);
    } else if (def.effectType === "riposte") {
      this.performRiposteAbility(def);
    } else if (def.effectType === "parry") {
      this.performParryAbility(def);
    } else if (def.effectType === "trap") {
      this.performTrapAbility(def);
    } else if (def.effectType === "cone") {
      this.performConeAbility(def);
    } else if (def.effectType === "aoeRoot") {
      this.performAoeRootAbility(def);
    } else if (def.effectType === "boomerang") {
      this.performBoomerangAbility(def);
    } else if (def.effectType === "vortex") {
      this.performVortexAbility(def);
    } else if (def.effectType === "visionBuff") {
      this.performVisionBuffAbility(def);
    } else if (def.effectType === "bloodPact") {
      this.performBloodPactAbility(def);
    } else if (def.effectType === "conditionalBuff") {
      this.performConditionalBuffAbility(def);
    } else {
      this.showLootToast(`${def.name} : effet pas encore implémenté`);
      return;
    }

    if (def.staminaCost) {
      this.playerStamina -= def.staminaCost;
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }
    if (def.manaCost) {
      this.playerMana -= def.manaCost;
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    this.abilityCooldowns[abilityId] = now + def.cooldownMs;
    this.events.emit("hotbar-cooldown-started", {
      key: `ability:${abilityId}`,
      cooldownMs: def.cooldownMs,
      startedAt: Date.now(),
    });
  }

  performAoeStunAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      this.applyStatusEffect(enemy.statusEffects, {
        type: "stun",
        kind: "modifier",
        statModifiers: {},
        durationMs: def.durationMs,
      });
    }

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0xffff00, 0.4);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  performRepelAbility(def) {
    const abilityDamage = this.computeAbilityDamage(def);
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dx = enemy.sprite.x - this.hero.x;
      const dy = enemy.sprite.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.radius) continue;

      if (abilityDamage) {
        const rawDamage = applyElementalResistance(
          abilityDamage,
          def.damageType,
          enemy.resistances,
        );
        this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      }

      const mag = dist || 1;
      this.knockbackEnemyIfClear(
        enemy,
        (dx / mag) * def.knockbackDistance,
        (dy / mag) * def.knockbackDistance,
      );
    }

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0xaaaaff, 0.4);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  spawnSummonSprite(spriteKey, x, y) {
    const summonSpriteInfo =
      SPRITE_REGISTRY[spriteKey] || SPRITE_REGISTRY.enemyDefault;
    const sprite = this.summonGroup.create(
      x,
      y,
      summonSpriteInfo.key,
      summonSpriteInfo.animations.idleDown,
    );
    sprite.setScale(summonSpriteInfo.scale);
    const hb = summonSpriteInfo.hitbox;
    sprite.body.setSize(hb.width, hb.height).setOffset(hb.offsetX, hb.offsetY);
    sprite.setDepth(8);
    sprite.anims.play(spriteKey + "-idle-down");
    this.levelColliders.push(this.physics.add.collider(sprite, this.layer));
    this.levelColliders.push(
      this.physics.add.collider(sprite, this.enemyGroup),
    );
    return sprite;
  }

  performSummonAbility(def) {
    if (this.summons.length >= MAX_SUMMONS) {
      const oldestIndex = this.summons.findIndex((s) => !s.persistent);
      if (oldestIndex === -1) {
        this.showLootToast("Toutes tes invocations sont déjà occupées");
        return;
      }
      const oldest = this.summons.splice(oldestIndex, 1)[0];
      oldest.sprite.destroy();
    }

    const summonHp =
      def.hp ?? Math.round(this.playerMaxHp * (def.hpScale || 0));
    const summonDamage =
      def.damage ??
      Math.round(this.getEffectivePlayerMeleeDamage() * (def.damageScale || 0));
    const summonDefense =
      def.defense ?? Math.round(this.playerDefense * (def.defenseScale || 0));

    const spawnX = this.hero.x + (Math.random() - 0.5) * 40;
    const spawnY = this.hero.y + (Math.random() - 0.5) * 40;
    const sprite = this.spawnSummonSprite(def.summonType, spawnX, spawnY);

    this.summons.push({
      sprite,
      spriteKey: def.summonType,
      sourceAbilityId: def.id,
      hp: summonHp,
      maxHp: summonHp,
      damage: summonDamage,
      defense: summonDefense,
      damageType: def.damageType || "physical",
      resistances: def.resistances || {},
      persistent: def.persistent || false,
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      expiresAt: def.durationMs ? this.time.now + def.durationMs : null,
      lastDir: "down",
    });

    this.showLootToast(`${def.name} invoquée !`);
  }

  confirmResummon() {
    this.unpauseGame("resummon");
    this.events.emit("resummon-prompt", null);

    const def = this.pendingResummonDef;
    const existing = this.pendingResummonTarget;
    this.pendingResummonDef = null;
    this.pendingResummonTarget = null;
    if (!def || !existing) return;

    if (def.staminaCost && this.playerStamina < def.staminaCost) {
      this.showLootToast("Pas assez de stamina !");
      return;
    }
    if (def.manaCost && this.playerMana < def.manaCost) {
      this.showLootToast("Pas assez de mana !");
      return;
    }

    const summonHp =
      def.hp ?? Math.round(this.playerMaxHp * (def.hpScale || 0));
    const summonDamage =
      def.damage ??
      Math.round(this.getEffectivePlayerMeleeDamage() * (def.damageScale || 0));
    const summonDefense =
      def.defense ?? Math.round(this.playerDefense * (def.defenseScale || 0));

    existing.hp = summonHp;
    existing.maxHp = summonHp;
    existing.damage = summonDamage;
    existing.defense = summonDefense;
    existing.damageType = def.damageType || "physical";
    existing.resistances = def.resistances || {};

    if (def.staminaCost) {
      this.playerStamina -= def.staminaCost;
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }
    if (def.manaCost) {
      this.playerMana -= def.manaCost;
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }
    const now = this.time.now;
    this.abilityCooldowns[def.id] = now + def.cooldownMs;
    this.events.emit("hotbar-cooldown-started", {
      key: `ability:${def.id}`,
      cooldownMs: def.cooldownMs,
      startedAt: Date.now(),
    });

    this.showLootToast(`${def.name} renouvelée !`);
  }

  cancelResummon() {
    this.unpauseGame("resummon");
    this.events.emit("resummon-prompt", null);
    this.pendingResummonDef = null;
    this.pendingResummonTarget = null;
  }

  updateSummons(now) {
    const remaining = [];
    for (const summon of this.summons) {
      if (summon.expiresAt && now >= summon.expiresAt) {
        summon.sprite.destroy();
        this.showLootToast("L'invocation s'est dissipée");
        continue;
      }
      if (summon.hp <= 0) {
        summon.sprite.destroy();
        this.showLootToast("L'invocation a été vaincue");
        continue;
      }

      if (now < (summon.attackAnimUntil || 0)) {
        remaining.push(summon);
        continue;
      }

      let nearestEnemy = null;
      let nearestDist = Infinity;
      for (const enemy of this.enemies) {
        if (!this.isEnemyVisible(enemy)) continue;
        const dist = Math.hypot(
          enemy.sprite.x - summon.sprite.x,
          enemy.sprite.y - summon.sprite.y,
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy && nearestDist < 250) {
        const dx = nearestEnemy.sprite.x - summon.sprite.x;
        const dy = nearestEnemy.sprite.y - summon.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 34) {
          const nx = dx / dist,
            ny = dy / dist;
          summon.sprite.setVelocity(nx * 100, ny * 100);
          summon.lastDir =
            Math.abs(nx) > Math.abs(ny)
              ? nx > 0
                ? "right"
                : "left"
              : ny > 0
                ? "down"
                : "up";
          summon.sprite.anims.play(
            summon.spriteKey + "-walk-" + summon.lastDir,
            true,
          );
        } else {
          summon.sprite.setVelocity(0, 0);
          summon.sprite.anims.play(
            summon.spriteKey + "-idle-" + summon.lastDir,
            true,
          );
          if (summon.attackCooldown.isReady(now)) {
            summon.attackCooldown.trigger(now);

            const hasAttackAnim = this.anims.exists(
              summon.spriteKey + "-attack-" + summon.lastDir,
            );
            if (hasAttackAnim) {
              summon.sprite.anims.play(
                summon.spriteKey + "-attack-" + summon.lastDir,
                true,
              );
              summon.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
            }

            const rawDamage = applyElementalResistance(
              summon.damage,
              summon.damageType,
              nearestEnemy.resistances,
            );
            this.damageEnemy(
              nearestEnemy,
              computeDamage(rawDamage, nearestEnemy.defense),
            );
          }
        }
      } else {
        const dx = this.hero.x - summon.sprite.x;
        const dy = this.hero.y - summon.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 60) {
          const nx = dx / dist,
            ny = dy / dist;
          summon.sprite.setVelocity(nx * 120, ny * 120);
          summon.lastDir =
            Math.abs(nx) > Math.abs(ny)
              ? nx > 0
                ? "right"
                : "left"
              : ny > 0
                ? "down"
                : "up";
          summon.sprite.anims.play(
            summon.spriteKey + "-walk-" + summon.lastDir,
            true,
          );
        } else {
          summon.sprite.setVelocity(0, 0);
          summon.sprite.anims.play(
            summon.spriteKey + "-idle-" + summon.lastDir,
            true,
          );
        }
      }

      remaining.push(summon);
    }
    this.summons = remaining;
  }

  performShieldBashAbility(def) {
    const shieldDef = this.equipped.offHand
      ? resolveItemDef(this.equipped.offHand)
      : null;
    if (def.requiresShield && (!shieldDef || !shieldDef.isShield)) {
      this.showLootToast("Nécessite un bouclier équipé");
      return;
    }

    const dir = this.lastAimVector;
    this.dashState = {
      def,
      dirX: dir.x,
      dirY: dir.y,
      hitEnemyIds: new Set(),
      startX: this.hero.x,
      startY: this.hero.y,
    };
    this.hero.setVelocity(dir.x * def.dashSpeed, dir.y * def.dashSpeed);
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

  performTauntAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      if (enemy.state !== "chase") {
        enemy.state = "chase";
        const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
        const ey = Math.floor(enemy.sprite.y / TILE_SIZE);
        const playerTileX = Math.floor(this.hero.x / TILE_SIZE);
        const playerTileY = Math.floor(this.hero.y / TILE_SIZE);
        const path = findPath(
          this.fogGrid,
          { x: ex, y: ey },
          { x: playerTileX, y: playerTileY },
        );
        enemy.path = path;
        enemy.pathIndex = path ? 1 : 0;
      }
    }

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0xffcc00, 0.4);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  performAoeAbility(def) {
    const abilityDamage = this.computeAbilityDamage(def);
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      const rawDamage = applyElementalResistance(
        abilityDamage,
        def.damageType,
        enemy.resistances,
      );
      this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      if (enemy.hp > 0) {
        this.applyStatusEffect(enemy.statusEffects, this.rollStatusEffect(def));
      }
    }

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0xff6600, 0.5);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });
  }

  performProjectileAoeAbility(def) {
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

    const sprite = this.add.circle(this.hero.x, this.hero.y, 8, 0xff6600);
    this.physics.add.existing(sprite);
    sprite.setDepth(12);
    sprite.body.setVelocity(
      v.x * def.projectileSpeed,
      v.y * def.projectileSpeed,
    );

    this.abilityProjectiles.push({
      sprite,
      startX: this.hero.x,
      startY: this.hero.y,
      def,
    });
  }
  performWeaponImbueAbility(def) {
    this.pendingWeaponImbue = def;
    this.showLootToast(
      `${def.name} activée - le prochain coup sera renforcé !`,
    );
  }

  performPierceAbility(def) {
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

    const sprite = this.add.circle(this.hero.x, this.hero.y, 6, 0xffdd44);
    this.physics.add.existing(sprite);
    sprite.setDepth(12);
    sprite.body.setVelocity(
      v.x * def.projectileSpeed,
      v.y * def.projectileSpeed,
    );

    this.abilityProjectiles.push({
      sprite,
      startX: this.hero.x,
      startY: this.hero.y,
      def,
      hitEnemyIds: new Set(),
      pierceCount: 0,
    });
  }

  performSelfBuffAbility(def) {
    this.applyStatusEffect(this.playerStatusEffects, {
      type: def.id,
      kind: "modifier",
      statModifiers: def.statModifiers,
      durationMs: def.durationMs,
    });
    this.showLootToast(`${def.name} activé !`);
  }

  performAoeDebuffAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      this.applyStatusEffect(enemy.statusEffects, {
        type: def.id,
        kind: "modifier",
        statModifiers: def.statModifiers,
        durationMs: def.durationMs,
      });
    }

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0x4488ff, 0.4);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });
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
        this.applyStatusEffect(enemy.statusEffects, this.rollStatusEffect(def));
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

  performFogPulseAbility(def) {
    const centerTileX = Math.floor(this.hero.x / TILE_SIZE);
    const centerTileY = Math.floor(this.hero.y / TILE_SIZE);

    let revealed;
    if (def.ignoresWalls) {
      const bossRoomTiles = this.computeBossRoomTiles();
      revealed = new Set();
      const height = this.fogGrid.length;
      const width = this.fogGrid[0].length;
      const minX = Math.max(0, centerTileX - def.radius);
      const maxX = Math.min(width - 1, centerTileX + def.radius);
      const minY = Math.max(0, centerTileY - def.radius);
      const maxY = Math.min(height - 1, centerTileY + def.radius);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const key = x + "," + y;
          if (Math.hypot(x - centerTileX, y - centerTileY) > def.radius)
            continue;
          if (bossRoomTiles.has(key)) continue;
          revealed.add(key);
        }
      }
    } else {
      revealed = computeVisibleTiles(
        this.fogGrid,
        centerTileX,
        centerTileY,
        def.radius,
      );
    }

    const changes = [];
    for (const key of revealed) {
      const [x, y] = key.split(",").map(Number);
      if (this.fogState.state[y][x] < 2) {
        this.fogState.state[y][x] = 2;
        changes.push({ x, y });
      }
    }
    this.applyFogChanges(changes);

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0x66ddff, 0);
    circle.setStrokeStyle(3, 0x66ddff, 0.8);
    circle.setDepth(6);
    this.tweens.add({
      targets: circle,
      radius: def.radius * TILE_SIZE,
      alpha: 0,
      duration: 600,
      onComplete: () => circle.destroy(),
    });
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
              this.applyStatusEffect(
                enemy.statusEffects,
                this.rollStatusEffect(proj.def),
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

  performTeleportDashAbility(def) {
    const dir = this.lastAimVector;
    const targetX = this.hero.x + dir.x * def.distance;
    const targetY = this.hero.y + dir.y * def.distance;
    const tileX = Math.floor(targetX / TILE_SIZE);
    const tileY = Math.floor(targetY / TILE_SIZE);
    const grid = this.fogGrid;
    if (
      tileY < 0 ||
      tileX < 0 ||
      tileY >= grid.length ||
      tileX >= grid[0].length ||
      grid[tileY][tileX] === WALL
    ) {
      this.showLootToast("Pas assez de place pour se téléporter");
      return;
    }
    this.hero.x = targetX;
    this.hero.y = targetY;

    for (const summon of this.summons) {
      summon.sprite.x = targetX + (Math.random() - 0.5) * 40;
      summon.sprite.y = targetY + (Math.random() - 0.5) * 40;
    }
  }

  performRandomTeleportAbility(def) {
    const grid = this.fogGrid;
    const floorTiles = [];
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0].length; x++) {
        if (grid[y][x] !== WALL) floorTiles.push({ x, y });
      }
    }
    if (floorTiles.length === 0) return;
    const target = floorTiles[Math.floor(Math.random() * floorTiles.length)];
    const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
    const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

    this.hero.x = targetX;
    this.hero.y = targetY;

    for (const summon of this.summons) {
      summon.sprite.x = targetX + (Math.random() - 0.5) * 40;
      summon.sprite.y = targetY + (Math.random() - 0.5) * 40;
    }

    this.showLootToast("Téléportation !");
  }

  performStealthAbility(def) {
    this.stealthUntil = this.time.now + def.durationMs;

    this.tweens.add({
      targets: this.hero,
      alpha: 0.4,
      duration: 250,
      ease: "Cubic.easeOut",
    });

    this.showLootToast(`${def.name} activée !`);
  }

  performChainLightningAbility(def) {
    let currentX = this.hero.x;
    let currentY = this.hero.y;
    const hit = new Set();
    let jumps = 0;
    const abilityDamage = this.computeAbilityDamage(def);

    while (jumps < def.maxJumps) {
      let nearest = null;
      let nearestDist = Infinity;
      for (const enemy of this.enemies) {
        if (hit.has(enemy) || !this.isEnemyVisible(enemy)) continue;
        const dist = Math.hypot(
          enemy.sprite.x - currentX,
          enemy.sprite.y - currentY,
        );
        if (dist <= def.jumpRange && dist < nearestDist) {
          nearestDist = dist;
          nearest = enemy;
        }
      }
      if (!nearest) break;

      const rawDamage = applyElementalResistance(
        abilityDamage,
        def.damageType,
        nearest.resistances,
      );
      this.damageEnemy(nearest, computeDamage(rawDamage, nearest.defense));

      hit.add(nearest);
      const line = this.add
        .line(
          0,
          0,
          currentX,
          currentY,
          nearest.sprite.x,
          nearest.sprite.y,
          0x66ddff,
        )
        .setLineWidth(2)
        .setDepth(15);
      this.time.delayedCall(200, () => line.destroy());
      currentX = nearest.sprite.x;
      currentY = nearest.sprite.y;
      jumps++;
    }
  }

  performZoneAbility(def) {
    const circle = this.add.circle(
      this.hero.x,
      this.hero.y,
      def.radius,
      def.color,
      0.3,
    );
    circle.setDepth(6);
    this.zones.push({
      sprite: circle,
      x: this.hero.x,
      y: this.hero.y,
      radius: def.radius,
      damagePerTick: this.computeAbilityDamage({
        damage: def.damagePerTick,
        damagePercent: def.damagePercent,
        scalesFrom: def.scalesFrom,
      }),
      damageType: def.damageType || "physical",
      tickIntervalMs: def.tickIntervalMs,
      nextTickAt: this.time.now,
      expiresAt: this.time.now + def.durationMs,
    });
  }

  performAoeCurseAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      this.applyStatusEffect(enemy.statusEffects, {
        type: "curse",
        kind: "modifier",
        statModifiers: { damagePercent: def.damagePercent },
        durationMs: def.durationMs,
      });
    }
    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0x882299, 0.4);
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  performRiposteAbility(def) {
    this.riposteUntil = this.time.now + def.durationMs;
    this.riposteReflectPercent = def.reflectPercent;
    this.showLootToast(`${def.name} activée !`);
  }

  performParryAbility(def) {
    this.parryUntil = this.time.now + def.durationMs;
    this.parryDamageReduction = def.damageReduction;
    this.showLootToast(`${def.name} activée !`);
  }

  performTrapAbility(def) {
    const sprite = this.add.circle(this.hero.x, this.hero.y, 6, 0x884400, 0.8);
    sprite.setDepth(6);
    this.traps.push({
      sprite,
      x: this.hero.x,
      y: this.hero.y,
      triggerRadius: def.triggerRadius,
      inflictsEffect: def.inflictsEffect,
      expiresAt: this.time.now + def.expiresAfterMs,
    });
  }

  performConeAbility(def) {
    const dir = this.lastAimVector;
    const angleRad = (def.angleDegrees * Math.PI) / 180;
    const baseAngle = Math.atan2(dir.y, dir.x);
    const abilityDamage = this.computeAbilityDamage(def);

    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dx = enemy.sprite.x - this.hero.x;
      const dy = enemy.sprite.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.distance) continue;
      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = Math.abs(angleToEnemy - baseAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
      if (angleDiff > angleRad / 2) continue;

      const rawDamage = applyElementalResistance(
        abilityDamage,
        def.damageType,
        enemy.resistances,
      );
      this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));

      if (enemy.hp > 0) {
        this.applyStatusEffect(enemy.statusEffects, this.rollStatusEffect(def));
      }
    }
  }

  performAoeRootAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      this.applyStatusEffect(enemy.statusEffects, {
        type: "root",
        kind: "modifier",
        statModifiers: {},
        durationMs: def.durationMs,
      });
    }
  }

  performBoomerangAbility(def) {
    const dir = this.lastAimVector;
    const sprite = this.add.circle(this.hero.x, this.hero.y, 7, 0x996633);
    this.physics.add.existing(sprite);
    sprite.body.setVelocity(
      dir.x * def.projectileSpeed,
      dir.y * def.projectileSpeed,
    );
    this.boomerangs.push({
      sprite,
      def,
      startX: this.hero.x,
      startY: this.hero.y,
      returning: false,
      hitEnemyIds: new Set(),
    });
  }

  performVortexAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dx = this.hero.x - enemy.sprite.x;
      const dy = this.hero.y - enemy.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist > def.radius || dist < 1) continue;
      this.knockbackEnemyIfClear(
        enemy,
        (dx / dist) * def.pullDistance,
        (dy / dist) * def.pullDistance,
      );
    }
    const circle = this.add.circle(
      this.hero.x,
      this.hero.y,
      def.radius,
      0x8844ff,
      0.2,
    );
    circle.setDepth(6);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 500,
      onComplete: () => circle.destroy(),
    });
  }

  performVisionBuffAbility(def) {
    this.visionBonusUntil = this.time.now + def.durationMs;
    this.visionBonusAmount = def.visionBonus;
  }

  performBloodPactAbility(def) {
    if (this.playerHp <= def.hpCost) {
      this.showLootToast("Pas assez de PV pour ce pacte");
      return;
    }
    this.playerHp -= def.hpCost;
    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    if (def.resourceType === "mana") {
      this.playerMana = Math.min(
        this.playerMaxMana,
        this.playerMana + def.resourceGain,
      );
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    } else {
      this.playerStamina = Math.min(
        this.playerMaxStamina,
        this.playerStamina + def.resourceGain,
      );
      this.events.emit("player-stamina-changed", {
        stamina: this.playerStamina,
        maxStamina: this.playerMaxStamina,
      });
    }
  }

  performConditionalBuffAbility(def) {
    this.applyStatusEffect(this.playerStatusEffects, {
      type: def.id,
      kind: "modifier",
      statModifiers: def.buffStatModifiers,
      durationMs: def.durationMs,
    });
    this.showLootToast(`${def.name} activée !`);
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
          this.applyStatusEffect(
            enemy.statusEffects,
            this.rollStatusEffect({ inflictsEffect: trap.inflictsEffect }),
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
    if (slotIndex < 0 || slotIndex > 8) return;

    if (payload) {
      for (let i = 0; i < this.hotbarSlots.length; i++) {
        if (i === slotIndex) continue;
        const existing = this.hotbarSlots[i];
        if (!existing) continue;
        const sameAbility =
          payload.type === "ability" &&
          existing.type === "ability" &&
          existing.id === payload.id;
        const sameItem =
          payload.type === "item" &&
          existing.type === "item" &&
          existing.itemId === payload.itemId;
        if (sameAbility || sameItem) {
          this.hotbarSlots[i] = null;
          this.showLootToast(`Déplacé depuis l'emplacement ${i + 1}`);
        }
      }
    }

    this.hotbarSlots[slotIndex] = payload;
    this.events.emit("hotbar-updated", [...this.hotbarSlots]);
  }

  rollStatusEffect(sourceDef) {
    if (!sourceDef || !sourceDef.inflictsEffect) return null;
    const inflict = sourceDef.inflictsEffect;
    if (Math.random() >= inflict.chance) return null;

    if (inflict.kind === "modifier") {
      return {
        type: inflict.type,
        kind: "modifier",
        statModifiers: inflict.statModifiers,
        durationMs: inflict.durationMs,
      };
    }

    return {
      type: inflict.type,
      kind: "dot",
      damagePerTick: inflict.damagePerTick,
      tickIntervalMs: inflict.tickIntervalMs,
      ticksRemaining: inflict.ticks,
    };
  }

  applyStatusEffect(list, effect) {
    if (!effect) return;
    const existingIndex = list.findIndex((e) => e.type === effect.type);
    if (existingIndex !== -1) list.splice(existingIndex, 1);
    if (effect.kind === "modifier") {
      list.push({ ...effect, expiresAt: this.time.now + effect.durationMs });
    } else {
      list.push({
        ...effect,
        nextTickAt: this.time.now + effect.tickIntervalMs,
      });
    }
  }

  flashStatusTint(sprite, effectType) {
    if (!sprite || !sprite.active) return;
    const color = STATUS_EFFECT_COLORS[effectType] ?? 0xcc0000;
    sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(150, () => {
      if (sprite.active) {
        sprite.clearTint();
        sprite.setTintMode(Phaser.TintModes.MULTIPLY);
      }
    });
  }

  updateStatusEffects(now) {
    for (const enemy of this.enemies) {
      if (!enemy.statusEffects || enemy.statusEffects.length === 0) continue;
      const remaining = [];
      for (const effect of enemy.statusEffects) {
        if (effect.kind === "modifier") {
          if (now < effect.expiresAt) remaining.push(effect);
          continue;
        }
        if (now >= effect.nextTickAt) {
          this.damageEnemy(enemy, effect.damagePerTick);
          effect.ticksRemaining -= 1;
          effect.nextTickAt = now + effect.tickIntervalMs;
          this.flashStatusTint(enemy.sprite, effect.type);
        }
        if (effect.ticksRemaining > 0 && enemy.hp > 0) remaining.push(effect);
      }
      enemy.statusEffects = remaining;
    }

    if (this.playerStatusEffects.length > 0 && !this.isDead) {
      const remaining = [];
      for (const effect of this.playerStatusEffects) {
        if (effect.kind === "modifier") {
          if (now < effect.expiresAt) remaining.push(effect);
          continue;
        }
        if (now >= effect.nextTickAt) {
          this.playerHp = Math.max(0, this.playerHp - effect.damagePerTick);
          this.showDamageNumber(this.hero, effect.damagePerTick, "#ff4444");
          this.events.emit("player-hp-changed", {
            hp: this.playerHp,
            maxHp: this.playerMaxHp,
          });
          effect.ticksRemaining -= 1;
          effect.nextTickAt = now + effect.tickIntervalMs;
          this.flashStatusTint(this.hero, effect.type);
        }
        if (effect.ticksRemaining > 0) remaining.push(effect);
      }
      this.playerStatusEffects = remaining;
    }
  }

  getEffectiveEnemySpeed(enemy) {
    let multiplier = 1;
    for (const effect of enemy.statusEffects) {
      if (effect.statModifiers?.moveSpeedPercent) {
        multiplier += effect.statModifiers.moveSpeedPercent;
      }
    }
    return Math.max(ENEMY_SPEED * 0.2, ENEMY_SPEED * multiplier);
  }

  getEffectiveEnemyDamage(enemy) {
    let multiplier = 1;
    for (const effect of enemy.statusEffects) {
      if (effect.statModifiers?.damagePercent)
        multiplier += effect.statModifiers.damagePercent;
    }
    return Math.max(0, enemy.damage * multiplier);
  }

  getEffectivePlayerMoveSpeed() {
    let multiplier = 1;
    for (const effect of this.playerStatusEffects) {
      if (effect.statModifiers?.moveSpeedPercent) {
        multiplier += effect.statModifiers.moveSpeedPercent;
      }
    }
    return Math.max(
      this.playerMoveSpeed * 0.2,
      this.playerMoveSpeed * multiplier,
    );
  }

  getEffectivePlayerMeleeDamage() {
    let multiplier = 1;
    for (const effect of this.playerStatusEffects) {
      if (effect.statModifiers?.meleeDamagePercent)
        multiplier += effect.statModifiers.meleeDamagePercent;
    }
    return this.playerMeleeDamage * multiplier;
  }

  getEffectivePlayerRangedDamage() {
    let multiplier = 1;
    for (const effect of this.playerStatusEffects) {
      if (effect.statModifiers?.rangedDamagePercent)
        multiplier += effect.statModifiers.rangedDamagePercent;
    }
    return this.playerRangedDamage * multiplier;
  }

  getEffectivePlayerDefense() {
    let multiplier = 1;
    for (const effect of this.playerStatusEffects) {
      if (effect.statModifiers?.defensePercent)
        multiplier += effect.statModifiers.defensePercent;
    }
    return this.playerDefense * multiplier;
  }

  getEffectivePlayerVisionRadius() {
    const bonus =
      this.time.now < this.visionBonusUntil ? this.visionBonusAmount : 0;
    return this.playerVisionRadius + bonus;
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
      this.applyStatusEffect(this.playerStatusEffects, {
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
      const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
      const ey = Math.floor(enemy.sprite.y / TILE_SIZE);
      const playerTileX = Math.floor(this.hero.x / TILE_SIZE);
      const playerTileY = Math.floor(this.hero.y / TILE_SIZE);
      const path = findPath(
        this.fogGrid,
        { x: ex, y: ey },
        { x: playerTileX, y: playerTileY },
      );
      enemy.path = path;
      enemy.pathIndex = path ? 1 : 0;
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
      if (enemy.drops && enemy.drops.length > 0) {
        this.spawnLootChest(enemy.sprite.x, enemy.sprite.y, enemy.drops);
      }

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

          this.addItemToInventory(enemy.questLoot, 1);
          const lootDef = resolveItemDef(enemy.questLoot);
          this.showLootToast(`${lootDef.name} obtenu !`);
          break;
        }
      }

      if (enemy.isBoss) {
        const neededCounts = {};
        for (const questKey of Object.keys(this.quests)) {
          const qs = this.quests[questKey];
          if (qs.questId !== "obtainItem" || !qs.accepted || qs.completed)
            continue;
          neededCounts[qs.targetItemId] =
            (neededCounts[qs.targetItemId] || 0) + 1;
        }
        for (const [itemId, neededCount] of Object.entries(neededCounts)) {
          const haveCount = this.inventory
            .filter((i) => i.itemId === itemId)
            .reduce((sum, i) => sum + i.quantity, 0);
          const toGrant = neededCount - haveCount;
          if (toGrant > 0) {
            this.addItemToInventory(itemId, toGrant);
            const itemDef = resolveItemDef(itemId);
            this.showLootToast(
              `Le boss laisse tomber : ${itemDef.name} x${toGrant}`,
            );
          }
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
      if (this.unlockedRecipes.includes(recipe.id)) continue;
      this.unlockedRecipes.push(recipe.id);
      anyRecipeUnlocked = true;
      this.showLootToast(`Nouvelle recette débloquée : ${recipe.name} !`);
    }
    if (anyRecipeUnlocked)
      this.events.emit("recipes-updated", [...this.unlockedRecipes]);

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
    this.events.emit("level-up", { level });
    this.events.emit("levelup-available", { available: false });
    this.persistProgress();
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

  updateEnemyAttacks(now) {
    for (const enemy of this.enemies) {
      if (enemy.state !== "chase") continue;
      if (this.isEnemyStunned(enemy)) continue;
      if (!enemy.attackCooldown.isReady(now)) continue;

      if (enemy.attackType === "ranged") {
        const dist = Math.hypot(
          enemy.sprite.x - this.hero.x,
          enemy.sprite.y - this.hero.y,
        );
        if (dist > ENEMY_RANGED_ATTACK_RANGE) continue;
        enemy.attackCooldown.trigger(now);

        const hasRangedAttackAnim = this.anims.exists(
          enemy.spriteKey + "-attack-" + enemy.lastDir,
        );
        if (hasRangedAttackAnim) {
          enemy.sprite.anims.play(
            enemy.spriteKey + "-attack-" + enemy.lastDir,
            true,
          );
          enemy.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
        }

        const dx = this.hero.x - enemy.sprite.x;
        const dy = this.hero.y - enemy.sprite.y;
        const mag = Math.hypot(dx, dy) || 1;
        const vx = dx / mag;
        const vy = dy / mag;

        const sprite = this.add.circle(
          enemy.sprite.x,
          enemy.sprite.y,
          PROJECTILE_RADIUS,
          0xff6644,
        );
        this.physics.add.existing(sprite);
        sprite.setDepth(12);
        sprite.body.setVelocity(
          vx * ENEMY_PROJECTILE_SPEED,
          vy * ENEMY_PROJECTILE_SPEED,
        );

        this.enemyProjectiles.push({
          sprite,
          startX: enemy.sprite.x,
          startY: enemy.sprite.y,
          damage: this.getEffectiveEnemyDamage(enemy),
          damageType: enemy.damageType,
          inflictsEffect: enemy.inflictsEffect,
        });
        continue;
      }

      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );

      let target = {
        isSummon: false,
        defense: this.playerDefense,
      };
      for (const summon of this.summons) {
        const summonDist = Math.hypot(
          enemy.sprite.x - summon.sprite.x,
          enemy.sprite.y - summon.sprite.y,
        );
        if (summonDist <= ENEMY_ATTACK_RANGE && summonDist < dist) {
          target = { isSummon: true, summon, defense: summon.defense };
        }
      }

      if (!target.isSummon && dist > ENEMY_ATTACK_RANGE) continue;

      enemy.attackCooldown.trigger(now);

      const hasAttackAnim = this.anims.exists(
        enemy.spriteKey + "-attack-" + enemy.lastDir,
      );
      if (hasAttackAnim) {
        enemy.sprite.anims.play(
          enemy.spriteKey + "-attack-" + enemy.lastDir,
          true,
        );
        enemy.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
      }

      if (target.isSummon) {
        const dmg = computeDamage(
          applyElementalResistance(
            this.getEffectiveEnemyDamage(enemy),
            enemy.damageType,
            target.summon.resistances,
          ),
          target.defense,
        );
        target.summon.hp = Math.max(0, target.summon.hp - dmg);

        this.showDamageNumber(target.summon.sprite, dmg, "#ff44c7");
      } else {
        let dmg = computeDamage(
          applyElementalResistance(
            this.getEffectiveEnemyDamage(enemy),
            enemy.damageType,
            this.playerResistances,
          ),
          target.defense,
        );
        if (this.time.now < this.parryUntil) {
          dmg = Math.round(dmg * (1 - this.parryDamageReduction));
        }
        this.playerHp = Math.max(0, this.playerHp - dmg);
        this.showDamageNumber(this.hero, dmg, "#ff4444");
        this.events.emit("player-hp-changed", {
          hp: this.playerHp,
          maxHp: this.playerMaxHp,
        });

        if (this.time.now < this.riposteUntil) {
          this.damageEnemy(enemy, dmg * this.riposteReflectPercent);
        }

        this.applyStatusEffect(
          this.playerStatusEffects,
          this.rollStatusEffect(enemy),
        );

        this.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
        this.time.delayedCall(100, () => {
          if (this.hero) {
            this.hero.clearTint();
            this.hero.setTintMode(Phaser.TintModes.MULTIPLY);
          }
        });
      }
    }
  }

  updateEnemyProjectiles() {
    const grid = this.fogGrid;
    const remaining = [];

    for (const proj of this.enemyProjectiles) {
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

      if (traveled >= ENEMY_PROJECTILE_MAX_DISTANCE || outOfBounds || hitWall) {
        proj.sprite.destroy();
        continue;
      }

      const distToHero = Math.hypot(
        this.hero.x - proj.sprite.x,
        this.hero.y - proj.sprite.y,
      );
      if (distToHero <= PROJECTILE_RADIUS + 14) {
        let dmg = computeDamage(
          applyElementalResistance(
            proj.damage,
            proj.damageType,
            this.playerResistances,
          ),
          this.playerDefense,
        );
        if (this.time.now < this.parryUntil) {
          dmg = Math.round(dmg * (1 - this.parryDamageReduction));
        }
        this.playerHp = Math.max(0, this.playerHp - dmg);
        this.showDamageNumber(this.hero, dmg, "#ff4444");
        this.events.emit("player-hp-changed", {
          hp: this.playerHp,
          maxHp: this.playerMaxHp,
        });

        this.applyStatusEffect(
          this.playerStatusEffects,
          this.rollStatusEffect({ inflictsEffect: proj.inflictsEffect }),
        );

        this.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
        this.time.delayedCall(100, () => {
          if (this.hero) {
            this.hero.clearTint();
            this.hero.setTintMode(Phaser.TintModes.MULTIPLY);
          }
        });

        proj.sprite.destroy();
        continue;
      }

      remaining.push(proj);
    }

    this.enemyProjectiles = remaining;
  }

  craftItem(recipeId) {
    if (!this.unlockedRecipes.includes(recipeId)) return;
    const recipe = resolveCraftingRecipe(recipeId);
    if (!recipe) return;

    for (const ing of recipe.ingredients) {
      const have = this.inventory
        .filter((i) => i.itemId === ing.itemId)
        .reduce((sum, i) => sum + i.quantity, 0);
      if (have < ing.quantity) {
        this.showLootToast(`Il manque des ingrédients pour ${recipe.name}`);
        return;
      }
    }

    for (const ing of recipe.ingredients) {
      let remaining = ing.quantity;
      for (let i = this.inventory.length - 1; i >= 0 && remaining > 0; i--) {
        const entry = this.inventory[i];
        if (entry.itemId !== ing.itemId) continue;
        const take = Math.min(entry.quantity, remaining);
        entry.quantity -= take;
        remaining -= take;
        if (entry.quantity <= 0) this.inventory.splice(i, 1);
      }
    }

    this.addItemToInventory(recipe.resultItemId, recipe.resultQuantity);
    this.showLootToast(`${recipe.name} fabriquée !`);
  }

  drawHpBars() {
    const g = this.hpBarGraphics;
    g.clear();
    const barW = 28,
      barH = 4;

    for (const enemy of this.enemies) {
      if (!enemy.visible) continue;
      const ratio = enemy.hp / enemy.maxHp;
      const bx = enemy.sprite.x - barW / 2;
      const by = enemy.sprite.y - 26;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(bx, by, barW, barH);
      g.fillStyle(
        ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c,
        1,
      );
      g.fillRect(bx, by, barW * ratio, barH);
    }

    if (this.hero) {
      const ratio = Math.max(0, this.playerHp / this.playerMaxHp);
      const bx = this.hero.x - barW / 2;
      const by = this.hero.y - 30;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(bx, by, barW, barH);
      g.fillStyle(0x3498db, 1);
      g.fillRect(bx, by, barW * ratio, barH);
    }

    for (const summon of this.summons) {
      const ratio = summon.hp / summon.maxHp;
      const bx = summon.sprite.x - barW / 2;
      const by = summon.sprite.y - 26;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(bx, by, barW, barH);
      g.fillStyle(
        ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf39c12 : 0xe74c3c,
        1,
      );
      g.fillRect(bx, by, barW * ratio, barH);
    }
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
