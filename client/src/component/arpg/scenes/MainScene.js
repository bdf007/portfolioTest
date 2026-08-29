import Phaser from "phaser";
import { fetchLevel, saveProgress } from "../../../api/arpgClient";
import { createRng } from "../rng";
import { hasClearLineOfSight, createFogState } from "../fogOfWar";
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
import { computeEquipmentBonuses } from "../equipment";
import { resolveAbilityDef, ABILITY_DEFS } from "../abilityDefs";
import { resolveFuryDef } from "../furyDefs";

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
// couleur de flash par TYPE d'effet de statut - seul endroit du code ou
// la chaine `type` (arbitraire, choisie dans chaque itemDefs.js/
// abilityDefs.js) influence quoi que ce soit d'autre que l'identifiant
// de deduplication. Repli sur le rouge (bleed/generique) si un type
// inconnu de cette table apparait un jour.
const FURY_KILLS_REQUIRED = 10; // ajustable
const STATUS_EFFECT_COLORS = {
  burn: 0xff8800, // orange
  bleed: 0xcc0000, // rouge
  slow: 0x4488ff, // bleu - coherent avec l'explosion de performAoeDebuffAbility
  haste: 0x44ff88, // vert clair - pour un futur flash sur soi-meme si besoin
  acid: 0x88ff00, // vert
};
// combat ennemi
const ENEMY_ATTACK_COOLDOWN = 900;
const ENEMY_ATTACK_RANGE = 34; // portee de contact (attackType 'melee')
const ENEMY_RANGED_ATTACK_RANGE = 260; // portee de declenchement (attackType 'ranged') - plus large que le contact, sinon un ennemi a distance se comporterait comme un ennemi de melee qui rate juste sa portee
const ENEMY_PROJECTILE_SPEED = 220; // plus lent que celui du joueur (PROJECTILE_SPEED=320) - laisse une vraie chance d'esquiver
const ENEMY_PROJECTILE_MAX_DISTANCE = 300;

// rendu placeholder par biome, en attendant du vrai tile art - purement
// visuel, ne duplique aucune logique de génération (celle-ci reste
// entièrement côté serveur)
// lignes de salutation des PNJ ambiants (purement decoratifs, aucun
// rapport avec une quete) - une seule choisie au hasard (seedee) par
// PNJ a sa creation, cf. MainScene.createAmbientNpcs
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
  cavechain: { wall: 0x2f3a34, floor: 0xa8c0a0 }, // teinte verdatre/humide, distincte de la grotte classique
  drunkardwalk: { wall: 0x3a2f2a, floor: 0xb89878 }, // teinte terreuse/brune, tunnels creuses
  maze: { wall: 0x28282f, floor: 0x8a8a9a }, // gris froid, austere - coherent avec l'aspect labyrinthe oppressant
  noise: { wall: 0x2a3540, floor: 0x94b0a8 }, // teinte bleu-vert, cavites organiques
  voronoi: { wall: 0x3a2f3a, floor: 0xb090a0 }, // violet/rose desature, distinct des formes polygonales
  tree: { wall: 0x2e4a2a, floor: 0x5a7a4a }, // foret - le sol reste TOUJOURS en couleur pleine (floorKey=null dans TILE_IMAGE_REGISTRY, aucune vraie image de sol pour ce biome) ; le mur n'est qu'un repli si wall_tree echoue a charger
  temple: { wall: 0x32303c, floor: 0xbec8d7 },
  town: { wall: 0x5a4a3a, floor: 0xc8bfa0 }, // batiments en bois/pierre, place claire
};

/**
 * Scène de jeu principale. Contrairement à la démo de prototypage (un
 * seul fichier HTML qui devait tout simuler côté navigateur, génération
 * de niveau incluse), cette version appelle le vrai backend via
 * fetchLevel() et utilise les stats d'ennemis telles que renvoyées par
 * le serveur - jamais recalculées côté client, pour garder la même
 * garantie anti-triche que le reste de l'architecture (cf. commentaires
 * dans server/services/generation/enemyStats.js).
 *
 * Communique avec le composant React parent (arpg.jsx) par événements
 * Phaser plutôt que par manipulation directe du DOM - la démo utilisait
 * document.getElementById(), ce qui ne convient pas dans une vraie app
 * React (casse l'encapsulation, ne survit pas à un remount du composant).
 */
export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  /**
   * Cree les animations d'une entree du registre, namespacees par la
   * cle du registre (ex: 'hero1-walk-down', 'enemyDefault-walk-down') -
   * meme si plusieurs entrees partagent la meme texture aujourd'hui,
   * chacune garde ses propres objets Animation. Evite tout conflit le
   * jour ou une entree divergera vraiment (texture ou decoupage propre).
   */
  createAnimationsForEntry(entryKey, entry) {
    const prefix = entryKey + "-";
    if (this.anims.exists(prefix + "walk-down")) return; // deja cree

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
    this.abilityProjectiles = []; // projectiles de competences (ex: boule de feu) - distinct de this.projectiles (attaque a distance normale) car l'impact declenche une explosion en zone, pas des degats mono-cible

    this.xp = 0;
    this.playerLevel = 1;
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
    this.playerStatusEffects = []; // saignement/brulure actifs sur le heros - cf. updateStatusEffects
    this.meleeCooldown = createCooldown(PLAYER_MELEE_COOLDOWN);
    this.rangedCooldown = createCooldown(PLAYER_RANGED_COOLDOWN);
    this.isDead = false;
    this.currentDepth = 1;

    this.hpBarGraphics = this.add.graphics();
    this.hpBarGraphics.setDepth(20);

    this.enemyGroup = this.physics.add.group();
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
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
    // Mémoire des points remarquables découverts par étage.
    this.discoveredLandmarks = {};
    // brouillard deja decouvert par etage, pour les retours EN COURS DE
    // SESSION (distinct de la version sauvegardee, qui ne couvre que
    // sauvegarder+recharger la page) - cf. loadLevel/persistProgressAsync/
    // resumeFromSave
    this.floorFogCache = {};
    this.currentFloorKills = [];
    this.currentFloorOpenedChests = [];
    this.quests = {};
    this.unlockedAbilities = []; // ids de competences debloquees (kit de depart + niveau + loot/achat)
    this.furyKillCount = 0;
    this.pendingWeaponImbue = null; // enchantement du prochain coup en attente - consomme au premier coup qui TOUCHE, restitue si le coup rate
    this.touchFuryRequested = false;
    this.hotbarSlots = new Array(9).fill(null); // {type:'ability', id} | {type:'item', itemId} | null, par emplacement 1..9
    this.abilityCooldowns = {}; // {abilityId: timestamp du prochain tir autorise} - meme esprit que meleeCooldown/rangedCooldown mais par competence, pas un seul cooldown global
    this.itemCooldowns = {}; // {itemId prefixe: timestamp} - meme principe que abilityCooldowns, mais pour les consommables de la barre de raccourcis
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

  /**
   * Restaure XP/niveau/PV depuis une sauvegarde AVANT de charger le
   * niveau, avec la seed sauvegardee (regenere donc exactement le meme
   * plan). Contrairement a un changement d'etage normal (qui soigne
   * entierement, cf. loadLevel), reprendre une sauvegarde restaure les PV
   * exacts au moment de la sauvegarde - sinon recharger la page
   * deviendrait un soin gratuit exploitable.
   */
  async resumeFromSave(save) {
    this.currentGameId = save.gameId || null;
    this.visitedFloors = save.floors || [];
    const ps = save.playerState || {};
    this.discoveredLandmarks = ps.discoveredLandmarks || {};
    this.xp = ps.xp || 0;
    this.playerLevel = ps.level || 1;
    this.quests = ps.quests || {};
    this.inventory = ps.inventory || [];
    this.hotbarSlots = ps.hotbarSlots || new Array(9).fill(null);
    this.unlockedAbilities = ps.unlockedAbilities || [];
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

    // restaure la memoire de TOUS les etages deja explores (pas
    // seulement celui qu'on s'apprete a charger) - alimente le repli
    // automatique de loadLevel (effectiveSavedFogState) pour chaque
    // etage qu'on revisitera plus tard dans cette session reprise,
    // exactement comme si on n'avait jamais quitte le jeu
    this.floorFogCache = ps.floorFogCache || {};

    await this.loadLevel(
      save.depth,
      save.seed,
      ps.hp,
      ps.currentFloorKills || [],
      ps.currentFloorOpenedChests || [],
      ps.currentFloorLootSeed || null,
      null, // savedFogState explicite retire - this.floorFogCache (deja restaure ci-dessus) le fournit desormais via le repli automatique de loadLevel
      ps.playerPosition || null,
    );

    this.events.emit("xp-changed", { xp: this.xp });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
    this.events.emit("level-up", { level: this.playerLevel, stats });
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

  recalculatePlayerStats() {
    const heroProfile = resolveHeroStatsOverride(this.heroSpriteKey);

    const base = getPlayerStatsForLevel(this.playerLevel, heroProfile);

    const bonus = computeEquipmentBonuses(this.equipped);

    this.playerMaxHp = base.maxHp + bonus.maxHp;
    this.playerMeleeDamage = base.meleeDamage + bonus.meleeDamage;
    this.playerRangedDamage = base.rangedDamage + bonus.rangedDamage;
    this.playerDefense = base.defense + bonus.defense;

    this.playerMaxMana = base.mana + bonus.mana;
    this.playerMaxStamina = base.stamina + (bonus.stamina ?? 0);

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
    // restriction d'archetype eventuelle (armes/armures reservees a
    // certains heros, cf. def.archetypes optionnel dans itemDefs.js) -
    // absent/vide = equipable par tous, comportement inchange. Meme
    // mecanisme que pour les competences (cf. checkLevelUp/useConsumable
    // plus haut dans ce fichier).
    if (def.archetypes && def.archetypes.length > 0) {
      const heroArchetype = resolveHeroStatsOverride(
        this.heroSpriteKey,
      )?.archetype;
      if (!heroArchetype || !def.archetypes.includes(heroArchetype)) {
        this.showLootToast("Cet objet ne convient pas à ton archétype");
        return;
      }
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

    if (def.category !== "consumable" || !def.effect) return;

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

  /**
   * Coeur de la sauvegarde, en version async attendable.
   */
  async persistProgressAsync() {
    if (!this.currentSeed) return; // aucun niveau charge pour l'instant

    try {
      // brouillard de TOUS les etages deja explores (pas seulement
      // l'etage courant) - fusionne le cache en memoire (floorFogCache,
      // alimente a chaque changement d'etage, cf. loadLevel) avec l'etat
      // LIVE de l'etage courant : ce dernier n'est mis en cache QUE
      // lorsqu'on le QUITTE (cf. le debut de loadLevel), jamais en
      // continu pendant qu'on y est - sans cette fusion, l'etage sur
      // lequel le joueur se trouve AU MOMENT precis de la sauvegarde
      // manquerait toujours a l'appel.
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
          hp: this.playerHp,
          mana: this.playerMana,
          heroId: this.heroSpriteKey,
          currentFloorKills: this.currentFloorKills,
          currentFloorOpenedChests: this.currentFloorOpenedChests,
          currentFloorLootSeed: this.currentFloorLootSeed,
          quests: this.quests,
          inventory: this.inventory,
          hotbarSlots: this.hotbarSlots,
          furyKillCount: this.furyKillCount,
          unlockedAbilities: this.unlockedAbilities,
          equipped: this.equipped,
          discoveredLandmarks: this.discoveredLandmarks,
          timePlayedSeconds: this.getTotalTimePlayed(),

          // remplace l'ancien champ `fogState` (un seul etage, celui
          // courant) - desormais TOUS les etages deja explores, sous
          // forme de map {profondeur: tuiles decouvertes[]}
          floorFogCache: floorFogCacheToSave,

          // Position du joueur au moment de la sauvegarde
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
   * Charge un étage via l'API (GET /api/arpg/level) et reconstruit
   * entièrement la scène à partir de la réponse serveur.
   */
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
    // cache le brouillard de l'etage qu'on QUITTE (this.fogState/
    // this.currentDepth valent encore l'ANCIEN etage ici, avant d'etre
    // ecrases plus bas) - permet de le restaurer si le joueur y revient
    // plus tard dans la MEME session, sans avoir besoin de sauvegarder+
    // recharger la page
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

    // priorite au parametre explicite (reprise de sauvegarde), repli sur
    // le cache en memoire (retour en cours de session), sinon rien
    // (premiere visite)
    const effectiveSavedFogState =
      savedFogState || this.floorFogCache[depth] || null;

    this.currentDepth = depth;
    this.currentSeed = data.seed;
    // Initialise la mémoire des landmarks de cet étage.
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
    this.playerStatusEffects = []; // remis a zero a chaque changement d'etage, comme les projectiles
    this.pendingWeaponImbue = null; // transitoire, remis a zero a chaque changement d'etage comme les autres etats de combat

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

    const colors = TILESET_COLORS[tileset] || TILESET_COLORS.cave;
    const tilesetKey = "tiles-" + tileset;
    if (this.textures.exists(tilesetKey)) this.textures.remove(tilesetKey);
    const canvasTex = this.textures.createCanvas(
      tilesetKey,
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

    this.map = this.make.tilemap({
      data: grid,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const phaserTileset = this.map.addTilesetImage(
      tilesetKey,
      tilesetKey,
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
    );
    this.layer = this.map.createLayer(0, phaserTileset, 0, 0);
    this.layer.setCollision(WALL);
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
        questLoot: enemyData.questLoot || null, // objet garanti si une quete obtainItem le cible precisement - cf. damageEnemy
        inflictsEffect: enemyData.inflictsEffect || null, // saignement/brulure eventuel inflige au joueur - cf. rollStatusEffect/updateEnemyAttacks
        statusEffects: [], // saignement/brulure actifs SUR cet ennemi (infliges par le joueur) - cf. updateStatusEffects
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
      // Si on avait un brouillard restaure (sauvegarde OU cache
      // session), restaurer visuellement les cases deja decouvertes.
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
        this.playerVisionRadius,
      );

      this.applyFogChanges(initialChanges);
    }

    this.events.emit("level-loaded", { depth, biome: data.biome });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("hotbar-updated", [...this.hotbarSlots]);
    this.events.emit("fury-progress", {
      count: this.furyKillCount,
      required: FURY_KILLS_REQUIRED,
    });
    this.events.emit("abilities-updated", [...this.unlockedAbilities]);
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
      inflictsEffect: this.bossData.inflictsEffect || null, // saignement/brulure eventuel - meme mecanisme que les ennemis normaux
      statusEffects: [], // saignement/brulure actifs SUR le boss (infliges par le joueur)
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
      // marque le debut REEL de la pause - uniquement au premier passage
      // non-pause -> pause, jamais re-decale si une DEUXIEME raison
      // s'empile par-dessus une pause deja active
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
      // on sort REELLEMENT de pause (plus aucune raison active) - decale
      // tous les cooldowns en cours du temps ecoule pendant la pause,
      // pour qu'ils n'aient jamais avance "gratuitement" pendant que le
      // jeu semblait fige. HP/mana/stamina/statusEffects n'ont pas besoin
      // de ce traitement : ils ne progressent QUE via update() (cf.
      // updateRegen/updateStatusEffects), deja completement arrete par
      // gamePaused - seuls abilityCooldowns/itemCooldowns comparent un
      // timestamp absolu HORS de la boucle update(), d'ou ce trou.
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
          targetQuantity: npcData.targetQuantity, // uniquement pour questId==='obtainItem' - undefined sinon (repli sur 1 cote client, cf. openQuestDialog/turnInQuest)
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

  /**
   * Decide, avec une certaine probabilite, d'injecter une quete de
   * livraison entre PNJ CLIENT-SIDE.
   */
  maybeInjectDeliveryQuest(eligibleKeys) {
    if (eligibleKeys.length === 0) return;

    const injectRng = createRng(`${this.currentSeed}-delivery-inject`);
    if (injectRng() >= 0.2) return; // 20% de chance qu'une livraison apparaisse dans cette ville

    const giverKey =
      eligibleKeys[Math.floor(injectRng() * eligibleKeys.length)];

    // villes futures (VRAIS multiples de 10 - cf. TOWN_INTERVAL cote
    // serveur, biomeConfig.js - jamais currentDepth+10*k, qui ne
    // correspond a une vraie ville que si currentDepth est deja lui-meme
    // un multiple de 10 par coincidence. Bug corrige : depuis l'etage 1,
    // l'ancien calcul donnait 11/21/31...91 - aucun de ces etages n'est
    // une ville, rendant la quete de livraison IMPOSSIBLE a completer,
    // faute de PNJ destinataire a cet endroit) au-dela de l'etage
    // courant, dans la limite du jeu, PAS encore dans this.visitedFloors
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
    } else if (qs.accepted) {
      const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
      text =
        custom.progress ||
        `Progression : ${qs.killCount} / ${qs.target} ${enemyName} tués. Reviens me voir une fois terminé !`;
    } else {
      const enemyName = resolveEnemyDisplayName(qs.targetEnemyType);
      text =
        custom.offer || `Peux-tu tuer ${qs.target} ${enemyName} pour moi ?`;
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
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
    this.events.emit("quests-updated", { ...this.quests });

    this.addItemToInventory("gold", qs.goldReward);
  }

  openAmbientDialog(npc) {
    this.dialogOpen = true;
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
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
  }

  update(time, delta) {
    if (!this.hero || this.isDead) return;
    if (this.gamePaused) return;
    this.updateRegen(delta);

    const speed = this.getEffectivePlayerMoveSpeed();
    let vx = 0,
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

    if (moving) {
      this.hero.anims.play(this.heroSpriteKey + "-walk-" + dir, true);
      this.lastDir = dir;
    } else {
      this.hero.anims.play(this.heroSpriteKey + "-idle-" + this.lastDir, true);
    }

    if (moving) {
      const len = Math.hypot(vx, vy);
      this.lastAimVector = { x: vx / len, y: vy / len };
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
          this.playerVisionRadius,
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

    this.events.emit("fog-changed", {
      grid: this.fogGrid,
      fogState: this.fogState.state,
      playerTile: this.lastPlayerTile,
      exitTile: this.exitTile,
      upstairsTile: this.upstairsTile,
      questNpcs,
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

    for (const enemy of this.enemies) {
      const ex = Math.floor(enemy.sprite.x / TILE_SIZE);
      const ey = Math.floor(enemy.sprite.y / TILE_SIZE);
      const distanceToPlayer = Math.hypot(ex - playerTileX, ey - playerTileY);
      const losClear = hasClearLineOfSight(
        grid,
        width,
        height,
        ex,
        ey,
        playerTileX,
        playerTileY,
      );
      const arrivedAtHome =
        Math.hypot(ex - enemy.home.x, ey - enemy.home.y) < 1;
      const isPlayerBehind = this.isPlayerBehindEnemy(
        enemy,
        ex,
        ey,
        playerTileX,
        playerTileY,
      );

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
          { x: playerTileX, y: playerTileY },
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

      if (enemy.state === "chase" || enemy.state === "returning") {
        const distToHero = Math.hypot(
          this.hero.x - enemy.sprite.x,
          this.hero.y - enemy.sprite.y,
        );
        const isRanged = enemy.attackType === "ranged";
        const stopDistance = isRanged
          ? ENEMY_RANGED_STOP_DISTANCE
          : ENEMY_STOP_DISTANCE;
        const stopForMelee =
          enemy.state === "chase" && distToHero < stopDistance;

        if (
          enemy.state === "chase" &&
          isRanged &&
          distToHero < ENEMY_RANGED_RETREAT_DISTANCE
        ) {
          const dx = enemy.sprite.x - this.hero.x;
          const dy = enemy.sprite.y - this.hero.y;
          const mag = Math.hypot(dx, dy) || 1;
          const vx = (dx / mag) * this.getEffectiveEnemySpeed(enemy);
          const vy = (dy / mag) * this.getEffectiveEnemySpeed(enemy);
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

  /**
   * Regeneration PASSIVE de PV/mana/stamina - tres lente par design, et
   * grimpe legerement avec le niveau (formule base + croissance*niveau).
   * Appelee chaque frame depuis update(). Jamais au-dela du maximum de
   * chaque stat, et aucun evenement emis si deja au max (evite du bruit
   * inutile).
   */
  updateRegen(deltaMs) {
    const n = this.playerLevel - 1;
    const deltaSec = deltaMs / 1000;

    if (this.playerHp < this.playerMaxHp) {
      const rate = HP_REGEN_PER_SEC_BASE + HP_REGEN_PER_SEC_GROWTH * n;
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
      const rate = MANA_REGEN_PER_SEC_BASE + MANA_REGEN_PER_SEC_GROWTH * n;
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
        STAMINA_REGEN_PER_SEC_BASE + STAMINA_REGEN_PER_SEC_GROWTH * n;
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
      if (imbue) rawDamage += imbue.bonusDamage;
      this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      anyHit = true;

      if (enemy.hp > 0) {
        this.applyStatusEffect(
          enemy.statusEffects,
          this.rollStatusEffect(meleeWeaponDef),
        );
        if (imbue)
          this.applyStatusEffect(
            enemy.statusEffects,
            this.rollStatusEffect(imbue),
          );
      }
    }

    if (imbue && !anyHit) {
      this.pendingWeaponImbue = imbue; // coup dans le vide - restitue plutot que gaspille
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

    // weaponDef ET la munition equipee (this.equipped.quiver) sont TOUTES
    // DEUX capturees ICI (au moment du tir) - une munition (fleche,
    // carreau) peut porter son PROPRE inflictsEffect, independant de
    // celui de l'arme qui la propulse (ex: une fleche enflammee tiree par
    // un arc normal, ou l'inverse). null si aucune munition equipee
    // (arme magique comme le baton, requiresAmmo absent).
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
          if (proj.imbue) rawDamage += proj.imbue.bonusDamage;
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

  /**
   * Active l'emplacement `slotIndex` (0-8, correspond aux touches 1-9) de
   * la barre de raccourcis - un pouvoir OU un objet (potion), selon ce qui
   * y est assigne. Meme garde de pause/mort que performMeleeAttack/
   * performRangedAttack (jamais appelee directement par React sans passer
   * par ce chemin).
   */
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
      this.useConsumable(invIndex); // le cooldown est verifie A L'INTERIEUR desormais
      return;
    }

    this.performAbility(slot.id);
  }

  /**
   * Utilise un parchemin DEPUIS LA BARRE - different de useConsumable
   * (qui APPREND definitivement) : si l'archetype correspond, retombe
   * sur l'apprentissage normal (un parchemin compatible reste toujours
   * preferable a apprendre plutot qu'a "gaspiller" en usage unique). Si
   * l'archetype ne correspond PAS, devient un consommable a USAGE UNIQUE
   * - lance la competence UNE FOIS, jamais apprise, sans cout en mana/
   * stamina (le parchemin porte deja son propre "cout" : il disparait),
   * avec le MEME cooldown que les potions (itemCooldowns).
   */
  useScrollFromHotbar(itemId) {
    const invIndex = this.inventory.findIndex((i) => i.itemId === itemId);
    if (invIndex === -1) {
      this.showLootToast("Parchemin épuisé");
      return;
    }

    const def = resolveItemDef(itemId);
    const abilityDef = resolveAbilityDef(def.grantsAbility);
    const heroArchetype = resolveHeroStatsOverride(
      this.heroSpriteKey,
    )?.archetype;

    const archetypeMatches =
      !abilityDef.archetypes ||
      abilityDef.archetypes.length === 0 ||
      abilityDef.archetypes.includes(heroArchetype);
    // meme garde que les autres chemins d'apprentissage (checkLevelUp,
    // useConsumable) - une competence dont la ressource necessaire est
    // plafonnee a 0 pour ce heros ne peut JAMAIS etre apprise
    // "normalement", peu importe si l'archetype correspond par ailleurs
    const resourceAvailable =
      (!abilityDef.staminaCost || this.playerMaxStamina > 0) &&
      (!abilityDef.manaCost || this.playerMaxMana > 0);

    if (archetypeMatches && resourceAvailable) {
      this.useConsumable(invIndex);
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

  /**
   * Execute une competence par son id - verifie cooldown INDIVIDUEL (par
   * competence, pas un seul cooldown global comme pour melee/ranged) et
   * stamina, puis dispatche selon effectType. Seul 'aoe' est implemente
   * pour l'instant - 'pierce'/'debuff'/'buff' a construire sur le meme
   * schema, cf. abilityDefs.js.
   */
  performAbility(abilityId) {
    if (!this.unlockedAbilities.includes(abilityId)) return;

    const def = resolveAbilityDef(abilityId);
    const now = this.time.now;
    const readyAt = this.abilityCooldowns[abilityId] || 0;
    if (now < readyAt) {
      this.showLootToast("Compétence en recharge");
      return;
    }

    // ressource consommee : stamina OU mana, jamais les deux - chaque
    // competence declare UN SEUL des deux couts (cf. abilityDefs.js) selon
    // ce qui est coherent avec son archetype (coup physique -> stamina,
    // sort -> mana)
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
    this.abilityCooldowns[abilityId] = now + def.cooldownMs;
    this.events.emit("hotbar-cooldown-started", {
      key: `ability:${abilityId}`,
      cooldownMs: def.cooldownMs,
      startedAt: Date.now(),
    });
  }

  /**
   * Degats en zone autour du heros (rayon def.radius) - touche TOUS les
   * ennemis visibles dans ce rayon, pas juste un cone comme la melee de
   * base. Reutilise damageEnemy tel quel (meme consequences qu'un coup
   * normal : XP/butin/quete/mort). Pas de critique ici (les competences
   * ont leurs propres degats fixes, distincts du systeme melee/ranged).
   */
  performAoeAbility(def) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > def.radius) continue;
      this.damageEnemy(enemy, computeDamage(def.damage, enemy.defense));
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
  /**
   * Lance un projectile de competence (boule de feu) - meme auto-visee
   * que l'attaque a distance normale (ennemi visible le plus proche,
   * repli sur lastAimVector), mais stocke dans this.abilityProjectiles
   * (SEPARE de this.projectiles) car son impact declenche une explosion
   * en zone plutot que des degats mono-cible.
   */
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
  /**
   * Lance un projectile PERFORANT - meme auto-visee que les autres
   * projectiles, mais NE S'ARRETE JAMAIS au premier contact (cf.
   * updateAbilityProjectiles, qui distingue le comportement via
   * def.effectType). hitEnemyIds (un Set de references d'objets ennemi,
   * pas d'ids numeriques) evite de toucher DEUX FOIS le meme ennemi
   * pendant qu'il reste dans le rayon de collision sur plusieurs frames
   * consecutives.
   */
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
  /**
   * Buff temporaire SUR LE JOUEUR lui-meme (ex: hate) - reutilise
   * applyStatusEffect/this.playerStatusEffects, kind:'modifier'. Aucune
   * cible a viser, applique immediatement.
   */
  performSelfBuffAbility(def) {
    this.applyStatusEffect(this.playerStatusEffects, {
      type: def.id,
      kind: "modifier",
      statModifiers: def.statModifiers,
      durationMs: def.durationMs,
    });
    this.showLootToast(`${def.name} activé !`);
  }

  /**
   * Debuff temporaire (ex: ralentissement) a TOUS les ennemis visibles
   * dans def.radius - meme perimetre que performAoeAbility (degats) mais
   * applique un statusEffect plutot qu'un coup instantane.
   */
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

    const circle = this.add.circle(this.hero.x, this.hero.y, 10, 0x4488ff, 0.4); // bleu, distinct de l'orange feu
    circle.setDepth(14);
    this.tweens.add({
      targets: circle,
      radius: def.radius,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });
  }

  /**
   * Explosion au point d'impact d'une competence-projectile - touche TOUS
   * les ennemis visibles dans def.radius autour de CE POINT (pas autour
   * du heros, contrairement a performAoeAbility). Reutilise damageEnemy
   * tel quel.
   */
  explodeAbilityProjectile(def, x, y) {
    for (const enemy of this.enemies) {
      if (!this.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(enemy.sprite.x - x, enemy.sprite.y - y);
      if (dist > def.radius) continue;
      this.damageEnemy(enemy, computeDamage(def.damage, enemy.defense));
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

  /**
   * Fait avancer this.abilityProjectiles - meme structure que
   * updateProjectiles (deplacement, sortie de limites/mur, visibilite au
   * brouillard), mais l'impact declenche explodeAbilityProjectile
   * (explosion en zone) plutot que des degats mono-cible.
   */
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
            this.damageEnemy(
              enemy,
              computeDamage(proj.def.damage, enemy.defense),
            );
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
  /**
   * Assigne une competence OU un objet (potion) a un emplacement de la
   * barre de raccourcis (0-8). Si ce MEME pouvoir/objet est deja assigne
   * a un AUTRE emplacement, on le retire de la-bas d'abord (deplace
   * plutot que duplique) - purement une question de clarte pour le
   * joueur (fonctionnellement, un doublon ne casserait rien : le
   * cooldown est partage par abilityId, pas par emplacement), mais deux
   * touches pour exactement la meme action preterait a confusion.
   */
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

  /**
   * Tire (aleatoire simple, Math.random - meme esprit que rollCritical
   * dans combat.js) si une source (arme du joueur ou type d'ennemi,
   * toutes deux au format {inflictsEffect: {type, chance, damagePerTick,
   * tickIntervalMs, ticks}}) declenche son effet de statut sur CE coup
   * precis. Renvoie l'effet a appliquer, ou null si la source n'en
   * inflige aucun ou si le tirage a echoue.
   */
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

    // dot (saignement/brulure, inchange)
    return {
      type: inflict.type,
      kind: "dot",
      damagePerTick: inflict.damagePerTick,
      tickIntervalMs: inflict.tickIntervalMs,
      ticksRemaining: inflict.ticks,
    };
  }

  /**
   * Ajoute/rafraichit un effet de statut sur une cible (enemy.statusEffects
   * OU this.playerStatusEffects, meme forme des deux cotes). Un effet du
   * MEME type REMPLACE l'existant (rafraichit la duree) plutot que de
   * s'empiler.
   */
  applyStatusEffect(list, effect) {
    if (!effect) return;
    const existingIndex = list.findIndex((e) => e.type === effect.type);
    if (existingIndex !== -1) list.splice(existingIndex, 1);
    if (effect.kind === "modifier") {
      // buff/debuff : PAS de tic - juste une expiration a verifier chaque
      // frame (cf. updateStatusEffects). L'effet reste actif tant que
      // present dans la liste - getEffectiveEnemySpeed/
      // getEffectivePlayerMoveSpeed relisent la liste EN DIRECT, jamais
      // de valeur mise en cache a "annuler" explicitement a l'expiration.
      list.push({ ...effect, expiresAt: this.time.now + effect.durationMs });
    } else {
      list.push({
        ...effect,
        nextTickAt: this.time.now + effect.tickIntervalMs,
      });
    }
  }

  /**
   * Flash de teinte bref pour signaler un tic de saignement (rouge) ou
   * de brulure (orange).
   */
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

  /**
   * Fait avancer tous les effets de statut actifs - cote ENNEMIS
   * (enemy.statusEffects) ET cote JOUEUR (this.playerStatusEffects). Un
   * tic passe TOUJOURS par damageEnemy / la reduction normale de
   * playerHp.
   */
  updateStatusEffects(now) {
    for (const enemy of this.enemies) {
      if (!enemy.statusEffects || enemy.statusEffects.length === 0) continue;
      const remaining = [];
      for (const effect of enemy.statusEffects) {
        if (effect.kind === "modifier") {
          if (now < effect.expiresAt) remaining.push(effect);
          continue; // jamais de degats/flash pour un modificateur pur
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

  /**
   * Vitesse de deplacement EFFECTIVE d'un ennemi - base ENEMY_SPEED
   * (globale : le champ enemy.speed calcule cote serveur par archetype
   * n'est PAS branche cote client aujourd'hui, hors perimetre de cette
   * demande) moduleé par les effets de statut actifs portant
   * statModifiers.moveSpeedPercent (ex: 'slow' a -0.5). Jamais sous 20%
   * de la vitesse de base - un ennemi ralenti reste toujours un minimum
   * mobile, jamais totalement fige.
   */
  getEffectiveEnemySpeed(enemy) {
    let multiplier = 1;
    for (const effect of enemy.statusEffects) {
      if (effect.statModifiers?.moveSpeedPercent) {
        multiplier += effect.statModifiers.moveSpeedPercent;
      }
    }
    return Math.max(ENEMY_SPEED * 0.2, ENEMY_SPEED * multiplier);
  }

  /**
   * Meme principe pour le heros - this.playerMoveSpeed (deja calcule par
   * recalculatePlayerStats, niveau+equipement) module par les effets
   * actifs (ex: 'haste' a +0.6).
   */
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
  /**
   * Declenche la furie de l'archetype actuel - disponible uniquement une
   * fois this.furyKillCount >= FURY_KILLS_REQUIRED. Contrairement aux
   * competences normales : AUCUN cout en ressource, AUCUN cooldown
   * temporel.
   */
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
        this.damageEnemy(enemy, computeDamage(fury.aoeDamage, enemy.defense));
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
    // se faire TOUCHER physiquement est TOUJOURS une detection, quelle
    // que soit la position (dos ou face) - contrairement a
    // decideNextState (base uniquement sur position/ligne de vue), etre
    // frappe ne peut pas rester "non detecte" indefiniment. Sans ca, un
    // ennemi jamais repere restait eternellement en patrol/guard/etc,
    // rendant CHAQUE coup un critique GARANTI a l'infini (cf.
    // rollCritical(enemy.state !== 'chase'), deja calcule par l'appelant
    // AVANT ce point - le coup EN COURS garde donc son statut de critique
    // deja decide, seuls les coups SUIVANTS perdent la garantie).
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

    const result = applyDamage(enemy, amount);
    enemy.hp = result.hp;

    if (result.died) {
      this.xp += enemy.xpReward;
      this.events.emit("xp-changed", { xp: this.xp });
      this.checkLevelUp();
      this.currentFloorKills.push(enemy.spawnIndex);
      // alimente la furie - plafonne a FURY_KILLS_REQUIRED, jamais au-dela
      // (pas besoin de deborder, useFury remet a 0 de toute facon au
      // declenchement)
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

      // objet de quete garanti pour un ennemi NORMAL (cf. enemy.questLoot,
      // derive de ENEMY_TYPES[...].questLoot cote serveur) - INDEPENDANT
      // du coffre de butin classique ci-dessus. Un seul objet par ennemi
      // (contrairement au boss, qui garantit TOUS les objets de quete
      // actifs a la fois) - jamais de drop sans quete active qui cible
      // PRECISEMENT cet objet.
      if (!enemy.isBoss && enemy.questLoot) {
        for (const questKey of Object.keys(this.quests)) {
          const qs = this.quests[questKey];
          if (qs.questId !== "obtainItem" || !qs.accepted || qs.completed)
            continue;
          if (qs.targetItemId !== enemy.questLoot) continue;
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
      let justCompletedReward = null;
      for (const questKey of Object.keys(this.quests)) {
        const qs = this.quests[questKey];
        if (!qs.accepted || qs.completed) continue;
        if (qs.targetEnemyType && qs.targetEnemyType !== enemy.archetype)
          continue;
        qs.killCount++;
        if (qs.killCount >= qs.target) {
          qs.completed = true;
          this.xp += qs.xpReward;
          this.events.emit("xp-changed", { xp: this.xp });
          if (qs.itemReward) {
            this.addItemToInventory(
              qs.itemReward.itemId,
              qs.itemReward.quantity,
            );
            if (!justCompletedReward) justCompletedReward = qs.itemReward;
          }
        }
        anyQuestUpdated = true;
      }
      if (anyQuestUpdated) {
        this.events.emit("quests-updated", { ...this.quests });
        this.persistProgress();
      }
      if (justCompletedReward) {
        const itemDef = resolveItemDef(justCompletedReward.itemId);
        this.showLootToast(
          `Quête terminée ! Reçu : ${itemDef.name} x${justCompletedReward.quantity}`,
        );
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

    this.playerLevel = level;
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
      // <-- LES 2 NOUVELLES LIGNES, ICI, entre le filtre "deja debloquee"
      // et le push - jamais debloquer une competence dont la ressource
      // necessaire est plafonnee a 0 pour ce heros precis
      if (def.staminaCost && this.playerMaxStamina <= 0) continue;
      if (def.manaCost && this.playerMaxMana <= 0) continue;
      this.unlockedAbilities.push(def.id);
      anyAbilityUnlocked = true;
      this.showLootToast(`Nouvelle compétence débloquée : ${def.name} !`);
    }
    if (anyAbilityUnlocked)
      this.events.emit("abilities-updated", [...this.unlockedAbilities]);

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
    this.persistProgress();
  }

  updateEnemyAttacks(now) {
    for (const enemy of this.enemies) {
      if (enemy.state !== "chase") continue;
      if (!enemy.attackCooldown.isReady(now)) continue;

      if (enemy.attackType === "ranged") {
        const dist = Math.hypot(
          enemy.sprite.x - this.hero.x,
          enemy.sprite.y - this.hero.y,
        );
        if (dist > ENEMY_RANGED_ATTACK_RANGE) continue;
        enemy.attackCooldown.trigger(now);

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

        // damage ET inflictsEffect captures ICI (etat de l'ennemi au
        // moment du tir), jamais relus plus tard
        this.enemyProjectiles.push({
          sprite,
          startX: enemy.sprite.x,
          startY: enemy.sprite.y,
          damage: enemy.damage,
          inflictsEffect: enemy.inflictsEffect,
        });
        continue;
      }

      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > ENEMY_ATTACK_RANGE) continue;

      enemy.attackCooldown.trigger(now);
      const dmg = computeDamage(enemy.damage, this.playerDefense);
      this.playerHp = Math.max(0, this.playerHp - dmg);
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });

      // effet de statut eventuel de cet ennemi (saignement/brulure)
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
        const dmg = computeDamage(proj.damage, this.playerDefense);
        this.playerHp = Math.max(0, this.playerHp - dmg);
        this.events.emit("player-hp-changed", {
          hp: this.playerHp,
          maxHp: this.playerMaxHp,
        });

        // effet de statut capture au TIR (proj.inflictsEffect), pas une
        // relecture de l'ennemi qui a tire
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
  }
}
