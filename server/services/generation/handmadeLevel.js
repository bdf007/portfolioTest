/**
 * Niveaux "faits main" : un etage dont le plan (et, au choix, les ennemis,
 * coffres, gisements, PNJ, decors...) est ecrit dans un fichier JSON au lieu
 * d'etre genere. Tout le reste du jeu (client, sauvegarde, brouillard de
 * guerre, descente d'etage...) ne voit AUCUNE difference : getLevel
 * (arpgController.js) renvoie exactement la meme forme de reponse.
 *
 * Fichiers : <ce dossier>/handmadeLevels/depth-<N>.json  (N = numero d'etage,
 * ex. depth-0.json, depth-1.json). Pas de fichier pour un etage = generation
 * procedurale habituelle, rien ne change. Un fichier "depth-1.example.json"
 * (ou tout autre nom) n'est JAMAIS lu : seul le nom exact depth-<N>.json compte.
 *
 * Pour passer a Mongo plus tard : seule loadHandmadeLevel() change (elle est
 * deja async), normalizeHandmadeLevel() et les hydrate* restent identiques.
 *
 * FORMAT (tout est optionnel sauf grid, playerSpawn, exitTile) :
 * {
 *   "tileset": "muddyCave_0_0",          // sinon tirage du biome de l'etage
 *   "grid": [ "####", "#..#", "####" ],   // # = mur, . = sol (ou tableaux de 0/1)
 *   "playerSpawn": { "x": 1, "y": 1 },
 *   "exitTile": { "x": 2, "y": 1 },
 *   "upstairsTile": { "x": 1, "y": 1 },
 *   "enemies": [ { "x": 5, "y": 5, "type": "greenSlime" } ],
 *   "chests": [ { "x": 3, "y": 3, "propType": "chest", "lootTable": "chestStandard" } ],
 *                // ou "loot": { "itemId": "healthPotion", "quantity": 1 } / "loot": null (vide)
 *   "miningRocks": [ { "x": 6, "y": 2, "resource": "copperOre", "totalHits": 3 } ],
 *   "decorations": [ { "x": 4, "y": 4, "decorType": "rock_small" } ],
 *   "questNpcs": [ { "x": 8, "y": 8, "npcIndex": 0 } ],
 *   "ambientNpcs": [ { "x": 9, "y": 9 } ],
 *   "travelHubTile": { "x": 7, "y": 7 },
 *   "shop": { "x": 6, "y": 6 },
 *   "townBuildings": [ { "x": 2, "y": 2, "houseKey": "..." } ],
 *   "generate": { "enemies": true, "decorations": true }
 * }
 * `generate` : pour chaque categorie (enemies, chests, crates, traps,
 * miningRocks, forageNodes, decorations), true = en plus de ce qui est ecrit
 * a la main, le serveur genere comme d'habitude (sur CE plan, en evitant les
 * cases deja occupees). Absent/false = uniquement ce qui est ecrit.
 *
 * Phase 1 : pas de boss, pas de salle secrete sur un niveau fait main ; les
 * pieges et les points de ressource (forageNodes) ne peuvent qu'etre generes
 * (generate), pas places a la main.
 */
const fs = require("fs/promises");
const path = require("path");

const LEVELS_DIR = path.join(__dirname, "handmadeLevels");

const GENERATE_KEYS = [
  "enemies",
  "chests",
  "crates",
  "traps",
  "miningRocks",
  "forageNodes",
  "decorations",
];

const KNOWN_KEYS = new Set([
  "depth",
  "tileset",
  "grid",
  "playerSpawn",
  "exitTile",
  "upstairsTile",
  "enemies",
  "chests",
  "miningRocks",
  "decorations",
  "questNpcs",
  "ambientNpcs",
  "travelHubTile",
  "shop",
  "townBuildings",
  "paintedFloor",
  "generate",
]);

async function loadHandmadeLevel(depth) {
  if (!Number.isInteger(depth)) return null;
  const file = path.join(LEVELS_DIR, `depth-${depth}.json`);
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
  let def;
  try {
    def = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `[handmadeLevel] JSON invalide dans ${file} : ${err.message}`,
    );
  }
  return normalizeHandmadeLevel(def, `depth-${depth}.json`);
}

function fail(file, message) {
  throw new Error(`[handmadeLevel] ${file} : ${message}`);
}

function normalizeGrid(file, rawGrid) {
  if (!Array.isArray(rawGrid) || rawGrid.length === 0) {
    fail(file, '"grid" manquante ou vide');
  }
  const grid = rawGrid.map((row, y) => {
    let cells;
    if (typeof row === "string") {
      cells = [...row].map((ch, x) => {
        if (ch === "#") return 1;
        if (ch === ".") return 0;
        return fail(
          file,
          `grid[${y}] colonne ${x} : caractere "${ch}" inconnu (# = mur, . = sol)`,
        );
      });
    } else if (Array.isArray(row)) {
      cells = row.map((v, x) => {
        if (v !== 0 && v !== 1) {
          fail(
            file,
            `grid[${y}][${x}] vaut ${v} : seuls 0 (sol) et 1 (mur) sont permis`,
          );
        }
        return v;
      });
    } else {
      fail(file, `grid[${y}] n'est ni une chaine ni un tableau`);
    }
    return cells;
  });
  const width = grid[0].length;
  if (width === 0) fail(file, "grid : premiere ligne vide");
  grid.forEach((row, y) => {
    if (row.length !== width) {
      fail(
        file,
        `grid[${y}] fait ${row.length} cases de large, attendu ${width} (toutes les lignes doivent avoir la meme largeur)`,
      );
    }
  });
  return grid;
}

function normalizeHandmadeLevel(def, file) {
  if (!def || typeof def !== "object")
    fail(file, "le fichier doit contenir un objet");

  for (const key of Object.keys(def)) {
    if (!key.startsWith("_") && !KNOWN_KEYS.has(key)) {
      console.warn(
        `[handmadeLevel] ${file} : champ inconnu ignore "${key}" (faute de frappe ?)`,
      );
    }
  }

  const grid = normalizeGrid(file, def.grid);
  const height = grid.length;
  const width = grid[0].length;

  const inBounds = (t) =>
    t &&
    Number.isInteger(t.x) &&
    Number.isInteger(t.y) &&
    t.x >= 0 &&
    t.y >= 0 &&
    t.x < width &&
    t.y < height;

  const floorTile = (label, t) => {
    if (!inBounds(t))
      fail(
        file,
        `${label} : position invalide ou hors grille (${JSON.stringify(t)})`,
      );
    if (grid[t.y][t.x] !== 0)
      fail(file, `${label} : la case (${t.x},${t.y}) est un mur`);
    return { x: t.x, y: t.y };
  };

  const list = (key) => {
    const value = def[key];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) fail(file, `"${key}" doit etre un tableau`);
    return value;
  };

  if (!def.playerSpawn) fail(file, '"playerSpawn" manquant');
  if (!def.exitTile) fail(file, '"exitTile" manquant');

  const playerSpawn = floorTile("playerSpawn", def.playerSpawn);
  const exitTile = floorTile("exitTile", def.exitTile);
  const upstairsTile = def.upstairsTile
    ? floorTile("upstairsTile", def.upstairsTile)
    : null;
  const travelHubTile = def.travelHubTile
    ? floorTile("travelHubTile", def.travelHubTile)
    : null;
  const shop = def.shop ? floorTile("shop", def.shop) : null;

  const enemies = list("enemies").map((e, i) => {
    const t = floorTile(`enemies[${i}]`, e);
    if (typeof e.type !== "string" || !e.type)
      fail(file, `enemies[${i}] : "type" manquant`);
    return { ...t, type: e.type };
  });

  const chests = list("chests").map((c, i) => {
    const t = floorTile(`chests[${i}]`, c);
    const propType = c.propType || "chest";
    if (propType !== "chest" && propType !== "crate") {
      fail(
        file,
        `chests[${i}] : propType "${propType}" inconnu (chest ou crate)`,
      );
    }
    const out = { ...t, propType };
    if (Object.prototype.hasOwnProperty.call(c, "loot")) {
      out.hasExplicitLoot = true;
      out.loot = c.loot
        ? { itemId: c.loot.itemId, quantity: c.loot.quantity || 1 }
        : null;
    }
    if (c.lootTable) out.lootTable = c.lootTable;
    return out;
  });

  const miningRocks = list("miningRocks").map((r, i) => {
    const t = floorTile(`miningRocks[${i}]`, r);
    return {
      ...t,
      resource: r.resource || null,
      totalHits: r.totalHits ?? null,
      requiredTier: r.requiredTier ?? null,
      gemChance: r.gemChance ?? null,
    };
  });

  const decorations = list("decorations").map((d, i) => {
    const t = floorTile(`decorations[${i}]`, d);
    return { ...t, decorType: d.decorType || "rock_small" };
  });

  const questNpcs = list("questNpcs").map((n, i) => {
    const t = floorTile(`questNpcs[${i}]`, n);
    return { ...t, npcIndex: Number.isInteger(n.npcIndex) ? n.npcIndex : i };
  });

  const ambientNpcs = list("ambientNpcs").map((n, i) =>
    floorTile(`ambientNpcs[${i}]`, n),
  );

  const townBuildings = list("townBuildings").map((b, i) => {
    if (!inBounds(b) || typeof b.houseKey !== "string") {
      fail(
        file,
        `townBuildings[${i}] : x, y (dans la grille) et houseKey sont requis`,
      );
    }
    return { ...b };
  });

  // sol peint : { "<cle de feuille>": [[x, y, frame], ...] } - tuiles
  // visuelles posees par-dessus le sol autotile (cf. paintedFloor.js cote
  // client). Une tuile par case ET PAR COUCHE (5e element optionnel :
  // couche 0 = sol, 1 = par-dessus, ex. un pont sur une riviere peinte ; la
  // tuile de la couche la plus haute decide de la traversabilite de la case).
  // 4e element optionnel = drapeaux :
  //   1 = NON traversable : la case devient un mur dans la grille renvoyee
  //       (collisions, brouillard, minicarte, placement des ennemis... tout
  //       suit), la tuile peinte etant dessinee par-dessus le mur ;
  //   2 = AU-DESSUS du joueur : dessinee devant lui (on passe "derriere" :
  //       cime d'arbre, toit, arche...). Combinables (3).
  const paintedFloor = {};
  const seenPainted = new Set();
  const topTileByCell = new Map(); // "x,y" -> { layer, solid } (couche la plus haute)
  if (def.paintedFloor !== undefined && def.paintedFloor !== null) {
    const raw = def.paintedFloor;
    if (typeof raw !== "object" || Array.isArray(raw)) {
      fail(
        file,
        '"paintedFloor" doit etre un objet { feuille: [[x, y, frame], ...] }',
      );
    }
    for (const [sheet, cells] of Object.entries(raw)) {
      if (!/^[A-Za-z0-9_.-]+$/.test(sheet)) {
        fail(file, `paintedFloor : nom de feuille invalide "${sheet}"`);
      }
      if (!Array.isArray(cells))
        fail(file, `paintedFloor.${sheet} : tableau attendu`);
      paintedFloor[sheet] = cells.map((c, i) => {
        const ok =
          Array.isArray(c) &&
          c.length >= 3 &&
          c.length <= 5 &&
          c.every(Number.isInteger) &&
          inBounds({ x: c[0], y: c[1] }) &&
          c[2] >= 0 &&
          (c.length < 4 || (c[3] >= 0 && c[3] <= 3)) &&
          (c.length < 5 || (c[4] >= 0 && c[4] <= 1));
        if (!ok) {
          fail(
            file,
            `paintedFloor.${sheet}[${i}] : attendu [x, y, frame] ou [x, y, frame, drapeaux 0-3] ou [x, y, frame, drapeaux, couche 0-1] entiers, dans la grille (recu ${JSON.stringify(c)})`,
          );
        }
        const flags = c.length >= 4 ? c[3] : 0;
        const layer = c.length === 5 ? c[4] : 0;
        const cellId = `${c[0]},${c[1]}`;
        const id = `${cellId},${layer}`;
        if (seenPainted.has(id)) {
          fail(
            file,
            `paintedFloor : la case (${c[0]},${c[1]}) est peinte deux fois sur la couche ${layer}`,
          );
        }
        seenPainted.add(id);
        const top = topTileByCell.get(cellId);
        if (!top || layer >= top.layer) {
          topTileByCell.set(cellId, {
            layer,
            solid: (flags & 1) === 1,
            x: c[0],
            y: c[1],
          });
        }
        if (layer !== 0) return [c[0], c[1], c[2], flags, layer];
        return flags !== 0 ? [c[0], c[1], c[2], flags] : [c[0], c[1], c[2]];
      });
    }
  }

  const generate = {};
  const rawGenerate = def.generate || {};
  for (const key of Object.keys(rawGenerate)) {
    if (!GENERATE_KEYS.includes(key)) {
      console.warn(
        `[handmadeLevel] ${file} : generate.${key} inconnu ignore (permis : ${GENERATE_KEYS.join(", ")})`,
      );
    }
  }
  for (const key of GENERATE_KEYS) generate[key] = rawGenerate[key] === true;

  const occupiedTiles = [
    playerSpawn,
    exitTile,
    upstairsTile,
    travelHubTile,
    shop,
    ...enemies,
    ...chests,
    ...miningRocks,
    ...decorations,
    ...questNpcs,
    ...ambientNpcs,
  ].filter(Boolean);

  // tuiles peintes non traversables -> murs (apres les verifications
  // ci-dessus : rien de pose a la main ne doit se retrouver dedans)
  const solidCells = [...topTileByCell.values()].filter((t) => t.solid);
  for (const t of solidCells) {
    const clash = occupiedTiles.find((o) => o.x === t.x && o.y === t.y);
    if (clash) {
      fail(
        file,
        `paintedFloor : la tuile non traversable (${t.x},${t.y}) recouvre un element place a la main (depart, sortie, ennemi, coffre...)`,
      );
    }
    grid[t.y][t.x] = 1;
  }

  return {
    tileset:
      typeof def.tileset === "string" && def.tileset ? def.tileset : null,
    grid,
    playerSpawn,
    exitTile,
    upstairsTile,
    travelHubTile,
    shop,
    enemies,
    chests,
    miningRocks,
    decorations,
    questNpcs,
    ambientNpcs,
    townBuildings,
    paintedFloor: Object.keys(paintedFloor).length > 0 ? paintedFloor : null,
    generate,
    occupiedTiles,
  };
}

/**
 * Coffres/caisses ecrits a la main : meme forme de sortie que
 * generateChests (chestGenerator.js) + propType. Contenu : "loot" explicite
 * si fourni, sinon tire dans "lootTable" (ou, a defaut, la table du biome de
 * l'etage), avec la lootSeed - donc il varie a chaque nouvelle visite comme
 * pour les coffres generes. `rollLoot` et `createRng` sont fournis par
 * arpgController.js (aucun import ici, pour ne pas dupliquer de chemins).
 */
function hydrateChests(
  chests,
  { biome, lootSeed, obtainedUniqueItems, rollLoot, createRng },
) {
  const lootRng = createRng(`${lootSeed}-handmade-chest-loot`);
  return chests.map((c) => {
    let loot;
    if (c.hasExplicitLoot) {
      loot = c.loot;
    } else {
      const table =
        c.lootTable ||
        (c.propType === "crate"
          ? (biome.crateConfig && biome.crateConfig.lootTable) ||
            "crateStandard"
          : biome.chestLootTable || "chestStandard");
      loot = rollLoot(table, lootRng, Infinity, obtainedUniqueItems);
    }
    return { x: c.x, y: c.y, opened: false, loot, propType: c.propType };
  });
}

/**
 * Gisements ecrits a la main : meme forme de sortie que
 * generateMiningRocks. Tout champ non precise est complete avec la
 * miningConfig du biome de l'etage (ressource tiree dans resourcePool,
 * nombre de coups dans totalHits, gemChance/gemPool).
 */
function hydrateMiningRocks(rocks, { biome, lootSeed, createRng, depth }) {
  const cfg = biome.miningConfig || {};
  const pool = cfg.resourcePool || [];
  const rng = createRng(`${lootSeed}-handmade-rocks`);

  const pickFromPool = () => {
    const total = pool.reduce((s, p) => s + (p.weight ?? 1), 0);
    let r = rng() * total;
    for (const p of pool) {
      r -= p.weight ?? 1;
      if (r < 0) return p;
    }
    return pool[pool.length - 1];
  };

  return rocks.map((rock, i) => {
    let poolEntry = rock.resource
      ? pool.find((p) => p.itemId === rock.resource)
      : pickFromPool();
    const resourceItemId = rock.resource || (poolEntry && poolEntry.itemId);
    if (!resourceItemId) {
      throw new Error(
        `[handmadeLevel] etage ${depth} miningRocks[${i}] : aucune "resource" indiquee et le biome n'a pas de miningConfig.resourcePool`,
      );
    }
    const [minHits, maxHits] = cfg.totalHits || [1, 3];
    const totalHits =
      rock.totalHits ?? minHits + Math.floor(rng() * (maxHits - minHits + 1));
    return {
      x: rock.x,
      y: rock.y,
      requiredTier:
        rock.requiredTier ?? (poolEntry && poolEntry.requiredTier) ?? 1,
      resourceItemId,
      totalHits,
      gemChance: rock.gemChance ?? cfg.gemChance ?? 0,
      gemPool: cfg.gemPool || [],
    };
  });
}

// ---- gestion des fichiers (utilisee par l'editeur de niveaux) ----

const MAX_DEPTH = 9999;

function assertDepth(depth) {
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_DEPTH) {
    throw new Error(`[handmadeLevel] etage invalide : ${depth}`);
  }
}

/** Etages qui ont un fichier depth-<N>.json (tries). */
async function listHandmadeDepths() {
  let names;
  try {
    names = await fs.readdir(LEVELS_DIR);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
  return names
    .map((n) => /^depth-(\d+)\.json$/.exec(n))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

/** Contenu brut (JSON non normalise) du fichier d'un etage, ou null. */
async function readHandmadeRaw(depth) {
  assertDepth(depth);
  try {
    const raw = await fs.readFile(
      path.join(LEVELS_DIR, `depth-${depth}.json`),
      "utf8",
    );
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Valide (MEME validation que le jeu : un niveau enregistre ici est
 * forcement chargeable par getLevel) puis ecrit depth-<N>.json. Ecriture
 * atomique (fichier temporaire + rename) : un plantage en cours d'ecriture
 * ne laisse jamais un niveau a moitie ecrit. Renvoie les avertissements.
 */
async function saveHandmadeLevel(depth, def) {
  assertDepth(depth);
  if (!def || typeof def !== "object" || Array.isArray(def)) {
    fail(`depth-${depth}.json`, 'corps de requete : objet "level" attendu');
  }
  normalizeHandmadeLevel(def, `depth-${depth}.json`); // leve si invalide
  await fs.mkdir(LEVELS_DIR, { recursive: true });
  const file = path.join(LEVELS_DIR, `depth-${depth}.json`);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(def, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

async function deleteHandmadeLevel(depth) {
  assertDepth(depth);
  try {
    await fs.unlink(path.join(LEVELS_DIR, `depth-${depth}.json`));
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

module.exports = {
  listHandmadeDepths,
  readHandmadeRaw,
  saveHandmadeLevel,
  deleteHandmadeLevel,
  loadHandmadeLevel,
  normalizeHandmadeLevel,
  hydrateChests,
  hydrateMiningRocks,
};
