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
const POINTS_TABLE = {
  rat: 1,
  monstre: 2,
  "horde-rats": 4,
  "monstre-tresor": 5,
  "monstre-gelatineux": 6,
  boss: 10,
};

// Noms affichés au joueur — distincts des identifiants internes (stockés en
// base, utilisés dans toute la logique) pour ne jamais avoir à les renommer
// en base si le vocabulaire change à nouveau.
const ENEMY_DISPLAY_NAMES = {
  rat: "rat",
  monstre: "monstre gélatineux",
  "horde-rats": "horde de rats",
  "monstre-gelatineux": "méga-blob",
  "monstre-tresor": "mimic",
  boss: "boss",
};
function enemyDisplayName(type) {
  return ENEMY_DISPLAY_NAMES[type] || type;
}

// Accord grammatical correct ("à la tête", "au torse", "aux jambes") — évite
// le "au tête" invariable qui sonnait faux dans les logs de combat.
const BODY_PART_PHRASES = {
  tete: "à la tête",
  torse: "au torse",
  jambes: "aux jambes",
};
function bodyPartPhrase(part) {
  return BODY_PART_PHRASES[part] || `au ${part}`;
}
const BODY_PART_ORDER_LOW_TO_HIGH = ["jambes", "torse", "tete"];

function isInBounds(x, y) {
  return x >= 0 && x <= 7 && y >= 0 && y <= 7;
}

// Un atterrissage n'est physiquement impossible que sur un AUTRE gouffre révélé
// (chaîner les sauts au-dessus de deux gouffres n'est pas géré) — une herse,
// elle, reste franchissable à l'atterrissage : elle inflige juste son effet
// normal (voir isHerseTile / traitement dédié dans les résolutions de saut).
function isTileBlockedForLanding(tile) {
  if (!tile || !tile.revealed || tile.cleared) return false;
  return tile.type === "piège" && tile.value === -1;
}

function isHerseTile(tile) {
  return (
    !!tile &&
    tile.revealed &&
    !tile.cleared &&
    tile.type === "piège" &&
    tile.value === -2
  );
}

function isEnemyTile(tile) {
  return (
    !!tile &&
    tile.revealed &&
    !tile.cleared &&
    OBSTACLE_ENEMY_TYPES.includes(tile.type)
  );
}

function isMandatoryFight(game, enemyType) {
  if (game.difficulty === "epique") return true; // aucun repli possible en épique, quel que soit l'ennemi
  return (
    enemyType === "horde-rats" ||
    enemyType === "monstre-tresor" ||
    (enemyType === "boss" && game.gameState.keyFound)
  );
}

// Seulement 3 dés de chaque couleur existent physiquement (sac aux monstres) :
// un mega-blob d'une couleur "consomme" ses 3 dés tant qu'il n'est pas vaincu,
// donc aucun nouveau blob de cette couleur ne peut apparaître entre-temps.
function pickAvailableBlobColor(game) {
  const colors = ["rouge", "bleu", "vert"];
  const available = colors.filter((color) => {
    const megaBlobExists = game.tiles.some(
      (t) => t.type === "monstre-gelatineux" && t.color === color && !t.cleared,
    );
    if (megaBlobExists) return false;

    const soloCount = game.tiles.filter(
      (t) =>
        t.type === "monstre" && t.color === color && t.revealed && !t.cleared,
    ).length;
    return soloCount < 3;
  });

  const pool = available.length > 0 ? available : colors; // sécurité, ne devrait pas arriver
  return pool[Math.floor(Math.random() * pool.length)];
}

// Coup gratuit porté immédiatement (avant même le début formel du combat),
// utilisé quand une furtivité réussie fait atterrir le héros sur un second ennemi.
function applyBonusHeroStrike(game, enemyType, enemy) {
  const heroPC = game.hero.weaponDie;
  let hitPart = rollHitLocation();
  const log = [];
  let victory = false;

  if (enemy.bodyParts) {
    hitPart = resolveHit(enemy.bodyParts, hitPart);
    if (!hitPart) {
      log.push("Votre frappe surprise manque sa cible !");
    } else {
      applyDamage(enemy.bodyParts, hitPart, heroPC);
      log.push(
        `Frappe surprise : vous touchez ${bodyPartPhrase(hitPart)} (${heroPC} dégâts).`,
      );
      if (hitPart === "jambes" && enemy.bodyParts.jambes === 0) {
        enemy.weaponDie = Math.max(1, enemy.weaponDie - 1);
      }
      if (
        enemyType === "monstre-gelatineux" &&
        hitPart !== "jambes" &&
        enemy.bodyParts[hitPart] === 0
      ) {
        enemy.weaponDie = Math.max(1, enemy.weaponDie - 1);
      }
      if (
        (hitPart === "tete" || hitPart === "torse") &&
        enemy.bodyParts[hitPart] === 0
      ) {
        victory = true;
        log.push(`Le ${enemyDisplayName(enemyType)} s'effondre déjà !`);
      }
    }
  } else {
    enemy.pv = Math.max(0, enemy.pv - heroPC);
    log.push(`Frappe surprise : ${heroPC} dégâts (PV restants : ${enemy.pv}).`);
    if (enemy.pv <= 0) {
      victory = true;
      log.push(
        `Le ${enemyDisplayName(enemyType)} est vaincu avant même d'avoir réagi !`,
      );
    }
  }

  return { log, victory };
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
function markHeroDead(game, lootX, lootY, cause = "Une mort mystérieuse...") {
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
  game.gameState.deathCause = cause;
  game.gameState.movesRemaining = 0;
  game.gameState.lockedDirection = null;
  game.gameState.pendingCombat = null;
  game.gameState.pendingTrapChoice = null;

  game.gameState.livesRemaining = Math.max(
    0,
    (game.gameState.livesRemaining ?? 1) - 1,
  );

  if (game.gameState.livesRemaining <= 0) {
    // Plus aucune vie : fin de partie définitive (le score final reste consultable)
    game.status = "defeat";
  } else {
    // Une vie reste : le héros pourra être recréé (nouveaux essais de dés)
    const rules =
      Donjon.DIFFICULTY_RULES[game.difficulty] ||
      Donjon.DIFFICULTY_RULES.facile;
    game.gameState.rerollsRemaining = rules.maxRerolls;
  }
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
  if (gotKey) {
    game.gameState.keyFound = true;
    revealExitIfReady(game);
  }

  return { gold: totalGold, inventory: totalInventory, hasKey: gotKey };
}

// Appelé quand le joueur choisit "Recréer un héros" après sa mort.
// Le héros réapparaît logiquement sur la tuile d'entrée (currentTile mis à jour côté
// serveur), mais visuellement le front doit continuer d'afficher le sprite à l'ancien
// emplacement jusqu'au prochain déplacement (le front ne doit PAS resynchroniser
// heroPosition sur ce retour d'appel).
// Le héros n'est PAS re-tiré automatiquement : il repasse par le flux normal de
// création (lancer les dés / relancer / garder), avec les essais propres à la
// difficulté (déjà réinitialisés dans markHeroDead).
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

    game.hero.bodyParts = { tete: 0, torse: 0, jambes: 0 };
    game.hero.weaponDie = 1;
    game.hero.hasLegs = true;
    game.gameState.heroConfirmed = false;

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

// Classement des meilleurs scores, tous joueurs confondus (toutes parties,
// peu importe leur statut : le score reflète la progression atteinte).
exports.getLeaderboard = async (req, res) => {
  try {
    const { difficulty, scope } = req.body;
    const validDifficulties = ["facile", "moyen", "difficile", "epique"];

    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ error: "Difficulté invalide." });
    }

    // Comptent pour le classement : la mort définitive (plus de vies) ET
    // l'abandon volontaire — mais pas les parties encore en cours.
    const filter = { status: { $in: ["defeat", "abandoned"] }, difficulty };
    if (scope === "mine") {
      filter.userId = req.user._id;
    }

    const topGames = await Donjon.find(filter)
      .sort({ "gameState.score": -1 })
      .limit(10)
      .populate("userId", "username")
      .select(
        "gameState.score gameState.floor gameState.deathCause difficulty status userId createdAt",
      );

    const leaderboard = topGames.map((g) => ({
      username: g.userId?.username || "Joueur inconnu",
      score: g.gameState.score || 0,
      floor: g.gameState.floor || 1,
      difficulty: g.difficulty,
      status: g.status,
      cause:
        g.status === "abandoned"
          ? "Abandon volontaire"
          : g.gameState.deathCause || "Cause inconnue",
    }));

    res.json({ leaderboard, difficulty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Renvoie TOUTES les parties en cours du joueur (plusieurs parties en pause
// peuvent coexister) — permet un écran "Reprendre / Nouvelle partie" avec liste.
// Referme l'écran récapitulatif de fin d'étage (que le joueur choisisse de
// continuer immédiatement ou de sauvegarder et quitter) — dans les deux cas
// l'étage suivant est déjà généré, donc une reprise ultérieure y arrive direct.
exports.dismissFloorRecap = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    game.gameState.floorRecap = null;
    await game.save();

    res.json({ gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyGames = async (req, res) => {
  try {
    const games = await Donjon.find({
      userId: req.user._id,
      status: "in_progress",
    }).sort({
      updatedAt: -1,
    });
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createGame = async (req, res) => {
  try {
    const { difficulty } = req.body;
    const heroName = req.user.username || "Hero";
    const gameData = await Donjon.createGameForUser(
      req.user._id,
      difficulty,
      heroName,
    );
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

// Révèle la tuile sortie dès que les deux conditions de victoire sont réunies,
// pour guider le joueur, même s'il n'y est jamais physiquement passé.
function revealExitIfReady(game) {
  if (game.gameState.keyFound && game.gameState.bossDefeated) {
    const exitTile = game.tiles.find((t) => t.type === "sortie");
    if (exitTile) exitTile.revealed = true;
  }
}

// Révèle une tuile en vérifiant au passage une éventuelle fusion (rats/blobs) —
// utilisé par les bombes, qui révèlent sans jamais "déclencher" de combat,
// mais la fusion elle-même est un effet purement structurel, pas un déclenchement.
function revealTileAndCheckMerge(game, tile) {
  if (!tile || tile.revealed) return false;
  tile.revealed = true;

  if (tile.type === "rat") {
    return checkAndMergeRats(game, tile);
  } else if (tile.type === "monstre") {
    if (!tile.color) {
      tile.color = pickAvailableBlobColor(game);
    }
    return checkAndMergeBlobs(game, tile);
  }
  return false;
}
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

      case "sneak_safe": {
        const landingTile = game.tiles.find(
          (t) =>
            t.position.x === pending.landingTo.x &&
            t.position.y === pending.landingTo.y,
        );
        game.gameState.currentTile = pending.landingTo;
        game.gameState.movesRemaining -= 3;

        if (isEnemyTile(landingTile)) {
          game.gameState.movesRemaining = 0;
          game.gameState.lockedDirection = null;

          const enemy2 = buildEnemyFromTile(
            game,
            landingTile.type,
            pending.landingTo.x,
            pending.landingTo.y,
          );
          const bonusStrike = applyBonusHeroStrike(
            game,
            landingTile.type,
            enemy2,
          );

          if (bonusStrike.victory) {
            const goldReward = GOLD_TABLE[landingTile.type] || 0;
            game.hero.gold += goldReward;
            game.gameState.score =
              (game.gameState.score || 0) +
              (POINTS_TABLE[landingTile.type] || 0);
            landingTile.cleared = true;
            const recoveredLoot = collectGroundLoot(
              game,
              pending.landingTo.x,
              pending.landingTo.y,
            );
            if (landingTile.type === "boss") game.gameState.bossDefeated = true;
            revealExitIfReady(game);
            message = `${bonusStrike.log.join(" ")} Victoire surprise, +${goldReward} PO !${
              recoveredLoot ? " Vous récupérez votre trésor perdu ici !" : ""
            }`;
          } else {
            game.gameState.pendingCombat = {
              x: pending.landingTo.x,
              y: pending.landingTo.y,
              enemyType: landingTile.type,
              started: true,
              attacksHero: 0,
              attacksEnemy: 0,
              enemy: enemy2,
              initiative: "hero",
              mandatory: isMandatoryFight(game, landingTile.type),
              retreatBack: { x: pending.enemyX, y: pending.enemyY },
              retreatForward: null,
            };
            message = `${bonusStrike.log.join(" ")} Un ${enemyDisplayName(landingTile.type)} vous barrait la route juste après, le combat s'engage !`;
          }
        } else {
          game.gameState.lockedDirection =
            game.gameState.movesRemaining > 0 ? pending.direction : null;
          const recovered = collectGroundLoot(
            game,
            pending.landingTo.x,
            pending.landingTo.y,
          );
          message =
            `Vous vous faufilez discrètement devant : ${enemyDisplayName(pending.enemyType)}.` +
            (recovered ? " Vous retrouvez votre trésor perdu !" : "");
        }
        break;
      }

      case "sneak_risky": {
        const success = Math.random() < 0.5;
        game.gameState.movesRemaining = 0;
        game.gameState.lockedDirection = null;

        if (success) {
          const landingTile = game.tiles.find(
            (t) =>
              t.position.x === pending.landingTo.x &&
              t.position.y === pending.landingTo.y,
          );
          game.gameState.currentTile = pending.landingTo;

          if (isEnemyTile(landingTile)) {
            const enemy2 = buildEnemyFromTile(
              game,
              landingTile.type,
              pending.landingTo.x,
              pending.landingTo.y,
            );
            const bonusStrike = applyBonusHeroStrike(
              game,
              landingTile.type,
              enemy2,
            );

            if (bonusStrike.victory) {
              const goldReward = GOLD_TABLE[landingTile.type] || 0;
              game.hero.gold += goldReward;
              game.gameState.score =
                (game.gameState.score || 0) +
                (POINTS_TABLE[landingTile.type] || 0);
              landingTile.cleared = true;
              const recoveredLoot = collectGroundLoot(
                game,
                pending.landingTo.x,
                pending.landingTo.y,
              );
              if (landingTile.type === "boss")
                game.gameState.bossDefeated = true;
              revealExitIfReady(game);
              message = `${bonusStrike.log.join(" ")} Victoire surprise, +${goldReward} PO !${
                recoveredLoot ? " Vous récupérez votre trésor perdu ici !" : ""
              }`;
            } else {
              game.gameState.pendingCombat = {
                x: pending.landingTo.x,
                y: pending.landingTo.y,
                enemyType: landingTile.type,
                started: true,
                attacksHero: 0,
                attacksEnemy: 0,
                enemy: enemy2,
                initiative: "hero",
                mandatory: isMandatoryFight(game, landingTile.type),
                retreatBack: { x: pending.enemyX, y: pending.enemyY },
                retreatForward: null,
              };
              message = `${bonusStrike.log.join(" ")} Un ${enemyDisplayName(landingTile.type)} vous barrait la route juste après, le combat s'engage !`;
            }
          } else {
            const recovered = collectGroundLoot(
              game,
              pending.landingTo.x,
              pending.landingTo.y,
            );
            message =
              "Vous réussissez à vous faufiler discrètement !" +
              (recovered ? " Vous retrouvez votre trésor perdu !" : "");
          }
        } else {
          const retreatBack = { ...game.gameState.currentTile };
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
            mandatory: isMandatoryFight(game, pending.enemyType),
            retreatBack,
            retreatForward: pending.landingTo || null,
          };
          message = `Votre tentative échoue, ${enemyDisplayName(pending.enemyType)} vous prend par surprise !`;
        }
        break;
      }

      case "fight": {
        const retreatBack = { ...game.gameState.currentTile };
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
          mandatory: isMandatoryFight(game, pending.enemyType),
          retreatBack,
          retreatForward: pending.landingTo || null,
        };
        message = `Vous engagez le combat contre : ${enemyDisplayName(pending.enemyType)}.`;
        break;
      }
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

    if (game.gameState.heroConfirmed) {
      return res
        .status(400)
        .json({
          error: "Le héros est déjà confirmé, impossible de relancer les dés.",
        });
    }
    if (game.gameState.rerollsRemaining <= 0) {
      return res.status(400).json({
        error:
          "Plus aucun essai disponible pour cette difficulté, vous devez garder ce héros.",
      });
    }

    const diceRolls = [rollD6(), rollD6(), rollD6()];
    const [tete, torse, jambes] = diceRolls;

    game.hero.bodyParts = { tete, torse, jambes };
    game.hero.hasLegs = true;
    game.gameState.rerollsRemaining -= 1;
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

    if (game.gameState.heroConfirmed) {
      return res
        .status(400)
        .json({
          error: "Le héros est déjà confirmé, impossible de relancer les dés.",
        });
    }

    const weaponDie = Math.floor(Math.random() * 3) + 1; // PC 1-3
    game.hero.weaponDie = weaponDie;
    await game.save();

    res.json({ weaponDie, gameData: game });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Verrouille définitivement les stats du héros (plus de relance possible ensuite)
exports.confirmHero = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const total =
      (game.hero.bodyParts?.tete ?? 0) +
      (game.hero.bodyParts?.torse ?? 0) +
      (game.hero.bodyParts?.jambes ?? 0);

    if (total <= 0) {
      return res
        .status(400)
        .json({ error: "Lancez d'abord les dés du héros." });
    }

    game.gameState.heroConfirmed = true;
    await game.save();

    res.json({ gameData: game });
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
    game.gameState.turnCount = (game.gameState.turnCount || 0) + 1;
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
      if (targetTile.type === "boss" && game.gameState.keyFound) {
        // Avec la clé en poche, impossible d'éviter le combat contre le boss
        game.gameState.currentTile = { x: nx, y: ny };
        game.gameState.movesRemaining = 0;
        game.gameState.lockedDirection = null;
        game.gameState.pendingCombat = {
          x: nx,
          y: ny,
          enemyType: "boss",
          started: true,
          attacksHero: 0,
          attacksEnemy: 0,
          enemy: buildEnemyFromTile(game, "boss", nx, ny),
          initiative: "hero",
          mandatory: true,
        };
        response.message =
          "Avec la clé en poche, impossible d'éviter le boss !";
        response.stopped = true;
      } else {
        // ----- Ennemi déjà révélé : proposer furtivité / combat / arrêt, sans bouger -----
        const landingX = nx + dx;
        const landingY = ny + dy;
        const landingTile = tileAt(landingX, landingY);
        const canLand =
          isInBounds(landingX, landingY) &&
          !isTileBlockedForLanding(landingTile);
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
      }
    } else if (targetTile?.revealed && targetTile.type === "piège") {
      // ----- Piège permanent révélé (herse ou gouffre) : toujours un choix -----
      const isGouffre = targetTile.value === -1;
      const landingX = nx + dx;
      const landingY = ny + dy;
      const landingTile = tileAt(landingX, landingY);
      const canLand =
        isInBounds(landingX, landingY) && !isTileBlockedForLanding(landingTile);
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

      // La sortie, une fois les conditions de victoire réunies, arrête toujours
      // le déplacement net — même s'il restait des mouvements sur ce lancer.
      if (
        targetTile?.type === "sortie" &&
        game.gameState.keyFound &&
        game.gameState.bossDefeated
      ) {
        game.gameState.movesRemaining = 0;
      }
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
        const recoveredWalk = collectGroundLoot(
          game,
          pending.walkTo.x,
          pending.walkTo.y,
        );
        message =
          "Vous marchez sur la herse et perdez 1 PV." +
          (recoveredWalk ? " Vous retrouvez votre trésor perdu !" : "");
        break;
      }

      case "jump_safe": {
        const landingTile = game.tiles.find(
          (t) =>
            t.position.x === pending.jumpTo.x &&
            t.position.y === pending.jumpTo.y,
        );
        game.gameState.currentTile = pending.jumpTo;
        game.gameState.movesRemaining -= 3;

        if (isEnemyTile(landingTile)) {
          game.gameState.movesRemaining = 0;
          game.gameState.pendingCombat = {
            x: pending.jumpTo.x,
            y: pending.jumpTo.y,
            enemyType: landingTile.type,
            started: true,
            attacksHero: 0,
            attacksEnemy: 0,
            enemy: buildEnemyFromTile(
              game,
              landingTile.type,
              pending.jumpTo.x,
              pending.jumpTo.y,
            ),
            initiative: "enemy",
            // Pas de repli possible : la case précédente est de l'autre côté du
            // piège qu'on vient de sauter, on ne peut pas la retraverser gratuitement.
            mandatory: true,
          };
          message = `Vous atterrissez en plein sur : ${enemyDisplayName(landingTile.type)} !`;
        } else if (isHerseTile(landingTile)) {
          const { heroDied: died } = applyLowestPartDamage(game.hero, 2);
          heroDied = died;
          const recoveredHerse = collectGroundLoot(
            game,
            pending.jumpTo.x,
            pending.jumpTo.y,
          );
          message =
            "Vous atterrissez lourdement sur une herse et perdez 2 PV." +
            (recoveredHerse ? " Vous retrouvez votre trésor perdu !" : "");
        } else {
          const recoveredClean = collectGroundLoot(
            game,
            pending.jumpTo.x,
            pending.jumpTo.y,
          );
          message =
            "Vous sautez par-dessus, sans perte !" +
            (recoveredClean ? " Vous retrouvez votre trésor perdu !" : "");
        }
        break;
      }

      case "jump_risky": {
        const success = Math.random() < 0.5;
        game.gameState.movesRemaining = 0; // la tentative consomme tout, réussite ou non

        if (pending.trapType === "gouffre") {
          if (success) {
            const landingTile = game.tiles.find(
              (t) =>
                t.position.x === pending.jumpTo.x &&
                t.position.y === pending.jumpTo.y,
            );
            game.gameState.currentTile = pending.jumpTo;

            if (isEnemyTile(landingTile)) {
              game.gameState.pendingCombat = {
                x: pending.jumpTo.x,
                y: pending.jumpTo.y,
                enemyType: landingTile.type,
                started: true,
                attacksHero: 0,
                attacksEnemy: 0,
                enemy: buildEnemyFromTile(
                  game,
                  landingTile.type,
                  pending.jumpTo.x,
                  pending.jumpTo.y,
                ),
                initiative: "enemy",
                mandatory: true, // pas de repli sûr possible après un saut de piège
              };
              message = `Saut risqué... réussi ! Mais vous atterrissez en plein sur : ${enemyDisplayName(landingTile.type)} !`;
            } else if (isHerseTile(landingTile)) {
              const { heroDied: died } = applyLowestPartDamage(game.hero, 2);
              heroDied = died;
              const recovered = collectGroundLoot(
                game,
                pending.jumpTo.x,
                pending.jumpTo.y,
              );
              message =
                "Saut risqué... réussi ! Vous atterrissez lourdement sur une herse et perdez 2 PV." +
                (recovered ? " Vous retrouvez votre trésor perdu !" : "");
            } else {
              const recovered = collectGroundLoot(
                game,
                pending.jumpTo.x,
                pending.jumpTo.y,
              );
              message =
                "Saut risqué... réussi ! Vous traversez le gouffre." +
                (recovered ? " Vous retrouvez votre trésor perdu !" : "");
            }
          } else {
            heroDied = true;
            message = "Le saut échoue... vous tombez dans le gouffre !";
          }
        } else {
          // Herse : réussite = passe complètement de l'autre côté, sans perte.
          // Échec = trébuche et retombe SUR la herse (pas au-delà), perd 1 PV.
          if (success) {
            const landingTile = game.tiles.find(
              (t) =>
                t.position.x === pending.jumpTo.x &&
                t.position.y === pending.jumpTo.y,
            );
            game.gameState.currentTile = pending.jumpTo;

            if (isEnemyTile(landingTile)) {
              game.gameState.pendingCombat = {
                x: pending.jumpTo.x,
                y: pending.jumpTo.y,
                enemyType: landingTile.type,
                started: true,
                attacksHero: 0,
                attacksEnemy: 0,
                enemy: buildEnemyFromTile(
                  game,
                  landingTile.type,
                  pending.jumpTo.x,
                  pending.jumpTo.y,
                ),
                initiative: "enemy",
                mandatory: true, // pas de repli sûr possible après un saut de piège
              };
              message = `Vous sautez avec agilité... et atterrissez en plein sur : ${enemyDisplayName(landingTile.type)} !`;
            } else if (isHerseTile(landingTile)) {
              const { heroDied: died } = applyLowestPartDamage(game.hero, 2);
              heroDied = died;
              const recovered = collectGroundLoot(
                game,
                pending.jumpTo.x,
                pending.jumpTo.y,
              );
              message =
                "Vous sautez avec agilité... et atterrissez lourdement sur une autre herse (-2 PV)." +
                (recovered ? " Vous retrouvez votre trésor perdu !" : "");
            } else {
              const recovered = collectGroundLoot(
                game,
                pending.jumpTo.x,
                pending.jumpTo.y,
              );
              message =
                "Vous sautez avec agilité par-dessus la herse, sans perte !" +
                (recovered ? " Vous retrouvez votre trésor perdu !" : "");
            }
          } else {
            const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
            heroDied = died;
            game.gameState.currentTile = pending.walkTo;
            const recovered = collectGroundLoot(
              game,
              pending.walkTo.x,
              pending.walkTo.y,
            );
            message =
              "Le saut rate, vous trébuchez et retombez sur la herse (-1 PV)." +
              (recovered ? " Vous retrouvez votre trésor perdu !" : "");
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
        message,
      );
      message +=
        " Vous êtes mort ! Choisissez : recréer un héros ou abandonner la partie.";
    }

    game.gameState.pendingTrapChoice = null;
    game.gameState.lockedDirection =
      game.gameState.movesRemaining > 0 ? pending.direction : null;
    const stopped =
      game.gameState.movesRemaining <= 0 ||
      heroDied ||
      !!game.gameState.pendingCombat;

    game.markModified("gameState.pendingCombat");
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
    let deathLootAtCurrentTile = false; // true = herse (dépôt sur place), false = gouffre (case précédente)

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
            deathLootAtCurrentTile = false; // le trésor va sur la case précédente
            message = "C'est un gouffre ! Vous tombez...";
          } else {
            const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
            heroDied = died;
            deathLootAtCurrentTile = true; // mort sur la herse : le trésor reste sur cette case
            message = "C'est une herse ! Vous perdez 1 PV.";
          }
          break; // reste un obstacle pour les prochains passages

        case "entrée":
          tile.cleared = true;
          message = "Vous êtes à l'entrée du donjon.";
          break;

        case "monstre": {
          if (!tile.color) {
            tile.color = pickAvailableBlobColor(game);
          }
          const merged = checkAndMergeBlobs(game, tile);
          const immediateFight =
            game.difficulty === "difficile" || game.difficulty === "epique";

          if (merged) {
            message = `3 monstres gélatineux ${tile.color}s fusionnent en une masse unique !`;
            if (immediateFight) {
              game.gameState.pendingCombat = {
                x,
                y,
                enemyType: "monstre-gelatineux",
                started: true,
                attacksHero: 0,
                attacksEnemy: 0,
                enemy: buildEnemyFromTile(game, "monstre-gelatineux", x, y),
                initiative: "hero",
                mandatory: isMandatoryFight(game, "monstre-gelatineux"), // fuyable sauf en épique
              };
              message += " Le combat s'engage immédiatement !";
            } else {
              game.gameState.pendingCombat = {
                x,
                y,
                enemyType: "monstre-gelatineux",
                started: false,
              };
            }
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
          const immediateFight =
            game.difficulty === "difficile" || game.difficulty === "epique";

          if (merged) {
            message = "3 rats se regroupent en une horde monstrueuse !";
            if (immediateFight) {
              game.gameState.pendingCombat = {
                x,
                y,
                enemyType: "horde-rats",
                started: true,
                attacksHero: 0,
                attacksEnemy: 0,
                enemy: buildEnemyFromTile(game, "horde-rats", x, y),
                initiative: "hero",
                mandatory: true, // la horde n'est de toute façon jamais fuyable
              };
              message += " Le combat s'engage immédiatement !";
            } else {
              game.gameState.pendingCombat = {
                x,
                y,
                enemyType: "horde-rats",
                started: false,
              };
            }
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
          if (game.gameState.keyFound) {
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "boss",
              started: true,
              attacksHero: 0,
              attacksEnemy: 0,
              enemy: buildEnemyFromTile(game, "boss", x, y),
              initiative: "hero",
              mandatory: true,
            };
            message =
              "Le boss vous barre la route... avec la clé en poche, impossible de l'éviter !";
          } else {
            game.gameState.pendingCombat = {
              x,
              y,
              enemyType: "boss",
              started: false,
            };
            message = "Le boss se dresse devant vous !";
          }
          break;

        default:
          message = "Rien de spécial.";
      }
    }

    // Fait passer le héros à l'étage suivant : nouveau plateau/boss/deck/magasin,
    // mais conserve les stats du héros, ses vies, ses essais et son score.
    // Perd son inventaire et sa clé (nouvel étage = nouveau donjon).
    function advanceToNextFloor(game) {
      game.gameState.floor = (game.gameState.floor || 1) + 1;

      game.tiles = Donjon.generateTiles(game.difficulty);
      game.boss = { type: "goblin", ...Donjon.generateBossStats() };
      game.treasureDeck = Donjon.buildShuffledTreasureDeck();
      game.shopStock = {
        potionSimple: { price: 2, stock: 4 },
        potionTriple: { price: 10, stock: 2 },
        armeBonus: { price: 5, stock: 2 },
      };

      game.hero.inventory = []; // perd ses objets
      // gold, bodyParts, weaponDie, hasLegs : conservés tels quels

      game.gameState.currentTile = { x: 0, y: 0 };
      game.gameState.entryTile = { x: 0, y: 0 };
      game.gameState.previousTile = null;
      game.gameState.keyFound = false; // perd la clé
      game.gameState.bossDefeated = false;
      game.gameState.movesRemaining = 0;
      game.gameState.lockedDirection = null;
      game.gameState.pendingCombat = null;
      game.gameState.pendingTrapChoice = null;
      game.gameState.pendingEnemyChoice = null;
      game.gameState.groundLoot = [];
      game.gameState.turnCount = 0;
      game.gameState.lastShopPurchaseTurn = -1;
      // heroIsDead, heroConfirmed, livesRemaining, rerollsRemaining, score : conservés
    }

    // Vérifie la condition de victoire à CHAQUE passage sur la sortie,
    // pas seulement lors de sa première découverte (le joueur a pu la
    // traverser avant d'avoir la clé/le boss).
    if (tile.type === "sortie" && game.status === "in_progress") {
      tile.cleared = true;

      if (game.gameState.keyFound && game.gameState.bossDefeated) {
        const turnBonus = Math.max(0, 100 - (game.gameState.turnCount || 0));
        game.gameState.score = (game.gameState.score || 0) + turnBonus;
        const floorReached = game.gameState.floor;
        const turnsTaken = game.gameState.turnCount;
        advanceToNextFloor(game);

        game.gameState.floorRecap = {
          completedFloor: floorReached,
          turnsTaken,
          turnBonus,
          totalScore: game.gameState.score,
          livesRemaining: game.gameState.livesRemaining,
          nextFloor: game.gameState.floor,
        };

        message = `🎉 Vous atteignez la sortie de l'étage ${floorReached} ! +${turnBonus} points de rapidité. Direction l'étage ${game.gameState.floor} !`;
      } else {
        const missing = [];
        if (!game.gameState.keyFound) missing.push("la clé");
        if (!game.gameState.bossDefeated) missing.push("le boss");
        message = `Vous êtes à la sortie, mais il vous manque : ${missing.join(" et ")}.`;
      }
    }

    if (heroDied) {
      const lootPos = deathLootAtCurrentTile
        ? { x, y }
        : game.gameState.previousTile || { x, y };
      markHeroDead(game, lootPos.x, lootPos.y, message);
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
    revealExitIfReady(game);

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
        mandatory: true,
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
    if (game.gameState.lastShopPurchaseTurn === game.gameState.turnCount) {
      return res
        .status(400)
        .json({ error: "Vous ne pouvez acheter qu'un seul objet par tour." });
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
    game.gameState.lastShopPurchaseTurn = game.gameState.turnCount;
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
        if (game.hero.bodyParts[bodyPart] >= 6) {
          return res
            .status(400)
            .json({
              error: "Cette partie du corps est déjà au maximum (6 PV).",
            });
        }
        game.hero.bodyParts[bodyPart] += 1;
        // Régénère l'usage des jambes, mais le malus d'arme déjà subi n'est PAS effacé (règle)
        if (bodyPart === "jambes" && game.hero.bodyParts.jambes > 0) {
          game.hero.hasLegs = true;
        }
        message = `Vous récupérez 1 PV sur : ${bodyPart}.`;
        break;
      }

      case "potionTriple": {
        const alreadyMaxed = ["tete", "torse", "jambes"].every(
          (part) => game.hero.bodyParts[part] >= 6,
        );
        if (alreadyMaxed) {
          return res
            .status(400)
            .json({
              error: "Toutes vos parties du corps sont déjà au maximum (6 PV).",
            });
        }
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
        if (game.hero.weaponDie >= 3) {
          return res
            .status(400)
            .json({ error: "Votre arme est déjà au maximum (3 PC)." });
        }
        game.hero.weaponDie += 1;
        message = "Votre arme est améliorée (+1 PC) !";
        break;
      }

      case "bombeCarre": {
        const { x, y } = game.gameState.currentTile;
        let mergeHappened = false;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const t = game.tiles.find(
              (tile) =>
                tile.position.x === x + dx && tile.position.y === y + dy,
            );
            if (t && revealTileAndCheckMerge(game, t)) mergeHappened = true;
          }
        }
        message = mergeHappened
          ? "Une explosion révèle les alentours... et provoque le regroupement de monstres visibles !"
          : "Une explosion révèle les alentours, sans rien déclencher.";
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
        let mergeHappened = false;

        for (let i = -7; i <= 7; i++) {
          const t = game.tiles.find(
            (tile) =>
              tile.position.x === x + dx * i && tile.position.y === y + dy * i,
          );
          if (t && revealTileAndCheckMerge(game, t)) mergeHappened = true;
        }
        message = mergeHappened
          ? "Une explosion linéaire révèle tout l'alignement... et provoque le regroupement de monstres visibles !"
          : "Une explosion linéaire révèle tout l'alignement, sans rien déclencher.";
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
      retreatBack: game.gameState.previousTile || null,
      retreatForward: null,
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
          `Vous touchez le ${enemyDisplayName(combat.enemyType)} ${bodyPartPhrase(heroHitPart)} (${heroPC} dégâts).`,
        );

        if (heroHitPart === "jambes" && enemy.bodyParts.jambes === 0) {
          enemy.weaponDie = Math.max(1, enemy.weaponDie - 1);
          log.push(
            `Le ${enemyDisplayName(combat.enemyType)} perd ses jambes, son arme est affaiblie.`,
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
          log.push(`Le ${enemyDisplayName(combat.enemyType)} s'effondre !`);
        }
      } else {
        enemy.pv = Math.max(0, enemy.pv - heroPC);
        log.push(`Vous infligez ${heroPC} dégâts (PV restants : ${enemy.pv}).`);
        if (enemy.pv <= 0) {
          victory = true;
          log.push(`Le ${enemyDisplayName(combat.enemyType)} est vaincu !`);
        }
      }
      combat.attacksHero += 1;
    };

    const enemyAttacks = () => {
      const enemyPC = enemy.weaponDie || 1;
      const enemyHitPart = resolveHit(game.hero.bodyParts, rollHitLocation());

      if (!enemyHitPart) {
        log.push(`Le ${enemyDisplayName(combat.enemyType)} vous rate !`);
      } else {
        applyDamage(game.hero.bodyParts, enemyHitPart, enemyPC);
        log.push(
          `Le ${enemyDisplayName(combat.enemyType)} vous touche ${bodyPartPhrase(enemyHitPart)} (${enemyPC} dégâts).`,
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
      game.gameState.score =
        (game.gameState.score || 0) + (POINTS_TABLE[combat.enemyType] || 0);

      const tile = game.tiles.find(
        (t) => t.position.x === combat.x && t.position.y === combat.y,
      );
      if (tile) tile.cleared = true;
      if (combat.enemyType === "boss") {
        game.gameState.bossDefeated = true;
        revealExitIfReady(game);
      }

      const recoveredLoot = collectGroundLoot(game, combat.x, combat.y);
      if (recoveredLoot) log.push("Vous récupérez votre trésor perdu ici !");

      game.gameState.pendingCombat = null;
    } else if (heroDied) {
      markHeroDead(
        game,
        combat.x,
        combat.y,
        `Vaincu au combat contre : ${enemyDisplayName(combat.enemyType)}.`,
      );
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

// Détermine la case sur laquelle le héros atterrit en se repliant : la case
// précédente par défaut, ou la case suivante (au-delà de l'ennemi) si la
// précédente est un gouffre déjà connu (on ne recule pas dans le vide).
function computeRetreatTile(game, combat) {
  const backTile = combat.retreatBack
    ? game.tiles.find(
        (t) =>
          t.position.x === combat.retreatBack.x &&
          t.position.y === combat.retreatBack.y,
      )
    : null;
  const backIsGouffre =
    backTile &&
    backTile.revealed &&
    backTile.type === "piège" &&
    backTile.value === -1;

  if (combat.retreatBack && !backIsGouffre) return combat.retreatBack;
  if (combat.retreatForward) return combat.retreatForward;
  return { x: combat.x, y: combat.y }; // dernier recours, ne devrait pas arriver
}

exports.stopCombat = async (req, res) => {
  try {
    const { gameId } = req.body;
    const game = await Donjon.findOne({ _id: gameId, userId: req.user._id });
    if (!game) return res.status(404).json({ error: "Partie introuvable." });

    const combat = game.gameState.pendingCombat;
    if (!combat || !combat.started) {
      return res.status(400).json({ error: "Aucun combat en cours." });
    }
    if (combat.mandatory) {
      return res.status(400).json({
        error:
          "Impossible de fuir ce combat une fois engagé : il faut aller jusqu'au bout !",
      });
    }
    if (combat.attacksHero === 0) {
      return res
        .status(400)
        .json({ error: "Impossible de fuir avant la fin du premier round." });
    }
    if (combat.attacksHero !== combat.attacksEnemy) {
      return res
        .status(400)
        .json({ error: "Terminez ce round avant de vous replier." });
    }

    const retreatTile = computeRetreatTile(game, combat);
    const landingTileObj = game.tiles.find(
      (t) => t.position.x === retreatTile.x && t.position.y === retreatTile.y,
    );

    let message = "Vous vous repliez prudemment.";
    let heroDied = false;

    if (isHerseTile(landingTileObj)) {
      const { heroDied: died } = applyLowestPartDamage(game.hero, 1);
      heroDied = died;
      message += " Vous atterrissez sur une herse et perdez 1 PV.";
    }

    game.gameState.currentTile = retreatTile;
    game.gameState.pendingCombat = null; // le monstre reste sur le plateau, non vaincu
    game.gameState.movesRemaining = 0;
    game.gameState.lockedDirection = null;

    const recovered = collectGroundLoot(game, retreatTile.x, retreatTile.y);
    if (recovered) message += " Vous retrouvez votre trésor perdu !";

    if (heroDied) {
      markHeroDead(game, retreatTile.x, retreatTile.y, message);
      message +=
        " Vous êtes mort ! Choisissez : recréer un héros ou abandonner la partie.";
    }

    await game.save();

    res.json({ gameData: game, message, heroDied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
