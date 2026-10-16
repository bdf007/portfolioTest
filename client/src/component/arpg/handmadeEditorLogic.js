/**
 * Logique PURE de l'editeur de niveaux (aucune dependance a React/Phaser) :
 * representation du niveau en memoire, outils de dessin, conversion
 * vers/depuis le fichier JSON du serveur (cf. handmadeLevel.js), et
 * verifications. Separee de l'ecran pour pouvoir etre testee seule.
 */

export const GENERATE_KEYS = [
  "enemies",
  "chests",
  "crates",
  "traps",
  "miningRocks",
  "forageNodes",
  "decorations",
];

export const GENERATE_LABELS = {
  enemies: "Ennemis",
  chests: "Coffres",
  crates: "Caisses",
  traps: "Pièges",
  miningRocks: "Gisements",
  forageNodes: "Plantes",
  decorations: "Décors",
};

// Cles du fichier que l'editeur sait afficher/modifier. Tout le reste est
// conserve tel quel dans `extra` (rien n'est perdu a l'enregistrement).
const POINT_KEYS = [
  "playerSpawn",
  "exitTile",
  "upstairsTile",
  "travelHubTile",
  "shop",
];
const LIST_KEYS = [
  "enemies",
  "chests",
  "questNpcs",
  "ambientNpcs",
  "miningRocks",
  "decorations",
  "townBuildings",
];
const HANDLED = new Set([
  "grid",
  "tileset",
  "generate",
  "paintedFloor",
  ...POINT_KEYS,
  ...LIST_KEYS,
]);

export function createEmptyLevel(width, height, tileset) {
  const grid = [];
  for (let y = 0; y < height; y++) grid.push(new Array(width).fill(1));
  return {
    tileset: tileset || null,
    grid,
    playerSpawn: null,
    exitTile: null,
    upstairsTile: null,
    travelHubTile: null,
    shop: null,
    enemies: [],
    chests: [],
    questNpcs: [],
    ambientNpcs: [],
    miningRocks: [],
    decorations: [],
    townBuildings: [],
    // sol peint : { "x,y": { sheet, frame } } (une tuile par case)
    paintedFloor: {},
    generate: Object.fromEntries(GENERATE_KEYS.map((k) => [k, false])),
    extra: {},
  };
}

export function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function gridFromDef(rawGrid) {
  return rawGrid.map((row) =>
    typeof row === "string"
      ? [...row].map((c) => (c === "#" ? 1 : 0))
      : row.map((v) => (v ? 1 : 0)),
  );
}

export function levelFromDef(def) {
  const level = createEmptyLevel(1, 1, def.tileset || null);
  level.grid = gridFromDef(def.grid);
  for (const k of POINT_KEYS)
    level[k] = def[k] ? { x: def[k].x, y: def[k].y } : null;
  for (const k of LIST_KEYS) {
    level[k] = Array.isArray(def[k]) ? def[k].map((e) => ({ ...e })) : [];
  }
  for (const k of GENERATE_KEYS) {
    level.generate[k] = !!(def.generate && def.generate[k] === true);
  }
  level.paintedFloor = {};
  if (def.paintedFloor && typeof def.paintedFloor === "object") {
    for (const [sheet, cells] of Object.entries(def.paintedFloor)) {
      for (const [x, y, frame, flags = 0, layer = 0] of cells) {
        const tile = { sheet, frame };
        if (flags & 1) tile.solid = true;
        if (flags & 2) tile.overhead = true;
        level.paintedFloor[tileKey(x, y, layer)] = tile;
      }
    }
  }
  for (const key of Object.keys(def)) {
    if (!HANDLED.has(key)) level.extra[key] = def[key];
  }
  return level;
}

export function levelToDef(level) {
  const def = { ...level.extra };
  if (level.tileset) def.tileset = level.tileset;
  def.grid = level.grid.map((row) => row.map((v) => (v ? "#" : ".")).join(""));
  for (const k of POINT_KEYS)
    if (level[k]) def[k] = { x: level[k].x, y: level[k].y };
  for (const k of LIST_KEYS)
    if (level[k].length > 0) def[k] = level[k].map((e) => ({ ...e }));
  def.generate = { ...level.generate };
  // sol peint regroupe par feuille : { sheet: [[x, y, frame], ...] } (compact)
  const bySheet = {};
  for (const [id, tile] of Object.entries(level.paintedFloor)) {
    const [x, y, layer = 0] = id.split(",").map(Number);
    const flags = (tile.solid ? 1 : 0) | (tile.overhead ? 2 : 0);
    (bySheet[tile.sheet] = bySheet[tile.sheet] || []).push(
      layer
        ? [x, y, tile.frame, flags, layer]
        : flags
          ? [x, y, tile.frame, flags]
          : [x, y, tile.frame],
    );
  }
  for (const cells of Object.values(bySheet)) {
    cells.sort(
      (a, b) => a[1] - b[1] || a[0] - b[0] || (a[4] || 0) - (b[4] || 0),
    );
  }
  if (Object.keys(bySheet).length > 0) def.paintedFloor = bySheet;
  return def;
}

export const gridWidth = (level) => level.grid[0].length;
export const gridHeight = (level) => level.grid.length;

export function inBounds(level, x, y) {
  return y >= 0 && y < gridHeight(level) && x >= 0 && x < gridWidth(level);
}

export function paintCell(level, x, y, value) {
  if (!inBounds(level, x, y)) return false;
  if (level.grid[y][x] === value) return false;
  level.grid[y][x] = value;
  if (value === 1) removeEntitiesAt(level, x, y); // plus rien sur un mur
  return true;
}

/** Remplit le rectangle (x0,y0)-(x1,y1) (bornes incluses, dans n'importe quel ordre). */
export function fillRect(level, x0, y0, x1, y1, value) {
  let changed = false;
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (paintCell(level, x, y, value)) changed = true;
    }
  }
  return changed;
}

/** Remplit toute la bordure de la grille de murs. */
export function surroundWithWalls(level) {
  const w = gridWidth(level);
  const h = gridHeight(level);
  for (let x = 0; x < w; x++) {
    paintCell(level, x, 0, 1);
    paintCell(level, x, h - 1, 1);
  }
  for (let y = 0; y < h; y++) {
    paintCell(level, 0, y, 1);
    paintCell(level, w - 1, y, 1);
  }
}

export function resizeLevel(level, width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(
        level.grid[y] && level.grid[y][x] !== undefined ? level.grid[y][x] : 1,
      );
    }
    grid.push(row);
  }
  level.grid = grid;
  const inside = (p) => p && p.x < width && p.y < height;
  for (const k of POINT_KEYS) if (!inside(level[k])) level[k] = null;
  for (const k of LIST_KEYS) level[k] = level[k].filter(inside);
  for (const id of Object.keys(level.paintedFloor)) {
    const [x, y] = id.split(",").map(Number);
    if (x >= width || y >= height) delete level.paintedFloor[id];
  }
}

// ---- sol peint ----

/**
 * Cle d'une tuile peinte : "x,y" pour la couche 0 (sol), "x,y,1" pour la
 * couche 1 (par-dessus, ex. un pont sur une riviere peinte).
 */
export function tileKey(x, y, layer = 0) {
  return layer ? `${x},${y},${layer}` : `${x},${y}`;
}

/** Tuile peinte la plus haute d'une case ({ id, tile }) ou null. */
export function topTileAt(level, x, y) {
  const upper = tileKey(x, y, 1);
  if (level.paintedFloor[upper])
    return { id: upper, tile: level.paintedFloor[upper] };
  const base = tileKey(x, y, 0);
  if (level.paintedFloor[base])
    return { id: base, tile: level.paintedFloor[base] };
  return null;
}

/**
 * Selection de tuiles dans une feuille : rectangle de `w` x `h` cases dont
 * le coin haut-gauche est (col, row) ; `cols` = nombre de colonnes de la
 * feuille (pour calculer l'indice de frame = ligne * cols + colonne).
 * { sheet, col, row, w, h, cols }
 */
export function selectionFrame(sel, dx, dy) {
  return (sel.row + dy) * sel.cols + (sel.col + dx);
}

/**
 * Peint la case (x, y) avec la selection. Une selection de plusieurs
 * tuiles se repete sur la grille (motif ancre sur la carte, pas sur le
 * clic) : remplir une zone donne un motif continu.
 */
export function paintFloorTile(level, x, y, sel, options = {}) {
  const solid = !!options.solid;
  const overhead = !!options.overhead;
  if (!sel || !inBounds(level, x, y)) return false;
  // motif ancre sur options.anchor (premier clic / coin du rectangle) ;
  // sans ancre : ancre sur la carte (0, 0) comme avant
  const ax = options.anchor ? options.anchor.x : 0;
  const ay = options.anchor ? options.anchor.y : 0;
  const dx = (((x - ax) % sel.w) + sel.w) % sel.w;
  const dy = (((y - ay) % sel.h) + sel.h) % sel.h;
  const tile = { sheet: sel.sheet, frame: selectionFrame(sel, dx, dy) };
  if (solid) tile.solid = true;
  if (overhead) tile.overhead = true;
  const id = tileKey(x, y, options.layer ? 1 : 0);
  const old = level.paintedFloor[id];
  if (
    old &&
    old.sheet === tile.sheet &&
    old.frame === tile.frame &&
    !!old.solid === solid &&
    !!old.overhead === overhead
  ) {
    return false;
  }
  level.paintedFloor[id] = tile;
  if (solid) removeEntitiesAt(level, x, y); // plus rien sur une case bloquee
  return true;
}

/** Case bloquee : mur de la grille OU tuile peinte non traversable. */
export function isBlocked(level, x, y) {
  if (!inBounds(level, x, y)) return true;
  if (level.grid[y][x] !== 0) return true;
  // la tuile la plus haute decide (un pont non bloquant sur une riviere bloquante = passable)
  const top = topTileAt(level, x, y);
  return !!(top && top.tile.solid);
}

/** Gomme : retire la tuile la plus haute de la case ; renvoie sa cle (ou null). */
export function eraseFloorTile(level, x, y) {
  const top = topTileAt(level, x, y);
  if (!top) return null;
  delete level.paintedFloor[top.id];
  return top.id;
}

/** Peint un rectangle (bornes incluses). */
export function paintFloorRect(level, x0, y0, x1, y1, sel, options = {}) {
  let changed = false;
  // le motif part du coin haut-gauche du rectangle trace
  if (!options.anchor)
    options = {
      ...options,
      anchor: { x: Math.min(x0, x1), y: Math.min(y0, y1) },
    };
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (paintFloorTile(level, x, y, sel, options)) changed = true;
    }
  }
  return changed;
}

// ---- entites ----

/** Outils de placement : outil -> ou ca se range dans le niveau. */
export const PLACE_TOOLS = {
  spawn: { kind: "point", key: "playerSpawn" },
  exit: { kind: "point", key: "exitTile" },
  upstairs: { kind: "point", key: "upstairsTile" },
  hub: { kind: "point", key: "travelHubTile" },
  shop: { kind: "point", key: "shop" },
  enemy: { kind: "list", key: "enemies" },
  chest: { kind: "list", key: "chests" },
  crate: { kind: "list", key: "chests" },
  questNpc: { kind: "list", key: "questNpcs" },
  ambientNpc: { kind: "list", key: "ambientNpcs" },
  rock: { kind: "list", key: "miningRocks" },
  decor: { kind: "list", key: "decorations" },
};

// types de decor connus du rendu (floorRenderer.js, DECOR_ENTRIES) - le
// serveur y ajoute ceux qu'utilisent les biomes (cf. collectBiomeMeta)
export const KNOWN_DECOR_TYPES = [
  "rock_small",
  "bush",
  "flower_patch",
  "wooden_fence",
  "crate",
  "boulder",
  "ground_crack",
  "vines",
  "flower",
];

/** Tout ce qui occupe la case (x,y) : [{ key, index|null }] */
export function entitiesAt(level, x, y) {
  const found = [];
  for (const k of POINT_KEYS) {
    const p = level[k];
    if (p && p.x === x && p.y === y) found.push({ key: k, index: null });
  }
  for (const k of LIST_KEYS) {
    level[k].forEach((e, index) => {
      if (e.x === x && e.y === y) found.push({ key: k, index });
    });
  }
  return found;
}

export function removeEntitiesAt(level, x, y) {
  const found = entitiesAt(level, x, y);
  // supprime les index de liste du plus grand au plus petit
  found
    .filter((f) => f.index !== null)
    .sort((a, b) => b.index - a.index)
    .forEach((f) => level[f.key].splice(f.index, 1));
  found.filter((f) => f.index === null).forEach((f) => (level[f.key] = null));
  return found.length > 0;
}

/**
 * Pose `tool` en (x,y). Remplace ce qui s'y trouvait deja. Refuse sur un
 * mur ou hors grille. Renvoie { ok, message }.
 */
export function placeEntity(level, tool, x, y, options = {}) {
  const spec = PLACE_TOOLS[tool];
  if (!spec) return { ok: false, message: `outil inconnu : ${tool}` };
  if (!inBounds(level, x, y))
    return { ok: false, message: "hors de la grille" };
  if (tool === "rock" && !options.resource) {
    return {
      ok: false,
      message: "choisis d'abord une ressource pour le gisement",
    };
  }
  if (isBlocked(level, x, y)) {
    return {
      ok: false,
      message: "impossible de poser sur un mur ou une tuile non traversable",
    };
  }
  removeEntitiesAt(level, x, y);
  if (spec.kind === "point") {
    level[spec.key] = { x, y };
  } else if (tool === "enemy") {
    level.enemies.push({ x, y, type: options.enemyType || "enemyDefault" });
  } else if (tool === "chest") {
    level.chests.push({ x, y, propType: "chest" });
  } else if (tool === "crate") {
    level.chests.push({ x, y, propType: "crate" });
  } else if (tool === "questNpc") {
    level.questNpcs.push({ x, y, npcIndex: nextNpcIndex(level.questNpcs) });
  } else if (tool === "ambientNpc") {
    level.ambientNpcs.push({ x, y });
  } else if (tool === "rock") {
    const rock = { x, y, resource: options.resource };
    if (Number.isInteger(options.totalHits) && options.totalHits > 0)
      rock.totalHits = options.totalHits;
    // palier ecrit explicitement : sinon une ressource absente du biome
    // de l'etage retomberait sur le palier 1
    if (Number.isInteger(options.requiredTier))
      rock.requiredTier = options.requiredTier;
    level.miningRocks.push(rock);
  } else if (tool === "decor") {
    level.decorations.push({
      x,
      y,
      decorType: options.decorType || "rock_small",
    });
  }
  return { ok: true };
}

function nextNpcIndex(npcs) {
  let i = 0;
  const used = new Set(npcs.map((n) => n.npcIndex));
  while (used.has(i)) i++;
  return i;
}

// ---- verification ----

/** Cases de sol atteignables depuis `start` (4 directions). */
export function reachableFrom(level, start) {
  const seen = new Set();
  if (!start || isBlocked(level, start.x, start.y)) return seen;
  const stack = [start];
  seen.add(`${start.x},${start.y}`);
  while (stack.length) {
    const { x, y } = stack.pop();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (isBlocked(level, nx, ny) || seen.has(key)) continue;
      seen.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/** { errors: [...] (bloquants), warnings: [...] } */
export function validateLevel(level) {
  const errors = [];
  const warnings = [];
  const onFloor = (p) =>
    p && inBounds(level, p.x, p.y) && !isBlocked(level, p.x, p.y);

  if (!level.playerSpawn)
    errors.push("Point de départ du joueur manquant (outil « Départ »).");
  else if (!onFloor(level.playerSpawn))
    errors.push("Le départ du joueur est sur un mur.");
  if (!level.exitTile) errors.push("Sortie manquante (outil « Sortie »).");
  else if (!onFloor(level.exitTile)) errors.push("La sortie est sur un mur.");

  if (
    level.playerSpawn &&
    level.exitTile &&
    onFloor(level.playerSpawn) &&
    onFloor(level.exitTile)
  ) {
    const reach = reachableFrom(level, level.playerSpawn);
    if (!reach.has(`${level.exitTile.x},${level.exitTile.y}`)) {
      errors.push("La sortie n'est pas atteignable depuis le départ.");
    }
    const unreachable = [];
    for (const k of [
      "enemies",
      "chests",
      "questNpcs",
      "ambientNpcs",
      "miningRocks",
    ]) {
      for (const e of level[k])
        if (!reach.has(`${e.x},${e.y}`)) unreachable.push(k);
    }
    if (unreachable.length > 0) {
      warnings.push(
        `${unreachable.length} élément(s) dans une zone inatteignable depuis le départ (ennemis, coffres, PNJ...).`,
      );
    }
  }
  if (level.generate.enemies && level.enemies.length === 0) {
    // rien : generer seulement des ennemis est un usage normal
  }
  const w = gridWidth(level);
  const h = gridHeight(level);
  let borderOpen = false;
  for (let x = 0; x < w && !borderOpen; x++)
    borderOpen = level.grid[0][x] === 0 || level.grid[h - 1][x] === 0;
  for (let y = 0; y < h && !borderOpen; y++)
    borderOpen = level.grid[y][0] === 0 || level.grid[y][w - 1] === 0;
  if (borderOpen)
    warnings.push(
      "Du sol touche le bord de la grille (le rendu des murs peut être incorrect) : « Entourer de murs ».",
    );
  return { errors, warnings };
}
