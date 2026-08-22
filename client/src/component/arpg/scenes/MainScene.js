import Phaser from "phaser";
import { fetchLevel, saveProgress } from "../../../api/arpgClient";
import { createRng } from "../rng";
import { hasClearLineOfSight, createFogState } from "../fogOfWar";
import { findPath } from "../pathfinding";
import { createEnemyBehavior, decideNextState } from "../enemyBehavior";
import { computeDamage, applyDamage, createCooldown } from "../combat";
import { computeLevelFromXp, getPlayerStatsForLevel } from "../leveling";
import {
  SPRITE_REGISTRY,
  resolveEnemySprite,
  TILE_IMAGE_REGISTRY,
} from "../spriteRegistry";
import { resolveItemDef } from "../itemDefs";
import { computeEquipmentBonuses } from "../equipment";

const TILE_SIZE = 32;
const WALL = 1;

const VISION_RADIUS = 6;
const ENEMY_SPEED = 90;
const ENEMY_STOP_DISTANCE = 28;

// combat joueur - hp/degats/defense viennent desormais de leveling.js
// (varient avec le niveau), seuls porte/cooldown/vitesse restent fixes ici
const PLAYER_MELEE_RANGE = 46;
// produit scalaire minimal entre le vecteur heros->cible normalise et la
// direction de visee reelle (this.lastAimVector) pour qu'une cible soit
// consideree "devant" - 0.5 = cone de ~120 degres (±60° autour du centre).
// Un attaque au corps a corps ne doit toucher que devant le heros, pas
// tout autour (cf. le rapport correspondant).
const MELEE_CONE_DOT_THRESHOLD = 0.5;
const PLAYER_MELEE_COOLDOWN = 420;
const PLAYER_RANGED_COOLDOWN = 650;
const PROJECTILE_SPEED = 320;
const PROJECTILE_MAX_DISTANCE = 380;
const PROJECTILE_RADIUS = 5;

// combat ennemi
const ENEMY_ATTACK_COOLDOWN = 900;
const ENEMY_ATTACK_RANGE = 34;

// rendu placeholder par biome, en attendant du vrai tile art - purement
// visuel, ne duplique aucune logique de génération (celle-ci reste
// entièrement côté serveur)
const TILESET_COLORS = {
  cave: { wall: 0x3a3542, floor: 0xc8be9e },
  ruins: { wall: 0x372f38, floor: 0xd2b48c },
  cavechain: { wall: 0x2f3a34, floor: 0xa8c0a0 }, // teinte verdatre/humide, distincte de la grotte classique
  drunkardwalk: { wall: 0x3a2f2a, floor: 0xb89878 }, // teinte terreuse/brune, tunnels creuses
  maze: { wall: 0x28282f, floor: 0x8a8a9a }, // gris froid, austere - coherent avec l'aspect labyrinthe oppressant
  noise: { wall: 0x2a3540, floor: 0x94b0a8 }, // teinte bleu-vert, cavites organiques
  voronoi: { wall: 0x3a2f3a, floor: 0xb090a0 }, // violet/rose desature, distinct des formes polygonales
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
    // repeat:0 (une seule fois) pour les entrees purement visuelles comme
    // meleeSlashEffect - un cycle de marche infini n'aurait aucun sens
    // pour un flash de degats. repeat:-1 (boucle) pour tout le reste,
    // comportement inchange.
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

    // heros choisi a l'ecran de selection (React), transmis via le
    // registre Phaser (donnee globale au niveau du jeu, pas de la scene -
    // cf. arpg.jsx qui fait game.registry.set('heroId', ...) avant de
    // demarrer). Repli sur hero1 si absent (ne devrait pas arriver en usage
    // normal, mais evite un plantage si jamais la scene demarre sans
    // passer par l'ecran de selection).
    this.heroSpriteKey = this.registry.get("heroId") || "hero1";

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.Z,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.Q,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      melee: Phaser.Input.Keyboard.KeyCodes.SPACE,
      ranged: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });

    this.hero = null;
    this.layer = null;
    this.fogLayer = null;
    this.fogState = null;
    this.fogGrid = null;
    this.lastPlayerTile = null;
    this.lastDir = "down";
    this.lastAimVector = { x: 0, y: 1 }; // correspond a 'down' (y positif = vers le bas a l'ecran)
    this.enemies = [];
    this.projectiles = [];

    this.xp = 0;
    this.playerLevel = 1;
    this.equipped = { weapon: null, armor: null, accessory: null }; // itemId par emplacement, ou null - AVANT recalculatePlayerStats
    this.recalculatePlayerStats();
    this.playerHp = this.playerMaxHp;
    this.meleeCooldown = createCooldown(PLAYER_MELEE_COOLDOWN);
    this.rangedCooldown = createCooldown(PLAYER_RANGED_COOLDOWN);
    this.isDead = false;
    this.currentDepth = 1;

    this.hpBarGraphics = this.add.graphics();
    this.hpBarGraphics.setDepth(20);

    // groupe physique des ennemis : une collision auto-geree par Phaser
    // entre TOUS les membres du groupe (self-collision), plutot que
    // d'avoir a poser une collision par paire manuellement. Cree une
    // seule fois, persiste a travers les changements de niveau (seul son
    // contenu change, cf. loadLevel). Sans ca, les ennemis peuvent se
    // superposer sur la meme case et se deplacer comme un seul bloc.
    this.enemyGroup = this.physics.add.group();
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);
    // colliders crees PENDANT loadLevel() (contre this.layer/this.questNpcs,
    // tous deux recrees a chaque changement d'etage) - traces ici pour
    // etre explicitement detruits au debut du loadLevel() suivant, cf.
    // le commentaire la-bas. Ne contient JAMAIS le collider ci-dessus
    // (self-collision du groupe), qui lui doit persister pour toujours.
    this.levelColliders = [];

    // tileset du brouillard : tuile 0 = noir plein (jamais vu),
    // tuile 1 = noir semi-transparent (deja vu, hors de vue actuelle) -
    // genere une seule fois, reutilise pour tous les niveaux
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
    this.currentGameId = null; // id de la partie en base - null tant qu'aucune sauvegarde n'a encore ete creee
    this.visitedFloors = []; // historique {depth, seed} - permet de regenerer exactement le meme plan en y retournant
    this.currentFloorKills = []; // indices des ennemis tues lors de la visite EN COURS (ecrase a chaque loadLevel)
    this.currentFloorOpenedChests = []; // meme principe pour les coffres
    this.quests = {}; // quetes actives/terminees, indexees par "depth-npcIndex" - cf. createQuestNpcs
    this.activeDialogQuestKey = null; // quelle quete le dialogue actuellement ouvert concerne (cf. openQuestDialog/acceptQuest)
    this.inventory = []; // {itemId, quantity}[] - persiste pour toute la partie, jamais reinitialise entre niveaux
    this.gamePaused = false; // vrai pendant la confirmation de remontee (cf. showUpstairsPrompt)
    this.pauseReasons = new Set(); // cf. pauseGame/unpauseGame - plusieurs sources de pause possibles (remontee, inventaire...) sans qu'elles se marchent dessus

    // temps de jeu : baseline chargee depuis la sauvegarde (0 pour une
    // partie fraiche) + temps ecoule depuis le debut de CETTE session,
    // recalcule a chaque fois plutot qu'accumule par petits bouts - evite
    // tout risque de derive. sessionStartedAt reste "maintenant" que la
    // partie soit fraiche ou reprise (seule la baseline differe).
    this.timePlayedBaseline = 0;
    this.sessionStartedAt = Date.now();

    // sauvegarde automatique periodique - complement des sauvegardes
    // immediates (changement d'etage, montee de niveau) pour capturer
    // aussi les degats/soins encaisses en combat sans sauvegarder a
    // chaque coup (ce qui spammerait l'API pendant un combat rapproche)
    this.time.addEvent({
      delay: 8000,
      loop: true,
      callback: () => this.persistProgress(),
    });

    this.startGame();
  }

  /**
   * Reprend une partie sauvegardee si React en a trouve une (deposee dans
   * le registre Phaser via game.registry.set('resumeSave', save) avant le
   * demarrage - cf. arpg.jsx), sinon demarre une nouvelle partie a
   * l'etage 1. React a deja fait l'appel fetchMyGames() pour construire
   * l'ecran de selection de partie - pas la peine de le refaire ici, on
   * reutilise directement ce qu'il a trouve.
   */
  async startGame() {
    const resumeSave = this.registry.get("resumeSave");
    if (resumeSave) {
      await this.resumeFromSave(resumeSave);
      return;
    }
    this.loadLevel(this.currentDepth);
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
    this.xp = ps.xp || 0;
    this.playerLevel = ps.level || 1;
    this.quests = ps.quests || {}; // restaure AVANT loadLevel : createQuestNpc n'ecrase jamais une entree deja presente
    this.inventory = ps.inventory || [];
    this.equipped = ps.equipped || {
      weapon: null,
      armor: null,
      accessory: null,
    };
    this.timePlayedBaseline = ps.timePlayedSeconds || 0; // sessionStartedAt reste "maintenant" (deja fixe dans create())

    const stats = getPlayerStatsForLevel(this.playerLevel);
    this.recalculatePlayerStats(); // combine niveau + bonus d'equipement (this.equipped deja restaure ci-dessus)

    await this.loadLevel(
      save.depth,
      save.seed,
      ps.hp,
      ps.currentFloorKills || [],
      ps.currentFloorOpenedChests || [],
      ps.currentFloorLootSeed || null,
    );

    // reutilise les events existants pour que le HUD React se mette a
    // jour avec l'etat restaure, sans avoir besoin d'un event dedie
    this.events.emit("xp-changed", { xp: this.xp });
    this.events.emit("level-up", { level: this.playerLevel, stats });
  }

  /**
   * Temps de jeu total (secondes) pour cette partie : baseline chargee a
   * la reprise + temps ecoule depuis le debut de cette session precise.
   * Recalcule a chaque appel plutot qu'accumule progressivement, pour ne
   * jamais deriver.
   */
  getTotalTimePlayed() {
    return (
      this.timePlayedBaseline +
      Math.floor((Date.now() - this.sessionStartedAt) / 1000)
    );
  }

  /**
   * Ajoute un objet a l'inventaire - fusionne dans une pile existante si
   * l'objet est empilable (potions, or...), sinon cree une entree
   * distincte par exemplaire (equipement : chaque epee trouvee reste
   * separee, meme si on en a plusieurs). `resolveItemDef` gere le repli
   * si l'objet n'est pas encore connu du client (nouvel objet ajoute
   * cote serveur avant mise a jour de itemDefs.js) - stackable=true par
   * defaut dans ce cas, choix le moins surprenant.
   */
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

  /**
   * Recalcule les stats de combat actuelles (niveau + bonus d'equipement
   * combines) et met a jour les champs caches (this.playerMaxHp etc.) -
   * NE TOUCHE JAMAIS this.playerHp lui-meme : c'est a l'appelant de
   * decider quoi en faire (soin complet a la montee de niveau,
   * preservation de l'ecart manquant a l'equipement...), cf. les points
   * d'appel (create, resumeFromSave, checkLevelUp, equipItem, unequipItem).
   */
  recalculatePlayerStats() {
    const base = getPlayerStatsForLevel(this.playerLevel);
    const bonus = computeEquipmentBonuses(this.equipped);
    this.playerMaxHp = base.maxHp + bonus.maxHp;
    this.playerMeleeDamage = base.meleeDamage + bonus.meleeDamage;
    this.playerRangedDamage = base.rangedDamage + bonus.rangedDamage;
    this.playerDefense = base.defense + bonus.defense;
  }

  /**
   * Ajuste this.playerHp apres un changement de playerMaxHp (equiper/
   * deséquiper un objet a charme de vitalite, par exemple) - preserve
   * l'ECART de PV manquants plutot que de soigner gratuitement ou, a
   * l'inverse, punir injustement le joueur. Ex: 80/100 PV, equipe +20
   * maxHp -> 100/120 (toujours 20 PV manquants, pas 100/120 soigne a
   * fond gratuitement). Jamais sous 1 PV (pas de mort instantanee juste
   * en deséquipant un objet).
   */
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

  /**
   * Equipe un objet de l'inventaire (par son index) dans son emplacement
   * (arme/armure/accessoire, cf. def.slot) - l'objet precedemment
   * equipe a cet emplacement, s'il y en avait un, retourne dans
   * l'inventaire. Ignore silencieusement si l'index est invalide ou si
   * l'objet n'est pas equipable (pas de raison de planter sur un clic
   * UI mal aligne).
   */
  equipItem(index) {
    const item = this.inventory[index];
    if (!item) return;
    const def = resolveItemDef(item.itemId);
    if (def.category !== "equipment" || !def.slot) return;

    const previousItemId = this.equipped[def.slot];
    this.inventory.splice(index, 1);
    if (previousItemId)
      this.inventory.push({ itemId: previousItemId, quantity: 1 });
    this.equipped[def.slot] = item.itemId;

    const oldMaxHp = this.playerMaxHp;
    this.recalculatePlayerStats();
    this.adjustHpAfterMaxHpChange(oldMaxHp);

    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  /**
   * Deséquipe l'objet d'un emplacement donne (arme/armure/accessoire) -
   * revient dans l'inventaire.
   */
  unequipItem(slot) {
    const itemId = this.equipped[slot];
    if (!itemId) return;
    this.equipped[slot] = null;
    this.inventory.push({ itemId, quantity: 1 });

    const oldMaxHp = this.playerMaxHp;
    this.recalculatePlayerStats();
    this.adjustHpAfterMaxHpChange(oldMaxHp);

    this.events.emit("equipment-updated", { ...this.equipped });
    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  /**
   * Utilise un consommable de l'inventaire (par son index) - applique
   * son effet (soin, pour l'instant le seul effet existant) et retire un
   * exemplaire de la pile (supprime l'entree si elle tombe a 0).
   */
  useConsumable(index) {
    const item = this.inventory[index];
    if (!item) return;
    const def = resolveItemDef(item.itemId);
    if (def.category !== "consumable" || !def.effect) return;

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

    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(index, 1);

    this.events.emit("inventory-updated", [...this.inventory]);
    this.persistProgress();
  }

  /**
   * Coeur de la sauvegarde, en version async attendable - persistProgress()
   * (fire-and-forget, utilisee par les hooks automatiques) et
   * saveAndQuit() (qui a besoin d'attendre la confirmation avant de
   * quitter) partagent cette meme logique plutot que de la dupliquer.
   * Capture le gameId renvoye par le serveur si cette partie n'en avait
   * pas encore (premiere sauvegarde d'une partie fraiche).
   */
  async persistProgressAsync() {
    if (!this.currentSeed) return; // aucun niveau charge pour l'instant
    try {
      const res = await saveProgress(
        this.currentGameId,
        this.currentDepth,
        this.currentSeed,
        this.visitedFloors,
        {
          xp: this.xp,
          level: this.playerLevel,
          hp: this.playerHp,
          heroId: this.heroSpriteKey,
          currentFloorKills: this.currentFloorKills,
          currentFloorOpenedChests: this.currentFloorOpenedChests,
          currentFloorLootSeed: this.currentFloorLootSeed,
          quests: this.quests,
          inventory: this.inventory,
          equipped: this.equipped,
          timePlayedSeconds: this.getTotalTimePlayed(),
        },
      );
      if (res && res.gameId) this.currentGameId = res.gameId;
    } catch (err) {
      console.warn("[MainScene] echec de sauvegarde", err);
    }
  }

  /**
   * Sauvegarde la progression courante - fire-and-forget, appelee par les
   * hooks automatiques (changement d'etage, montee de niveau, game over,
   * minuteur periodique). Une sauvegarde ratee ne doit jamais interrompre
   * la partie en cours, d'ou l'absence d'attente ici (cf.
   * persistProgressAsync pour la version attendable).
   */
  persistProgress() {
    this.persistProgressAsync();
  }

  /**
   * Sauvegarde explicitement (bouton "Sauvegarder et quitter" du HUD),
   * PUIS signale a React de revenir a l'ecran de selection de partie -
   * contrairement a persistProgress(), on attend la confirmation de la
   * sauvegarde avant de quitter, pour que le bouton tienne vraiment sa
   * promesse plutot que de partir sur une simple esperance.
   */
  async saveAndQuit() {
    await this.persistProgressAsync();
    this.events.emit("quit-to-menu");
  }

  /**
   * Charge un étage via l'API (GET /api/arpg/level) et reconstruit
   * entièrement la scène à partir de la réponse serveur : tilemap,
   * position du joueur, ennemis avec leurs stats déjà calculées.
   *
   * @param {number} depth
   * @param {string} [seed] seed a reutiliser (reprise de sauvegarde) - si
   *   absente, le serveur en genere une nouvelle
   * @param {number} [hpOverride] si fourni, remplace le soin complet par
   *   defaut - utilise uniquement lors d'une reprise de sauvegarde, pour
   *   ne pas transformer un rechargement de page en soin gratuit
   * @param {number[]} [killedIndices] indices des ennemis DEJA tues LORS
   *   DE CETTE VISITE precise de l'etage (cf. this.currentFloorKills) -
   *   ne sont jamais recrees. Vide par defaut : changer de profondeur
   *   (goToDepth vers une AUTRE profondeur) fait toujours reapparaitre
   *   tous les ennemis, comme voulu a l'origine (le farm via un vrai
   *   aller-retour reste possible et intentionnel). Seule une reprise de
   *   sauvegarde POUR CETTE MEME VISITE restaure cette liste - sinon
   *   sauvegarder+quitter+reprendre reviendrait a un aller-retour gratuit,
   *   sans le cout (trajet, risque) qui rend le vrai farm legitime.
   * @param {string} [lootSeed] seed du CONTENU du butin (ennemis/coffres/
   *   boss), distincte de `seed` (qui reste la disposition du niveau,
   *   fixe pour toujours) - si absente, une nouvelle est generee ICI a
   *   chaque appel : donc chaque vrai changement d'etage (goToDepth) tire
   *   un contenu different, alors qu'une reprise de sauvegarde (qui PASSE
   *   explicitement la valeur sauvegardee) retrouve exactement le meme
   *   butin qu'avant de quitter. Sans cette distinction, un coffre repere
   *   comme "donne une arme" serait une source infinie du meme objet en
   *   faisant de simples allers-retours d'etage.
   */
  async loadLevel(
    depth,
    seed,
    hpOverride,
    killedIndices = [],
    openedChestIndices = [],
    lootSeed = null,
  ) {
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
      enemies,
      chests,
      tileset,
    } = data;
    this.currentDepth = depth;
    this.currentSeed = data.seed;
    this.fogGrid = grid;
    this.currentFloorKills = [...killedIndices]; // copie fraiche, alimentee au fil des kills de cette visite
    this.currentFloorOpenedChests = [...openedChestIndices]; // meme principe, pour les coffres
    this.bossData = boss || null;
    this.travelHubTile = travelHubTile || null;
    this.shopData = shop || null;
    this.bossDoorTile = bossDoorTile || null;
    // porte fermee et boss pas encore invoque tant que les autres ennemis
    // ne sont pas nettoyes - reinitialise a CHAQUE visite (pas de mort
    // permanente : redescendre puis remonter oblige a recombattre, cf.
    // /areas/phaser-arpg.md)
    this.bossRoomOpen = false;
    this.bossAlive = this.bossData ? true : null; // null = pas de boss sur cet etage

    // alimente l'historique des etages visites - seule la PREMIERE fois
    // qu'un etage est atteint (sa seed y est figee pour toujours ensuite,
    // cf. la remontee qui reutilise cette seed exacte)
    if (!this.visitedFloors.find((f) => f.depth === depth)) {
      this.visitedFloors.push({ depth, seed: data.seed });
    }

    // detruit d'abord les colliders qui referencent des objets du niveau
    // PRECEDENT (this.layer, this.questNpcs) - sans ca, ils continuent
    // d'exister dans le monde physique de Phaser apres que ces objets
    // soient detruits juste apres, et le moteur plante en tentant de
    // verifier une collision contre une tilemap layer qui n'existe plus
    // (Cannot read properties of undefined (reading 'tileWidth')).
    // this.enemyGroup vs lui-meme (cf. create()) n'est PAS dans cette
    // liste : il ne reference rien de propre a un niveau, il doit
    // persister a travers tous les changements d'etage.
    this.levelColliders.forEach((c) => c.destroy());
    this.levelColliders = [];

    // detruit l'ancienne tilemap, le brouillard, l'ancien hero et les
    // anciens ennemis avant de reconstruire
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
    if (this.chests) {
      this.chests.forEach((c) => c.sprite.destroy());
    }
    this.chests = [];
    this.dialogOpen = false;
    this.gamePaused = false;
    this.pauseReasons.clear();
    this.enemies.forEach((e) => e.sprite.destroy());
    if (this.enemyGroup) this.enemyGroup.clear(false, false); // vide la liste du groupe, sprites deja detruits ci-dessus
    this.enemies = [];
    this.projectiles.forEach((p) => p.sprite.destroy());
    this.projectiles = [];

    this.playerHp =
      typeof hpOverride === "number"
        ? Math.min(hpOverride, this.playerMaxHp)
        : this.playerMaxHp;
    this.isDead = false;
    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
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

    // vraies images si ce biome en a (cf. TILE_IMAGE_REGISTRY), sinon
    // repli sur les couleurs pleines habituelles - meme mise en page dans
    // les deux cas (index 0 = sol, index 1 = mur), donc tout le reste du
    // code (grille brute utilisee comme indices de tuile, setCollision,
    // ouverture de la porte du boss via putTileAt...) reste inchange quel
    // que soit le chemin pris ici.
    const tileImages = TILE_IMAGE_REGISTRY[tileset];
    const hasRealImages =
      tileImages &&
      this.textures.exists(tileImages.floorKey) &&
      this.textures.exists(tileImages.wallKey);

    if (hasRealImages) {
      ctx.drawImage(
        this.textures.get(tileImages.floorKey).getSourceImage(),
        0,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
      ctx.drawImage(
        this.textures.get(tileImages.wallKey).getSourceImage(),
        TILE_SIZE,
        0,
        TILE_SIZE,
        TILE_SIZE,
      );
    } else {
      ctx.fillStyle = Phaser.Display.Color.IntegerToColor(colors.floor).rgba;
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
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

    const heroSprite = SPRITE_REGISTRY[this.heroSpriteKey];
    this.hero = this.physics.add.sprite(
      playerSpawn.x * TILE_SIZE + TILE_SIZE / 2,
      playerSpawn.y * TILE_SIZE + TILE_SIZE / 2,
      heroSprite.key,
      heroSprite.animations.idleDown,
    );
    this.hero.setScale(heroSprite.scale);
    this.hero.setCollideWorldBounds(true);
    // hitbox calculee par spriteRegistry.js (computeSafeHitbox) a partir
    // des dimensions/echelle propres a cette entree - cf. le commentaire
    // dans spriteRegistry.js pour le detail du calcul et pourquoi une
    // hitbox trop grande bloque le passage dans les couloirs/portes 1 case
    const hb = heroSprite.hitbox;
    this.hero.body
      .setSize(hb.width, hb.height)
      .setOffset(hb.offsetX, hb.offsetY);
    this.hero.setDepth(10);
    this.hero.anims.play(this.heroSpriteKey + "-idle-down");
    this.lastDir = "down";
    this.lastAimVector = { x: 0, y: 1 };

    this.levelColliders.push(this.physics.add.collider(this.hero, this.layer));
    // le groupe entier contre les murs - this.layer change a chaque
    // niveau, donc cette collision doit etre reposee ici plutot que dans
    // create() (contrairement a l'auto-collision du groupe, qui elle est
    // etablie une seule fois puisqu'elle ne reference aucun objet
    // recree a chaque niveau). Reference conservee dans levelColliders
    // pour etre detruite au prochain changement d'etage (cf. le debut de
    // cette fonction) - sinon elle continue d'exister dans le monde
    // physique apres que this.layer soit detruit, et Phaser plante en
    // tentant de tester une collision contre une layer qui n'existe plus.
    this.levelColliders.push(
      this.physics.add.collider(this.enemyGroup, this.layer),
    );
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(this.hero, true, 0.1, 0.1);

    // marqueur de sortie : place sous le calque de brouillard (depth 2,
    // entre le sol a 0 et le brouillard a 5) pour qu'il reste cache tant
    // que le joueur n'a pas explore/vu cette case, comme le reste du
    // niveau - pas de raccourci "on voit la sortie a travers le
    // brouillard"
    this.exitTile = exitTile;
    this.exitMarker = this.add.circle(
      exitTile.x * TILE_SIZE + TILE_SIZE / 2,
      exitTile.y * TILE_SIZE + TILE_SIZE / 2,
      10,
      0xffd700,
    );
    this.exitMarker.setDepth(2);
    this.exitMarker.setStrokeStyle(2, 0xffffff);
    this.tweens.add({
      targets: this.exitMarker,
      scale: { from: 0.7, to: 1.15 },
      alpha: { from: 0.6, to: 1 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // marqueur de remontee (jamais a l'etage 1) - meme principe que la
    // sortie (cache par le brouillard tant que non explore), rouge pour
    // le distinguer visuellement, PAS de declenchement automatique a
    // l'arrivee dessus (contrairement a la sortie) : une confirmation
    // est necessaire, cf. showUpstairsPrompt()
    this.upstairsTile = upstairsTile;
    if (upstairsTile) {
      this.upstairsMarker = this.add.circle(
        upstairsTile.x * TILE_SIZE + TILE_SIZE / 2,
        upstairsTile.y * TILE_SIZE + TILE_SIZE / 2,
        10,
        0xdc3030,
      );
      this.upstairsMarker.setDepth(2);
      this.upstairsMarker.setStrokeStyle(2, 0xffffff);
      this.tweens.add({
        targets: this.upstairsMarker,
        scale: { from: 0.7, to: 1.15 },
        alpha: { from: 0.6, to: 1 },
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }

    // marqueur de la porte du boss (visible seulement une fois explore,
    // comme les autres - cf. depth=2 vs fog) - pas encore d'ouverture
    // automatique, ni de sprite de boss : juste un repere visuel sur un
    // mur qui, pour l'instant, se comporte comme n'importe quel autre mur
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

    // hub de voyage rapide (uniquement en ville) - cyan, distinct du
    // dore (sortie), rouge (remontee) et violet (porte du boss)
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

    // boutique (uniquement en ville) - or/jaune, coherent thematiquement,
    // distinct de tous les autres marqueurs
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

    // ennemis : comportement (patrol/guard/rest) tire localement a partir
    // de la seed de niveau - c'est un detail de rendu/IA cote client, pas
    // une donnee de gameplay a faire transiter par l'API (cf.
    // enemyBehavior.js). Les stats de combat, elles, viennent
    // integralement du serveur (data.enemies[i]) et ne sont jamais
    // recalculees ici.
    const behaviorRng = createRng(data.seed + "-behaviors");
    enemies.forEach((enemyData, spawnIndex) => {
      const spawnPos = { x: enemyData.x, y: enemyData.y };

      // createEnemyBehavior DOIT etre appele pour CHAQUE ennemi de la
      // liste, meme deja tue lors de cette visite - il consomme le flux
      // RNG partage de facon sequentielle, le sauter decalerait le
      // tirage de tous les ennemis suivants et romprait le determinisme
      // (deux joueurs avec la meme seed n'auraient plus les memes
      // comportements pour les ennemis restants)
      const behavior = createEnemyBehavior(grid, spawnPos, behaviorRng);

      if (this.currentFloorKills.includes(spawnIndex)) return; // deja tue cette visite, pas de sprite

      // le type (donc le sprite) vient du serveur (enemyData.type) - le
      // client ne tire jamais ce choix lui-meme, sinon visuel et stats
      // pourraient diverger entre les deux (cf. spriteRegistry.js)
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
        spawnIndex, // identifiant stable pour cette visite - cf. currentFloorKills
        archetype: enemyData.type, // type d'ennemi cote serveur (enemyDefault/goblin/...) - cf. quete ciblee. DISTINCT de `type` ci-dessous (comportement IA), qui reutilise deja ce nom
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
        // stats fournies par le serveur, jamais recalculees ici
        hp: enemyData.hp,
        maxHp: enemyData.maxHp,
        damage: enemyData.damage,
        defense: enemyData.defense,
        xpReward: enemyData.xpReward,
        drop: enemyData.drop || null,
        attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      });
    });

    // coffres - places et remplis par le serveur (data.chests),
    // deterministe comme le reste. Deja ouverts cette visite
    // (currentFloorOpenedChests, meme principe que currentFloorKills
    // pour les ennemis) restent visibles mais dans un etat "ouvert"
    // distinct, sans interaction possible - sinon sauvegarder+quitter+
    // reprendre permettrait de re-piocher leur contenu gratuitement.
    (chests || []).forEach((chestData, index) => {
      const alreadyOpened = this.currentFloorOpenedChests.includes(index);
      const sprite = this.add.rectangle(
        chestData.x * TILE_SIZE + TILE_SIZE / 2,
        chestData.y * TILE_SIZE + TILE_SIZE / 2,
        20,
        16,
        alreadyOpened ? 0x5a4a30 : 0xc9a03c,
      );
      sprite.setStrokeStyle(2, 0x3a2f1a);
      sprite.setDepth(7);
      this.physics.add.existing(sprite, true); // corps statique, bloque le passage comme le PNJ
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      );
      // deja ouvert lors d'une session precedente (restaure via
      // currentFloorOpenedChests) : la collision doit etre desactivee
      // des la creation, pas seulement au moment ou on l'ouvre en direct
      if (alreadyOpened) sprite.body.checkCollision.none = true;

      this.chests.push({
        sprite,
        index,
        opened: alreadyOpened,
        loot: chestData.loot,
        x: chestData.x,
        y: chestData.y,
      });
    });

    // PNJ de quete - places et definis par le serveur (data.questNpcs,
    // tableau vide s'il n'y en a pas sur cet etage). Le client ne decide
    // plus rien lui meme (position, objectif) : uniquement des villes
    // pour l'instant (cf. ArpgController.getLevel), plusieurs PNJ
    // possibles par ville desormais (1 a 3).
    if (data.questNpcs && data.questNpcs.length > 0) {
      this.createQuestNpcs(data.questNpcs);
    }

    this.fogState = createFogState(grid);
    this.lastPlayerTile = { x: playerSpawn.x, y: playerSpawn.y };

    // pas de brouillard de guerre dans les villes - zone sure, tout est
    // visible d'emblee. On garde quand meme la structure fogState/fogLayer
    // intacte (pas de cas particulier a gerer partout ailleurs - minimap,
    // visibilite des ennemis... tout continue de lire le meme etat) : on
    // revele juste TOUTES les cases directement, en bypassant le calcul
    // par ligne de vue habituel (des batiments bloqueraient sinon la vue
    // meme avec un rayon enorme).
    this.fogDisabled = data.tileset === "town";

    // brouillard de guerre : calque separe, initialement opaque partout,
    // que l'on eclaircit progressivement selon ce que le joueur decouvre
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
      const initialChanges = this.fogState.update(
        playerSpawn.x,
        playerSpawn.y,
        VISION_RADIUS,
      );
      this.applyFogChanges(initialChanges);
    }

    this.events.emit("level-loaded", { depth, biome: data.biome });
    // etat initial pour React, qui n'a sinon aucune valeur tant que le
    // joueur n'a rien ramasse/equipe cette session (notamment en
    // reprenant une partie dont l'inventaire n'est pas vide)
    this.events.emit("inventory-updated", [...this.inventory]);
    this.events.emit("equipment-updated", { ...this.equipped });
    this.persistProgress();
  }

  /**
   * Recharge le même étage avec une nouvelle seed - appelé par le bouton
   * "Réessayer" du composant React après un game over.
   */
  retryLevel() {
    this.loadLevel(this.currentDepth, "retry-" + Date.now());
  }

  /**
   * Declenche la descente vers l'etage suivant - appele quand le joueur
   * atteint la case de sortie. Reutilise loadLevel() telle quelle
   * (nouvelle profondeur, nouvel appel API, reconstruction complete de
   * la scene), exactement comme retryLevel() le fait pour un game over.
   */
  descendStairs() {
    this.goToDepth(this.currentDepth + 1);
  }

  /**
   * Charge un etage en reutilisant sa seed d'origine si on y est deja
   * alle (cf. visitedFloors) - garantit exactement le meme plan a chaque
   * retour. Si jamais visite, aucune seed n'est passee : le serveur en
   * genere une nouvelle (comportement inchange pour une premiere
   * descente). Point d'entree commun pour descendre ET remonter.
   */
  goToDepth(targetDepth) {
    const existing = this.visitedFloors.find((f) => f.depth === targetDepth);
    this.loadLevel(targetDepth, existing ? existing.seed : undefined);
  }

  /**
   * Ouvre le hub de voyage rapide (evenement React, cf. arpg.jsx) - met
   * le jeu en pause (comme l'inventaire, cf. pauseGame) le temps du
   * choix. Envoie la liste des etages deja visites SAUF l'etage courant
   * (rien a faire d'y "voyager") - le client connait deja tout via
   * this.visitedFloors, aucun aller-retour serveur necessaire ici.
   */
  openTravelHub() {
    this.pauseGame("travelHub");
    const destinations = this.visitedFloors.filter(
      (f) => f.depth !== this.currentDepth,
    );
    this.events.emit("travel-hub", destinations);
  }

  /**
   * Voyage vers un etage deja visite, choisi dans le hub (bouton cote
   * React) - reutilise goToDepth telle quelle (meme mecanisme que la
   * remontee/descente normale : reutilise la seed stockee, donc le meme
   * plan qu'a la derniere visite).
   */
  travelToDepth(targetDepth) {
    this.unpauseGame("travelHub");
    this.events.emit("travel-hub", null);
    this.goToDepth(targetDepth);
  }

  /**
   * Ferme le hub sans voyager (bouton "Fermer" cote React).
   */
  closeTravelHub() {
    this.unpauseGame("travelHub");
    this.events.emit("travel-hub", null);
  }

  /**
   * Ouvre la boutique (evenement React, cf. arpg.jsx) - met le jeu en
   * pause (meme mecanisme a raisons comptees que l'inventaire/le hub,
   * cf. pauseGame). Le stock est deja connu (this.shopData.stock, fixe a
   * la generation) - pas besoin de recalculer quoi que ce soit ici, le
   * prix affichable cote React se contente de comparer au montant d'or
   * deja suivi dans l'inventaire (evenement 'inventory-updated').
   */
  openShop() {
    this.pauseGame("shop");
    this.events.emit("shop", this.shopData.stock);
  }

  /**
   * Achete un objet du stock de la boutique (par son index) - deduit le
   * prix de l'or en inventaire, ajoute l'objet achete. Ignore
   * silencieusement si l'or est insuffisant (l'interface devrait deja
   * avoir desactive le bouton dans ce cas - pas de raison de planter sur
   * un clic qui n'aurait pas du etre possible).
   */
  buyItem(shopItemIndex) {
    const shopItem = this.shopData?.stock?.[shopItemIndex];
    if (!shopItem) return;

    const goldEntry = this.inventory.find((i) => i.itemId === "gold");
    const currentGold = goldEntry ? goldEntry.quantity : 0;
    if (currentGold < shopItem.price) return;

    goldEntry.quantity -= shopItem.price;
    if (goldEntry.quantity <= 0)
      this.inventory = this.inventory.filter((i) => i !== goldEntry);

    this.addItemToInventory(shopItem.itemId, 1); // emet deja 'inventory-updated' et persiste
  }

  /**
   * Ferme la boutique (bouton "Fermer" cote React).
   */
  closeShop() {
    this.unpauseGame("shop");
    this.events.emit("shop", null);
  }

  /**
   * Ouvre la porte de la salle du boss (mur -> sol, visuellement ET
   * physiquement) et fait apparaitre le boss - appele une seule fois par
   * visite, quand le dernier ennemi NORMAL de l'etage tombe (cf.
   * damageEnemy). Le boss reutilise exactement le meme pipeline que les
   * ennemis normaux (enemyGroup, colliders deja en place, resolveEnemySprite
   * pour le visuel) - seul son comportement est force en garde
   * ({guard:1}), jamais patrouille/repos.
   */
  openBossDoor() {
    this.bossRoomOpen = true;

    const { x, y } = this.bossDoorTile;
    this.layer.putTileAt(0, x, y); // 0 = sol, ouvre physiquement (plus de collision a cet endroit)
    this.fogGrid[y][x] = 0; // coherence pour le pathfinding/la ligne de vue, qui lisent this.fogGrid

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

    // {guard:1} force 100% garde (jamais patrouille/repos), cf. la
    // demande initiale - createEnemyBehavior accepte deja ce parametre
    // optionnel, pas besoin de toucher enemyBehavior.js
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
      spawnIndex: -1, // pas de suivi currentFloorKills pour le boss - toujours recree a chaque visite, jamais de mort permanente
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
      drop: this.bossData.drop || null,
      attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
    });

    this.events.emit("boss-room-opened");
  }

  /**
   * Met le jeu en pause pour une RAISON donnee (une chaine libre,
   * ex: 'upstairs', 'inventory') - plusieurs raisons peuvent etre
   * actives en meme temps sans se marcher dessus (ouvrir l'inventaire
   * pendant que la confirmation de remontee est affichee, par exemple) :
   * this.gamePaused ne redevient false que lorsque TOUTES les raisons
   * ont ete levees via unpauseGame(). Immobilise aussi le heros.
   */
  pauseGame(reason) {
    this.pauseReasons.add(reason);
    this.gamePaused = true;
    if (this.hero) this.hero.setVelocity(0, 0);
  }

  /**
   * Leve une raison de pause - ne reprend le jeu que si plus aucune
   * autre raison n'est active.
   */
  unpauseGame(reason) {
    this.pauseReasons.delete(reason);
    this.gamePaused = this.pauseReasons.size > 0;
  }

  /**
   * Affiche la confirmation de remontee et met le jeu en pause (evenement
   * React, cf. arpg.jsx) - jamais de descente/remontee instantanee au
   * contact, contrairement a la sortie, pour ne pas punir un passage
   * involontaire (couloir, fuite de combat) sur cette case.
   */
  showUpstairsPrompt() {
    if (this.pauseReasons.has("upstairs")) return; // deja affiche, pas de re-declenchement
    this.pauseGame("upstairs");
    this.events.emit("upstairs-prompt", true);
  }

  /**
   * Confirme la remontee (bouton "Oui" cote React).
   */
  confirmGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
    this.goToDepth(this.currentDepth - 1);
  }

  /**
   * Annule la remontee (bouton "Non" cote React) - repart normalement,
   * sans re-declencher tant que le joueur reste sur cette case (le
   * prompt ne se redeclenche qu'au PROCHAIN changement de case, cf. le
   * bloc dans update()).
   */
  cancelGoUpstairs() {
    this.unpauseGame("upstairs");
    this.events.emit("upstairs-prompt", null);
  }

  /**
   * Cree le PNJ de quete a partir des donnees du serveur (position et
   * objectif deja decides la-bas, cf. ArpgController.getLevel) - le
   * client n'a plus a chercher de case ni a inventer d'objectif.
   * Plusieurs PNJ possibles par ville (data.questNpcs, un tableau).
   *
   * N'ecrase JAMAIS une progression deja existante (cf. this.quests,
   * restaure par resumeFromSave le cas echeant) - seule une PREMIERE
   * rencontre avec un PNJ precis initialise une entree fraiche. Chaque
   * quete est identifiee par une cle `${depth}-${npcIndex}` plutot que
   * par la seule profondeur, pour distinguer plusieurs PNJ du meme etage.
   */
  /**
   * Bassin des sprites utilisables pour les PNJ de quete - tout ce qui
   * commence par "NPC_town" dans le registre. Calcule dynamiquement
   * (pas une liste en dur) : ajouter un nouveau sprite NPC_town* au
   * registre l'integre automatiquement au tirage, sans toucher a ce
   * fichier.
   */
  createQuestNpcs(npcDataArray) {
    const npcSpritePool = Object.keys(SPRITE_REGISTRY).filter((key) =>
      key.startsWith("NPC_town"),
    );
    // seedee sur la seed du niveau (this.currentSeed) + l'index du PNJ -
    // meme apparence a chaque revisite du meme etage, coherent avec le
    // reste de la generation (seed identique = niveau identique)
    const spriteRng = createRng(`${this.currentSeed}-quest-npc-sprites`);
    this.questNpcs = [];

    for (const npcData of npcDataArray) {
      const questKey = `${this.currentDepth}-${npcData.npcIndex}`;

      // repli sur hero1 si aucun sprite NPC_town* n'existe dans le
      // registre (projet frais, avant l'ajout de tels sprites)
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
      // plus de teinte doree ici : c'etait un pis-aller pour distinguer
      // le PNJ du heros quand les deux reutilisaient la texture hero1 -
      // desormais de vrais sprites NPC distincts, la teinte ferait plus
      // de mal (fausse leur couleur reelle) que de bien
      sprite.body.moves = false; // ne bouge jamais
      sprite.anims.play(`${npcSpriteKey}-idle-down`);
      sprite.setDepth(9); // entre les ennemis (8) et le heros (10)
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite)); // pour ne pas pouvoir traverser le PNJ
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      ); // idem pour les ennemis

      this.questNpcs.push({ sprite, questKey });

      if (!this.quests[questKey]) {
        this.quests[questKey] = {
          questId: npcData.questId,
          target: npcData.target,
          xpReward: npcData.xpReward,
          goldReward: npcData.goldReward, // uniquement pour questId==='obtainItem' - undefined sinon, sans consequence
          itemReward: npcData.itemReward || null,
          targetEnemyType: npcData.targetEnemyType,
          targetItemId: npcData.targetItemId, // uniquement pour questId==='obtainItem' - undefined sinon, sans consequence
          dialogText: npcData.dialogText || null, // texte personnalise (quete fixe) - null = texte generique
          accepted: false,
          completed: false,
          killCount: 0,
        };
      }
    }
  }

  /**
   * Ouvre le dialogue d'UN PNJ precis (evenement React, cf. arpg.jsx) -
   * propose la quete si elle n'a pas encore ete acceptee, un message de
   * fin sinon. Retient `questKey` (this.activeDialogQuestKey) pour que
   * acceptQuest() sache sur quelle quete precise agir - plusieurs PNJ
   * peuvent etre presents sur le meme etage desormais.
   */
  openQuestDialog(questKey) {
    this.dialogOpen = true;
    this.activeDialogQuestKey = questKey;
    const qs = this.quests[questKey];
    if (!qs) return;
    const custom = qs.dialogText || {};
    let text;
    let canAccept = false;
    let canTurnIn = false;

    if (qs.questId === "obtainItem") {
      const itemName = resolveItemDef(qs.targetItemId).name;
      // l'objet appartient au PNJ, pas au joueur : l'avoir en poche ne
      // suffit pas, il faut le RENDRE (cf. turnInQuest) pour toucher la
      // recompense - ce dialogue distingue donc "je l'ai, pret a le
      // rendre" de "je l'ai pas encore trouve", contrairement a
      // killEnemies qui n'a que 3 etats (pas 4)
      const hasItem = this.inventory.some((i) => i.itemId === qs.targetItemId);
      if (qs.completed) {
        text = custom.complete || `Merci pour ${itemName} !`;
      } else if (qs.accepted && hasItem) {
        text =
          custom.progress ||
          `Tu l'as trouvé ! Rends-moi ${itemName} contre une récompense.`;
        canTurnIn = true;
      } else if (qs.accepted) {
        text =
          custom.progress ||
          `Toujours à la recherche de ${itemName} - reviens me voir une fois que tu l'auras trouvé.`;
      } else {
        text = custom.offer || `Peux-tu me rapporter ${itemName} ?`;
        canAccept = true;
      }
    } else if (qs.completed) {
      text =
        custom.complete ||
        `Merci d'avoir tué ces ${qs.targetEnemyType} pour moi !`;
    } else if (qs.accepted) {
      text =
        custom.progress ||
        `Progression : ${qs.killCount} / ${qs.target} ${qs.targetEnemyType} tués. Reviens me voir une fois terminé !`;
    } else {
      text =
        custom.offer ||
        `Peux-tu tuer ${qs.target} ${qs.targetEnemyType} pour moi ?`;
      canAccept = true;
    }
    this.events.emit("npc-dialog", { text, canAccept, canTurnIn });
  }

  /**
   * Accepte la quete du PNJ dont le dialogue est actuellement ouvert -
   * appele depuis React (bouton "Accepter" du dialogue).
   */
  acceptQuest() {
    const qs = this.quests[this.activeDialogQuestKey];
    if (!qs) return;
    qs.accepted = true;
    this.dialogOpen = false;
    this.activeDialogQuestKey = null;
    this.events.emit("npc-dialog", null);
    this.events.emit("quests-updated", { ...this.quests });
    this.persistProgress();
  }

  /**
   * Rend l'objet d'une quete "recuperer tel objet" au PNJ - l'objet
   * appartient au PNJ, pas au joueur : l'avoir en poche ne suffit pas
   * (cf. openQuestDialog, qui n'affiche le bouton "Rendre" que si
   * l'objet est bien present). Retire l'objet de l'inventaire, marque la
   * quete terminee, donne l'XP et l'or.
   */
  turnInQuest() {
    const qs = this.quests[this.activeDialogQuestKey];
    if (!qs || qs.questId !== "obtainItem" || qs.completed) return;

    const itemIndex = this.inventory.findIndex(
      (i) => i.itemId === qs.targetItemId,
    );
    if (itemIndex === -1) return; // defensif - ne devrait pas arriver si le bouton n'etait propose que l'objet en main

    const item = this.inventory[itemIndex];
    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(itemIndex, 1);

    qs.completed = true;
    this.xp += qs.xpReward;
    this.events.emit("xp-changed", { xp: this.xp });

    this.dialogOpen = false;
    this.activeDialogQuestKey = null;
    this.events.emit("npc-dialog", null);
    this.events.emit("quests-updated", { ...this.quests });

    // reutilise addItemToInventory (deja teste) pour l'or gagne - empile
    // avec l'or existant, emet 'inventory-updated' (reflete deja le
    // retrait de l'objet ci-dessus) et persiste
    this.addItemToInventory("gold", qs.goldReward);
  }

  /**
   * Ferme le dialogue sans accepter - appele depuis React (bouton
   * "Fermer").
   */
  closeDialog() {
    this.dialogOpen = false;
    this.activeDialogQuestKey = null;
    this.events.emit("npc-dialog", null);
  }

  update() {
    if (!this.hero || this.isDead) return;
    if (this.gamePaused) return; // confirmation de remontee en cours - tout le gameplay est gele

    const speed = 150;
    let vx = 0,
      vy = 0;
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;

    if (left) vx = -speed;
    if (right) vx = speed;
    if (up) vy = -speed;
    if (down) vy = speed;
    if (vx !== 0 && vy !== 0) {
      const n = Math.SQRT1_2;
      vx *= n;
      vy *= n;
    }

    this.hero.setVelocity(vx, vy);

    // direction d'ANIMATION : reste forcement cardinale (le sprite n'a que
    // 4 directions), on choisit l'axe dominant plutot que de toujours
    // privilegier l'horizontal comme avant
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

    // direction de VISEE : vecteur normalise complet, capture les vraies
    // diagonales (contrairement a `dir` ci-dessus) - utilise par le tir a
    // distance pour ne pas etre limite aux 4 directions cardinales
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
        const changes = this.fogState.update(tileX, tileY, VISION_RADIUS);
        this.applyFogChanges(changes);
      }
      this.updateEnemyDecisions(tileX, tileY);

      // bloque tant qu'un boss est vivant sur cet etage - this.bossAlive
      // vaut null s'il n'y a pas de boss (comportement normal, inchange),
      // false une fois vaincu (sortie de nouveau accessible)
      if (
        this.exitTile &&
        tileX === this.exitTile.x &&
        tileY === this.exitTile.y &&
        this.bossAlive !== true
      ) {
        this.descendStairs();
        return; // le niveau est en cours de rechargement, pas la peine de continuer cette frame
      }

      if (
        this.upstairsTile &&
        tileX === this.upstairsTile.x &&
        tileY === this.upstairsTile.y
      ) {
        this.showUpstairsPrompt();
        // pas de return ici contrairement a la sortie : on ne recharge
        // rien, on met juste le jeu en pause en attendant la reponse du
        // joueur (cf. showUpstairsPrompt)
      }
    }

    const now = this.time.now;
    if (Phaser.Input.Keyboard.JustDown(this.keys.melee))
      this.performMeleeAttack(now);
    if (Phaser.Input.Keyboard.JustDown(this.keys.ranged))
      this.performRangedAttack(now);

    this.updateEnemyMovement();

    // les PNJ suivent la meme regle de visibilite que les ennemis (case
    // actuellement visible, pas juste "deja vue") - immobiles, donc pas
    // besoin d'une boucle dediee complexe, un simple check par PNJ suffit
    for (const npc of this.questNpcs) {
      const npcTileX = Math.floor(npc.sprite.x / TILE_SIZE);
      const npcTileY = Math.floor(npc.sprite.y / TILE_SIZE);
      const state = this.fogState.state;
      const npcVisible =
        npcTileY >= 0 &&
        npcTileX >= 0 &&
        npcTileY < state.length &&
        npcTileX < state[0].length &&
        state[npcTileY][npcTileX] === 2;
      npc.sprite.setVisible(npcVisible);
    }
    this.updateEnemyAttacks(now);
    this.updateProjectiles();
    this.drawHpBars();

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
      if (s === 2) this.fogLayer.removeTileAt(x, y);
      else if (s === 1) this.fogLayer.putTileAt(1, x, y);
      else this.fogLayer.putTileAt(0, x, y);
    }

    // pour la minimap React : renvoie les references directement (pas de
    // copie) - fogState.state est mute en place par createFogState, donc
    // ce n'est fiable que parce qu'on emet a chaque fois qu'il change,
    // jamais en cache/differe cote React
    this.events.emit("fog-changed", {
      grid: this.fogGrid,
      fogState: this.fogState.state,
      playerTile: this.lastPlayerTile,
    });
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

      const nextState = decideNextState(enemy.state, {
        distanceToPlayer,
        losClear,
        aggroRadius: enemy.aggroRadius,
        arrivedAtHome,
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
      // visible seulement dans la zone de vision actuelle du heros (pas
      // la memoire du brouillard - un ennemi bouge, on ne "voit" plus sa
      // position passee comme on le fait pour le decor) ; conditionne le
      // rendu ET stocke le resultat pour que les fonctions de combat
      // n'aient pas a refaire le calcul
      enemy.visible = this.isEnemyVisible(enemy);
      enemy.sprite.setVisible(enemy.visible);

      if (enemy.state === "chase" || enemy.state === "returning") {
        const distToHero = Math.hypot(
          this.hero.x - enemy.sprite.x,
          this.hero.y - enemy.sprite.y,
        );
        const stopForMelee =
          enemy.state === "chase" && distToHero < ENEMY_STOP_DISTANCE;

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
          ENEMY_SPEED,
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
        this.moveEnemyToward(enemy, waypoint, ENEMY_SPEED * 0.6, () => {
          if (
            enemy.patrolIndex + enemy.patrolDirection < 0 ||
            enemy.patrolIndex + enemy.patrolDirection >= enemy.patrolPath.length
          ) {
            enemy.patrolDirection *= -1;
          }
          enemy.patrolIndex += enemy.patrolDirection;
        });
        continue;
      }

      enemy.sprite.setVelocity(0, 0);
      enemy.sprite.anims.play(enemy.spriteKey + "-idle-" + enemy.lastDir, true);
    }
  }

  /**
   * Un ennemi n'est visible que si sa case actuelle est dans la zone de
   * vision immediate du joueur (etat 2 du brouillard) - pas la memoire
   * (etat 1), contrairement au decor : un ennemi bouge, "se souvenir" de
   * sa position passee n'aurait pas de sens.
   */
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
      onArrive();
      return;
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

  performMeleeAttack(now) {
    if (!this.meleeCooldown.isReady(now)) return;
    this.meleeCooldown.trigger(now);

    // interaction avec un PNJ de quete : pas de degats, on ouvre le
    // dialogue a la place - reutilise la meme touche/portee que
    // l'attaque, comme demande. On n'attaque pas les ennemis ce coup-ci
    // si un PNJ est a portee, pour eviter d'ouvrir le dialogue en pleine
    // baston contre un ennemi qui se trouverait juste a cote. Plusieurs
    // PNJ possibles par etage desormais, mais l'espacement minimal impose
    // a la generation (4 cases) est deja plus grand que la portee de
    // melee - jamais deux a la fois a portee, un simple `find` suffit.
    if (!this.dialogOpen) {
      const npc = this.questNpcs.find(
        (n) =>
          Math.hypot(n.sprite.x - this.hero.x, n.sprite.y - this.hero.y) <=
          PLAYER_MELEE_RANGE,
      );
      if (npc) {
        this.openQuestDialog(npc.questKey);
        return;
      }
    }

    // hub de voyage rapide (uniquement en ville) - pas de degats, ouvre
    // la liste des etages deja visites (evenement React, cf. arpg.jsx)
    if (this.travelHubTile && !this.dialogOpen) {
      const hubPx = this.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2;
      const hubPy = this.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distHub = Math.hypot(hubPx - this.hero.x, hubPy - this.hero.y);
      if (distHub <= PLAYER_MELEE_RANGE) {
        this.openTravelHub();
        return;
      }
    }

    // boutique (uniquement en ville) - pas de degats, ouvre l'ecran
    // d'achat (evenement React, cf. arpg.jsx)
    if (this.shopData && !this.dialogOpen) {
      const shopPx = this.shopData.x * TILE_SIZE + TILE_SIZE / 2;
      const shopPy = this.shopData.y * TILE_SIZE + TILE_SIZE / 2;
      const distShop = Math.hypot(shopPx - this.hero.x, shopPy - this.hero.y);
      if (distShop <= PLAYER_MELEE_RANGE) {
        this.openShop();
        return;
      }
    }

    // interaction avec la porte scellee du boss (tant qu'elle n'est pas
    // ouverte) - meme principe que le PNJ : pas de degats, juste un
    // message informatif rappelant pourquoi elle reste fermee. Position
    // en cases (pas en pixels comme les sprites) puisque la porte n'est
    // qu'une case de mur, pas un objet Phaser a part entiere.
    if (this.bossDoorTile && !this.bossRoomOpen && !this.dialogOpen) {
      const doorPx = this.bossDoorTile.x * TILE_SIZE + TILE_SIZE / 2;
      const doorPy = this.bossDoorTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distDoor = Math.hypot(doorPx - this.hero.x, doorPy - this.hero.y);
      if (distDoor <= PLAYER_MELEE_RANGE) {
        this.dialogOpen = true;
        this.events.emit("npc-dialog", {
          text: "Des ennemis sont encore présents aux alentours, la salle du boss n'est pas accessible...",
          canAccept: false,
        });
        return;
      }
    }

    // ouverture de coffre : pas de degats, ajoute le butin a l'inventaire
    // et marque le coffre ouvert POUR CETTE VISITE (cf.
    // currentFloorOpenedChests - meme logique anti-exploit que les
    // ennemis, sans quoi sauvegarder+quitter+reprendre permettrait de
    // re-piocher un contenu frais indefiniment)
    if (!this.dialogOpen) {
      const chest = this.chests.find((c) => {
        if (c.opened) return false;
        const cx = c.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = c.y * TILE_SIZE + TILE_SIZE / 2;
        return (
          Math.hypot(cx - this.hero.x, cy - this.hero.y) <= PLAYER_MELEE_RANGE
        );
      });
      if (chest) {
        chest.opened = true;
        chest.sprite.setFillStyle(0x5a4a30);
        chest.sprite.body.checkCollision.none = true; // sinon il faut sauvegarder+reprendre pour que le passage se debloque (le corps physique du coffre nouvellement ouvert n'est jamais retouche autrement)
        this.currentFloorOpenedChests.push(chest.index);

        if (chest.loot) {
          this.addItemToInventory(chest.loot.itemId, chest.loot.quantity);
          const itemDef = resolveItemDef(chest.loot.itemId);
          this.dialogOpen = true;
          this.events.emit("npc-dialog", {
            text: `Vous avez trouvé : ${itemDef.name} x${chest.loot.quantity}`,
            canAccept: false,
          });
        }
        return;
      }
    }

    for (const enemy of this.enemies) {
      const dx = enemy.sprite.x - this.hero.x;
      const dy = enemy.sprite.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > PLAYER_MELEE_RANGE || !this.isEnemyVisible(enemy)) continue;

      // ne touche que dans un cone devant le heros, pas tout autour -
      // produit scalaire entre le vecteur heros->cible normalise et la
      // direction de visee reelle (capture aussi les diagonales, pas
      // seulement les 4 directions cardinales de lastDir)
      if (dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = nx * this.lastAimVector.x + ny * this.lastAimVector.y;
        if (dot < MELEE_CONE_DOT_THRESHOLD) continue;
      }

      this.damageEnemy(
        enemy,
        computeDamage(this.playerMeleeDamage, enemy.defense),
      );
    }

    // effet visuel directionnel (eclair de griffe qui s'estompe), oriente
    // vers la meme direction que le cone de degats ci-dessus - remplace
    // l'ancien flash en cercle plein (qui suggerait a tort un impact tout
    // autour du heros). Meme bucketing axe-dominant que l'animation de
    // marche (cf. plus haut dans update()), pour rester cohent avec le
    // reste du jeu quand la visee est en diagonale.
    const aimDir =
      Math.abs(this.lastAimVector.x) > Math.abs(this.lastAimVector.y)
        ? this.lastAimVector.x > 0
          ? "right"
          : "left"
        : this.lastAimVector.y > 0
          ? "down"
          : "up";
    const slashOffset = 22; // entre le heros et le bord de la portee (46)
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

  performRangedAttack(now) {
    if (!this.rangedCooldown.isReady(now)) return;
    this.rangedCooldown.trigger(now);

    // vecteur de visee reel (peut etre diagonal), pas la direction
    // d'animation qui elle reste cardinale - cf. update()
    const v = this.lastAimVector;

    const sprite = this.add.circle(
      this.hero.x,
      this.hero.y,
      PROJECTILE_RADIUS,
      0x66ccff,
    );
    this.physics.add.existing(sprite);
    sprite.setDepth(12);
    sprite.body.setVelocity(v.x * PROJECTILE_SPEED, v.y * PROJECTILE_SPEED);

    this.projectiles.push({ sprite, startX: this.hero.x, startY: this.hero.y });
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

      // meme logique que isEnemyVisible : le projectile ne s'affiche que
      // dans la zone de vision actuelle - sinon sa trajectoire (ou l'endroit
      // ou il s'arrete brusquement contre un mur) reverlerait la forme du
      // niveau a travers le brouillard, un "sonar" non voulu
      const fogState = this.fogState.state;
      const projVisible = !outOfBounds && fogState[tileY][tileX] === 2;
      proj.sprite.setVisible(projVisible);

      if (traveled >= PROJECTILE_MAX_DISTANCE || outOfBounds || hitWall) {
        proj.sprite.destroy();
        continue;
      }

      let hit = false;
      for (const enemy of this.enemies) {
        const dist = Math.hypot(
          enemy.sprite.x - proj.sprite.x,
          enemy.sprite.y - proj.sprite.y,
        );
        if (dist <= PROJECTILE_RADIUS + 14 && this.isEnemyVisible(enemy)) {
          this.damageEnemy(
            enemy,
            computeDamage(this.playerRangedDamage, enemy.defense),
          );
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

  damageEnemy(enemy, amount) {
    const result = applyDamage(enemy, amount);
    enemy.hp = result.hp;

    if (result.died) {
      this.xp += enemy.xpReward;
      this.events.emit("xp-changed", { xp: this.xp });
      this.checkLevelUp();
      this.currentFloorKills.push(enemy.spawnIndex); // ne reapparait plus si on sauvegarde+reprend SANS avoir quitte cet etage
      if (enemy.drop)
        this.addItemToInventory(enemy.drop.itemId, enemy.drop.quantity);

      // suivi GLOBAL de toutes les quetes actives, pas seulement celle de
      // l'etage courant : une quete acceptee en ville (0 ennemi sur
      // place) ne peut compter que des kills faits ailleurs, sur
      // d'autres etages, potentiellement bien plus tard. Plusieurs
      // quetes actives simultanement (etages differents) progressent
      // toutes en meme temps sur un seul kill - mais SEULEMENT si le
      // type de l'ennemi tue correspond a celui vise par la quete.
      let anyQuestUpdated = false;
      let justCompletedReward = null; // au cas ou plusieurs quetes se terminent sur le meme kill, n'affiche que la premiere - tres rare en pratique
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
      // notification immediate de la recompense en objet - la quete est
      // deja terminee et l'objet deja ajoute a l'inventaire a cet instant,
      // pas la peine d'attendre que le joueur retourne parler au PNJ
      if (justCompletedReward && !this.dialogOpen) {
        const itemDef = resolveItemDef(justCompletedReward.itemId);
        this.dialogOpen = true;
        this.events.emit("npc-dialog", {
          text: `Quête terminée ! Vous avez aussi reçu : ${itemDef.name} x${justCompletedReward.quantity}`,
          canAccept: false,
        });
      }

      enemy.sprite.destroy();
      this.enemies = this.enemies.filter((e) => e !== enemy);

      if (enemy.isBoss) {
        // le boss vient de mourir : deverrouille la sortie (qui se
        // trouve DANS la salle du boss, cf. ArpgController). Pas de mort
        // permanente : redescendre puis remonter regenere l'etage depuis
        // la meme seed, donc un boss frais a recombattre (cf.
        // /areas/phaser-arpg.md)
        this.bossAlive = false;
        this.events.emit("boss-defeated");
      } else if (
        this.bossDoorTile &&
        !this.bossRoomOpen &&
        this.enemies.length === 0
      ) {
        // dernier ennemi NORMAL de l'etage tombe, et une salle de boss
        // scellee existe : ouvre la porte et fait apparaitre le boss
        this.openBossDoor();
      }
    } else {
      // flash blanc bref pour signaler qu'un coup a touche - Phaser 4 :
      // setTintFill() ne fait plus rien (breaking change), remplace par
      // setTint() + setTintMode(FILL). Revient a clearTint() ensuite (pas
      // de teinte d'etat persistante sur les ennemis, cf. leur propre sprite)
      enemy.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(80, () => {
        if (enemy.sprite.active) {
          enemy.sprite.clearTint();
          enemy.sprite.setTintMode(Phaser.TintModes.MULTIPLY);
        }
      });
    }
  }

  /**
   * Verifie si l'XP cumulee fait passer un ou plusieurs niveaux (un seul
   * kill pourrait theoriquement en franchir plusieurs si l'XP gagnee est
   * grosse - la boucle est dans computeLevelFromXp, pas ici). Un niveau
   * gagne applique immediatement les nouvelles stats et soigne
   * entierement le joueur - un vrai pic de puissance, pas une simple
   * ligne dans un journal.
   */
  checkLevelUp() {
    const { level } = computeLevelFromXp(this.xp);
    if (level <= this.playerLevel) return;

    this.playerLevel = level;
    this.recalculatePlayerStats(); // niveau + bonus d'equipement combines
    this.playerHp = this.playerMaxHp; // leve de niveau soigne entierement

    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    this.events.emit("level-up", { level });
    this.persistProgress();
  }

  updateEnemyAttacks(now) {
    for (const enemy of this.enemies) {
      if (enemy.state !== "chase") continue;
      const dist = Math.hypot(
        enemy.sprite.x - this.hero.x,
        enemy.sprite.y - this.hero.y,
      );
      if (dist > ENEMY_ATTACK_RANGE) continue;
      if (!enemy.attackCooldown.isReady(now)) continue;

      enemy.attackCooldown.trigger(now);
      const dmg = computeDamage(enemy.damage, this.playerDefense);
      this.playerHp = Math.max(0, this.playerHp - dmg);
      this.events.emit("player-hp-changed", {
        hp: this.playerHp,
        maxHp: this.playerMaxHp,
      });

      this.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(100, () => {
        if (this.hero) {
          this.hero.clearTint();
          this.hero.setTintMode(Phaser.TintModes.MULTIPLY);
        }
      });
    }
  }

  drawHpBars() {
    const g = this.hpBarGraphics;
    g.clear();
    const barW = 28,
      barH = 4;

    for (const enemy of this.enemies) {
      if (!enemy.visible) continue; // pas de barre de vie pour un ennemi cache par le brouillard
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
