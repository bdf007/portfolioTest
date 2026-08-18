const mongoose = require("mongoose");
const enemyBalance = require("./enemyBalance");
const gameConfig = require("./gameConfig");

const DungeonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "victory", "abandoned", "defeat"],
      default: "in_progress",
    },
    difficulty: {
      type: String,
      enum: ["facile", "moyen", "difficile", "epique"],
      default: "facile",
    },
    // "normal" = plateau classique 8x8 en une pièce, "aventure" = donjon en
    // salles reliées par des portes (15x15). Les 4 difficultés s'appliquent
    // identiquement aux deux modes (mêmes vies/essais/étages à boucler),
    // seule la structure du plateau change.
    mode: {
      type: String,
      enum: ["normal", "aventure"],
      default: "normal",
    },

    tiles: [
      {
        type: { type: String }, // "type" est un mot réservé Mongoose -> imbrication obligatoire
        value: Number,
        weaponDie: Number, // PC individuel — rat/monstre seuls (les fusions utilisent mergedStats.weaponDie)
        position: { x: Number, y: Number },
        revealed: { type: Boolean, default: false },
        cleared: { type: Boolean, default: false }, // true = ne bloque plus le passage
        color: String, // couleur du blob ("rouge"/"bleu"/"vert"), assignée à la révélation
        mergedStats: {
          bodyParts: { tete: Number, torse: Number, jambes: Number },
          weaponDie: Number,
        },
      },
    ],

    hero: {
      name: String,
      bodyParts: {
        tete: { type: Number, default: 0 },
        torse: { type: Number, default: 0 },
        jambes: { type: Number, default: 0 },
      },
      weaponDie: { type: Number, default: 1 }, // PC (Points de Combat)
      gold: { type: Number, default: 0 },
      hasLegs: { type: Boolean, default: true },
      inventory: [String],
      spriteId: { type: Number, default: null }, // 1-4, choisi à la création/recréation
    },

    boss: {
      type: { type: String },
      bodyParts: {
        tete: Number,
        torse: Number,
        jambes: Number,
      },
      weaponDie: Number,
    },

    // Pioche des cartes trésor (mélangée à la création), consommée à chaque coffre ouvert
    treasureDeck: [String],

    shopStock: {
      potionSimple: {
        price: { type: Number, default: 2 },
        stock: { type: Number, default: 4 },
      },
      potionTriple: {
        price: { type: Number, default: 10 },
        stock: { type: Number, default: 2 },
      },
      armeBonus: {
        price: { type: Number, default: 5 },
        stock: { type: Number, default: 2 },
      },
    },

    gameState: {
      currentTile: { x: Number, y: Number },
      // Position de respawn (équivalent "tuile d'entrée" de la règle)
      entryTile: { x: Number, y: Number },
      // Dernière position avant le déplacement courant, utile pour savoir où
      // déposer le trésor en cas de chute dans un gouffre ("case précédente")
      previousTile: { x: Number, y: Number },
      keyFound: Boolean,
      bossDefeated: Boolean,
      movesRemaining: { type: Number, default: 0 },
      lockedDirection: { type: String, default: null },
      heroIsDead: { type: Boolean, default: false },
      deathCause: { type: String, default: null },
      pendingGouffreFall: { type: mongoose.Schema.Types.Mixed, default: null },
      usedSpriteIds: { type: [Number], default: [] },
      solVariant: { type: Number, default: 0 }, // index dans SOL_VARIANTS, tiré au sort par étage
      radarUsedCount: { type: Number, default: 0 }, // 1ère gratuite, +5 à chaque suivante
      tilesRevealedCount: { type: Number, default: 0 },
      heroConfirmed: { type: Boolean, default: false },
      livesRemaining: { type: Number, default: 1 },
      rerollsRemaining: { type: Number, default: 1 },
      score: { type: Number, default: 0 },
      turnCount: { type: Number, default: 0 },
      lastShopPurchaseTurn: { type: Number, default: -1 },
      lastItemUseTurn: { type: Number, default: -1 },
      // Récapitulatif affiché après avoir réussi un étage, jusqu'à ce que le
      // joueur confirme (continuer ou sauvegarder/quitter) — voir dismissFloorRecap.
      floorRecap: { type: mongoose.Schema.Types.Mixed, default: null },
      floor: { type: Number, default: 1 },
      // Ennemi croisé en chemin, en attente d'une décision (combattre / continuer au tour suivant)
      // puis état complet du combat une fois démarré (started: true, attacksHero, attacksEnemy, enemy)
      pendingCombat: { type: mongoose.Schema.Types.Mixed, default: null },
      // Piège permanent croisé en chemin, en attente d'une décision (marcher / sauter / s'arrêter / se jeter)
      pendingTrapChoice: { type: mongoose.Schema.Types.Mixed, default: null },
      // Ennemi révélé croisé de nouveau : choix furtivité/combat/arrêt en attente
      pendingEnemyChoice: { type: mongoose.Schema.Types.Mixed, default: null },
      // Trésor abandonné au sol par un héros mort, en attente d'être récupéré
      groundLoot: [
        {
          x: Number,
          y: Number,
          gold: Number,
          inventory: [String],
          hasKey: Boolean,
        },
      ],
    },
  },
  { timestamps: true },
);

// ---------------------------------------------------------------------------
// Génération du plateau selon la difficulté
// ---------------------------------------------------------------------------

// NB: le nombre exact de tuiles "trésor"/"magasin" a été simplifié par rapport
// au tableau brut du PDF (colonnes ambiguës à l'extraction) : ajuste si besoin.
// Toutes les valeurs ci-dessous vivent maintenant dans gameConfig.js —
// modifiable sans toucher à ce fichier.
const DIFFICULTY_CONFIG = gameConfig.DIFFICULTY_CONFIG;
const ADVENTURE_CONTENT_SCALE = gameConfig.ADVENTURE_CONTENT_SCALE;
const DIFFICULTY_RULES = gameConfig.DIFFICULTY_RULES;

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function generateTiles(difficulty) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.facile;
  const usedPositions = new Set();

  const pickFreePosition = () => {
    let x, y, key;
    do {
      x = Math.floor(Math.random() * 8);
      y = Math.floor(Math.random() * 8);
      key = `${x},${y}`;
    } while (usedPositions.has(key));
    usedPositions.add(key);
    return { x, y };
  };

  const tiles = [];

  // Entrée et sortie : positions fixes et réservées, exclues du tirage aléatoire
  usedPositions.add("0,0");
  usedPositions.add("7,7");
  tiles.push({
    type: "entrée",
    value: null,
    position: { x: 0, y: 0 },
    revealed: true, // le héros démarre ici, jamais "découverte" via un déplacement
    cleared: true,
  });
  tiles.push({ type: "sortie", value: null, position: { x: 7, y: 7 } });

  const addTiles = (type, count, value) => {
    for (let i = 0; i < count; i++) {
      tiles.push({ type, value, position: pickFreePosition() });
    }
  };

  // Tuiles uniques
  tiles.push({ type: "clé", value: null, position: pickFreePosition() });
  tiles.push({ type: "boss", value: 20, position: pickFreePosition() });
  tiles.push({ type: "magasin", value: null, position: pickFreePosition() });

  // Tuiles selon la difficulté — rats et blobs tirent chacun leurs propres
  // PV et PC (équilibrage centralisé dans enemyBalance.js), plutôt qu'une
  // valeur identique pour tous.
  for (let i = 0; i < cfg.monstres; i++) {
    const stats = enemyBalance.generateBlobStats(difficulty);
    tiles.push({
      type: "monstre",
      value: stats.pv,
      weaponDie: stats.weaponDie,
      position: pickFreePosition(),
    });
  }
  for (let i = 0; i < cfg.rats; i++) {
    const stats = enemyBalance.generateRatStats(difficulty);
    tiles.push({
      type: "rat",
      value: stats.pv,
      weaponDie: stats.weaponDie,
      position: pickFreePosition(),
    });
  }
  addTiles("piège", cfg.herses, -2); // herse
  addTiles("piège", cfg.gouffres, -1); // gouffre
  addTiles("coffre", cfg.tresor, 10);

  // Compléter à 64 avec des tuiles vierges
  while (tiles.length < 64) {
    tiles.push({
      type: "tuile-vide",
      value: null,
      position: pickFreePosition(),
    });
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// Génération du mode Aventure : donjon en salles reliées, plutôt qu'une
// grande pièce unique. Algorithme repris du portage JS de Generation.cs
// (Unity) qu'on a déjà testé séparément — grille de 5×5 emplacements de
// salle possibles, remplie par une marche aléatoire biaisée dans une
// direction générale, sans forcément toutes les remplir.
// ---------------------------------------------------------------------------

const ADVENTURE_ROOM_GRID_SIZE = 5; // 5x5 emplacements de salle possibles
const ADVENTURE_ROOM_SIZE = 3; // chaque salle générée = 3x3 cases

const ADV_DIRECTIONS = {
  north: { x: 0, y: 1 },
  south: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Place les salles sur la grille 5×5 — retourne uniquement la structure
// (quelles salles existent, laquelle est le départ, laquelle est la
// sortie), pas encore le contenu des cases. Le nombre cible de salles est
// tiré dans la fourchette de la difficulté (voir gameConfig.js).
function generateAdventureRoomsOnce(difficulty) {
  const roomsToGenerate = gameConfig.getAdventureRoomCount(difficulty);
  const roomMap = Array.from({ length: ADVENTURE_ROOM_GRID_SIZE }, () =>
    Array(ADVENTURE_ROOM_GRID_SIZE).fill(false),
  );
  let roomCount = 0;
  let firstRoomPos = null;
  const center = Math.floor(ADVENTURE_ROOM_GRID_SIZE / 2);

  function checkRoom(rx, ry, remaining, generalDirection, firstRoom = false) {
    if (roomCount >= roomsToGenerate) return;
    if (
      rx < 0 ||
      rx >= ADVENTURE_ROOM_GRID_SIZE ||
      ry < 0 ||
      ry >= ADVENTURE_ROOM_GRID_SIZE
    )
      return;
    if (!firstRoom && remaining <= 0) return;
    if (roomMap[rx][ry] === true) return;

    if (firstRoom) firstRoomPos = { rx, ry };

    roomCount++;
    roomMap[rx][ry] = true;

    const isDir = (d) =>
      generalDirection &&
      generalDirection.x === d.x &&
      generalDirection.y === d.y;
    const north = Math.random() > (isDir(ADV_DIRECTIONS.north) ? 0.2 : 0.8);
    const south = Math.random() > (isDir(ADV_DIRECTIONS.south) ? 0.2 : 0.8);
    const east = Math.random() > (isDir(ADV_DIRECTIONS.east) ? 0.2 : 0.8);
    const west = Math.random() > (isDir(ADV_DIRECTIONS.west) ? 0.2 : 0.8);
    const maxRemaining = Math.floor(roomsToGenerate / 4);

    if (north || firstRoom) {
      checkRoom(
        rx,
        ry + 1,
        firstRoom ? maxRemaining : remaining - 1,
        firstRoom ? ADV_DIRECTIONS.north : generalDirection,
      );
    }
    if (south || firstRoom) {
      checkRoom(
        rx,
        ry - 1,
        firstRoom ? maxRemaining : remaining - 1,
        firstRoom ? ADV_DIRECTIONS.south : generalDirection,
      );
    }
    if (east || firstRoom) {
      checkRoom(
        rx + 1,
        ry,
        firstRoom ? maxRemaining : remaining - 1,
        firstRoom ? ADV_DIRECTIONS.east : generalDirection,
      );
    }
    if (west || firstRoom) {
      checkRoom(
        rx - 1,
        ry,
        firstRoom ? maxRemaining : remaining - 1,
        firstRoom ? ADV_DIRECTIONS.west : generalDirection,
      );
    }
  }

  checkRoom(center, center, 0, null, true);

  const rooms = [];
  for (let rx = 0; rx < ADVENTURE_ROOM_GRID_SIZE; rx++) {
    for (let ry = 0; ry < ADVENTURE_ROOM_GRID_SIZE; ry++) {
      if (roomMap[rx][ry]) rooms.push({ rx, ry });
    }
  }

  // Salle de sortie = la plus éloignée de la salle de départ (distance sur
  // la grille de salles, pas sur les cases) — pour garantir un vrai trajet
  // à parcourir plutôt qu'une sortie toute proche par hasard.
  let exitRoom = rooms[0];
  let maxDist = -1;
  for (const r of rooms) {
    const dist = Math.hypot(r.rx - firstRoomPos.rx, r.ry - firstRoomPos.ry);
    if (dist > maxDist) {
      maxDist = dist;
      exitRoom = r;
    }
  }

  return { rooms, roomMap, firstRoomPos, exitRoom };
}

// Détecte une symétrie de rotation à 4 branches autour du centre — une
// propriété que le hasard produit très rarement pour une disposition de
// salles quelconque, mais qui caractérise justement une croix à 4 branches
// (dont la croix gammée en fait partie). Un chevauchement élevé après
// rotation de 90° déclenche une nouvelle génération, par précaution — quitte
// à écarter aussi, de temps en temps, une simple croix parfaitement
// symétrique tout à fait innocente : le coût d'un faux positif est nul, le
// coût d'un faux négatif ne l'est pas.
function has4FoldRotationalSymmetry(roomMap) {
  const size = ADVENTURE_ROOM_GRID_SIZE;
  const center = Math.floor(size / 2);

  let total = 0;
  let matches = 0;

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (!roomMap[x][y]) continue;
      total++;

      // Rotation de 90° autour du centre : (dx,dy) -> (dy,-dx)
      const dx = x - center;
      const dy = y - center;
      const rx = center + dy;
      const ry = center - dx;

      if (rx >= 0 && rx < size && ry >= 0 && ry < size && roomMap[rx][ry]) {
        matches++;
      }
    }
  }

  if (total < 8) return false; // trop peu de salles pour qu'un motif inquiétant se forme
  return matches / total > 0.85;
}

function generateAdventureRooms(difficulty) {
  let result = generateAdventureRoomsOnce(difficulty);
  let attempts = 1;

  while (has4FoldRotationalSymmetry(result.roomMap) && attempts < 20) {
    result = generateAdventureRoomsOnce(difficulty);
    attempts++;
  }

  return result;
}

// Construit le tableau de tuiles final (même format que generateTiles) à
// partir de la structure de salles — remplit chaque salle générée avec le
// catalogue existant (monstres, coffres, pièges...), les emplacements non
// générés restant simplement absents du tableau (donc infranchissables,
// pas besoin d'un type de tuile "mur" séparé).
function generateAdventureTiles(difficulty = "facile") {
  const baseCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.facile;
  const cfg = {
    monstres: Math.round(baseCfg.monstres * ADVENTURE_CONTENT_SCALE),
    rats: Math.round(baseCfg.rats * ADVENTURE_CONTENT_SCALE),
    herses: Math.round(baseCfg.herses * ADVENTURE_CONTENT_SCALE),
    gouffres: Math.round(baseCfg.gouffres * ADVENTURE_CONTENT_SCALE),
    tresor: Math.round(baseCfg.tresor * ADVENTURE_CONTENT_SCALE),
  };
  const { rooms, firstRoomPos, exitRoom } = generateAdventureRooms(difficulty);

  // Chaque salle générée occupe un bloc de 3x3 cases, dont les coordonnées
  // de départ sont (rx * 3, ry * 3).
  const roomTilePositions = [];
  for (const room of rooms) {
    for (let dx = 0; dx < ADVENTURE_ROOM_SIZE; dx++) {
      for (let dy = 0; dy < ADVENTURE_ROOM_SIZE; dy++) {
        roomTilePositions.push({
          x: room.rx * ADVENTURE_ROOM_SIZE + dx,
          y: room.ry * ADVENTURE_ROOM_SIZE + dy,
          isFirstRoom:
            room.rx === firstRoomPos.rx && room.ry === firstRoomPos.ry,
          isExitRoom: room.rx === exitRoom.rx && room.ry === exitRoom.ry,
        });
      }
    }
  }

  const centerOffset = Math.floor(ADVENTURE_ROOM_SIZE / 2); // case centrale d'une salle 3x3

  const entryPos = {
    x: firstRoomPos.rx * ADVENTURE_ROOM_SIZE + centerOffset,
    y: firstRoomPos.ry * ADVENTURE_ROOM_SIZE + centerOffset,
  };
  const exitPos = {
    x: exitRoom.rx * ADVENTURE_ROOM_SIZE + centerOffset,
    y: exitRoom.ry * ADVENTURE_ROOM_SIZE + centerOffset,
  };

  const usedPositions = new Set([
    `${entryPos.x},${entryPos.y}`,
    `${exitPos.x},${exitPos.y}`,
  ]);
  const freePositions = roomTilePositions
    .map((p) => ({ x: p.x, y: p.y }))
    .filter((p) => !usedPositions.has(`${p.x},${p.y}`));

  const pickFreePosition = () => {
    const idx = Math.floor(Math.random() * freePositions.length);
    const [pos] = freePositions.splice(idx, 1);
    usedPositions.add(`${pos.x},${pos.y}`);
    return pos;
  };

  const tiles = [];
  tiles.push({
    type: "entrée",
    value: null,
    position: entryPos,
    revealed: true,
    cleared: true,
  });
  tiles.push({ type: "sortie", value: null, position: exitPos });

  const addTiles = (type, count, value) => {
    for (let i = 0; i < count && freePositions.length > 0; i++) {
      tiles.push({ type, value, position: pickFreePosition() });
    }
  };

  tiles.push({ type: "clé", value: null, position: pickFreePosition() });
  tiles.push({ type: "boss", value: 20, position: pickFreePosition() });
  tiles.push({ type: "magasin", value: null, position: pickFreePosition() });

  for (let i = 0; i < cfg.monstres && freePositions.length > 0; i++) {
    const stats = enemyBalance.generateBlobStats(difficulty);
    tiles.push({
      type: "monstre",
      value: stats.pv,
      weaponDie: stats.weaponDie,
      position: pickFreePosition(),
    });
  }
  for (let i = 0; i < cfg.rats && freePositions.length > 0; i++) {
    const stats = enemyBalance.generateRatStats(difficulty);
    tiles.push({
      type: "rat",
      value: stats.pv,
      weaponDie: stats.weaponDie,
      position: pickFreePosition(),
    });
  }
  addTiles("piège", cfg.herses, -2);
  addTiles("piège", cfg.gouffres, -1);
  addTiles("coffre", cfg.tresor, 10);

  // Complète le reste des cases des salles générées avec des tuiles vierges
  while (freePositions.length > 0) {
    tiles.push({
      type: "tuile-vide",
      value: null,
      position: pickFreePosition(),
    });
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// Génération du boss (dés 3D6 + dé arme, comme un héros)
// ---------------------------------------------------------------------------

function generateBossStats(difficulty = "facile") {
  return enemyBalance.generateBossStats(difficulty);
}

// ---------------------------------------------------------------------------
// Deck de trésor (matériel du jeu : 5 potions, 3 armes, 3 monstres,
// 2 bombes carrées, 2 bombes lignes = 15 cartes)
// ---------------------------------------------------------------------------

function buildShuffledTreasureDeck() {
  const deck = gameConfig.buildTreasureCardPool();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

DungeonSchema.statics.createGameForUser = async function (
  userId,
  difficulty = "facile",
  heroName = "Hero",
  mode = "normal",
) {
  const rules = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.facile;

  const tiles =
    mode === "aventure"
      ? generateAdventureTiles(difficulty)
      : generateTiles(difficulty);
  // La position d'entrée est toujours (0,0) pour le mode classique, mais
  // calculée dynamiquement en Aventure (centre de la grille de salles) — on
  // la déduit systématiquement des tuiles plutôt que de la coder en dur,
  // pour ne jamais désynchroniser le héros de sa vraie case de départ.
  const entryTileData = tiles.find((t) => t.type === "entrée");
  const startPos = entryTileData
    ? { x: entryTileData.position.x, y: entryTileData.position.y }
    : { x: 0, y: 0 };

  return this.create({
    userId,
    difficulty,
    mode,
    status: "in_progress",
    tiles,
    treasureDeck: buildShuffledTreasureDeck(),
    shopStock: gameConfig.SHOP_CONFIG,
    hero: {
      name: heroName,
      bodyParts: { tete: 0, torse: 0, jambes: 0 }, // à définir via roll-three-dices
      weaponDie: 1,
      gold: 0,
      hasLegs: true,
      inventory: [],
      spriteId: null,
    },
    boss: { type: "goblin", ...generateBossStats(difficulty) },
    gameState: {
      currentTile: { x: startPos.x, y: startPos.y },
      entryTile: { x: startPos.x, y: startPos.y },
      previousTile: null,
      keyFound: false,
      bossDefeated: false,
      movesRemaining: 0,
      lockedDirection: null,
      heroIsDead: false,
      heroConfirmed: false,
      livesRemaining: rules.maxLives,
      rerollsRemaining: rules.maxRerolls,
      score: 0,
      turnCount: 0,
      lastShopPurchaseTurn: -1,
      lastItemUseTurn: -1,
      floorRecap: null,
      pendingGouffreFall: null,
      usedSpriteIds: [],
      tilesRevealedCount: 0,
      floor: 1,
      solVariant: Math.floor(Math.random() * 5), // 5 variantes dans SOL_VARIANTS (images.js)
      radarUsedCount: 0,
      pendingCombat: null,
      pendingTrapChoice: null,
      pendingEnemyChoice: null,
      groundLoot: [],
    },
  });
};

const DonjonModel = mongoose.model("Donjon", DungeonSchema);
DonjonModel.buildShuffledTreasureDeck = buildShuffledTreasureDeck;
DonjonModel.generateTiles = generateTiles;
DonjonModel.generateAdventureTiles = generateAdventureTiles;
DonjonModel.generateAdventureRooms = generateAdventureRooms;
DonjonModel.generateBossStats = generateBossStats;
DonjonModel.DIFFICULTY_RULES = DIFFICULTY_RULES;
module.exports = DonjonModel;
