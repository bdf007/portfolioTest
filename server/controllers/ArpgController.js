const { getBiomeForDepth } = require("../services/generation/biomeConfig");
const { generateCave } = require("../services/generation/caveGenerator");
const { generateRooms } = require("../services/generation/roomGenerator");
const {
  generateCaveChain,
} = require("../services/generation/caveChainGenerator");
const { generateBSP } = require("../services/generation/bspGenerator");
const {
  generateTown,
  findBuildingFrontTile,
} = require("../services/generation/townGenerator");
const {
  generateDrunkardWalk,
} = require("../services/generation/drunkardWalkGenerator");
const { generateMaze } = require("../services/generation/mazeGenerator");
const { generateNoiseCave } = require("../services/generation/noiseGenerator");
const { generateVoronoi } = require("../services/generation/voronoiGenerator");
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
  generateObtainItemQuest,
  generateDefeatBossQuest,
  getFixedQuest,
} = require("../services/generation/questTypes");
const {
  carveBossRoom,
  reachableFloorSet,
} = require("../services/generation/bossRoom");
const { generateChests } = require("../services/generation/chestGenerator");
const { generateShopStock } = require("../services/generation/shopGenerator");
const {
  rollLoot,
  rollMultipleLoot,
  getQuestItemIds,
} = require("../services/generation/itemTypes");
const { createRng } = require("../services/generation/rng");
const ArpgGame = require("../models/ArpgModel");
const {
  isBossDepth,
  getBossConfigForDepth,
  getBossDepthsInCurrentDecade,
} = require("../services/generation/bossConfig");

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
    let townBuildings = []; // rempli uniquement pour le biome 'town' - sert a placer l'entree de la boutique (cf. findBuildingFrontTile)

    // base commune a tous les generateurs, ecrasee par generatorParams
    // du biome si defini (cf. le commentaire en tete de biomeConfig.js)
    // - c'est ICI, pas dans les generateurs eux-memes ni figes en dur
    // dans ce switch, que se regle le "ressenti" propre a un biome
    // (taille de salle, largeur de couloir, dimensions de la grille...)
    const genParams = {
      width: 40,
      height: 40,
      seed,
      ...(biome.generatorParams || {}),
    };

    switch (biome.generator) {
      case "cellular":
        grid = generateCave(genParams);
        break;
      case "randomwalk":
        grid = generateRooms(genParams);
        break;
      case "cavechain":
        grid = generateCaveChain(genParams);
        break;
      case "bsp":
        grid = generateBSP(genParams);
        break;
      case "town":
        // pas d'ennemis dans ce biome (biome.enemyBaseCount=0 dans
        // biomeConfig.js) - generateTown n'a rien de particulier a savoir
        // sur les ennemis, geree entierement en amont
        {
          const townResult = generateTown(genParams);
          grid = townResult.grid;
          townBuildings = townResult.buildings;
        }
        break;
      case "drunkardwalk":
        grid = generateDrunkardWalk(genParams);
        break;
      case "maze":
        grid = generateMaze(genParams);
        break;
      case "noise":
        // seul generateur qui peut echouer (retourne null si le ratio de
        // sol minimal n'est pas atteint apres ses propres tentatives
        // internes) - repli sur l'automate cellulaire (fiable, jamais
        // echoue) avec les MEMES parametres (width/height coherents -
        // les options propres a noise, absentes de generateCave, sont
        // simplement ignorees sans erreur)
        grid = generateNoiseCave(genParams);
        if (!grid) {
          console.warn(
            `[ArpgController] noise a echoue pour la seed "${seed}", repli sur cellular`,
          );
          grid = generateCave(genParams);
        }
        break;
      case "voronoi":
        grid = generateVoronoi(genParams);
        break;
      default:
        throw new Error(`Générateur inconnu pour le biome ${biome.id}`);
    }

    const playerSpawn = findSpawnTile(grid, seed);

    // salle de boss : remplace le calcul normal de la sortie (qui se
    // retrouve A L'INTERIEUR de la salle scellee, cf. carveBossRoom) et
    // restreint les ennemis normaux aux zones reellement atteignables
    // (porte fermee) - sans ca, un ennemi normal pourrait atterrir dans
    // la salle scellee et rendre impossible de nettoyer l'etage.
    const hasBoss = isBossDepth(depth);
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

      const bossConfig = getBossConfigForDepth(depth);
      const bossLootRng = createRng(lootSeed + "-boss-loot");
      boss = {
        x: carved.bossSpawn.x,
        y: carved.bossSpawn.y,
        type: bossConfig.type,
        hp: bossConfig.stats.hp,
        maxHp: bossConfig.stats.hp,
        damage: bossConfig.stats.damage,
        defense: bossConfig.stats.defense,
        speed: bossConfig.stats.speed,
        xpReward: bossConfig.stats.xpReward,
        attackType: bossConfig.stats.attackType || "melee", // pas encore defini dans BOSS_ASSIGNMENTS (cf. bossConfig.js) - repli explicite, prêt si un futur boss veut attaquer a distance
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
            exitTile,
          )
        : null;

    // PNJ de quete : pour l'instant, uniquement dans les villes -
    // plusieurs par ville desormais (1 a 3, comme les coffres), places de
    // facon dispersee (meme algorithme que les coffres, pas la recherche
    // "proche du spawn" a un seul point d'avant, qui ne passait pas a
    // l'echelle pour plusieurs PNJ). D'autres conditions d'apparition
    // (aleatoire sur un etage normal, sous condition) sont prevues plus
    // tard mais pas construites ici.
    let questNpcs = [];
    if (biome.id === "town") {
      const npcCountRng = createRng(seed + "-quest-npc-count");
      const npcCount = 1 + Math.floor(npcCountRng() * 3); // 1 a 3

      let npcPositions = generateEnemySpawns({
        grid,
        seed: seed + "-quest-npc-positions",
        playerSpawn,
        enemyCount: npcCount,
        minDistanceFromPlayer: 3,
        minDistanceBetweenEnemies: 4,
      });
      // evite toute coincidence avec la case de remontee - rare, mais
      // plus simple a filtrer apres coup qu'a exclure a priori (le
      // pire cas est un PNJ de moins que demande, jamais un crash)
      if (upstairsTile) {
        npcPositions = npcPositions.filter(
          (p) => !(p.x === upstairsTile.x && p.y === upstairsTile.y),
        );
      }

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

      // quete "recuperer tel objet sur le boss" : toujours eligible pour
      // une ville (elle n'apparait jamais avant l'etage 10, donc les 2
      // boss de sa dizaine - cf. getBossDepthsInCurrentDecade - ont deja
      // forcement ete affrontes). ~25% de chance par PNJ eligible, sinon
      // quete habituelle. Bassin = objets de categorie 'questItem'
      // UNIQUEMENT (jamais de l'equipement reel ni un consommable) -
      // garantit qu'une telle quete ne cible jamais un objet equipable
      // ("le marteau du grand-pere", pas une vraie arme). Ces objets ne
      // tombent JAMAIS du boss sans quete active (garanti a coup sur
      // quand une quete active les cible, cf. MainScene.damageEnemy
      // cote client) - absents de LOOT_TABLES.bossDrop (cf. itemTypes.js),
      // qui ne gere que le butin a tirage aleatoire classique.
      //
      // le boss REFERENCE dans le texte de la quete se limite a la
      // DIZAINE EN COURS (cf. getBossDepthsInCurrentDecade) - jamais les
      // dizaines precedentes, meme deja affrontees : a l'etage 20, seuls
      // 15 et 19 sont eligibles, plus jamais 5 ni 9. Tirage au hasard
      // entre les deux, seede PAR PNJ (peut donc varier d'un PNJ a
      // l'autre dans la meme ville).
      const bossDepthsThisDecade = getBossDepthsInCurrentDecade(depth);
      const bossItemPool = getQuestItemIds();

      questNpcs = npcPositions.map((pos, npcIndex) => {
        // une quete ecrite a la main pour CE PNJ precis prend le pas sur
        // le tirage aleatoire, si elle existe (cf. FIXED_QUESTS dans
        // questTypes.js) - sinon, comportement habituel. Seed DISTINCTE
        // par PNJ (inclut son index), pour que plusieurs PNJ du meme
        // etage n'aient jamais la meme quete par coincidence.
        const fixedQuest = getFixedQuest(depth, npcIndex);
        let quest;
        if (fixedQuest) {
          quest = fixedQuest;
        } else {
          const npcSeed = `${seed}-npc-${npcIndex}`;
          // tirage a 3 branches en UN SEUL jet (jamais deux verifications
          // independantes empilees, qui fausseraient les probabilites
          // reelles) : 25% obtainItem, 25% defeatBoss, 50% killEnemies
          const questTypeRng = createRng(`${npcSeed}-quest-type-choice`);
          const roll = questTypeRng();

          if (roll < 0.5) {
            // obtainItem (roll < 0.25) OU defeatBoss (0.25 <= roll < 0.5) -
            // partagent le meme choix de boss cible (cf.
            // getBossDepthsInCurrentDecade plus haut)
            const bossPickRng = createRng(`${npcSeed}-boss-pick`);
            const relevantBossDepth =
              bossDepthsThisDecade[
                Math.floor(bossPickRng() * bossDepthsThisDecade.length)
              ];
            const relevantBossType =
              getBossConfigForDepth(relevantBossDepth).type;
            quest =
              roll < 0.25
                ? generateObtainItemQuest(
                    npcSeed,
                    bossItemPool,
                    relevantBossDepth,
                    relevantBossType,
                  )
                : generateDefeatBossQuest(
                    npcSeed,
                    relevantBossDepth,
                    relevantBossType,
                  );
          } else {
            quest = generateQuestForNpc(npcSeed, enemyTypePool);
          }
        }
        return { x: pos.x, y: pos.y, npcIndex, ...quest };
      });
    }

    // hub de voyage rapide - uniquement dans les villes. Ne transporte
    // aucune donnee de destinations : le CLIENT connait deja tous les
    // etages visites (this.visitedFloors), le serveur n'a qu'a placer le
    // point d'interaction, en evitant la remontee et les PNJ de quete.
    let travelHubTile = null;
    if (biome.id === "town") {
      const excludeTiles = [];
      if (upstairsTile) excludeTiles.push(upstairsTile);
      for (const npc of questNpcs) excludeTiles.push({ x: npc.x, y: npc.y });
      travelHubTile = findNearbyFloorTile(grid, playerSpawn, excludeTiles);
    }

    // boutique - uniquement dans les villes, stock genere de facon
    // seedee (cf. shopGenerator.js) - evite tous les autres landmarks
    // deja places (remontee, PNJ de quete, hub). Placee devant un
    // batiment choisi au hasard (seede) quand c'est possible - plus
    // coherent visuellement qu'une case de sol quelconque. Repli sur
    // l'ancienne recherche generique si aucun batiment ne convient
    // (aucun batiment genere, ou tous leurs devants exclus/deja pris).
    let shop = null;
    if (biome.id === "town") {
      const excludeTiles = [];
      if (upstairsTile) excludeTiles.push(upstairsTile);
      if (travelHubTile) excludeTiles.push(travelHubTile);
      for (const npc of questNpcs) excludeTiles.push({ x: npc.x, y: npc.y });

      let shopTile = null;
      if (townBuildings.length > 0) {
        const shopBuildingRng = createRng(`${seed}-shop-building`);
        const shuffledBuildings = [...townBuildings];
        for (let i = shuffledBuildings.length - 1; i > 0; i--) {
          const j = Math.floor(shopBuildingRng() * (i + 1));
          [shuffledBuildings[i], shuffledBuildings[j]] = [
            shuffledBuildings[j],
            shuffledBuildings[i],
          ];
        }
        for (const building of shuffledBuildings) {
          const front = findBuildingFrontTile(grid, building, shopBuildingRng);
          if (
            front &&
            !excludeTiles.some((t) => t.x === front.x && t.y === front.y)
          ) {
            shopTile = front;
            break;
          }
        }
      }
      if (!shopTile) {
        shopTile = findNearbyFloorTile(grid, playerSpawn, excludeTiles);
      }

      if (shopTile) {
        shop = { x: shopTile.x, y: shopTile.y, stock: generateShopStock(seed) };
      }
    }

    // PNJ ambiants - juste du decor/dialogue, jamais de quete ni de
    // vente. Uniquement dans les villes, disperses comme les PNJ de
    // quete (meme fonction de dispersion, purement pour la repartition
    // spatiale - aucun rapport avec du combat). 2 a 4 par ville. Le
    // texte de salutation et le sprite sont choisis cote CLIENT (purement
    // cosmetique, cf. MainScene.createAmbientNpcs) - le serveur ne fait
    // que placer les positions.
    let ambientNpcs = [];
    if (biome.id === "town") {
      const ambientCountRng = createRng(`${seed}-ambient-npc-count`);
      const ambientCount = 2 + Math.floor(ambientCountRng() * 3); // 2 a 4

      const excludeTiles = [];
      if (upstairsTile) excludeTiles.push(upstairsTile);
      if (travelHubTile) excludeTiles.push(travelHubTile);
      if (shop) excludeTiles.push({ x: shop.x, y: shop.y });
      for (const npc of questNpcs) excludeTiles.push({ x: npc.x, y: npc.y });

      const positions = generateEnemySpawns({
        grid,
        seed: `${seed}-ambient-npc-positions`,
        playerSpawn,
        enemyCount: ambientCount,
        minDistanceFromPlayer: 3,
        minDistanceBetweenEnemies: 4,
      }).filter((p) => !excludeTiles.some((t) => t.x === p.x && t.y === p.y));

      ambientNpcs = positions.map((pos, npcIndex) => ({
        x: pos.x,
        y: pos.y,
        npcIndex,
      }));
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
        attackType: stats.attackType,
        // PLURIEL desormais (drops, pas drop) - plusieurs tirages
        // independants (2) au lieu d'un seul, pour permettre un coffre
        // de butin avec plusieurs objets a la fois (cf. MainScene.js,
        // qui fait apparaitre un coffre a ouvrir plutot qu'un ramassage
        // instantane). Tableau vide si aucun tirage n'a rien donne -
        // jamais null. Les BOSS gardent leur mecanique inchangee
        // (rollLoot singulier, cf. plus haut) - la garantie d'objet de
        // quete y est plus delicate a toucher sans risque, hors du
        // perimetre de cette demande.
        drops: rollMultipleLoot("enemyDrop", enemyLootRng, 2),
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
      questNpcs,
      travelHubTile,
      shop,
      ambientNpcs,
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
      username: req.user.username,
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

// supprimer une partie
async function deleteGame(req, res) {
  try {
    const { gameId } = req.body;
    if (!gameId) {
      return res.status(400).json({ error: "gameId requis" });
    }

    const result = await ArpgGame.findOneAndDelete({
      _id: gameId,
      user: req.user._id,
    });

    if (!result) {
      return res.status(404).json({ error: "Partie introuvable" });
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("[ArpgController.deleteGame]", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  ping,
  getLevel,
  getMyGames,
  saveProgress,
  abandonGame,
  deleteGame,
};
