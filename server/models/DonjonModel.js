const mongoose = require("mongoose");

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

    tiles: [
      {
        type: { type: String }, // "type" est un mot réservé Mongoose -> imbrication obligatoire
        value: Number,
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
      heroConfirmed: { type: Boolean, default: false },
      livesRemaining: { type: Number, default: 1 },
      rerollsRemaining: { type: Number, default: 1 },
      score: { type: Number, default: 0 },
      turnCount: { type: Number, default: 0 },
      lastShopPurchaseTurn: { type: Number, default: -1 },
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
const DIFFICULTY_CONFIG = {
  facile: { monstres: 3, rats: 3, herses: 3, gouffres: 0, tresor: 10 },
  moyen: { monstres: 6, rats: 6, herses: 3, gouffres: 2, tresor: 10 },
  difficile: { monstres: 9, rats: 9, herses: 5, gouffres: 5, tresor: 10 },
  epique: { monstres: 9, rats: 9, herses: 5, gouffres: 5, tresor: 10 },
};

// Nombre d'essais de dés à la création/recréation du héros, et nombre de vies
// (recréations possibles) autorisées avant la fin définitive de la partie.
const DIFFICULTY_RULES = {
  facile: { maxRerolls: 4, maxLives: 4 },
  moyen: { maxRerolls: 3, maxLives: 3 },
  difficile: { maxRerolls: 2, maxLives: 2 },
  epique: { maxRerolls: 1, maxLives: 1 },
};

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

  // Tuiles selon la difficulté
  addTiles("monstre", cfg.monstres, 5); // blob
  addTiles("rat", cfg.rats, 3);
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
// Génération du boss (dés 3D6 + dé arme, comme un héros)
// ---------------------------------------------------------------------------

function generateBossStats() {
  return {
    bodyParts: { tete: rollD6(), torse: rollD6(), jambes: rollD6() },
    weaponDie: Math.floor(Math.random() * 3) + 1, // PC 1-3
  };
}

// ---------------------------------------------------------------------------
// Deck de trésor (matériel du jeu : 5 potions, 3 armes, 3 monstres,
// 2 bombes carrées, 2 bombes lignes = 15 cartes)
// ---------------------------------------------------------------------------

const TREASURE_CARD_POOL = [
  ...Array(5).fill("potion"),
  ...Array(3).fill("arme"),
  ...Array(3).fill("monstre"),
  ...Array(2).fill("bombe_carre"),
  ...Array(2).fill("bombe_ligne"),
];

function buildShuffledTreasureDeck() {
  const deck = [...TREASURE_CARD_POOL];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

DungeonSchema.statics.createGameForUser = async function (
  userId,
  difficulty = "facile",
) {
  const rules = DIFFICULTY_RULES[difficulty] || DIFFICULTY_RULES.facile;

  return this.create({
    userId,
    difficulty,
    status: "in_progress",
    tiles: generateTiles(difficulty),
    treasureDeck: buildShuffledTreasureDeck(),
    hero: {
      name: "Hero",
      bodyParts: { tete: 0, torse: 0, jambes: 0 }, // à définir via roll-three-dices
      weaponDie: 1,
      gold: 0,
      hasLegs: true,
      inventory: [],
    },
    boss: { type: "goblin", ...generateBossStats() },
    gameState: {
      currentTile: { x: 0, y: 0 },
      entryTile: { x: 0, y: 0 },
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
      floorRecap: null,
      floor: 1,
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
DonjonModel.generateBossStats = generateBossStats;
DonjonModel.DIFFICULTY_RULES = DIFFICULTY_RULES;
module.exports = DonjonModel;
