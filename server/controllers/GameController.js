const Donjon = require("../models/DonjonModel");

// ---------------------------------------------------------------------------
// Constantes / helpers
// ---------------------------------------------------------------------------

const DELTAS = {
  haut: { dx: 0, dy: -1 },
  bas: { dx: 0, dy: 1 },
  gauche: { dx: -1, dy: 0 },
  droite: { dx: 1, dy: 0 },
};
const OPPOSITE = {
  haut: "bas",
  bas: "haut",
  gauche: "droite",
  droite: "gauche",
};
const OBSTACLE_ENEMY_TYPES = [
  "monstre",
  "rat",
  "boss",
  "horde-rats",
  "monstre-gelatineux",
];
const SHOP_ITEMS = {
  potionSimple: "Potion (+1)",
  potionTriple: "Potion (+1)(+1)(+1)",
  armeBonus: "Arme (+1)",
};
const GOLD_TABLE = {
  rat: 0,
  monstre: 1,
  boss: 8,
  "horde-rats": 3,
  "monstre-gelatineux": 5,
  "monstre-tresor": 4,
};
const BODY_PART_ORDER_LOW_TO_HIGH = ["jambes", "torse", "tete"];

function isInBounds(x, y) {
  return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

function rollD6() {
  return Math.floor(Math.random() * 6) + 1;
}

// Répartition du dé de hit : 1 tête / 2-3 torse / 4-5 jambes / 6 loupé
function rollHitLocation() {
  const roll = rollD6();
  if (roll === 1) return "tete";
  if (roll <= 3) return "torse";
  if (roll <= 5) return "jambes";
  return null; // loupé
}

function applyDamage(bodyParts, part, amount) {
  bodyParts[part] = Math.max(0, bodyParts[part] - amount);
  return bodyParts[part] === 0;
}

// Si le coup vise une partie déjà détruite, il ne porte pas (traité comme un loupé)
function resolveHit(bodyParts, hitPart) {
  if (hitPart && bodyParts[hitPart] === 0) return null;
  return hitPart;
}

// Pioche une carte trésor ; recrée un deck neuf si la pioche est vide (cas rare
// où plus de coffres sont ouverts que de cartes disponibles).
function drawTreasureCard(game) {
  if (!game.treasureDeck || game.treasureDeck.length === 0) {
    game.treasureDeck = Donjon.buildShuffledTreasureDeck();
    game.markModified("treasureDeck");
  }
  return game.treasureDeck.pop();
}

function resolveTreasureCard(game, card) {
  switch (card) {
    case "potion":
      game.hero.inventory.push("potionCoffre");
      return "Vous trouvez une carte Potion (+1) !";
    case "arme":
      game.hero.inventory.push("armeCoffre");
      return "Vous trouvez une carte Arme (+1) !";
    case "bombe_carre":
      game.hero.inventory.push("bombeCarre");
      return "Vous trouvez une Bombe carrée !";
    case "bombe_ligne":
      game.hero.inventory.push("bombeLigne");
      return "Vous trouvez une Bombe ligne !";
    case "monstre":
      // TODO (brique "monstre au trésor") : combat immédiat, initiative à l'ennemi
      return "Un monstre surgit du coffre... mais s'échappe aussitôt (combat à venir).";
    default:
      return "Le coffre est vide.";
  }
}

// Si 2 autres rats sont déjà révélés sur le plateau, ils se regroupent avec
// celui qu'on vient de découvrir pour former une horde de rats.
function checkAndMergeRats(game, justRevealedTile) {
  const otherRats = game.tiles.filter(
    (t) =>
      t.type === "rat" && t.revealed && !t.cleared && t !== justRevealedTile,
  );
  if (otherRats.length < 2) return false;

  const [first, second] = otherRats;
  [first, second].forEach((t) => {
    t.type = "tuile-vide";
    t.cleared = true;
  });

  justRevealedTile.type = "horde-rats";
  justRevealedTile.cleared = false;
  justRevealedTile.mergedStats = {
    bodyParts: { tete: rollD6(), torse: rollD6(), jambes: rollD6() },
    weaponDie: 1, // la horde n'a pas d'arme : 1 seul point de combat
  };

  return true;
}

// Si 2 autres blobs de la MÊME couleur sont déjà révélés, ils se regroupent
// avec celui qu'on vient de découvrir pour former un monstre gélatineux.
function checkAndMergeBlobs(game, justRevealedTile) {
  const sameColorOthers = game.tiles.filter(
    (t) =>
      t.type === "monstre" &&
      t.revealed &&
      !t.cleared &&
      t.color === justRevealedTile.color &&
      t !== justRevealedTile,
  );
  if (sameColorOthers.length < 2) return false;

  const [first, second] = sameColorOthers;
  [first, second].forEach((t) => {
    t.type = "tuile-vide";
    t.cleared = true;
  });

  justRevealedTile.type = "monstre-gelatineux";
  justRevealedTile.cleared = false;
  justRevealedTile.mergedStats = {
    bodyParts: { tete: rollD6(), torse: rollD6(), jambes: rollD6() },
    weaponDie: Math.floor(Math.random() * 3) + 1,
  };

  return true;
}

// Applique des dégâts sur la partie du corps encore existante la plus basse
// (jambes -> torse -> tête), comme le prévoit la règle pour la herse.
// Renvoie { part, heroDied } : heroDied = true si torse ou tête tombe à 0.
function applyLowestPartDamage(hero, amount) {
  for (const part of BODY_PART_ORDER_LOW_TO_HIGH) {
    if (hero.bodyParts[part] > 0) {
      const reachedZero = applyDamage(hero.bodyParts, part, amount);

      if (part === "jambes" && reachedZero) {
        hero.hasLegs = false;
        hero.weaponDie = Math.max(1, hero.weaponDie - 1);
      }

      const heroDied = reachedZero && (part === "torse" || part === "tete");
      return { part, heroDied };
    }
  }
  // Plus aucune partie disponible (ne devrait pas arriver, le héros serait déjà mort)
  return { part: null, heroDied: true };
}

// Fait mourir puis instantanément réapparaître le héros : dépose son or/objets/clé
// au sol (à lootX, lootY), le recrée (nouveaux dés) et le replace sur la tuile d'entrée.
// Marque le héros comme mort : dépose son or/objets/clé au sol (à lootX, lootY),
// mais NE le recrée PAS automatiquement — le joueur choisira ensuite (recreateHero / abandonGame).
function markHeroDead(game, lootX, lootY) {
  if (!game.gameState.groundLoot) game.gameState.groundLoot = [];

  const droppedGold = game.hero.gold;
  const droppedInventory = [...game.hero.inventory];
  const droppedKey = game.gameState.keyFound;

  if (droppedGold > 0 || droppedInventory.length > 0 || droppedKey) {
    game.gameState.groundLoot.push({
      x: lootX,
      y: lootY,
      gold: droppedGold,
      inventory: droppedInventory,
      hasKey: droppedKey,
    });
  }

  game.hero.gold = 0;
  game.hero.inventory = [];
  game.gameState.keyFound = false;

  game.gameState.heroIsDead = true;
  game.gameState.movesRemaining = 0;
  game.gameState.lockedDirection = null;
  game.gameState.pendingCombat = null;
  game.gameState.pendingTrapChoice = null;
}

// Récupère un trésor abandonné au sol si le héros se trouve sur sa case
// Récupère TOUT le trésor abandonné au sol à une position donnée — plusieurs
// morts successives au même endroit peuvent avoir empilé plusieurs dépôts.
function collectGroundLoot(game, x, y) {
  if (!game.gameState.groundLoot || game.gameState.groundLoot.length === 0)
    return null;

  const matching = game.gameState.groundLoot.filter(
    (loot) => loot.x === x && loot.y === y,
  );
  if (matching.length === 0) return null;

  game.gameState.groundLoot = game.gameState.groundLoot.filter(
    (loot) => !(loot.x === x && loot.y === y),
  );

  let totalGold = 0;
  let totalInventory = [];
  let gotKey = false;

  matching.forEach((loot) => {
    totalGold += loot.gold;
    totalInventory = totalInventory.concat(loot.inventory);
    if (loot.hasKey) gotKey = true;
  });

  game.hero.gold += totalGold;
  game.hero.inventory.push(...totalInventory);
  if (gotKey) game.gameState.keyFound = true;

  return { gold: totalGold, inventory: totalInventory, hasKey: gotKey };
}

// Appelé quand le joueur choisit "Recréer un héros" après sa mort.
// Le héros réapparaît logiquement sur la tuile d'entrée (currentTile mis à jour côté
// serveur), mais visuellement le front doit continuer d'afficher le sprite à l'ancien
// emplacement jusqu'au prochain déplacement (le front ne doit PAS resynchroniser
// heroPosition sur ce retour d'appel).
exports.recreateHero = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    if (!game.gameState.heroIsDead) {
      return res.status(400).json({ error: "Le héros n'est pas mort." });
    }

    if (!game.gameState.entryTile) {
      game.gameState.entryTile = { x: 0, y: 0 };
    }

    game.hero.bodyParts = { tete: rollD6(), torse: rollD6(), jambes: rollD6() };
    game.hero.weaponDie = Math.floor(Math.random() * 3) + 1;
    game.hero.hasLegs = true;

    game.gameState.currentTile = { ...game.gameState.entryTile };
    game.gameState.previousTile = null;
    game.gameState.lockedDirection = null;
    game.gameState.heroIsDead = false;

    await game.save();
    res.json({ gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Création / reprise / abandon de partie
// ---------------------------------------------------------------------------

exports.createGame = async (req, res) => {
  try {
    const userId = req.user._id;
    const { difficulty } = req.body;

    const existingGame = await Donjon.findOne({
      userId,
      status: "in_progress",
    });
    if (existingGame) {
      return res.status(200).json(existingGame);
    }

    const gameData = await Donjon.createGameForUser(userId, difficulty);
    res.status(201).json(gameData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.abandonGame = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOneAndUpdate(
      { _id: gameId, userId: req.user._id },
      { $set: { status: "abandoned" } },
      { new: true },
    );
    if (!game) return res.status(404).json({ error: "Partie introuvable." });
    res.json({ message: "Partie abandonnée.", gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Le joueur choisit de ne pas combattre l'ennemi croisé : on efface juste la
// proposition de combat, SANS toucher aux mouvements restants ni à la direction
// verrouillée — le joueur reprend son déplacement là où il l'avait laissé.
exports.declineCombat = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    if (!game.gameState.pendingCombat || game.gameState.pendingCombat.started) {
      return res.status(400).json({ error: "Aucun combat à esquiver ici." });
    }

    game.gameState.pendingCombat = null;
    await game.save();
    res.json({ gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function buildEnemyFromTile(game, enemyType, x, y) {
  if (enemyType === "boss") {
    return {
      bodyParts: { ...game.boss.bodyParts },
      weaponDie: game.boss.weaponDie,
    };
  }
  if (enemyType === "horde-rats" || enemyType === "monstre-gelatineux") {
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    return {
      bodyParts: { ...tile.mergedStats.bodyParts },
      weaponDie: tile.mergedStats.weaponDie,
    };
  }
  const tile = game.tiles.find((t) => t.position.x === x && t.position.y === y);
  const weaponDie = enemyType === "monstre" ? 2 : 1;
  return { pv: tile.value, weaponDie };
}

// Réécrit l'état actuel de l'ennemi (dégâts subis) sur sa source persistante,
// pour que ces dégâts survivent même si le combat s'interrompt (mort du héros,
// repli...) — comme le dé physique posé sur le plateau dans le vrai jeu.
function persistEnemyDamage(game, combat) {
  const { enemyType, x, y, enemy } = combat;

  if (enemyType === "monstre-tresor") return; // reset complet prévu en cas de mort, rien à conserver

  if (enemyType === "boss") {
    game.boss.bodyParts = { ...enemy.bodyParts };
    game.boss.weaponDie = enemy.weaponDie;
  } else if (enemyType === "horde-rats" || enemyType === "monstre-gelatineux") {
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    if (tile) {
      tile.mergedStats = {
        bodyParts: { ...enemy.bodyParts },
        weaponDie: enemy.weaponDie,
      };
    }
  } else {
    // Rat / monstre seuls : on ne persiste que les PV restants
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    if (tile) tile.value = enemy.pv;
  }
}

// Résout le choix furtivité / combat / arrêt face à un ennemi déjà révélé
exports.resolveEnemyChoice = async (req, res) => {
  try {
    const { gameId, choice } = req.body; // "sneak_safe" | "sneak_risky" | "fight" | "stop"

    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const pending = game.gameState.pendingEnemyChoice;
    if (!pending)
      return res.status(400).json({ error: "Aucune décision en attente." });
    if (!pending.options.includes(choice)) {
      return res
        .status(400)
        .json({ error: "Ce choix n'est pas disponible ici." });
    }

    let message;

    switch (choice) {
      case "stop":
        game.gameState.movesRemaining = 0;
        game.gameState.lockedDirection = null;
        message = "Vous préférez ne pas vous approcher davantage.";
        break;

      case "sneak_safe":
        game.gameState.currentTile = pending.landingTo;
        game.gameState.movesRemaining -= 3;
        game.gameState.lockedDirection =
          game.gameState.movesRemaining > 0 ? pending.direction : null;
        message = `Vous vous faufilez discrètement devant : ${pending.enemyType}.`;
        break;

      case "sneak_risky": {
        const success = Math.random() < 0.5;
        game.gameState.movesRemaining = 0;
        game.gameState.lockedDirection = null;

        if (success) {
          game.gameState.currentTile = pending.landingTo;
          message = "Vous réussissez à vous faufiler discrètement !";
        } else {
          game.gameState.currentTile = { x: pending.enemyX, y: pending.enemyY };
          game.gameState.pendingCombat = {
            x: pending.enemyX,
            y: pending.enemyY,
            enemyType: pending.enemyType,
            started: true,
            attacksHero: 0,
            attacksEnemy: 0,
            enemy: buildEnemyFromTile(
              game,
              pending.enemyType,
              pending.enemyX,
              pending.enemyY,
            ),
            initiative: "enemy",
          };
          message = `Votre tentative échoue, ${pending.enemyType} vous prend par surprise !`;
        }
        break;
      }

      case "fight":
        game.gameState.currentTile = { x: pending.enemyX, y: pending.enemyY };
        game.gameState.movesRemaining = 0; // engager le combat consomme le reste du tour
        game.gameState.lockedDirection = null;
        game.gameState.pendingCombat = {
          x: pending.enemyX,
          y: pending.enemyY,
          enemyType: pending.enemyType,
          started: true,
          attacksHero: 0,
          attacksEnemy: 0,
          enemy: buildEnemyFromTile(
            game,
            pending.enemyType,
            pending.enemyX,
            pending.enemyY,
          ),
          initiative: "hero",
        };
        message = `Vous engagez le combat contre : ${pending.enemyType}.`;
        break;
    }

    game.gameState.pendingEnemyChoice = null;
    const stopped =
      game.gameState.movesRemaining <= 0 || !!game.gameState.pendingCombat;

    game.markModified("gameState.pendingCombat");
    await game.save();

    res.json({
      gameData: game,
      message,
      movesRemaining: game.gameState.movesRemaining,
      stopped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Création du héros
// ---------------------------------------------------------------------------

exports.rollThreeDices = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const diceRolls = [rollD6(), rollD6(), rollD6()];
    const [tete, torse, jambes] = diceRolls;

    game.hero.bodyParts = { tete, torse, jambes };
    game.hero.hasLegs = true;
    await game.save();

    res.json({ diceRolls, gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rollWeaponDie = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const weaponDie = Math.floor(Math.random() * 3) + 1; // PC 1-3
    game.hero.weaponDie = weaponDie;
    await game.save();

    res.json({ weaponDie, gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Déplacement
// ---------------------------------------------------------------------------

exports.rollDice = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    if (game.gameState.pendingTrapChoice) {
      return res
        .status(400)
        .json({ error: "Résolvez d'abord le piège en cours." });
    }
    if (game.gameState.pendingEnemyChoice) {
      return res
        .status(400)
        .json({ error: "Résolvez d'abord la décision face à l'ennemi." });
    }
    if (game.gameState.pendingCombat?.started) {
      return res
        .status(400)
        .json({ error: "Un combat est en cours, résolvez-le d'abord." });
    }
    if (game.gameState.movesRemaining > 0) {
      return res
        .status(400)
        .json({ error: "Des déplacements sont encore disponibles." });
    }

    let diceRoll = rollD6();
    if (!game.hero.hasLegs) diceRoll = Math.max(0, diceRoll - 2); // malus jambes coupées

    game.gameState.movesRemaining = diceRoll;
    game.gameState.lockedDirection = null;
    game.gameState.pendingCombat = null; // relancer le dé = renoncer au combat immédiat
    await game.save();

    res.json({ diceRoll, gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.moveOneStep = async (req, res) => {
  try {
    const { gameId, direction } = req.body;
    if (!["haut", "bas", "gauche", "droite"].includes(direction)) {
      return res.status(400).json({ error: "Direction invalide." });
    }

    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    if (game.gameState.pendingTrapChoice) {
      return res
        .status(400)
        .json({ error: "Une décision est en attente sur un piège." });
    }
    if (game.gameState.pendingEnemyChoice) {
      return res
        .status(400)
        .json({ error: "Une décision est en attente face à un ennemi." });
    }
    if (game.gameState.pendingCombat) {
      return res.status(400).json({ error: "Un combat est en attente." });
    }
    if (game.gameState.movesRemaining <= 0) {
      return res
        .status(400)
        .json({ error: "Aucun déplacement restant, relancez le dé." });
    }

    const { x: startX, y: startY } = game.gameState.currentTile;
    let dir = direction;
    let { dx, dy } = DELTAS[dir];
    let nx = startX + dx;
    let ny = startY + dy;

    // Rebond sur un mur du plateau
    if (!isInBounds(nx, ny)) {
      dir = OPPOSITE[dir];
      ({ dx, dy } = DELTAS[dir]);
      nx = startX + dx;
      ny = startY + dy;
    }

    const tileAt = (px, py) =>
      game.tiles.find((t) => t.position.x === px && t.position.y === py);
    const targetTile = tileAt(nx, ny);
    const response = { message: null, stopped: false, heroDied: false };

    if (
      targetTile?.revealed &&
      OBSTACLE_ENEMY_TYPES.includes(targetTile.type) &&
      !targetTile.cleared
    ) {
      // ----- Ennemi déjà révélé : proposer furtivité / combat / arrêt, sans bouger -----
      const landingX = nx + dx;
      const landingY = ny + dy;
      const canLand = isInBounds(landingX, landingY);
      const movesLeft = game.gameState.movesRemaining;

      const options = [];
      if (canLand && movesLeft >= 3) options.push("sneak_safe");
      if (canLand && movesLeft === 2) options.push("sneak_risky");
      options.push("fight", "stop");

      game.gameState.pendingEnemyChoice = {
        enemyX: nx,
        enemyY: ny,
        enemyType: targetTile.type,
        landingTo: canLand ? { x: landingX, y: landingY } : null,
        direction: dir,
        options,
      };

      response.message = `Vous approchez d'un ${targetTile.type}. Que faites-vous ?`;
      response.stopped = true;
    } else if (targetTile?.revealed && targetTile.type === "piège") {
      // ----- Piège permanent révélé (herse ou gouffre) : toujours un choix -----
      const isGouffre = targetTile.value === -1;
      const landingX = nx + dx;
      const landingY = ny + dy;
      const canLand = isInBounds(landingX, landingY);
      const movesLeft = game.gameState.movesRemaining;
      const canJumpSafe = game.hero.hasLegs && canLand && movesLeft >= 3;
      const canJumpRisky = game.hero.hasLegs && canLand && movesLeft === 2;

      const options = [];
      if (isGouffre) {
        options.push("stop", "fall");
        if (canJumpSafe) options.push("jump_safe");
        if (canJumpRisky) options.push("jump_risky");
      } else {
        if (canJumpSafe) options.push("jump_safe");
        if (canJumpRisky) options.push("jump_risky");
        options.push("walk"); // toujours possible pour une herse
      }

      game.gameState.pendingTrapChoice = {
        trapType: isGouffre ? "gouffre" : "herse",
        walkTo: { x: nx, y: ny },
        jumpTo: canLand ? { x: landingX, y: landingY } : null,
        options,
        direction: dir,
      };

      response.message = isGouffre
        ? "⚠️ Un gouffre s'ouvre devant vous ! Que faites-vous ?"
        : "Une herse vous barre la route. Que faites-vous ?";
      response.stopped = true;
    } else {
      // ----- Déplacement normal (tuile inconnue, vide, clé, coffre, magasin...) -----
      game.gameState.previousTile = { x: startX, y: startY };
      game.gameState.currentTile = { x: nx, y: ny };
      game.gameState.movesRemaining -= 1;

      const recoveredLoot = collectGroundLoot(game, nx, ny);
      if (recoveredLoot)
        response.message = "Vous retrouvez votre trésor perdu !";
    }

    if (game.gameState.movesRemaining <= 0) response.stopped = true;
    game.gameState.lockedDirection =
      game.gameState.movesRemaining > 0 ? dir : null;

    await game.save();

    res.json({
      gameData: game,
      direction: dir,
      movesRemaining: game.gameState.movesRemaining,
      ...response,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stopMovement = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;
    await game.save();

    res.json({ gameData: game, movesRemaining: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Résout un choix en attente sur un piège permanent (herse ou gouffre)
exports.resolveTrapChoice = async (req, res) => {
  try {
    const { gameId, choice } = req.body; // "stop" | "walk" | "jump_safe" | "jump_risky" | "fall"

    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const pending = game.gameState.pendingTrapChoice;
    if (!pending)
      return res.status(400).json({ error: "Aucune décision en attente." });
    if (!pending.options.includes(choice)) {
      return res
        .status(400)
        .json({ error: "Ce choix n'est pas disponible ici." });
    }

    let message;
    let heroDied = false;

    switch (choice) {
      case "stop":
        game.gameState.movesRemaining = 0;
        message = "Vous préférez ne pas prendre de risque et vous arrêtez là.";
        break;

      case "fall":
        heroDied = true;
        game.gameState.movesRemaining = 0;
        message = "Vous vous jetez délibérément dans le gouffre...";
        break;

      case "walk": {
        const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
        heroDied = died;
        game.gameState.currentTile = pending.walkTo;
        game.gameState.movesRemaining -= 1;
        message = "Vous marchez sur la herse et perdez 1 PV.";
        break;
      }

      case "jump_safe":
        game.gameState.currentTile = pending.jumpTo;
        game.gameState.movesRemaining -= 3;
        message = "Vous sautez par-dessus, sans perte !";
        break;

      case "jump_risky": {
        const success = Math.random() < 0.5;
        game.gameState.movesRemaining = 0; // la tentative consomme tout, réussite ou non

        if (pending.trapType === "gouffre") {
          if (success) {
            game.gameState.currentTile = pending.jumpTo;
            message = "Saut risqué... réussi ! Vous traversez le gouffre.";
          } else {
            heroDied = true;
            message = "Le saut échoue... vous tombez dans le gouffre !";
          }
        } else {
          // Herse : réussite = passe complètement de l'autre côté, sans perte.
          // Échec = trébuche et retombe SUR la herse (pas au-delà), perd 1 PV.
          if (success) {
            game.gameState.currentTile = pending.jumpTo;
            message =
              "Vous sautez avec agilité par-dessus la herse, sans perte !";
          } else {
            const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
            heroDied = died;
            game.gameState.currentTile = pending.walkTo;
            message =
              "Le saut rate, vous trébuchez et retombez sur la herse (-1 PV).";
          }
        }
        break;
      }
    }

    if (heroDied) {
      markHeroDead(
        game,
        game.gameState.currentTile.x,
        game.gameState.currentTile.y,
      );
      message +=
        " Vous êtes mort ! Choisissez : recréer un héros ou abandonner la partie.";
    }

    game.gameState.pendingTrapChoice = null;
    game.gameState.lockedDirection =
      game.gameState.movesRemaining > 0 ? pending.direction : null;
    const stopped = game.gameState.movesRemaining <= 0 || heroDied;

    await game.save();
    res.json({
      gameData: game,
      message,
      heroDied,
      movesRemaining: game.gameState.movesRemaining,
      stopped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Révélation de la tuile courante (première découverte)
// ---------------------------------------------------------------------------

exports.revealTile = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const { x, y } = game.gameState.currentTile;
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );
    if (!tile)
      return res
        .status(404)
        .json({ error: "Tuile introuvable à cette position." });

    let message = "Cette tuile est déjà révélée.";
    let heroDied = false;

    if (!tile.revealed) {
      tile.revealed = true;

      switch (tile.type) {
        case "tuile-vide":
          tile.cleared = true;
          message = "Rien ne se passe.";
          break;

        case "clé":
          message = "Vous voyez une clé briller au sol.";
          // Le ramassage n'est plus automatique : voir l'endpoint pickUpKey.
          break;

        case "coffre":
          message = "Vous trouvez un coffre fermé.";
          // L'ouverture n'est plus automatique : voir l'endpoint openChest.
          break;

        case "magasin":
          tile.cleared = true;
          message = "Le magasin est ouvert !";
          break;

        case "piège":
          if (tile.value === -1) {
            // Première découverte d'un gouffre = mort automatique (règle de base)
            heroDied = true;
            message = "C'est un gouffre ! Vous tombez...";
          } else {
            const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
            heroDied = died;
            message = "C'est une herse ! Vous perdez 1 PV.";
          }
          break; // reste un obstacle pour les prochains passages

        case "entrée":
          tile.cleared = true;
          message = "Vous êtes à l'entrée du donjon.";
          break;

        case "monstre": {
          if (!tile.color) {
            tile.color = ["rouge", "bleu", "vert"][
              Math.floor(Math.random() * 3)
            ];
          }
          const merged = checkAndMergeBlobs(game, tile);
          if (merged) {
            message = `3 monstres gélatineux ${tile.color}s fusionnent en une masse unique !`;
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "monstre-gelatineux",
              started: false,
            };
          } else {
            message = `Un monstre gélatineux ${tile.color} apparaît devant vous !`;
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "monstre",
              started: false,
            };
          }
          break; // reste un obstacle tant que non vaincu
        }

        case "rat": {
          const merged = checkAndMergeRats(game, tile);
          if (merged) {
            message = "3 rats se regroupent en une horde monstrueuse !";
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "horde-rats",
              started: false,
            };
          } else {
            message = "Un rat apparaît devant vous !";
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "rat",
              started: false,
            };
          }
          break; // reste un obstacle tant que non vaincu
        }

        case "boss":
          game.gameState.pendingCombat = {
            x,
            y,
            enemyType: "boss",
            started: false,
          };
          message = "Le boss se dresse devant vous !";
          break;

        default:
          message = "Rien de spécial.";
      }
    }

    // Vérifie la condition de victoire à CHAQUE passage sur la sortie,
    // pas seulement lors de sa première découverte (le joueur a pu la
    // traverser avant d'avoir la clé/le boss).
    if (tile.type === "sortie" && game.status === "in_progress") {
      tile.cleared = true;

      if (game.gameState.keyFound && game.gameState.bossDefeated) {
        game.status = "victory";
        message = "🎉 Vous vous échappez du donjon avec la clé, victoire !";
      } else {
        const missing = [];
        if (!game.gameState.keyFound) missing.push("la clé");
        if (!game.gameState.bossDefeated) missing.push("le boss");
        message = `Vous êtes à la sortie, mais il vous manque : ${missing.join(" et ")}.`;
      }
    }

    if (heroDied) {
      const lootPos = game.gameState.previousTile || { x, y };
      markHeroDead(game, lootPos.x, lootPos.y);
      message +=
        " Vous êtes mort ! Choisissez : recréer un héros ou abandonner la partie.";
    }

    game.markModified("gameState.pendingCombat");
    await game.save();
    res.json({ gameData: game, tile, message, heroDied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ramasse la clé si le héros se trouve sur sa case et qu'elle n'est pas déjà ramassée
exports.pickUpKey = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const { x, y } = game.gameState.currentTile;
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );

    if (!tile || tile.type !== "clé") {
      return res.status(400).json({ error: "Il n'y a pas de clé ici." });
    }
    if (tile.cleared) {
      return res.status(400).json({ error: "Cette clé a déjà été ramassée." });
    }

    tile.cleared = true;
    game.gameState.keyFound = true;
    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;

    await game.save();
    res.json({ gameData: game, message: "Vous ramassez la clé !" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Ouvre un coffre si le héros se trouve sur sa case — action risquée,
// explicitement choisie par le joueur (peut tomber sur une carte "monstre").
exports.openChest = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const { x, y } = game.gameState.currentTile;
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );

    if (!tile || tile.type !== "coffre") {
      return res.status(400).json({ error: "Il n'y a pas de coffre ici." });
    }
    if (tile.cleared) {
      return res.status(400).json({ error: "Ce coffre a déjà été ouvert." });
    }

    tile.cleared = false; // ne sera vraiment "ouvert" qu'une fois le mimic vaincu (voir plus bas)
    const card = drawTreasureCard(game);

    if (card === "monstre") {
      // Le mimic attaque immédiatement, combat obligatoire, initiative à l'ennemi
      const enemy = {
        bodyParts: { tete: rollD6(), torse: rollD6(), jambes: rollD6() },
        weaponDie: Math.floor(Math.random() * 3) + 1,
      };

      game.gameState.pendingCombat = {
        x,
        y,
        enemyType: "monstre-tresor",
        started: true,
        attacksHero: 0,
        attacksEnemy: 0,
        enemy,
        initiative: "enemy",
      };
      game.gameState.movesRemaining = 0;
      game.gameState.lockedDirection = null;

      game.markModified("gameState.pendingCombat");
      await game.save();
      return res.json({
        gameData: game,
        message: "Un mimic jaillit du coffre et vous attaque !",
        card,
      });
    }

    tile.cleared = true;
    const message = resolveTreasureCard(game, card);

    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;

    await game.save();
    res.json({ gameData: game, message, card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Magasin
// ---------------------------------------------------------------------------

exports.buyItem = async (req, res) => {
  try {
    const { gameId, itemKey } = req.body;

    if (!SHOP_ITEMS[itemKey]) {
      return res.status(400).json({ error: "Objet inconnu." });
    }

    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const { x, y } = game.gameState.currentTile;
    const tile = game.tiles.find(
      (t) => t.position.x === x && t.position.y === y,
    );

    if (!tile || tile.type !== "magasin") {
      return res
        .status(400)
        .json({ error: "Vous devez être sur la tuile magasin pour acheter." });
    }

    const item = game.shopStock[itemKey];

    if (item.stock <= 0) {
      return res.status(400).json({ error: "Stock épuisé pour cet objet." });
    }
    if (game.hero.gold < item.price) {
      return res.status(400).json({ error: "Pas assez d'or." });
    }

    game.hero.gold -= item.price;
    item.stock -= 1;
    game.hero.inventory.push(itemKey);
    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;

    await game.save();
    res.json({
      gameData: game,
      message: `Vous avez acheté : ${SHOP_ITEMS[itemKey]}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Utilisation des objets de l'inventaire
// ---------------------------------------------------------------------------

exports.useItem = async (req, res) => {
  try {
    const { gameId, itemKey, bodyPart, direction } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const idx = game.hero.inventory.indexOf(itemKey);
    if (idx === -1) {
      return res.status(400).json({ error: "Vous ne possédez pas cet objet." });
    }

    let message;

    switch (itemKey) {
      case "potionCoffre":
      case "potionSimple": {
        if (!["tete", "torse", "jambes"].includes(bodyPart)) {
          return res
            .status(400)
            .json({ error: "Choisissez une partie du corps valide." });
        }
        game.hero.bodyParts[bodyPart] = Math.min(
          6,
          game.hero.bodyParts[bodyPart] + 1,
        );
        // Régénère l'usage des jambes, mais le malus d'arme déjà subi n'est PAS effacé (règle)
        if (bodyPart === "jambes" && game.hero.bodyParts.jambes > 0) {
          game.hero.hasLegs = true;
        }
        message = `Vous récupérez 1 PV sur : ${bodyPart}.`;
        break;
      }

      case "potionTriple": {
        ["tete", "torse", "jambes"].forEach((part) => {
          game.hero.bodyParts[part] = Math.min(
            6,
            game.hero.bodyParts[part] + 1,
          );
        });
        if (game.hero.bodyParts.jambes > 0) game.hero.hasLegs = true;
        message = "Vous récupérez 1 PV sur chaque partie du corps !";
        break;
      }

      case "armeCoffre":
      case "armeBonus": {
        if (!game.hero.hasLegs) {
          return res.status(400).json({
            error:
              "Sans jambes, vous n'avez pas la force de soulever une arme plus lourde.",
          });
        }
        game.hero.weaponDie = Math.min(3, game.hero.weaponDie + 1);
        message = "Votre arme est améliorée (+1 PC) !";
        break;
      }

      case "bombeCarre": {
        const { x, y } = game.gameState.currentTile;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const t = game.tiles.find(
              (tile) =>
                tile.position.x === x + dx && tile.position.y === y + dy,
            );
            if (t) t.revealed = true; // visible, mais ne déclenche rien tant que non foulée
          }
        }
        message = "Une explosion révèle les alentours, sans rien déclencher.";
        break;
      }

      case "bombeLigne": {
        if (!["haut", "bas", "gauche", "droite"].includes(direction)) {
          return res
            .status(400)
            .json({ error: "Choisissez une direction valide." });
        }
        const { x, y } = game.gameState.currentTile;
        const deltas = {
          haut: { dx: 0, dy: -1 },
          bas: { dx: 0, dy: 1 },
          gauche: { dx: -1, dy: 0 },
          droite: { dx: 1, dy: 0 },
        };
        const { dx, dy } = deltas[direction];

        for (let i = -7; i <= 7; i++) {
          const t = game.tiles.find(
            (tile) =>
              tile.position.x === x + dx * i && tile.position.y === y + dy * i,
          );
          if (t) t.revealed = true;
        }
        message =
          "Une explosion linéaire révèle tout l'alignement, sans rien déclencher.";
        break;
      }

      default:
        return res
          .status(400)
          .json({ error: "Objet inconnu ou non utilisable." });
    }

    game.hero.inventory.splice(idx, 1);
    await game.save();
    res.json({ gameData: game, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

exports.startCombat = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const pending = game.gameState.pendingCombat;
    if (!pending || pending.started) {
      return res.status(400).json({ error: "Aucun combat à démarrer ici." });
    }

    const enemy = buildEnemyFromTile(
      game,
      pending.enemyType,
      pending.x,
      pending.y,
    );

    game.gameState.pendingCombat = {
      ...pending,
      started: true,
      attacksHero: 0,
      attacksEnemy: 0,
      enemy,
      initiative: "hero",
    };
    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;

    game.markModified("gameState.pendingCombat");
    await game.save();
    res.json({ gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.attackRound = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const combat = game.gameState.pendingCombat;
    if (!combat || !combat.started) {
      return res.status(400).json({ error: "Aucun combat en cours." });
    }

    const log = [];
    const heroPC = game.hero.weaponDie;
    const enemy = combat.enemy;
    let victory = false;
    let heroDied = false;

    const heroAttacks = () => {
      let heroHitPart = rollHitLocation();
      if (enemy.bodyParts) {
        heroHitPart = resolveHit(enemy.bodyParts, heroHitPart);
      }

      if (!heroHitPart) {
        log.push("Votre attaque manque sa cible !");
      } else if (enemy.bodyParts) {
        applyDamage(enemy.bodyParts, heroHitPart, heroPC);
        log.push(
          `Vous touchez le ${combat.enemyType} au ${heroHitPart} (${heroPC} dégâts).`,
        );

        if (heroHitPart === "jambes" && enemy.bodyParts.jambes === 0) {
          enemy.weaponDie = Math.max(1, enemy.weaponDie - 1);
          log.push(
            `Le ${combat.enemyType} perd ses jambes, son arme est affaiblie.`,
          );
        }
        if (
          combat.enemyType === "monstre-gelatineux" &&
          heroHitPart !== "jambes" &&
          enemy.bodyParts[heroHitPart] === 0
        ) {
          enemy.weaponDie = Math.max(1, enemy.weaponDie - 1);
          log.push(
            "Une partie du monstre gélatineux se dissout, son attaque faiblit encore.",
          );
        }
        if (
          (heroHitPart === "tete" || heroHitPart === "torse") &&
          enemy.bodyParts[heroHitPart] === 0
        ) {
          victory = true;
          log.push(`Le ${combat.enemyType} s'effondre !`);
        }
      } else {
        enemy.pv = Math.max(0, enemy.pv - heroPC);
        log.push(`Vous infligez ${heroPC} dégâts (PV restants : ${enemy.pv}).`);
        if (enemy.pv <= 0) {
          victory = true;
          log.push(`Le ${combat.enemyType} est vaincu !`);
        }
      }
      combat.attacksHero += 1;
    };

    const enemyAttacks = () => {
      const enemyPC = enemy.weaponDie || 1;
      const enemyHitPart = resolveHit(game.hero.bodyParts, rollHitLocation());

      if (!enemyHitPart) {
        log.push(`Le ${combat.enemyType} vous rate !`);
      } else {
        applyDamage(game.hero.bodyParts, enemyHitPart, enemyPC);
        log.push(
          `Le ${combat.enemyType} vous touche au ${enemyHitPart} (${enemyPC} dégâts).`,
        );

        if (enemyHitPart === "jambes" && game.hero.bodyParts.jambes === 0) {
          game.hero.hasLegs = false;
          game.hero.weaponDie = Math.max(1, game.hero.weaponDie - 1);
          log.push(
            "Vous perdez l'usage de vos jambes, votre arme est affaiblie.",
          );
        }
        if (
          (enemyHitPart === "tete" || enemyHitPart === "torse") &&
          game.hero.bodyParts[enemyHitPart] === 0
        ) {
          heroDied = true;
          log.push("Vous succombez à vos blessures...");
        }
      }
      combat.attacksEnemy += 1;
    };

    // L'ennemi ne garde l'initiative que pour le tout premier échange du combat
    // (surprise lors d'une tentative de furtivité ratée)
    const enemyHasInitiative =
      combat.initiative === "enemy" && combat.attacksEnemy === 0;

    if (enemyHasInitiative) {
      enemyAttacks();
      if (!heroDied) heroAttacks();
    } else {
      heroAttacks();
      if (!victory) enemyAttacks();
    }

    // Les dégâts subis par l'ennemi doivent survivre même si le combat
    // s'interrompt sans victoire (mort du héros, repli...)
    persistEnemyDamage(game, combat);

    let goldReward = 0;

    if (victory) {
      goldReward = GOLD_TABLE[combat.enemyType] || 0;
      game.hero.gold += goldReward;

      const tile = game.tiles.find(
        (t) => t.position.x === combat.x && t.position.y === combat.y,
      );
      if (tile) tile.cleared = true;
      if (combat.enemyType === "boss") game.gameState.bossDefeated = true;

      const recoveredLoot = collectGroundLoot(game, combat.x, combat.y);
      if (recoveredLoot) log.push("Vous récupérez votre trésor perdu ici !");

      game.gameState.pendingCombat = null;
    } else if (heroDied) {
      markHeroDead(game, combat.x, combat.y);
      log.push(
        "Vous êtes mort ! Choisissez : recréer un héros ou abandonner la partie.",
      );

      if (combat.enemyType === "monstre-tresor") {
        const chestTile = game.tiles.find(
          (t) => t.position.x === combat.x && t.position.y === combat.y,
        );
        if (chestTile) {
          chestTile.revealed = false;
          chestTile.cleared = false;
        }

        game.treasureDeck.push("monstre");
        for (let i = game.treasureDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [game.treasureDeck[i], game.treasureDeck[j]] = [
            game.treasureDeck[j],
            game.treasureDeck[i],
          ];
        }
        game.markModified("treasureDeck");

        log.push(
          "Le mimic retourne se cacher, le coffre se referme et redevient un mystère...",
        );
      }
    } else {
      game.gameState.pendingCombat = combat;
    }

    // pendingCombat est un champ Mixed : Mongoose ne détecte pas les mutations
    // internes (enemy.pv, combat.attacksHero, etc.), il faut le signaler explicitement.
    game.markModified("gameState.pendingCombat");
    await game.save();

    res.json({
      gameData: game,
      log,
      victory,
      heroDied,
      goldReward,
      canStop:
        !victory && !heroDied && combat.attacksHero === combat.attacksEnemy,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.stopCombat = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const combat = game.gameState.pendingCombat;
    if (!combat || !combat.started) {
      return res.status(400).json({ error: "Aucun combat en cours." });
    }
    if (
      combat.enemyType === "horde-rats" ||
      combat.enemyType === "monstre-tresor"
    ) {
      return res.status(400).json({
        error:
          "Impossible de fuir ce combat une fois engagé : il faut aller jusqu'au bout !",
      });
    }
    if (combat.attacksHero !== combat.attacksEnemy) {
      return res
        .status(400)
        .json({ error: "Terminez ce round avant de vous replier." });
    }

    game.gameState.pendingCombat = null; // le monstre reste sur le plateau, non vaincu
    await game.save();

    res.json({ gameData: game, message: "Vous vous repliez prudemment." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
