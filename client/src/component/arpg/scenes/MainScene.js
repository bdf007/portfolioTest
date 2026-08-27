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

    // attributs FIXES propres a l'archetype (pas de progression par
    // niveau, contrairement aux stats de combat gerees par
    // recalculatePlayerStats) - vitesse de deplacement, rayon de vision,
    // portee de melee/a distance (cf. HERO_STATS_PROFILES dans
    // spriteRegistry.js). Repli sur les anciennes valeurs uniformes si
    // le profil ne definit pas (encore) l'un de ces champs - jamais de
    // plantage sur un profil incomplet.
    const heroProfile = resolveHeroStatsOverride(this.heroSpriteKey);
    this.playerMoveSpeed = heroProfile?.moveSpeed ?? PLAYER_MOVE_SPEED_DEFAULT;
    this.playerVisionRadius =
      heroProfile?.visionRadius ?? VISION_RADIUS_DEFAULT;
    this.playerMeleeRange =
      heroProfile?.base?.meleeRange ?? PLAYER_MELEE_RANGE_DEFAULT;
    this.playerRangedRange =
      heroProfile?.rangedRange ?? PROJECTILE_MAX_DISTANCE_DEFAULT;

    this.cursors = this.input.keyboard.createCursorKeys();
    // deux jeux de touches de deplacement enregistres SIMULTANEMENT
    // (AZERTY ZQSD et QWERTY WASD) plutot qu'un seul choisi a la
    // creation - permet de basculer de l'un a l'autre en cours de partie
    // (cf. this.keyboardLayout, setKeyboardLayout) sans avoir a recreer
    // les objets Key de Phaser. S est commun aux deux dispositions (meme
    // position physique sur AZERTY et QWERTY), une seule touche suffit
    // pour "bas". Par defaut AZERTY, la disposition la plus repandue
    // pour un clavier francais.
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
    });

    this.hero = null;
    this.layer = null;
    this.fogLayer = null;
    this.fogState = null;
    this.fogGrid = null;
    this.lastPlayerTile = null;
    this.lastDir = "down";
    this.lastAimVector = { x: 0, y: 1 }; // correspond a 'down' (y positif = vers le bas a l'ecran)
    // controles tactiles (cf. TouchControls.jsx cote React) - vecteur
    // ANALOGIQUE du joystick virtuel (magnitude 0 a 1, pas juste 4
    // booleens comme le clavier), fusionne avec le clavier dans update()
    // plutot que de le remplacer - permet de tenir un appareil tactile
    // ET un clavier branche sans que l'un exclue l'autre. Les drapeaux
    // d'attaque sont consommes puis remis a false dans update() (meme
    // semantique que Phaser.Input.Keyboard.JustDown pour le clavier) -
    // jamais appeles directement depuis React, pour ne jamais contourner
    // les gardes de pause/mort deja en tete d'update().
    this.touchMoveVector = { x: 0, y: 0 };
    this.touchMeleeRequested = false;
    this.touchRangedRequested = false;
    this.touchActionRequested = false;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = []; // distinct des projectiles du joueur (this.projectiles) - collision inversee (touche le heros, jamais les ennemis)

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
    }; // itemId par emplacement, ou null - AVANT recalculatePlayerStats
    this.recalculatePlayerStats();
    this.playerHp = this.playerMaxHp;
    this.playerMana = this.playerMaxMana;
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
    this.activeTalkingNpc = null; // quel PNJ (quete ou ambiant) est en train de parler, s'il y en a un (cf. openQuestDialog/openAmbientDialog/releaseTalkingNpc)
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
    this.giveStartingKit();
    this.loadLevel(this.currentDepth);
  }

  /**
   * Donne ET equipe automatiquement le kit de depart de l'archetype
   * choisi (arme en bois +1, bouclier/fleches selon le cas - cf.
   * HERO_STATS_PROFILES dans spriteRegistry.js) - UNIQUEMENT pour une
   * partie NEUVE (jamais appelee sur resumeFromSave, qui restaure deja
   * l'equipement exact de la sauvegarde). Utilise addItemToInventory +
   * equipItem tels quels (deja testes) plutot que de manipuler
   * this.equipped directement, sauf pour les flèches (cf.
   * equipArrows - mecanique dediee, jamais retirees de l'inventaire en
   * s'equipant, contrairement a une arme/armure classique).
   */
  giveStartingKit() {
    const profile = resolveHeroStatsOverride(this.heroSpriteKey);
    if (!profile) return;

    for (const itemId of profile.startingEquipment || []) {
      this.addItemToInventory(itemId, 1);
      const newIndex = this.inventory.length - 1; // addItemToInventory vient de le pousser en dernier (objet non empilable, jamais fusionne avec une entree existante)
      this.equipItem(newIndex);
    }

    if (profile.startingAmmo) {
      this.addItemToInventory(
        profile.startingAmmo.itemId,
        profile.startingAmmo.quantity,
      );
      this.equipped.quiver = profile.startingAmmo.itemId;
      // sans cet evenement, React (equipped.quiver cote arpg.jsx) ne
      // recevait JAMAIS cette affectation directe - le carquois etait
      // bien rempli en interne (scene Phaser), mais son itemId restait
      // `null` cote React, donc le filtre qui masque les fleches
      // equipees de la liste "Objets" (cf. InventoryScreen.jsx) ne les
      // reconnaissait jamais comme equipees
      this.events.emit("equipment-updated", { ...this.equipped });
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
    this.xp = ps.xp || 0;
    this.playerLevel = ps.level || 1;
    this.quests = ps.quests || {}; // restaure AVANT loadLevel : createQuestNpc n'ecrase jamais une entree deja presente
    this.inventory = ps.inventory || [];
    // fusionne avec la forme par defaut plutot que ps.equipped || {...} :
    // une sauvegarde ANTERIEURE a l'ajout des emplacements
    // casque/pantalon/bottes n'aurait que weapon/armor/accessory dans
    // son objet - sans fusion, ces nouveaux emplacements resteraient
    // `undefined` plutot que `null` (fonctionnellement equivalent pour
    // computeEquipmentBonuses, mais incoherent si jamais compare
    // explicitement a `null` ailleurs)
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
    this.timePlayedBaseline = ps.timePlayedSeconds || 0; // sessionStartedAt reste "maintenant" (deja fixe dans create())

    const stats = getPlayerStatsForLevel(
      this.playerLevel,
      resolveHeroStatsOverride(this.heroSpriteKey),
    );
    this.recalculatePlayerStats(); // combine niveau + bonus d'equipement (this.equipped deja restaure ci-dessus)
    // contrairement aux PV (cf. hpOverride passe a loadLevel juste en
    // dessous, qui EMPECHE le soin complet par defaut a chaque
    // chargement d'etage), le mana n'est jamais reinitialise par
    // loadLevel - fixe ici suffit, rien a modifier la-bas. `?? ` plutot
    // que `||` : un mana a 0 (legitime, ex: juste apres avoir tout
    // depense) ne doit pas etre remplace par le max
    this.playerMana = ps.mana ?? this.playerMaxMana;

    await this.loadLevel(
      save.depth,
      save.seed,
      ps.hp,
      ps.currentFloorKills || [],
      ps.currentFloorOpenedChests || [],
      ps.currentFloorLootSeed || null,
      ps.fogState || null,
      ps.playerPosition || null,
    );

    // reutilise les events existants pour que le HUD React se mette a
    // jour avec l'etat restaure, sans avoir besoin d'un event dedie
    this.events.emit("xp-changed", { xp: this.xp });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
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
   * Affiche une ligne de log transitoire (butin trouve) - remplace toute
   * ligne encore affichee, s'efface automatiquement au bout d'un
   * moment. Cote React, gere par un simple timer qui reinitialise a
   * chaque nouvel appel (cf. arpg.jsx) - remplace les anciennes fenetres
   * de notification (npc-dialog) qu'il fallait fermer manuellement,
   * genant pour un evenement aussi frequent qu'un simple ramassage
   * d'objet.
   */
  showLootToast(text) {
    this.events.emit("loot-toast", text);
  }

  /**
   * Point d'entree pour le joystick virtuel (cf. TouchControls.jsx) -
   * vecteur ANALOGIQUE (magnitude entre 0 et 1, jamais juste -1/0/1
   * comme le clavier), fusionne avec le clavier dans update() plutot
   * que de le remplacer. {x:0,y:0} = relache.
   */
  setTouchMoveVector(x, y) {
    this.touchMoveVector = { x, y };
  }

  /**
   * Points d'entree pour les boutons d'attaque/action tactiles - se
   * contentent de LEVER un drapeau, consomme puis remis a false dans
   * update() (meme semantique que JustDown pour le clavier). Jamais
   * d'appel direct a performMeleeAttack/performRangedAttack/
   * performInteraction depuis React : ça contournerait les gardes de
   * pause/mort deja en tete d'update().
   */
  requestTouchMelee() {
    this.touchMeleeRequested = true;
  }

  requestTouchRanged() {
    this.touchRangedRequested = true;
  }

  requestTouchAction() {
    this.touchActionRequested = true;
  }

  /**
   * Bascule la disposition clavier utilisee pour le deplacement -
   * 'azerty' (ZQSD, defaut) ou 'qwerty' (WASD). Ne recree jamais les
   * objets Key de Phaser (les deux jeux sont deja enregistres en
   * parallele des la creation, cf. create()) - change juste lequel des
   * deux est lu dans update().
   */
  setKeyboardLayout(layout) {
    this.keyboardLayout = layout === "qwerty" ? "qwerty" : "azerty";
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
    const heroProfile = resolveHeroStatsOverride(this.heroSpriteKey);

    const base = getPlayerStatsForLevel(this.playerLevel, heroProfile);

    const bonus = computeEquipmentBonuses(this.equipped);

    this.playerMaxHp = base.maxHp + bonus.maxHp;
    this.playerMeleeDamage = base.meleeDamage + bonus.meleeDamage;
    this.playerRangedDamage = base.rangedDamage + bonus.rangedDamage;
    this.playerDefense = base.defense + bonus.defense;

    this.playerMaxMana = base.mana + bonus.mana;

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
   * (cf. def.slot) - l'objet precedemment equipe a cet emplacement, s'il
   * y en avait un, retourne dans l'inventaire. Ignore silencieusement si
   * l'index est invalide ou si l'objet n'est pas equipable (pas de
   * raison de planter sur un clic UI mal aligne).
   *
   * Deux regles specifiques aux emplacements de main (mainHand/offHand,
   * cf. def.slot==='mainHand' et le shield eventuel en offHand) :
   *
   * - Une arme A DEUX MAINS (def.twoHanded) occupe mainHand ET libere
   *   offHand en meme temps - offHand reste `null` (jamais une
   *   reference dupliquee vers la meme arme, ce qui aurait double son
   *   bonus de stats dans computeEquipmentBonuses) ; equiper QUOI QUE CE
   *   SOIT dans offHand alors qu'une arme a 2 mains occupe mainHand
   *   libere cette derniere au passage (les deux etats sont mutuellement
   *   exclusifs).
   * - Une arme a UNE main equipee alors que mainHand est deja occupe par
   *   une AUTRE arme a une main (et offHand est libre) bascule
   *   automatiquement vers offHand plutot que de remplacer - permet le
   *   double armement (deux epees, une par main) sans avoir besoin de
   *   donnees "main gauche"/"main droite" separees par objet.
   *
   * Meme principe generalise pour les bagues (def.slot==='ring',
   * emplacement VIRTUEL - resolu vers ring1 ou ring2, quel que soit
   * celui de libre) : un objet "bague" n'est jamais fige sur un doigt
   * precis.
   */
  equipItem(index) {
    const item = this.inventory[index];
    if (!item) return;
    const def = resolveItemDef(item.itemId);

    // munitions (flèches) : mecanique DEDIEE, jamais retirees de
    // l'inventaire en s'equipant (contrairement a une arme/armure
    // classique, non empilable) - "equiper" signifie juste "cette pile
    // devient la source active pour le tir a distance" (cf.
    // performRangedAttack, qui decremente directement cette meme entree
    // d'inventaire a chaque tir). Pas de recalculatePlayerStats ici :
    // le bonus de statBonus des flèches (cf. itemDefs.js) est deja pris
    // en compte par computeEquipmentBonuses via this.equipped.quiver,
    // sans changement necessaire a cette fonction.
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

    // bague : emplacement virtuel, resolu vers le premier libre (ring1
    // puis ring2), ou ring1 par defaut si les deux sont deja pris
    // (remplace alors ring1, choix arbitraire mais deterministe)
    if (targetSlot === "ring") {
      targetSlot = !this.equipped.ring1
        ? "ring1"
        : !this.equipped.ring2
          ? "ring2"
          : "ring1";
    }

    // double armement automatique : arme a une main, mainHand deja
    // occupe par une AUTRE arme a une main, offHand libre -> bascule
    // vers offHand plutot que de remplacer mainHand
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

    // arme a 2 mains : libere aussi offHand (jamais de reference
    // dupliquee vers la meme arme dans les deux emplacements)
    if (def.twoHanded && targetSlot === "mainHand") {
      const previousOffHand = this.equipped.offHand;
      if (previousOffHand) itemsToReturnToInventory.push(previousOffHand);
      this.equipped.offHand = null;
    }

    // equiper dans offHand alors qu'une arme a 2 mains occupe mainHand :
    // celle-ci doit d'abord etre liberee (etats mutuellement exclusifs)
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

  /**
   * Deséquipe l'objet d'un emplacement donne (arme/armure/accessoire) -
   * revient dans l'inventaire.
   */
  unequipItem(slot) {
    const itemId = this.equipped[slot];
    if (!itemId) return;
    this.equipped[slot] = null;

    // munitions : jamais repoussees dans l'inventaire - elles n'en sont
    // JAMAIS sorties en s'equipant (cf. equipItem), les repousser ici
    // dupliquerait la pile deja presente
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
    const discoveredTiles = [];

    if (this.fogState?.state) {
      for (let y = 0; y < this.fogState.state.length; y++) {
        for (let x = 0; x < this.fogState.state[y].length; x++) {
          if (this.fogState.state[y][x] !== 0) {
            discoveredTiles.push(`${x},${y}`);
          }
        }
      }
    }

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
        equipped: this.equipped,
        timePlayedSeconds: this.getTotalTimePlayed(),

        // Exploration du niveau actuellement sauvegardé
        fogState: discoveredTiles,

        // Position du joueur au moment de la sauvegarde
        playerPosition: this.lastPlayerTile,
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
    savedFogState = null,
    savedPlayerPosition = null,
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
      ambientNpcs: ambientNpcData,
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
    if (this.ambientNpcs) {
      this.ambientNpcs.forEach((n) => n.sprite.destroy());
    }
    this.ambientNpcs = [];
    this.activeTalkingNpc = null; // au cas ou un dialogue serait reste ouvert a travers un changement de niveau - evite une reference vers un sprite deja detruit
    if (this.chests) {
      this.chests.forEach((c) => c.sprite.destroy());
    }
    this.chests = [];
    this.nextLootChestId = 0; // identifiants negatifs pour les coffres de butin d'ennemi (cf. spawnLootChest), jamais confondus avec un index de coffre pre-place (toujours >= 0)
    this.dialogOpen = false;
    this.gamePaused = false;
    this.pauseReasons.clear();
    this.enemies.forEach((e) => e.sprite.destroy());
    if (this.enemyGroup) this.enemyGroup.clear(false, false); // vide la liste du groupe, sprites deja detruits ci-dessus
    this.enemies = [];
    this.projectiles.forEach((p) => p.sprite.destroy());
    this.projectiles = [];
    this.enemyProjectiles.forEach((p) => p.sprite.destroy());
    this.enemyProjectiles = [];

    // ne soigne PLUS automatiquement a chaque changement d'etage (montee/
    // descente/voyage) - preserve les PV actuels par defaut (clamped au
    // cas ou playerMaxHp aurait change entre-temps, ex: niveau gagne ou
    // objet retire). hpOverride (fourni par resumeFromSave) reste
    // prioritaire quand present. Un soin complet EXPLICITE reste
    // legitime pour "Reessayer" apres une mort (cf. retryLevel, qui fixe
    // this.playerHp AVANT d'appeler loadLevel) et pour une partie neuve
    // (this.playerHp deja a this.playerMaxHp depuis create(), preserve
    // tel quel ici).
    this.playerHp =
      typeof hpOverride === "number"
        ? Math.min(hpOverride, this.playerMaxHp)
        : Math.min(this.playerHp, this.playerMaxHp);
    this.isDead = false;
    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    // contrairement aux PV juste au-dessus, le mana n'est JAMAIS
    // reinitialise a chaque changement d'etage (pas de "soin complet"
    // equivalent pour le mana) - simple synchronisation de la valeur
    // deja en place (fixee dans create() pour une partie neuve, ou dans
    // resumeFromSave pour une reprise), pour que React en soit informe
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
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
    //
    // Sol et mur decident CHACUN separement s'ils ont une vraie image
    // disponible - un biome peut tres bien n'avoir qu'un mur en vraie
    // image (ex: tree.floorKey=null dans TILE_IMAGE_REGISTRY) et garder
    // un sol en couleur pleine, plutot que d'exiger les deux a la fois.
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

    // zoom sur mobile pour que la zone de visibilite (this.playerVisionRadius,
    // cf. le brouillard de guerre) remplisse une bonne partie de l'ecran -
    // sans ca, sur un petit telephone, le cercle visible (petit par
    // rapport aux 800x600 logiques du canvas) restait difficile a voir/
    // utiliser, la majeure partie de l'ecran affichant du brouillard
    // noir. Jamais sur desktop, ou le canvas 800x600 offre deja assez
    // d'espace visible. Calcule a partir du rayon de vision REEL du
    // heros (varie par archetype, cf. HERO_STATS_PROFILES) plutot qu'une
    // valeur fixe - un guerrier (vision plus courte) zoome davantage
    // qu'un archer (vision plus large) pour remplir la meme proportion
    // d'ecran.
    if (this.registry.get("isMobile")) {
      const visionDiameterPx = this.playerVisionRadius * TILE_SIZE * 2;
      const targetFraction = 0.85; // la zone visible doit remplir ~85% de la plus petite dimension de la camera
      const smallerDimension = Math.min(
        this.cameras.main.width,
        this.cameras.main.height,
      );
      this.cameras.main.setZoom(
        (smallerDimension * targetFraction) / visionDiameterPx,
      );
    }

    // marqueur de sortie : place sous le calque de brouillard (depth 2,
    // entre le sol a 0 et le brouillard a 5) pour qu'il reste cache tant
    // que le joueur n'a pas explore/vu cette case, comme le reste du
    // niveau - pas de raccourci "on voit la sortie a travers le
    // brouillard"
    this.exitTile = exitTile;
    this.exitMarker = this.add.image(
      exitTile.x * TILE_SIZE + TILE_SIZE / 2,
      exitTile.y * TILE_SIZE + TILE_SIZE / 2,
      "stair_up",
    );
    this.exitMarker.setDepth(2);

    // marqueur de remontee (jamais a l'etage 1) - meme principe que la
    // sortie (cache par le brouillard tant que non explore), PAS de
    // declenchement automatique a l'arrivee dessus (contrairement a la
    // sortie) : une confirmation est necessaire, cf. showUpstairsPrompt()
    this.upstairsTile = upstairsTile;
    if (upstairsTile) {
      this.upstairsMarker = this.add.image(
        upstairsTile.x * TILE_SIZE + TILE_SIZE / 2,
        upstairsTile.y * TILE_SIZE + TILE_SIZE / 2,
        "stair_down",
      );
      this.upstairsMarker.setDepth(2);
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
        attackType: enemyData.attackType || "melee", // 'melee' (contact) ou 'ranged' (projectile) - cf. updateEnemyAttacks
        drops: enemyData.drops || [], // PLURIEL - tableau (peut etre vide), plus jamais un singulier + null - cf. ArpgController.js
        attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
      });
    });

    // coffres - places et remplis par le serveur (data.chests),
    // deterministe comme le reste. Deja ouverts cette visite
    // (currentFloorOpenedChests, meme principe que currentFloorKills
    // pour les ennemis) restent visibles mais dans un etat "ouvert"
    // distinct, sans interaction possible - sinon sauvegarder+quitter+
    // reprendre permettrait de re-piocher leur contenu gratuitement.
    //
    // variante de couleur choisie au hasard, seedee sur la seed du
    // niveau + l'index du coffre - meme apparence a chaque revisite du
    // meme etage, coherent avec le reste de la generation
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
      this.physics.add.existing(sprite, true); // corps statique, bloque le passage du joueur (jamais des ennemis, cf. juste en dessous)
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      // PAS de collider ennemi ici, contrairement au PNJ de quete - un
      // coffre bloquant le chemin d'un ennemi permettait un exploit :
      // rester pres d'un coffre non ouvert (sans le declencher) pour
      // coincer un ennemi derriere, puis le mitrailler a distance sans
      // jamais subir de riposte. Les ennemis traversent donc les coffres
      // comme s'ils n'existaient pas - seul le joueur ne peut pas passer
      // a travers un coffre ferme.
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
        variant,
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

    if (ambientNpcData && ambientNpcData.length > 0) {
      this.createAmbientNpcs(ambientNpcData);
    }

    this.fogState = createFogState(grid);

    if (savedFogState) {
      for (const tile of savedFogState) {
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
        startPosition.x,
        startPosition.y,
        this.playerVisionRadius,
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
   * "Réessayer" du composant React après un game over. Contrairement a
   * un changement d'etage normal (qui ne soigne plus, cf. loadLevel),
   * "Réessayer" doit repartir a PLEINE vie - sans quoi le joueur
   * redemarrerait a 0 PV (celui de sa mort) et mourrait a nouveau
   * instantanement. Fixe explicitement AVANT l'appel a loadLevel, qui
   * preserve desormais this.playerHp tel quel par defaut.
   */
  retryLevel() {
    this.playerHp = this.playerMaxHp;
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
   * Vend un objet de l'inventaire (par son index) - retire un exemplaire,
   * ajoute de l'or a la moitie du prix d'achat (SELL_PRICE_RATIO,
   * convention classique de RPG : eviter qu'acheter puis revendre soit
   * gratuit/rentable). Jamais l'or lui-meme (pas de `price`, deja exclu
   * naturellement par le garde ci-dessous) ni un objet de quete (idem,
   * `ancientRelic` n'a pas de `price` dans itemDefs.js). Un objet
   * EQUIPE n'est jamais dans this.inventory (retire a l'equipement, cf.
   * equipItem) - impossible de vendre par erreur ce qu'on porte.
   */
  sellItem(inventoryIndex) {
    const item = this.inventory[inventoryIndex];
    if (!item) return;
    const def = resolveItemDef(item.itemId);
    if (!def.price) return; // pas de prix defini = jamais vendable

    const sellPrice = Math.floor(def.price * SELL_PRICE_RATIO);

    item.quantity -= 1;
    if (item.quantity <= 0) this.inventory.splice(inventoryIndex, 1);

    this.addItemToInventory("gold", sellPrice); // emet deja 'inventory-updated' et persiste
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
      attackType: this.bossData.attackType || "melee",
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
   * Ouvre le prompt de confirmation pour la sortie (etage suivant) -
   * meme principe que showUpstairsPrompt : met le jeu en pause pendant
   * la decision, evite qu'un simple passage dans le couloir force la
   * descente sans choix possible, et evite qu'un ennemi continue a se
   * deplacer (traversant potentiellement le joueur) pendant le delai
   * reseau du chargement du niveau suivant (loadLevel est asynchrone).
   */
  showExitPrompt() {
    if (this.pauseReasons.has("exit")) return; // deja affiche, pas de re-declenchement
    this.pauseGame("exit");
    this.events.emit("exit-prompt", true);
  }

  /**
   * Confirme la descente (bouton "Oui" cote React).
   */
  confirmDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
    this.descendStairs();
  }

  /**
   * Annule la descente (bouton "Non" cote React) - repart normalement,
   * sans re-declencher tant que le joueur reste sur cette case (meme
   * logique que cancelGoUpstairs).
   */
  cancelDescend() {
    this.unpauseGame("exit");
    this.events.emit("exit-prompt", null);
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
    const patrolRng = createRng(`${this.currentSeed}-quest-npc-patrol`);
    this.questNpcs = [];

    // PREMIER PASSAGE, AVANT la boucle normale : resout les livraisons
    // EN ATTENTE (role 'giver', style 'crossTown', receiverKey encore
    // null) dont CET etage est justement la cible - doit tourner avant
    // la boucle ci-dessous, pour que son garde habituel
    // (if (!this.quests[questKey])) saute le PNJ ainsi reserve comme
    // destinataire plutot que de lui assigner une quete normale du
    // serveur. Attribution par index croissant (0, 1, 2...) si plusieurs
    // livraisons visent le meme etage - jamais plus de destinataires que
    // de PNJ reellement presents ici ; l'exces reste simplement non
    // resolu (tres rare en pratique).
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

    const freshlyCreatedKeys = []; // pour l'injection eventuelle d'une NOUVELLE livraison, cf. maybeInjectDeliveryQuest plus bas

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
      sprite.anims.play(`${npcSpriteKey}-idle-down`);
      sprite.setDepth(9); // entre les ennemis (8) et le heros (10)
      // bouge desormais (meme mecanisme de patrouille que les PNJ
      // ambiants, cf. updateNpcMovement) - il lui faut donc aussi un
      // collider avec les murs, en plus du heros et des ennemis
      this.levelColliders.push(this.physics.add.collider(sprite, this.layer));
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite)); // pour ne pas pouvoir traverser le PNJ
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      ); // idem pour les ennemis

      const route = pickPatrolRoute(
        this.fogGrid,
        { x: npcData.x, y: npcData.y },
        patrolRng,
      );

      this.questNpcs.push({
        sprite,
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
          goldReward: npcData.goldReward, // pour questId==='obtainItem'|'defeatBoss' - undefined sinon, sans consequence
          itemReward: npcData.itemReward || null,
          targetEnemyType: npcData.targetEnemyType,
          targetItemId: npcData.targetItemId, // uniquement pour questId==='obtainItem' - undefined sinon, sans consequence
          targetBossDepth: npcData.targetBossDepth, // uniquement pour questId==='defeatBoss' - undefined sinon, sans consequence
          targetBossType: npcData.targetBossType, // idem
          dialogText: npcData.dialogText || null, // texte personnalise (quete fixe) - null = texte generique
          accepted: false,
          completed: false,
          killCount: 0,
          // vrai des que le boss cible (targetBossDepth) meurt APRES
          // acceptation - jamais retroactif : un boss deja vaincu avant
          // d'accepter ne compte pas (cf. generateDefeatBossQuest). Ce
          // jeu re-affronte le meme boss a chaque visite (jamais de mort
          // permanente), donc revenir le refaire est toujours possible.
          bossDefeated: false,
        };
        freshlyCreatedKeys.push(questKey);
      }
    }

    // SECOND PASSAGE : injecte EVENTUELLEMENT une NOUVELLE quete de
    // livraison (donneur) sur l'un des PNJ FRAICHEMENT crees ci-dessus -
    // remplace le type fourni par le serveur pour ce PNJ precis. Jamais
    // sur une entree deja existante (progression potentielle en jeu).
    this.maybeInjectDeliveryQuest(freshlyCreatedKeys);
  }

  /**
   * Decide, avec une certaine probabilite, d'injecter une quete de
   * livraison entre PNJ CLIENT-SIDE - le serveur ne peut PAS generer ce
   * type lui-meme, il n'a aucune connaissance des etages deja visites
   * (this.visitedFloors, la seule source fiable pour savoir quelles
   * villes existent deja) ni de leur seed.
   *
   * Deux styles bien distincts, JAMAIS l'un un simple repli de l'autre :
   * - 'crossTown' : cible une ville FUTURE, jamais encore visitee (sinon
   *   il suffirait de se teleporter via le hub de voyage - aucun interet).
   *   Le destinataire n'est PAS connu tout de suite (cette ville n'existe
   *   pas encore) - resolu plus tard, des que le joueur la visite pour la
   *   premiere fois (cf. le PREMIER PASSAGE de createQuestNpcs).
   * - 'sameTown' : delibere, assume comme un clin d'oeil moqueur envers
   *   les jeux qui font faire l'aller-retour entre deux PNJ situes juste
   *   a cote l'un de l'autre - PAS un repli faute de mieux. Le
   *   destinataire est un AUTRE PNJ de cette meme ville, deja connu
   *   immediatement.
   */
  maybeInjectDeliveryQuest(eligibleKeys) {
    if (eligibleKeys.length === 0) return;

    const injectRng = createRng(`${this.currentSeed}-delivery-inject`);
    if (injectRng() >= 0.2) return; // 20% de chance qu'une livraison apparaisse dans cette ville

    const giverKey =
      eligibleKeys[Math.floor(injectRng() * eligibleKeys.length)];

    // villes futures (multiples de 10, au-dela de l'etage courant, dans
    // la limite du jeu) PAS encore dans this.visitedFloors
    const futureCandidates = [];
    for (let d = this.currentDepth + 10; d <= 100; d += 10) {
      if (!this.visitedFloors.find((f) => f.depth === d))
        futureCandidates.push(d);
    }
    const canSameTown = eligibleKeys.length >= 2; // il faut au moins un AUTRE PNJ fraichement cree dans cette meme ville

    let style, targetDepth;
    if (futureCandidates.length > 0 && (!canSameTown || injectRng() < 0.7)) {
      style = "crossTown";
      targetDepth =
        futureCandidates[Math.floor(injectRng() * futureCandidates.length)];
    } else if (canSameTown) {
      style = "sameTown";
      targetDepth = this.currentDepth;
    } else {
      return; // ni l'un ni l'autre possible (ex: derniere ville du jeu, un seul PNJ ici) - pas de livraison cette fois
    }

    const goldReward = 20 + Math.floor(injectRng() * 21); // 20-40

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
    // crossTown : receiverKey reste null, resolu plus tard (cf. le
    // PREMIER PASSAGE de createQuestNpcs, ci-dessus) des que cette ville
    // cible sera visitee pour la premiere fois.
  }

  /**
   * Cree les PNJ ambiants a partir des positions du serveur - purement
   * decoratifs, jamais de quete ni de vente. Chacun patrouille (meme
   * mecanisme que le comportement 'patrol' des ennemis - pickPatrolRoute,
   * cf. enemyBehavior.js) autour de son point de spawn, et s'arrete
   * (this.talking) quand on lui parle, jusqu'a la fermeture du dialogue -
   * cf. openAmbientDialog/closeDialog. Sprite ET salutation choisis au
   * hasard, seedes separement des PNJ de quete (memes graines de base +
   * suffixe different) pour ne jamais coincider par accident.
   */
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
      sprite.setDepth(9); // entre les ennemis (8) et le heros (10), comme les PNJ de quete
      // contrairement au PNJ de quete, celui-ci BOUGE : il lui faut son
      // propre collider avec les murs (this.layer), en plus du heros et
      // des ennemis (pour ne traverser personne, ni etre traverse)
      this.levelColliders.push(this.physics.add.collider(sprite, this.layer));
      this.levelColliders.push(this.physics.add.collider(this.hero, sprite));
      this.levelColliders.push(
        this.physics.add.collider(this.enemyGroup, sprite),
      );

      // meme mecanisme de patrouille que les ennemis de type 'patrol' -
      // route calculee une fois a la creation, autour du point de spawn.
      // Pas de route trouvee (carte trop exigue) = null = reste immobile,
      // degradation propre plutot qu'une erreur
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

  /**
   * Ouvre le dialogue d'UN PNJ precis (evenement React, cf. arpg.jsx) -
   * propose la quete si elle n'a pas encore ete acceptee, un message de
   * fin sinon. Retient `questKey` (this.activeDialogQuestKey) pour que
   * acceptQuest() sache sur quelle quete precise agir - plusieurs PNJ
   * peuvent etre presents sur le meme etage desormais.
   */
  /**
   * Ouvre le dialogue d'UN PNJ de quete precis (evenement React, cf.
   * arpg.jsx) - propose la quete si elle n'a pas encore ete acceptee, un
   * message de fin sinon. Fige ce PNJ (npc.talking, lu par
   * updateNpcMovement) le temps du dialogue, exactement comme un PNJ
   * ambiant - cf. this.activeTalkingNpc, liberee a la fermeture quel que
   * soit le bouton presse (Fermer/Accepter/Rendre).
   */
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
        // indice de lieu uniquement si le serveur a fourni un boss
        // connu (cf. ArpgController.js/bossConfig.getMostRecentBossDepth)
        // - toujours le PLUS RECENT deja rencontre, jamais fige sur le
        // tout premier boss du jeu. Absent (FIXED_QUESTS, ou aucun boss
        // encore croise) = pas d'indice, texte generique seul.
        const bossHint =
          qs.bossDepth && qs.bossType
            ? ` Le ${resolveEnemyDisplayName(qs.bossType)} de l'étage ${qs.bossDepth} le détient.`
            : "";
        text = custom.offer || `Peux-tu me rapporter ${itemName} ?${bossHint}`;
        canAccept = true;
      }
    } else if (qs.questId === "defeatBoss") {
      const bossName = resolveEnemyDisplayName(qs.targetBossType);
      // meme distinction a 4 etats qu'obtainItem (accepte-pas-fait /
      // accepte-fait-pret-a-rendre / termine), mais la condition de
      // "pret a rendre" est bossDefeated plutot que "l'objet est dans
      // l'inventaire" - rien a retirer de l'inventaire a la remise
      // (cf. turnInQuest), juste une confirmation
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
        // le donneur n'a RIEN a faire apres l'acceptation - l'objet est
        // deja donne (cf. acceptQuest), toute la suite se joue chez le
        // destinataire (cf. la branche 'receiver' ci-dessous). Revenir
        // le voir n'est que du texte d'ambiance, jamais d'action.
        if (qs.completed) {
          text = custom.complete || `Merci d'avoir livré mon colis !`;
        } else if (qs.accepted) {
          text =
            custom.progress ||
            (qs.style === "sameTown"
              ? `Le colis est en route vers son destinataire, juste à côté.`
              : `Le colis est en route vers l'étage ${qs.targetDepth}.`);
        } else {
          // clin d'oeil assume pour le style 'sameTown' (cf.
          // maybeInjectDeliveryQuest) - le donneur sait pertinemment que
          // c'est absurde de faire porter un message juste a cote, et le
          // dit lui-meme plutot que de feindre une urgence
          text =
            custom.offer ||
            (qs.style === "sameTown"
              ? `Porte ce colis à quelqu'un juste à côté. Non, je ne peux pas y aller moi-même, ne pose pas de questions.`
              : `Porte ce colis à quelqu'un à l'étage ${qs.targetDepth}.`);
          canAccept = true;
        }
      } else {
        // role 'receiver' : deja "accepte" implicitement des la creation
        // (cf. createQuestNpcs) - pas de bouton "Accepter" cote
        // destinataire, juste "Rendre" une fois l'objet en poche
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
            // defensif - ne devrait pas arriver (l'objet est donne des
            // l'acceptation cote donneur), mais matche le meme filet de
            // securite qu'obtainItem au cas ou
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

  /**
   * Accepte la quete du PNJ dont le dialogue est actuellement ouvert -
   * appele depuis React (bouton "Accepter" du dialogue).
   */
  acceptQuest() {
    const qs = this.quests[this.activeDialogQuestKey];
    if (!qs) return;
    qs.accepted = true;
    // livraison : l'objet est donne IMMEDIATEMENT a l'acceptation (pas a
    // trouver/gagner comme obtainItem) - c'est litteralement le colis a
    // transporter jusqu'au destinataire
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

  /**
   * Rend une quete de type "obtainItem" (objet a rapporter) ou
   * "defeatBoss" (simple confirmation, rien a retirer de l'inventaire) -
   * appele depuis React (bouton "Rendre"/"Confirmer" du dialogue).
   * L'objet obtainItem appartient au PNJ, pas au joueur : l'avoir en
   * poche ne suffit pas (cf. openQuestDialog, qui n'affiche le bouton
   * que si l'objet est bien present ou, pour defeatBoss, si
   * qs.bossDefeated est vrai). Marque la quete terminee, donne l'XP et
   * l'or dans les deux cas.
   */
  /**
   * Rend une quete de type "obtainItem" (objet a rapporter), "defeatBoss"
   * (simple confirmation, rien a retirer de l'inventaire) ou "delivery"
   * cote destinataire (objet a remettre, ET clot AUSSI le donneur lie via
   * linkedKey - sinon il resterait eternellement "en cours" meme apres
   * livraison effective) - appele depuis React (bouton "Rendre"/
   * "Confirmer" du dialogue). L'objet obtainItem appartient au PNJ, pas
   * au joueur : l'avoir en poche ne suffit pas (cf. openQuestDialog, qui
   * n'affiche le bouton que si l'objet est bien present ou, pour
   * defeatBoss, si qs.bossDefeated est vrai). Marque la quete terminee,
   * donne l'XP et l'or dans tous les cas.
   */
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
      const itemIndex = this.inventory.findIndex(
        (i) => i.itemId === qs.targetItemId,
      );
      if (itemIndex === -1) return; // defensif - ne devrait pas arriver si le bouton n'etait propose que l'objet en main

      const item = this.inventory[itemIndex];
      item.quantity -= 1;
      if (item.quantity <= 0) this.inventory.splice(itemIndex, 1);
    } else if (qs.questId === "defeatBoss") {
      if (!qs.bossDefeated) return; // defensif - ne devrait pas arriver si le bouton n'etait propose qu'une fois le boss vaincu
    } else {
      // delivery, role receiver
      const itemIndex = this.inventory.findIndex((i) => i.itemId === qs.itemId);
      if (itemIndex === -1) return; // defensif - meme raison que obtainItem

      const item = this.inventory[itemIndex];
      item.quantity -= 1;
      if (item.quantity <= 0) this.inventory.splice(itemIndex, 1);

      // clot AUSSI le donneur (cf. linkedKey) - sans ca, il resterait
      // indefiniment "en cours" alors que la livraison a bien eu lieu
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

    // reutilise addItemToInventory (deja teste) pour l'or gagne - empile
    // avec l'or existant, emet 'inventory-updated' (reflete deja le
    // retrait de l'objet ci-dessus, le cas echeant) et persiste
    this.addItemToInventory("gold", qs.goldReward);
  }

  /**
   * Ouvre le dialogue d'un PNJ ambiant (evenement React, reutilise le
   * MEME canal que le dialogue de quete - cf. openQuestDialog) - juste
   * une salutation, jamais de bouton "Accepter"/"Rendre". Le PNJ
   * s'arrete net (npc.talking, lu par updateNpcMovement) pendant que le
   * dialogue reste ouvert, et reprend sa patrouille a la fermeture (cf.
   * closeDialog).
   */
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

  /**
   * Libere le PNJ actuellement fige par un dialogue (quete OU ambiant -
   * this.activeTalkingNpc couvre les deux, cf. openQuestDialog/
   * openAmbientDialog) - reprend sa patrouille au prochain update.
   * Appelee par les 3 chemins de fermeture du dialogue (Fermer/Accepter/
   * Rendre), pour ne jamais dupliquer cette logique.
   */
  releaseTalkingNpc() {
    if (this.activeTalkingNpc) {
      this.activeTalkingNpc.talking = false;
      this.activeTalkingNpc = null;
    }
  }

  /**
   * Ferme le dialogue sans accepter - appele depuis React (bouton
   * "Fermer").
   */
  closeDialog() {
    this.dialogOpen = false;
    this.activeDialogQuestKey = null;
    this.releaseTalkingNpc();
    this.events.emit("npc-dialog", null);
  }

  update() {
    if (!this.hero || this.isDead) return;
    if (this.gamePaused) return; // confirmation de remontee en cours - tout le gameplay est gele

    const speed = this.playerMoveSpeed;
    let vx = 0,
      vy = 0;
    // haut/gauche dependent de la disposition active (cf.
    // setKeyboardLayout) - droite/bas sont communs aux deux (D et S
    // occupent la meme position physique en AZERTY et QWERTY)
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

    // fusionne avec le joystick tactile (vecteur analogique, cf.
    // setTouchMoveVector) plutot que de le remplacer - un appareil
    // tactile ET un clavier branche fonctionnent tous les deux en meme
    // temps, aucun n'exclut l'autre
    vx += this.touchMoveVector.x;
    vy += this.touchMoveVector.y;

    // normalise seulement si la magnitude depasse 1 (mouvement clavier
    // en diagonale, ou clavier+tactile combines) - un joystick pousse a
    // moitie (magnitude 0.5) doit rester a mi-vitesse, jamais remonte a
    // pleine vitesse artificiellement
    const mag = Math.hypot(vx, vy);
    if (mag > 1) {
      vx /= mag;
      vy /= mag;
    }
    vx *= speed;
    vy *= speed;

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
        const changes = this.fogState.update(
          tileX,
          tileY,
          this.playerVisionRadius,
        );
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
        this.showExitPrompt();
        // pas de return : on ne recharge rien immediatement, on met le
        // jeu en pause en attendant la reponse du joueur (cf.
        // showExitPrompt) - avant, le passage direct par ce couloir
        // forcait la descente sans aucun choix possible, et le temps
        // d'attente du chargement (async, appel reseau) n'etait pas mis
        // en pause : un ennemi pouvait continuer a se deplacer et
        // traverser le joueur pendant ce court delai
      }

      if (
        this.upstairsTile &&
        tileX === this.upstairsTile.x &&
        tileY === this.upstairsTile.y
      ) {
        this.showUpstairsPrompt();
        // pas de return ici non plus, meme raison
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

    this.updateEnemyMovement();

    // meme regle pour les coffres - un vrai oubli jusqu'ici (jamais
    // couverts par le controle de visibilite applique aux ennemis/PNJ,
    // pas une regression d'un correctif precedent : ils n'avaient tout
    // simplement jamais ete inclus dans cette boucle)
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
      exitTile: this.exitTile,
      upstairsTile: this.upstairsTile,
    });
  }

  /**
   * Le joueur est-il dans l'angle mort (derriere) de cet ennemi ? Se
   * base sur enemy.lastDir (direction cardinale ou l'ennemi fait
   * actuellement face, mise a jour par le mouvement - reste valable a
   * l'arret, meme logique que le heros) plutot que sur une direction
   * "de visee" separee, qui n'existe pas cote ennemi. Coordonnees en
   * CASES (comme le reste de updateEnemyDecisions), pas en pixels - la
   * distance elle-meme n'a pas d'importance ici, seul l'angle compte.
   */
  isPlayerBehindEnemy(enemy, ex, ey, playerTileX, playerTileY) {
    const facing = ENEMY_DIR_VECTORS[enemy.lastDir] || ENEMY_DIR_VECTORS.down;
    const dx = playerTileX - ex;
    const dy = playerTileY - ey;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return false; // superposition exacte - pas de sens directionnel, ne bloque jamais la detection
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
        const isRanged = enemy.attackType === "ranged";
        // distance d'arret differente selon attackType - un ennemi a
        // distance s'arrete bien avant la melee (ENEMY_RANGED_STOP_DISTANCE),
        // pour pouvoir tirer sans jamais avoir besoin de s'approcher au
        // contact. Comportement melee inchange (ENEMY_STOP_DISTANCE).
        const stopDistance = isRanged
          ? ENEMY_RANGED_STOP_DISTANCE
          : ENEMY_STOP_DISTANCE;
        const stopForMelee =
          enemy.state === "chase" && distToHero < stopDistance;

        // ennemi a distance, joueur trop proche (sous
        // ENEMY_RANGED_RETREAT_DISTANCE) -> recule ACTIVEMENT plutot que
        // de simplement s'arreter. Recule ET tire en meme temps (choisi
        // explicitement) : les deux systemes restent decouples,
        // updateEnemyAttacks continue de fonctionner independamment de
        // l'etat du mouvement, pas besoin de s'arreter pour viser.
        // Velocite directe (pas de pathfinding vers un point precis) :
        // la direction de fuite est juste "l'oppose du joueur", pas une
        // destination fixe.
        if (
          enemy.state === "chase" &&
          isRanged &&
          distToHero < ENEMY_RANGED_RETREAT_DISTANCE
        ) {
          const dx = enemy.sprite.x - this.hero.x;
          const dy = enemy.sprite.y - this.hero.y;
          const mag = Math.hypot(dx, dy) || 1;
          const vx = (dx / mag) * ENEMY_SPEED;
          const vy = (dy / mag) * ENEMY_SPEED;
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

  /**
   * Deplace une entite (ennemi, PNJ de quete ou PNJ ambiant - fonction
   * partagee) vers une case cible. Inclut une detection de blocage : si
   * la position n'a quasiment pas bouge depuis ~500ms malgre une vitesse
   * non nulle (collision avec un mur/batiment, un autre PNJ...), force
   * le passage a l'etape suivante (onArrive quand meme) plutot que de
   * laisser l'entite pousser indefiniment contre l'obstacle avec
   * l'animation de marche qui tourne sans jamais vraiment avancer - bug
   * constate en jeu avec un PNJ ambiant coince contre un batiment.
   */
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
          // quasiment aucun progres en 500ms malgre une vitesse non
          // nulle : bloque par un obstacle, abandonne cette case et
          // passe a la suivante plutot que de rester coince
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
   * Deplace chaque PNJ ambiant le long de sa route de patrouille (meme
   * logique que le comportement 'patrol' des ennemis, reutilise
   * moveEnemyToward tel quel) - s'arrete net (this.talking) pendant
   * qu'on lui parle, cf. openAmbientDialog. Visibilite au brouillard
   * recalculee chaque frame comme les ennemis (case ACTUELLEMENT
   * visible, pas juste deja vue) : contrairement au PNJ de quete
   * (immobile), celui-ci bouge, "se souvenir" de sa position passee
   * n'aurait pas de sens.
   */
  /**
   * Deplace une LISTE de PNJ mobiles le long de leur route de patrouille
   * (meme logique que le comportement 'patrol' des ennemis, reutilise
   * moveEnemyToward tel quel) - s'arrete net (npc.talking) pendant qu'on
   * leur parle. Fonction partagee entre PNJ de quete ET PNJ ambiants :
   * les deux ont exactement la meme mecanique de deplacement desormais,
   * seule leur interaction differe (dialogue de quete vs simple
   * salutation). Visibilite au brouillard recalculee chaque frame comme
   * les ennemis (case ACTUELLEMENT visible, pas juste deja vue) : ces
   * PNJ bougent, contrairement au decor.
   */
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

  /**
   * Toute interaction NON combative a portee - PNJ de quete/ambiant,
   * hub de voyage, boutique, porte du boss, coffres. Scindee de
   * performMeleeAttack (qui gerait auparavant les deux a la fois, meme
   * touche) a la demande explicite : Espace n'attaque plus que les
   * ennemis, E ne fait plus qu'interagir. Pas de cooldown ici
   * (contrairement au combat) - parler/ouvrir un coffre n'a pas besoin
   * d'etre limite en cadence.
   */
  performInteraction() {
    // interaction avec un PNJ de quete : pas de degats, on ouvre le
    // dialogue a la place. On n'attaque pas les ennemis ce coup-ci
    // si un PNJ est a portee, pour eviter d'ouvrir le dialogue en pleine
    // baston contre un ennemi qui se trouverait juste a cote. Plusieurs
    // PNJ possibles par etage desormais, mais l'espacement minimal impose
    // a la generation (4 cases) est deja plus grand que la portee de
    // melee - jamais deux a la fois a portee, un simple `find` suffit.
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

    // interaction avec un PNJ ambiant : meme principe, mais purement
    // decoratif (juste une salutation, pas de quete/vente) - PEUT y avoir
    // plusieurs PNJ ambiants a portee simultanement (contrairement aux
    // PNJ de quete, leur espacement minimal - 4 cases - n'exclut pas ce
    // cas), donc on prend le premier trouve, ordre arbitraire mais stable
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

    // hub de voyage rapide (uniquement en ville) - pas de degats, ouvre
    // la liste des etages deja visites (evenement React, cf. arpg.jsx)
    if (this.travelHubTile && !this.dialogOpen) {
      const hubPx = this.travelHubTile.x * TILE_SIZE + TILE_SIZE / 2;
      const hubPy = this.travelHubTile.y * TILE_SIZE + TILE_SIZE / 2;
      const distHub = Math.hypot(hubPx - this.hero.x, hubPy - this.hero.y);
      if (distHub <= this.playerMeleeRange) {
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
      if (distShop <= this.playerMeleeRange) {
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
      if (distDoor <= this.playerMeleeRange) {
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
          Math.hypot(cx - this.hero.x, cy - this.hero.y) <=
          this.playerMeleeRange
        );
      });
      if (chest) {
        chest.opened = true;
        chest.sprite.setFrame(chest.variant.openFrame);
        chest.sprite.body.checkCollision.none = true; // sinon il faut sauvegarder+reprendre pour que le passage se debloque (le corps physique du coffre nouvellement ouvert n'est jamais retouche autrement)
        // jamais pour un coffre EPHEMERE (butin d'ennemi, cf.
        // spawnLootChest) - il n'existe pas dans la liste generee par le
        // serveur, son index (negatif) n'aurait aucun sens a y figurer,
        // et il n'est de toute facon jamais recree a une revisite
        if (!chest.ephemeral) this.currentFloorOpenedChests.push(chest.index);

        if (chest.loot) {
          this.addItemToInventory(chest.loot.itemId, chest.loot.quantity);
          const itemDef = resolveItemDef(chest.loot.itemId);
          this.showLootToast(
            `Trouvé : ${itemDef.name} x${chest.loot.quantity}`,
          );
        } else if (chest.lootItems && chest.lootItems.length > 0) {
          // coffre de butin d'ennemi : PLUSIEURS objets a la fois (cf.
          // spawnLootChest) - un seul toast combine plutot qu'un par
          // objet, qui se chevaucheraient (showLootToast remplace
          // toujours la ligne precedente, cf. sa propre doc)
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

  /**
   * Attaque au corps a corps PURE desormais (cf. performInteraction
   * ci-dessus pour tout ce qui n'inflige pas de degats) - ne fait plus
   * que blesser les ennemis a portee, dans le cone devant le heros.
   */
  performMeleeAttack(now) {
    if (!this.meleeCooldown.isReady(now)) return;
    this.meleeCooldown.trigger(now);

    for (const enemy of this.enemies) {
      const dx = enemy.sprite.x - this.hero.x;
      const dy = enemy.sprite.y - this.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > this.playerMeleeRange || !this.isEnemyVisible(enemy)) continue;

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

      // critique GARANTI si cet ennemi n'a pas encore repere le joueur
      // (etat autre que 'chase' - patrol/guard/rest/returning), sinon
      // simple chance (cf. rollCritical dans combat.js)
      const isCrit = rollCritical(enemy.state !== "chase");
      const rawDamage = this.playerMeleeDamage * (isCrit ? CRIT_MULTIPLIER : 1);
      this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
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

  /**
   * Le joueur ne peut tirer a distance que s'il porte une arme marquee
   * grantsRanged en main principale OU secondaire (cf. itemDefs.js -
   * l'arc, a 2 mains, ou l'arbalete, a 1 main et donc cumulable avec une
   * epee). Contrairement au comportement d'origine, l'attaque a distance
   * n'est plus une capacite universelle disponible quel que soit
   * l'equipement : une epee + un bouclier ne la debloque jamais.
   */
  /**
   * Renvoie la definition de l'arme a distance ACTUELLEMENT equipee
   * (mainHand ou offHand, quel que soit celui qui a grantsRanged) - ou
   * null si aucune. Complete canUseRangedAttack (qui dit juste SI le
   * joueur peut tirer) : celle-ci dit AVEC QUOI, utile pour verifier
   * requiresAmmo sans redérouler la meme logique deux fois.
   */
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
      // pas de declenchement du cooldown ici - aucune attaque n'a
      // reellement eu lieu, le laisser intact pour la prochaine fois ou
      // le joueur aura une vraie arme a distance equipee
      this.showLootToast("Aucune arme à distance équipée");
      return;
    }

    // arme PHYSIQUE (arc/arbalete) : consomme une munition de la pile
    // encochee (this.equipped.quiver) - MAIS uniquement si c'est la
    // BONNE munition (requiresAmmo est desormais l'itemId EXACT requis,
    // pas juste un booleen "a besoin de munitions") : un carreau ne peut
    // jamais alimenter un arc, ni une fleche une arbalete. Arme MAGIQUE
    // (baton, requiresAmmo absent/false) : tir illimite. Meme garde "pas
    // de cooldown declenche" que ci-dessus si la bonne munition manque.
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

    // arme MAGIQUE (baton) : coute du mana au lieu de munitions
    // physiques - meme structure de garde que requiresAmmo ci-dessus
    // (bloque, sans declencher le cooldown, si pas assez de mana). A sec,
    // le joueur retombe naturellement sur la melee pure (le baton n'a
    // aucun bonus de meleeDamage, cf. itemDefs.js) - aucun code
    // supplementaire necessaire pour "forcer" ce repli, il decoule deja
    // du fait que Space (melee) reste toujours disponible independamment.
    if (weaponDef.manaCost) {
      if (this.playerMana < weaponDef.manaCost) {
        this.showLootToast("Plus assez de mana !");
        return;
      }
      this.playerMana -= weaponDef.manaCost;
      // pas de persistProgress() ici non plus - meme raisonnement que
      // les munitions ci-dessus (trop frequent, la sauvegarde periodique suffit)
      this.events.emit("player-mana-changed", {
        mana: this.playerMana,
        maxMana: this.playerMaxMana,
      });
    }

    this.rangedCooldown.trigger(now);

    // vise automatiquement l'ennemi VISIBLE le plus proche a portee,
    // INDEPENDAMMENT de la direction de deplacement actuelle - sans ca,
    // le vecteur de visee etait toujours celui du deplacement
    // (lastAimVector), rendant impossible de reculer tout en tirant sur
    // un ennemi qui poursuit (il fallait s'arreter, se retourner, tirer,
    // refuir, en boucle). Repli sur lastAimVector si aucun ennemi n'est
    // trouve - permet quand meme de tirer "a vue" pour explorer/tester.
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

      if (traveled >= this.playerRangedRange || outOfBounds || hitWall) {
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
          const isCrit = rollCritical(enemy.state !== "chase");
          const rawDamage =
            this.playerRangedDamage * (isCrit ? CRIT_MULTIPLIER : 1);
          this.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
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

  /**
   * Fait apparaitre un coffre de butin a une position PIXEL donnee (pas
   * en cases, contrairement aux coffres pre-places du niveau) - utilise
   * par damageEnemy a la mort d'un ennemi normal avec du butin (cf.
   * enemy.drops), plutot que de donner les objets instantanement comme
   * avant. Reutilise EXACTEMENT le meme systeme visuel/d'interaction que
   * les coffres pre-places (this.chests, meme boucle d'ouverture dans
   * performInteraction) - simplement cree au RUNTIME plutot qu'a la
   * generation du niveau.
   *
   * JAMAIS suivi dans currentFloorOpenedChests (contrairement aux
   * coffres pre-places) : ephemere par nature - si le joueur quitte
   * l'etage et revient, tous les ennemis sont de toute facon regeneres,
   * un coffre de butin d'une visite precedente n'aurait pas de sens a
   * faire persister.
   */
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
    // pas de collider ennemi, meme raison que les coffres pre-places
    // (cf. le commentaire correspondant plus haut dans loadLevel)

    this.chests.push({
      sprite,
      index: -1 - this.nextLootChestId, // negatif = jamais confondu avec un index de coffre pre-place (toujours >= 0)
      opened: false,
      lootItems, // TABLEAU (nouveau champ) - distinct de `loot` (singulier, coffres pre-places), cf. performInteraction
      x: Math.round(pixelX / TILE_SIZE - 0.5),
      y: Math.round(pixelY / TILE_SIZE - 0.5),
      variant,
      ephemeral: true, // jamais pousse dans currentFloorOpenedChests a l'ouverture, cf. performInteraction
    });
    this.nextLootChestId++;
  }

  damageEnemy(enemy, amount) {
    const result = applyDamage(enemy, amount);
    enemy.hp = result.hp;

    if (result.died) {
      this.xp += enemy.xpReward;
      this.events.emit("xp-changed", { xp: this.xp });
      this.checkLevelUp();
      this.currentFloorKills.push(enemy.spawnIndex); // ne reapparait plus si on sauvegarde+reprend SANS avoir quitte cet etage
      // ennemi NORMAL avec du butin : fait apparaitre un coffre a
      // ouvrir plutot que de donner les objets instantanement (cf.
      // spawnLootChest) - peut contenir PLUSIEURS objets a la fois
      // (enemy.drops, tableau, cf. ArpgController.js/rollMultipleLoot),
      // contrairement a l'ancien ramassage automatique d'un seul objet.
      // Les BOSS gardent leur comportement instantane inchange (cf. le
      // bloc enemy.isBoss plus bas, qui utilise toujours enemy.drop
      // singulier) - hors du perimetre de cette demande.
      if (enemy.drops && enemy.drops.length > 0) {
        this.spawnLootChest(enemy.sprite.x, enemy.sprite.y, enemy.drops);
      }

      // un boss vaincu donne TOUJOURS l'objet cible de toute quete
      // "recuperer tel objet" active (acceptee, pas encore terminee),
      // EN PLUS du butin normal ci-dessus - sans quete active pour un
      // objet donne, il ne tombe jamais du tout (absent de
      // LOOT_TABLES.bossDrop cote serveur). Garantit que la quete reste
      // toujours faisable, sans dependre d'un tirage aleatoire - avant
      // ce changement, l'objet avait une simple CHANCE de tomber meme
      // sans quete active, ce qui rendait la quete elle-meme peu fiable
      // (bug remonte : "j'ai essaye le boss mais rien").
      //
      // Compte, par objet cible, combien d'EXEMPLAIRES sont necessaires
      // (plusieurs quetes actives peuvent viser le meme objet - rare
      // mais possible) contre combien on en a deja, et ne complete que
      // l'ecart - evite qu'une quete "vole" l'exemplaire deja destine a
      // une autre sur le meme kill.
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

        // quetes "vaincre le boss de l'etage X" : marque bossDefeated
        // des que LE BON boss (meme profondeur cible) meurt, APRES
        // acceptation - ne complete jamais la quete ici directement, le
        // joueur doit encore revenir en informer le PNJ (cf. turnInQuest)
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
      if (justCompletedReward) {
        const itemDef = resolveItemDef(justCompletedReward.itemId);
        this.showLootToast(
          `Quête terminée ! Reçu : ${itemDef.name} x${justCompletedReward.quantity}`,
        );
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
    this.playerMana = this.playerMaxMana; // idem pour le mana

    this.events.emit("player-hp-changed", {
      hp: this.playerHp,
      maxHp: this.playerMaxHp,
    });
    this.events.emit("player-mana-changed", {
      mana: this.playerMana,
      maxMana: this.playerMaxMana,
    });
    this.events.emit("level-up", { level });
    this.persistProgress();
  }

  /**
   * Attaque de chaque ennemi a portee, en chasse, et pret (cooldown) -
   * deux branches selon enemy.attackType (cf. enemyStats.js/bossConfig.js
   * cote serveur) :
   * - 'melee' (par defaut) : degats INSTANTANES au contact, comportement
   *   inchange depuis le debut du projet.
   * - 'ranged' : tire un PROJECTILE vers le heros au lieu de degats
   *   instantanes - les degats ne s'appliquent que si le projectile
   *   touche reellement, cf. updateEnemyProjectiles. Portee de
   *   declenchement bien plus large que le contact (ENEMY_RANGED_ATTACK_RANGE
   *   vs ENEMY_ATTACK_RANGE), sinon un ennemi a distance se comporterait
   *   comme un ennemi de melee qui rate juste sa portee.
   */
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
        const mag = Math.hypot(dx, dy) || 1; // || 1 : garde-fou si jamais le heros et l'ennemi sont exactement superposes (division par zero)
        const vx = dx / mag;
        const vy = dy / mag;

        // rouge/orange pour se distinguer visuellement du projectile bleu
        // du joueur (cf. performRangedAttack) - le joueur doit pouvoir
        // reconnaitre au premier coup d'oeil qui a tire quoi
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

        // damage capture ICI (stat de l'ennemi au moment du tir), jamais
        // relue plus tard - un ennemi tue apres avoir tire ne doit pas
        // faire disparaitre son propre projectile deja en vol
        this.enemyProjectiles.push({
          sprite,
          startX: enemy.sprite.x,
          startY: enemy.sprite.y,
          damage: enemy.damage,
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

      this.hero.setTint(0xff8888).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(100, () => {
        if (this.hero) {
          this.hero.clearTint();
          this.hero.setTintMode(Phaser.TintModes.MULTIPLY);
        }
      });
    }
  }

  /**
   * Fait avancer les projectiles ENNEMIS (this.enemyProjectiles, distinct
   * de this.projectiles qui appartient au joueur) - meme structure que
   * updateProjectiles, mais collision INVERSEE : teste la distance au
   * heros, jamais aux ennemis. Degats bases sur proj.damage (capture au
   * moment du tir, cf. updateEnemyAttacks), pas une relecture de
   * l'ennemi qui a tire.
   */
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

      // meme logique de visibilite que les projectiles du joueur - ne
      // s'affiche que dans la zone de vision ACTUELLE, jamais a travers
      // le brouillard (meme raison : eviter un "sonar" non voulu qui
      // reveler la forme du niveau)
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
