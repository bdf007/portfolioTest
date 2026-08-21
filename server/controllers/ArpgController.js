const { getBiomeForDepth } = require("../services/generation/biomeConfig");
const { generateCave } = require("../services/generation/caveGenerator");
const { generateRooms } = require("../services/generation/roomGenerator");
const { generateBSP } = require("../services/generation/bspGenerator");
const { generateTown } = require("../services/generation/townGenerator");
const { generateEnemySpawns } = require("../services/generation/enemySpawner");
const {
  findSpawnTile,
  findExitTile,
  findUpstairsTile,
  findNearbyFloorTile,
} = require("../services/generation/spawnUtils");
const { getEnemyStatsForDepth } = require("../services/generation/enemyStats");
const {
  generateQuestForNpc,
  getFixedQuest,
} = require("../services/generation/questTypes");
const {
  carveBossRoom,
  reachableFloorSet,
} = require("../services/generation/bossRoom");
const { generateChests } = require("../services/generation/chestGenerator");
const { rollLoot } = require("../services/generation/itemTypes");
const { createRng } = require("../services/generation/rng");
const ArpgGame = require("../models/ArpgModel");

/**
 * Etages avec un boss - un seul pour l'instant (etage 5). Tableau plutot
 * qu'un simple `=== 5` pour rester facile a etendre plus tard (un
 * deuxieme boss a un autre etage n'est qu'un ajout dans cette liste).
 */
const BOSS_DEPTHS = [5];

/**
 * Endpoint de vérification - à supprimer une fois le module bien démarré.
 */
async function ping(req, res) {
  res.json({ ok: true, module: "arpg" });
}

/**
 * Génère (ou régénère) le niveau courant pour une profondeur donnée.
 * GET /api/arpg/level?depth=1&seed=xxxx
 */
async function getLevel(req, res) {
  try {
    const depth = parseInt(req.query.depth, 10) || 1;
    const seed = req.query.seed || String(Date.now());
    // seed DISTINCTE pour le contenu du butin (ennemis, boss, coffres) -
    // le client en genere une nouvelle a chaque VRAIE nouvelle visite
    // d'un etage (mais la conserve telle quelle en cas de simple
    // sauvegarde+reprise, cf. MainScene.js) ; repli sur `seed` si absente
    // pour ne jamais planter (retrocompatibilite, appel manuel...)
    const lootSeed = req.query.lootSeed || seed;

    const biome = getBiomeForDepth(depth);

    let grid;
    switch (biome.generator) {
      case "cellular":
        grid = generateCave({ width: 40, height: 40, seed });
        break;
      case "randomwalk":
        grid = generateRooms({ width: 40, height: 40, seed });
        break;
      case "bsp":
        // niveaux plus grands et plus ouverts en fin de progression, cf.
        // /areas/phaser-arpg.md - d'où une grille plus large que les deux
        // autres biomes
        grid = generateBSP({ width: 60, height: 60, seed });
        break;
      case "town":
        // pas d'ennemis dans ce biome (biome.enemyBaseCount=0 dans
        // biomeConfig.js) - generateTown n'a rien de particulier a savoir
        // sur les ennemis, geree entierement en amont
        grid = generateTown({ width: 40, height: 40, seed });
        break;
      default:
        throw new Error(`Générateur inconnu pour le biome ${biome.id}`);
    }

    const playerSpawn = findSpawnTile(grid);

    // salle de boss : remplace le calcul normal de la sortie (qui se
    // retrouve A L'INTERIEUR de la salle scellee, cf. carveBossRoom) et
    // restreint les ennemis normaux aux zones reellement atteignables
    // (porte fermee) - sans ca, un ennemi normal pourrait atterrir dans
    // la salle scellee et rendre impossible de nettoyer l'etage.
    const hasBoss = BOSS_DEPTHS.includes(depth);
    let exitTile;
    let bossDoorTile = null;
    let boss = null;
    let allowedTiles = null;

    if (hasBoss) {
      const carved = carveBossRoom(grid, playerSpawn, 5);
      grid = carved.grid;
      bossDoorTile = carved.doorTile;
      exitTile = carved.exitTile;
      allowedTiles = reachableFloorSet(grid, playerSpawn); // porte encore fermee a ce stade

      const bossStats = getEnemyStatsForDepth(depth, "boss1");
      const bossLootRng = createRng(lootSeed + "-boss-loot");
      boss = {
        x: carved.bossSpawn.x,
        y: carved.bossSpawn.y,
        type: "boss1",
        hp: bossStats.hp,
        maxHp: bossStats.hp,
        damage: bossStats.damage,
        defense: bossStats.defense,
        speed: bossStats.speed,
        xpReward: bossStats.xpReward,
        drop: rollLoot("bossDrop", bossLootRng),
      };
    } else {
      exitTile = findExitTile(grid, playerSpawn);
    }

    // jamais de remontee depuis le premier etage - sinon, meme principe
    // que le PNJ de quete (case proche du spawn), null si aucune case
    // valide n'est trouvee (carte trop exigue) plutot que de planter.
    // Exclut la porte du boss si elle existe, pour ne jamais faire
    // coincider les deux landmarks.
    const upstairsTile =
      depth > 1
        ? findUpstairsTile(
            grid,
            playerSpawn,
            bossDoorTile ? [bossDoorTile] : [],
          )
        : null;

    // PNJ de quete : pour l'instant, uniquement dans les villes (un par
    // ville, garanti) - d'autres conditions d'apparition (aleatoire sur
    // un etage normal, sous condition) sont prevues plus tard mais pas
    // construites ici. Case distincte de la remontee (jamais la meme,
    // cf. findNearbyFloorTile) ; objectif tire de facon seedee (meme
    // seed = meme quete, comme le reste de la generation).
    let questNpc = null;
    if (biome.id === "town") {
      const npcTile = findNearbyFloorTile(
        grid,
        playerSpawn,
        upstairsTile ? [upstairsTile] : [],
      );
      if (npcTile) {
        // une quete ecrite a la main pour CET etage precis prend le pas
        // sur le tirage aleatoire, si elle existe (cf. FIXED_QUESTS dans
        // questTypes.js) - sinon, comportement habituel
        const fixedQuest = getFixedQuest(depth);
        let quest;
        if (fixedQuest) {
          quest = fixedQuest;
        } else {
          // bassin de types cible = fusion du biome qui precede ET de celui
          // qui suit la ville - pas un sens fige (le passage par une ville
          // impliquera generalement un changement de biome, mais rien
          // n'empeche la quete de faire reference a l'un OU l'autre selon
          // le tirage seede). Deduplique (Set) au cas ou les deux listes
          // se recoupent, pour ne pas fausser les probabilites de tirage.
          const prevBiome = getBiomeForDepth(depth - 1);
          const nextBiome = getBiomeForDepth(depth + 1);
          const enemyTypePool = [
            ...new Set([
              ...(prevBiome.enemyTypes || []),
              ...(nextBiome.enemyTypes || []),
            ]),
          ];
          quest = generateQuestForNpc(seed, enemyTypePool);
        }
        questNpc = { x: npcTile.x, y: npcTile.y, ...quest };
      }
    }

    // Pas de persistance de l'etat "tue/vivant" ici, volontairement : a
    // chaque appel (donc a chaque entree/retour sur cet etage), on
    // regenere une liste d'ennemis fraiche et entierement vivante. C'est
    // ce qui donne le comportement "nettoye tant que le joueur reste,
    // respawn quand il revient" sans avoir besoin d'un systeme de timer -
    // voir le commentaire en tete de enemySpawner.js.
    const enemySpawns = generateEnemySpawns({
      grid,
      seed: seed + "-enemies",
      playerSpawn,
      enemyCount: biome.enemyBaseCount,
      allowedTiles,
    });

    // stats calculees cote serveur (jamais cote client, cf. commentaire
    // en tete de enemyStats.js), un type d'archetype tire PAR ennemi -
    // c'est le serveur qui decide le type, jamais le client, pour que
    // visuel (sprite) et mecanique (stats) ne puissent jamais diverger
    // entre les deux. Seed dediee, distincte de celle des positions de
    // spawn, pour ne pas coupler les deux tirages.
    const enemyTypeRng = createRng(seed + "-enemy-types");
    const enemyLootRng = createRng(lootSeed + "-enemy-loot");
    const enemyTypeCandidates = biome.enemyTypes || ["enemyDefault"];
    const enemies = enemySpawns.map((spawn) => {
      const typeKey =
        enemyTypeCandidates[
          Math.floor(enemyTypeRng() * enemyTypeCandidates.length)
        ];
      const stats = getEnemyStatsForDepth(depth, typeKey);
      return {
        x: spawn.x,
        y: spawn.y,
        type: typeKey,
        hp: stats.hp,
        maxHp: stats.hp,
        damage: stats.damage,
        defense: stats.defense,
        speed: stats.speed,
        xpReward: stats.xpReward,
        drop: rollLoot("enemyDrop", enemyLootRng),
      };
    });

    // coffres : meme principe que les ennemis (tires cote serveur,
    // contenu deja fixe a la generation) - exclut la salle de boss
    // scellee du placement, comme les ennemis
    const chests = generateChests({
      grid,
      seed,
      lootSeed,
      playerSpawn,
      chestCount: biome.chestCount,
      allowedTiles,
    });

    res.json({
      depth,
      biome: biome.id,
      tileset: biome.tileset,
      seed,
      grid,
      playerSpawn,
      exitTile,
      upstairsTile,
      questNpc,
      bossDoorTile,
      boss,
      enemies,
      chests,
    });
  } catch (error) {
    console.error("[ArpgController.getLevel]", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Renvoie TOUTES les parties en cours du joueur connecte (plusieurs
 * parties en pause peuvent coexister, meme pattern que Skip the Dungeon) -
 * permet un ecran "Reprendre / Nouvelle partie" avec liste.
 * GET /api/arpg/my-games
 * Protege par authMiddleware (routes/arpg.js) - req.user est garanti present.
 */
async function getMyGames(req, res) {
  try {
    const games = await ArpgGame.find({
      user: req.user._id,
      status: "en_cours",
    }).sort({ updatedAt: -1 });

    res.json({
      games: games.map((g) => ({
        gameId: g._id,
        depth: g.depth,
        seed: g.seed,
        floors: g.floors,
        playerState: g.playerState,
        updatedAt: g.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[ArpgController.getMyGames]", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Cree ou met a jour une partie du joueur connecte.
 *
 * - `gameId` fourni : met a jour CETTE partie precise (l'id d'une partie
 *   parmi potentiellement plusieurs en cours - sans lui, impossible de
 *   savoir laquelle des N parties en cours du joueur mettre a jour).
 *   Si l'id ne correspond a aucune partie 'en_cours' de ce joueur
 *   (mauvais id, deja abandonnee, appartient a un autre joueur), erreur
 *   explicite plutot que de creer une nouvelle partie par erreur.
 * - `gameId` absent : nouvelle partie, creee et son id renvoye - c'est
 *   au client de le retenir et de le repasser a chaque sauvegarde
 *   suivante de cette meme partie.
 *
 * `floors` (optionnel) : historique complet {depth, seed} de tous les
 * etages deja visites - envoye par le client a chaque sauvegarde,
 * simplement stocke tel quel (c'est le client qui construit/maintient
 * cet historique au fil de la partie, cf. MainScene.js).
 *
 * POST /api/arpg/save { gameId?, depth, seed, floors?, playerState }
 */
async function saveProgress(req, res) {
  try {
    const { gameId, depth, seed, floors, playerState } = req.body;

    if (typeof depth !== "number" || !seed) {
      return res.status(400).json({ error: "depth et seed requis" });
    }

    let save;

    if (gameId) {
      save = await ArpgGame.findOneAndUpdate(
        { _id: gameId, user: req.user._id, status: "en_cours" },
        {
          $set: {
            depth,
            seed,
            floors: floors || [],
            playerState: playerState || {},
          },
        },
        { new: true },
      );
      if (!save) {
        return res
          .status(404)
          .json({ error: "Partie introuvable ou deja terminee" });
      }
    } else {
      save = await ArpgGame.create({
        user: req.user._id,
        depth,
        seed,
        floors: floors || [],
        playerState: playerState || {},
        status: "en_cours",
      });
    }

    res.json({
      ok: true,
      gameId: save._id,
      save: {
        depth: save.depth,
        seed: save.seed,
        floors: save.floors,
        playerState: save.playerState,
      },
    });
  } catch (error) {
    console.error("[ArpgController.saveProgress]", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Abandonne une partie (retrait de la liste "parties en cours" sans la
 * supprimer completement - meme pattern que Skip the Dungeon).
 * POST /api/arpg/abandon { gameId }
 */
async function abandonGame(req, res) {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: "gameId requis" });
    }

    const result = await ArpgGame.findOneAndUpdate(
      { _id: gameId, user: req.user._id, status: "en_cours" },
      { $set: { status: "abandonne" } },
      { new: true },
    );

    if (!result) {
      return res
        .status(404)
        .json({ error: "Partie introuvable ou deja terminee" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("[ArpgController.abandonGame]", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { ping, getLevel, getMyGames, saveProgress, abandonGame };
