import * as Registry from "../spriteRegistry";
import { TILE_SIZE } from "./gameConstants";

/**
 * "Sol peint" : tuiles purement visuelles, prises dans N'IMPORTE QUELLE
 * feuille du jeu, posees par-dessus le sol autotile d'un niveau (chemins de
 * pave, flaques, tapis...). Aucune collision, aucun etat de jeu.
 *
 * Format dans la reponse de getLevel (data.paintedFloor), compact :
 *   { "<cle de feuille>": [[x, y, frame], ...], ... }
 * ou la cle est le `key` Phaser de la feuille (ex. "cityTiles").
 *
 * Les feuilles proposees sont toutes les constantes exportees de
 * spriteRegistry.js dont le nom finit par _SPRITESHEET : en ajouter une
 * au registre suffit pour qu'elle apparaisse dans l'editeur.
 */

let sheetsCache = null;

/** [{ name, key, path, frameWidth, frameHeight }] triees par nom. */
export function getPaintableSheets() {
  if (sheetsCache) return sheetsCache;
  sheetsCache = Object.entries(Registry)
    .filter(
      ([name, v]) =>
        name.endsWith("_SPRITESHEET") &&
        v &&
        typeof v === "object" &&
        v.key &&
        v.path &&
        v.frameWidth &&
        v.frameHeight,
    )
    .map(([name, v]) => ({
      name,
      key: v.key,
      path: v.path,
      frameWidth: v.frameWidth,
      frameHeight: v.frameHeight,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return sheetsCache;
}

export function getSheetByKey(key) {
  return getPaintableSheets().find((s) => s.key === key) || null;
}

/**
 * Charge (si besoin) les feuilles demandees dans la scene. Les feuilles
 * deja chargees par BootScene ne sont pas rechargees. Se resout quand tout
 * est pret (ou si une feuille echoue : elle sera simplement ignoree).
 */
export function ensureSheetsLoaded(scene, keys) {
  let queued = 0;
  for (const key of keys) {
    if (scene.textures.exists(key)) continue;
    const sheet = getSheetByKey(key);
    if (!sheet) continue;
    scene.load.spritesheet(sheet.key, sheet.path, {
      frameWidth: sheet.frameWidth,
      frameHeight: sheet.frameHeight,
    });
    queued++;
  }
  if (queued === 0) return Promise.resolve();
  return new Promise((resolve) => {
    scene.load.once("complete", resolve);
    scene.load.start();
  });
}

// profondeurs (cf. levelLoader.js : heros 10, ennemis 8, brouillard 5)
const DEPTH_FLOOR = 1; // au-dessus du sol (0), sous les decors (4)
const DEPTH_OVERHEAD = 11; // devant le heros : on passe "derriere"

// au-dela de cette taille, un amas de tuiles speciales (toute une foret
// de cimes d'arbres, par ex.) n'est plus traite comme UN objet : il
// devoilerait d'un coup une zone entiere
const MAX_OBJECT_SIZE = 40;

/**
 * Regroupe les tuiles speciales (non traversables ou au-dessus du joueur)
 * qui se touchent (4 voisins) en "objets" : une statue = tete + corps + base.
 * Renvoie une table "x,y" -> { cells: [[x,y],...] } (la liste de cases de
 * l'objet, partagee par toutes ses tuiles).
 */
function groupSpecialTiles(painted) {
  const flagsById = new Map();
  for (const key of Object.keys(painted)) {
    for (const [x, y, , flags = 0] of painted[key]) {
      if (flags)
        flagsById.set(`${x},${y}`, (flagsById.get(`${x},${y}`) || 0) | flags);
    }
  }
  const groupOf = new Map();
  for (const id of flagsById.keys()) {
    if (groupOf.has(id)) continue;
    const cells = [];
    const stack = [id];
    groupOf.set(id, null);
    while (stack.length) {
      const cur = stack.pop();
      const [x, y] = cur.split(",").map(Number);
      cells.push([x, y]);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nid = `${x + dx},${y + dy}`;
        if (flagsById.has(nid) && !groupOf.has(nid)) {
          groupOf.set(nid, null);
          stack.push(nid);
        }
      }
    }
    const group = { cells };
    for (const [x, y] of cells) groupOf.set(`${x},${y}`, group);
  }
  return groupOf;
}

/** Cases voisines (3x3) d'une tuile : repli pour les trop gros amas. */
function neighbourhood(x, y) {
  const cells = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) cells.push([x + dx, y + dy]);
  return cells;
}

/**
 * Les tuiles "au-dessus du joueur" sont devant le brouillard (profondeur
 * 5 < 11) : sans precaution, on verrait un toit ou une cime d'arbre
 * a travers le noir d'une zone jamais explorée. Un petit crochet par frame
 * les cache tant que l'OBJET dont elles font partie n'a pas ete (au moins
 * en partie) decouvert - sinon une statue serait decoupee : tete visible,
 * corps cache - et les assombrit quand il est seulement "deja vu".
 */
function ensureOverheadFogHook(scene) {
  // (re)branche toujours le crochet : apres un restart de scene l'ancien
  // ecouteur peut avoir disparu
  if (scene._overheadFogHook)
    scene.events.off("update", scene._overheadFogHook);
  scene._overheadFogHook = () => {
    const groups = scene.overheadGroups;
    const fog = scene.fogState && scene.fogState.state;
    if (!groups || groups.length === 0 || !fog) return;
    for (const g of groups) {
      let best = 0;
      for (const [x, y] of g.cells) {
        const row = fog[y];
        const state = row ? row[x] || 0 : 0;
        if (state > best) best = state;
        if (best >= 2) break;
      }
      for (const sprite of g.sprites) {
        if (!sprite.active) continue;
        sprite.visible = best >= 1;
        if (best === 1) sprite.setTint(0x777777);
        else sprite.clearTint();
      }
    }
  };
  scene.events.on("update", scene._overheadFogHook);
}

/** Cree une image de tuile peinte a la case (x, y). */
export function createPaintedTile(
  scene,
  sheetKey,
  frame,
  x,
  y,
  overhead = false,
  layer = 0,
) {
  const img = scene.add.image(
    x * TILE_SIZE + TILE_SIZE / 2,
    y * TILE_SIZE + TILE_SIZE / 2,
    sheetKey,
    frame,
  );
  img.setDisplaySize(TILE_SIZE, TILE_SIZE);
  // couche 1 (pont sur une riviere...) : juste au-dessus de la couche 0
  img.setDepth(
    overhead ? DEPTH_OVERHEAD + layer * 0.1 : DEPTH_FLOOR + layer * 0.5,
  );
  img.tileX = x;
  img.tileY = y;
  return img;
}

/**
 * Pose toutes les tuiles peintes d'un niveau. Les images sont rangees dans
 * scene.decorationSprites : elles sont donc detruites avec les decors au
 * changement d'etage, sans code de nettoyage supplementaire.
 */
export async function spawnPaintedFloor(scene, data) {
  const painted = data && data.paintedFloor;
  if (!painted) return;
  const keys = Object.keys(painted);
  applySolidCollision(scene, painted);
  await ensureSheetsLoaded(scene, keys);
  if (!scene.decorationSprites) scene.decorationSprites = [];
  scene.overheadGroups = [];
  ensureOverheadFogHook(scene);
  // diagnostic : window.__arpgDebugOverhead() dans la console du navigateur
  // liste chaque objet "au-dessus du joueur" avec l'etat de brouillard de
  // ses cases (0 inconnu, 1 deja vu, 2 visible) et la visibilite de ses images
  if (typeof window !== "undefined") {
    window.__arpgDebugOverhead = () => {
      const fog = scene.fogState && scene.fogState.state;
      const out = (scene.overheadGroups || []).map((g) => ({
        cells: g.cells
          .map(([x, y]) => `${x},${y}=${fog && fog[y] ? fog[y][x] : "?"}`)
          .join(" "),
        sprites: g.sprites
          .map(
            (sp) =>
              `${sp.tileX},${sp.tileY}:${sp.visible ? "visible" : "cache"}`,
          )
          .join(" "),
      }));
      console.table(out);
      return out;
    };
  }
  const objectOf = groupSpecialTiles(painted);
  const runtimeGroups = new Map(); // objet -> { cells, sprites }
  for (const key of keys) {
    if (!scene.textures.exists(key)) {
      console.warn(
        `[paintedFloor] feuille "${key}" introuvable, tuiles ignorees`,
      );
      continue;
    }
    for (const [x, y, frame, flags = 0, layer = 0] of painted[key]) {
      const overhead = (flags & 2) !== 0;
      const img = createPaintedTile(scene, key, frame, x, y, overhead, layer);
      scene.decorationSprites.push(img);
      if (!overhead) {
        // sol / base non traversable : sous le brouillard (profondeur 5),
        // donc toujours affiche (le noir ou le voile le recouvre). On le
        // soustrait a la boucle de brouillard de la scene, qui le cachait
        // hors du champ de vision et laissait voir le mur dessous.
        img.setVisible = function () {
          return this;
        };
      }
      if (overhead) {
        img.visible = false; // le crochet l'affiche quand l'objet est decouvert
        // IMPORTANT : la boucle de brouillard de la scene masque tous les
        // sprites de decorationSprites hors des cases "visibles" (etat 2),
        // ce qui cachait le milieu de la statue. On neutralise setVisible
        // pour ces images : seul notre crochet pilote leur visibilite.
        img.setVisible = function () {
          return this;
        };
        const object = objectOf.get(`${x},${y}`);
        let group;
        if (object && object.cells.length <= MAX_OBJECT_SIZE) {
          group = runtimeGroups.get(object);
          if (!group) {
            group = { cells: object.cells, sprites: [] };
            runtimeGroups.set(object, group);
            scene.overheadGroups.push(group);
          }
        } else {
          // gros amas : chaque tuile se decide seule (avec ses voisines)
          group = { cells: neighbourhood(x, y), sprites: [] };
          scene.overheadGroups.push(group);
        }
        group.sprites.push(img);
      }
    }
  }
}

/**
 * Grille utilisee UNIQUEMENT pour dessiner le sol : les cases peintes
 * "non traversables" sont comptees comme du sol, sinon le mur du tileset
 * apparait sous (ou a travers) le sprite peint. La grille de collision,
 * elle, reste inchangee (ces cases y sont bien des murs).
 */
export function gridForRendering(grid, data) {
  const painted = data && data.paintedFloor;
  if (!painted) return grid;
  const copy = grid.map((row) => row.slice());
  for (const { x, y } of solidCellsOf(painted)) {
    if (copy[y] && copy[y][x] !== undefined) copy[y][x] = 0;
  }
  return copy;
}

/**
 * Les collisions du heros viennent du calque de tuiles (scene.layer), pas
 * de la grille : comme gridForRendering dessine ces cases en sol, on
 * rend ici leurs tuiles solides a la main.
 */
function applySolidCollision(scene, painted) {
  const layer = scene.layer;
  if (!layer) return;
  const touched = [];
  for (const cell of solidCellsOf(painted)) {
    const tile = layer.getTileAt(cell.x, cell.y);
    if (!tile) continue;
    tile.setCollision(true, true, true, true);
    touched.push([cell.x, cell.y]);
  }
  for (const [x, y] of touched) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) layer.calculateFacesAt(x + dx, y + dy);
    }
  }
}

/**
 * Cases non traversables : pour chaque case, c'est la tuile de la couche
 * la plus haute qui decide (un pont non bloquant pose sur une riviere
 * bloquante laisse la case passable). Meme regle que le serveur.
 */
function solidCellsOf(painted) {
  const top = new Map(); // "x,y" -> { layer, solid, x, y }
  for (const key of Object.keys(painted)) {
    for (const [x, y, , flags = 0, layer = 0] of painted[key]) {
      const id = `${x},${y}`;
      const cur = top.get(id);
      if (!cur || layer >= cur.layer)
        top.set(id, { layer, solid: (flags & 1) === 1, x, y });
    }
  }
  return [...top.values()].filter((t) => t.solid);
}
