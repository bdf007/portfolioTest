import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Phaser from "phaser";
import { buildFloorTilemap } from "./scenes/floorRenderer";
import { getTileImagesToLoad } from "./spriteRegistry";
import { BIOME_REGISTRY } from "./biomeRegistry";
import {
  getPaintableSheets,
  getSheetByKey,
  ensureSheetsLoaded,
  createPaintedTile,
} from "./scenes/paintedFloor";
import { TILE_SIZE } from "./scenes/gameConstants";
import {
  fetchEditorLevels,
  fetchEditorLevel,
  saveEditorLevel,
  deleteEditorLevel,
} from "../../api/arpgClient";
import {
  GENERATE_KEYS,
  GENERATE_LABELS,
  KNOWN_DECOR_TYPES,
  PLACE_TOOLS,
  createEmptyLevel,
  levelFromDef,
  levelToDef,
  gridWidth,
  gridHeight,
  paintCell,
  fillRect,
  surroundWithWalls,
  resizeLevel,
  placeEntity,
  removeEntitiesAt,
  validateLevel,
  paintFloorTile,
  paintFloorRect,
  eraseFloorTile,
} from "./handmadeEditorLogic";

// ---------------------------------------------------------------------------
// Editeur de niveaux "faits main" (cf. handmadeLevel.js cote serveur).
// Le niveau en cours vit dans ctrl.level (objet mutable partage entre la
// scene Phaser, qui dessine/edite, et React, qui affiche le panneau) ;
// React est prevenu des changements par ctrl.onChange().
// ---------------------------------------------------------------------------

const TILE_IMAGES_TO_LOAD = getTileImagesToLoad();

const TOOLS = [
  { group: "Dessin", id: "floor", label: "Sol (pinceau)" },
  { group: "Dessin", id: "wall", label: "Mur (pinceau)" },
  { group: "Dessin", id: "rectFloor", label: "Sol (rectangle)" },
  { group: "Dessin", id: "rectWall", label: "Mur (rectangle)" },
  { group: "Dessin", id: "erase", label: "Gomme (éléments)" },
  { group: "Repères", id: "spawn", label: "Départ du joueur" },
  { group: "Repères", id: "exit", label: "Sortie" },
  { group: "Repères", id: "upstairs", label: "Escalier montant" },
  { group: "Repères", id: "hub", label: "Hub de voyage" },
  { group: "Repères", id: "shop", label: "Boutique" },
  { group: "Éléments", id: "enemy", label: "Ennemi" },
  { group: "Éléments", id: "chest", label: "Coffre" },
  { group: "Éléments", id: "crate", label: "Caisse" },
  { group: "Éléments", id: "questNpc", label: "PNJ de quête" },
  { group: "Éléments", id: "ambientNpc", label: "PNJ d'ambiance" },
  { group: "Éléments", id: "rock", label: "Gisement" },
  { group: "Éléments", id: "decor", label: "Décor" },
  { group: "Sol peint", id: "tilePaint", label: "Tuile (pinceau)" },
  { group: "Sol peint", id: "tileRect", label: "Tuile (rectangle)" },
  { group: "Sol peint", id: "tileErase", label: "Gomme sol peint" },
];

// marqueurs dessines par-dessus la carte : [lettre, couleur]
const MARKERS = {
  playerSpawn: ["D", 0x2ecc71],
  exitTile: ["S", 0xf1c40f],
  upstairsTile: ["E", 0x3498db],
  travelHubTile: ["V", 0x9b59b6],
  shop: ["B", 0xe67e22],
  questNpcs: ["Q", 0x1abc9c],
  ambientNpcs: ["a", 0xbdc3c7],
  chests: ["C", 0xe67e22],
  miningRocks: ["R", 0x7f8c8d],
  decorations: ["d", 0x7f8c8d],
};

function lineCells(x0, y0, x1, y1) {
  // Bresenham : toutes les cases entre deux points (trace continu au pinceau)
  const cells = [];
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}

class EditorScene extends Phaser.Scene {
  constructor(ctrl, biome) {
    super("EditorScene");
    this.ctrl = ctrl;
    this.biome = biome;
  }

  preload() {
    if (this.biome && this.biome.spritesheet) {
      this.load.spritesheet(
        this.biome.spritesheet.key,
        this.biome.spritesheet.path,
        {
          frameWidth: this.biome.spritesheet.frameWidth,
          frameHeight: this.biome.spritesheet.frameHeight,
        },
      );
    }
    TILE_IMAGES_TO_LOAD.forEach(({ key, path }) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    });
  }

  create() {
    const ctrl = this.ctrl;
    ctrl.scene = this;
    // meme graine fixe que BiomeGalleryScreen : rendu stable des variantes
    this.currentSeed = "editor-preview";
    this.townHouseSprites = [];
    this.discoveredSecretRoomDepths = [];
    this.input.mouse.disableContextMenu();

    this.gridGfx = this.add.graphics().setDepth(20);
    this.markerGfx = this.add.graphics().setDepth(21);
    this.strokeGfx = this.add.graphics().setDepth(22);
    this.hoverGfx = this.add.graphics().setDepth(23);
    this.markerTexts = [];
    this.paintedSprites = new Map(); // "x,y" -> image du sol peint
    this.syncToken = 0;
    const markDead = () => {
      this.dead = true;
    };
    this.events.once("shutdown", markDead);
    this.events.once("destroy", markDead);
    this.stroke = null;
    this.rectStart = null;
    this.panning = false;
    this.lastPointer = { x: 0, y: 0 };

    this.refreshAll();
    this.fitCamera();

    this.input.on("pointerdown", this.onDown, this);
    this.input.on("pointermove", this.onMove, this);
    this.input.on("pointerup", this.onUp, this);
    this.input.on("pointerupoutside", this.onUp, this);
    this.input.on("wheel", this.onWheel, this);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.scale.on("resize", () => this.fitCameraIfNeeded());
  }

  update(_t, delta) {
    // fleches : deplacement de la camera (la souris reste le moyen principal)
    const cam = this.cameras.main;
    const speed = (600 * delta) / 1000 / cam.zoom;
    if (this.cursors.left.isDown) cam.scrollX -= speed;
    if (this.cursors.right.isDown) cam.scrollX += speed;
    if (this.cursors.up.isDown) cam.scrollY -= speed;
    if (this.cursors.down.isDown) cam.scrollY += speed;
  }

  get level() {
    return this.ctrl.level;
  }

  fitCamera() {
    const cam = this.cameras.main;
    const w = gridWidth(this.level) * TILE_SIZE;
    const h = gridHeight(this.level) * TILE_SIZE;
    const zoom = Math.min(cam.width / (w + 80), cam.height / (h + 80), 2);
    cam.setZoom(Math.max(0.2, zoom));
    cam.centerOn(w / 2, h / 2);
  }

  fitCameraIfNeeded() {
    // premiere taille reelle du conteneur : recadre une seule fois
    if (!this.fitted && this.cameras.main.width > 100) {
      this.fitted = true;
      this.fitCamera();
    }
  }

  // ---- rendu ----

  /** Reconstruit entierement le sol (autotiles) depuis la grille. */
  rebuildFloor() {
    if (this.map) {
      this.map.destroy();
      this.map = null;
      this.layer = null;
    }
    (this.townHouseSprites || []).forEach((s) => s.destroy());
    this.townHouseSprites = [];
    try {
      buildFloorTilemap(this, {
        grid: this.level.grid,
        tileset: this.ctrl.tileset,
        data: { townBuildings: this.level.townBuildings },
        depth: this.ctrl.depth,
      });
      this.layer.setDepth(0);
    } catch (err) {
      console.error("[Editor] buildFloorTilemap", err);
      this.ctrl.onMessage("error", `Rendu du sol impossible : ${err.message}`);
    }
  }

  drawGridLines() {
    const g = this.gridGfx;
    g.clear();
    g.lineStyle(1, 0xffffff, 0.12);
    const w = gridWidth(this.level);
    const h = gridHeight(this.level);
    for (let x = 0; x <= w; x++)
      g.lineBetween(x * TILE_SIZE, 0, x * TILE_SIZE, h * TILE_SIZE);
    for (let y = 0; y <= h; y++)
      g.lineBetween(0, y * TILE_SIZE, w * TILE_SIZE, y * TILE_SIZE);
  }

  /** Surligne en orange les cases de SOL qui touchent le bord de la grille. */
  drawBorderWarning() {
    const g = this.gridGfx;
    const lv = this.level;
    const w = gridWidth(lv);
    const h = gridHeight(lv);
    g.fillStyle(0xff8c00, 0.55);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const onEdge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        if (onEdge && lv.grid[y][x] === 0) {
          g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  /**
   * Repères sur les tuiles peintes speciales : croix rouge = non
   * traversable, cadre bleu = au-dessus du joueur (on passe derriere).
   */
  drawSolidMarks() {
    const g = this.gridGfx;
    for (const [id, tile] of Object.entries(this.level.paintedFloor)) {
      if (!tile.solid && !tile.overhead) continue;
      const [x, y] = id.split(",").map(Number);
      if (tile.solid) {
        g.lineStyle(2, 0xff3b3b, 0.9);
        g.lineBetween(
          x * TILE_SIZE + 4,
          y * TILE_SIZE + 4,
          (x + 1) * TILE_SIZE - 4,
          (y + 1) * TILE_SIZE - 4,
        );
        g.lineBetween(
          x * TILE_SIZE + 4,
          (y + 1) * TILE_SIZE - 4,
          (x + 1) * TILE_SIZE - 4,
          y * TILE_SIZE + 4,
        );
      }
      if (tile.overhead) {
        g.lineStyle(2, 0x4aa3ff, 0.95);
        g.strokeRect(
          x * TILE_SIZE + 2,
          y * TILE_SIZE + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4,
        );
      }
    }
  }

  drawMarkers() {
    const g = this.markerGfx;
    g.clear();
    this.markerTexts.forEach((t) => t.destroy());
    this.markerTexts = [];
    const put = (tile, letter, color, shape = "square", label = letter) => {
      const cx = tile.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = tile.y * TILE_SIZE + TILE_SIZE / 2;
      g.fillStyle(color, 0.75);
      g.lineStyle(2, 0x000000, 0.9);
      if (shape === "circle") {
        g.fillCircle(cx, cy, TILE_SIZE * 0.4);
        g.strokeCircle(cx, cy, TILE_SIZE * 0.4);
      } else {
        g.fillRect(
          cx - TILE_SIZE * 0.4,
          cy - TILE_SIZE * 0.4,
          TILE_SIZE * 0.8,
          TILE_SIZE * 0.8,
        );
        g.strokeRect(
          cx - TILE_SIZE * 0.4,
          cy - TILE_SIZE * 0.4,
          TILE_SIZE * 0.8,
          TILE_SIZE * 0.8,
        );
      }
      const txt = this.add
        .text(cx, cy, label, {
          fontFamily: "monospace",
          fontSize: "14px",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(22);
      this.markerTexts.push(txt);
    };
    const lv = this.level;
    for (const key of [
      "playerSpawn",
      "exitTile",
      "upstairsTile",
      "travelHubTile",
      "shop",
    ]) {
      if (lv[key]) put(lv[key], MARKERS[key][0], MARKERS[key][1]);
    }
    for (const key of ["questNpcs", "ambientNpcs"]) {
      lv[key].forEach((e) => put(e, MARKERS[key][0], MARKERS[key][1]));
    }
    lv.miningRocks.forEach((e) =>
      put(
        e,
        "R",
        MARKERS.miningRocks[1],
        "square",
        String(e.resource || "R").slice(0, 2),
      ),
    );
    lv.decorations.forEach((e) =>
      put(
        e,
        "d",
        MARKERS.decorations[1],
        "circle",
        String(e.decorType || "d").slice(0, 2),
      ),
    );
    lv.chests.forEach((e) =>
      put(
        e,
        "C",
        e.propType === "crate" ? 0x8d6e43 : MARKERS.chests[1],
        "square",
        e.propType === "crate" ? "c" : "C",
      ),
    );
    lv.enemies.forEach((e) =>
      put(e, "e", 0xe74c3c, "circle", String(e.type || "?").slice(0, 2)),
    );
    // maisons de ville : contour des cases visees (le sprite est dessine par buildFloorTilemap)
    lv.townBuildings.forEach((b) => {
      g.lineStyle(1, 0xffffff, 0.5);
      g.strokeRect(b.x * TILE_SIZE, b.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
  }

  refreshOverlay() {
    this.drawGridLines();
    this.drawBorderWarning();
    this.drawSolidMarks();
    this.drawMarkers();
  }

  refreshAll() {
    this.rebuildFloor();
    this.syncPainted();
    this.refreshOverlay();
  }

  // ---- sol peint ----

  /** Recree toutes les images du sol peint depuis le niveau. */
  async syncPainted() {
    const token = ++this.syncToken;
    this.paintedSprites.forEach((img) => img.destroy());
    this.paintedSprites.clear();
    const painted = this.level.paintedFloor;
    const sheets = [...new Set(Object.values(painted).map((t) => t.sheet))];
    await ensureSheetsLoaded(this, sheets);
    if (this.dead || token !== this.syncToken) return; // scene detruite ou resynchronisation plus recente
    for (const id of Object.keys(painted)) this.placePaintedImage(id);
  }

  /** (Re)cree l'image d'une seule case du sol peint (ou la retire). */
  placePaintedImage(id) {
    const old = this.paintedSprites.get(id);
    if (old) {
      old.destroy();
      this.paintedSprites.delete(id);
    }
    const tile = this.level.paintedFloor[id];
    if (!tile || !this.textures.exists(tile.sheet)) return;
    const [x, y] = id.split(",").map(Number);
    this.paintedSprites.set(
      id,
      createPaintedTile(this, tile.sheet, tile.frame, x, y),
    );
  }

  /** Applique l'outil de sol peint a une case (pose ou gomme). */
  applyTileTool(x, y, erase) {
    const id = `${x},${y}`;
    const changed = erase
      ? eraseFloorTile(this.level, x, y)
      : paintFloorTile(this.level, x, y, this.ctrl.tileSel, {
          solid: this.ctrl.tileSolid,
          overhead: this.ctrl.tileOverhead,
        });
    if (!changed) return false;
    const sheet =
      this.level.paintedFloor[id] && this.level.paintedFloor[id].sheet;
    if (sheet && !this.textures.exists(sheet)) {
      // feuille pas encore chargee : charge puis affiche
      ensureSheetsLoaded(this, [sheet]).then(() => {
        if (!this.dead) this.placePaintedImage(id);
      });
    } else {
      this.placePaintedImage(id);
    }
    this.tileChanged = true;
    return true;
  }

  // ---- entrees ----

  tileAt(pointer) {
    const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: Math.floor(wp.x / TILE_SIZE), y: Math.floor(wp.y / TILE_SIZE) };
  }

  drawHover(tile) {
    const g = this.hoverGfx;
    g.clear();
    if (!tile) return;
    if (
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= gridWidth(this.level) ||
      tile.y >= gridHeight(this.level)
    )
      return;
    g.lineStyle(2, 0xffffff, 0.9);
    g.strokeRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  paintPreview(cells, value) {
    const g = this.strokeGfx;
    g.fillStyle(value === 0 ? 0x2ecc71 : 0xc0392b, 0.45);
    cells.forEach(([x, y]) =>
      g.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE),
    );
  }

  onDown(pointer) {
    this.lastPointer = { x: pointer.x, y: pointer.y };
    if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
      this.panning = true;
      return;
    }
    const ctrl = this.ctrl;
    const tile = this.tileAt(pointer);
    const tool = ctrl.tool;
    this.before = JSON.stringify(this.level);
    this.gridChanged = false;
    this.tileChanged = false;

    if (tool === "tilePaint" || tool === "tileErase") {
      if (tool === "tilePaint" && !ctrl.tileSel) {
        ctrl.onMessage(
          "warn",
          "Choisis d'abord une tuile dans la palette (panneau « Sol peint »).",
        );
        return;
      }
      this.stroke = { tile: true, erase: tool === "tileErase", last: tile };
      this.applyTileTool(tile.x, tile.y, tool === "tileErase");
    } else if (tool === "tileRect") {
      if (!ctrl.tileSel) {
        ctrl.onMessage(
          "warn",
          "Choisis d'abord une tuile dans la palette (panneau « Sol peint »).",
        );
        return;
      }
      this.rectStart = tile;
    } else if (tool === "floor" || tool === "wall") {
      const value = tool === "floor" ? 0 : 1;
      this.stroke = { value, last: tile };
      if (paintCell(this.level, tile.x, tile.y, value)) {
        this.gridChanged = true;
        this.paintPreview([[tile.x, tile.y]], value);
      }
    } else if (tool === "rectFloor" || tool === "rectWall") {
      this.rectStart = tile;
    } else if (tool === "erase") {
      this.stroke = { erase: true, last: tile };
      if (removeEntitiesAt(this.level, tile.x, tile.y)) this.refreshOverlay();
    } else if (PLACE_TOOLS[tool]) {
      const res = placeEntity(this.level, tool, tile.x, tile.y, {
        enemyType: ctrl.enemyType,
        resource: ctrl.resource,
        requiredTier: ctrl.resourceTier,
        totalHits: ctrl.totalHits,
        decorType: ctrl.decorType,
      });
      if (!res.ok) ctrl.onMessage("warn", res.message);
      this.refreshOverlay();
      this.commit();
    }
  }

  onMove(pointer) {
    const tile = this.tileAt(pointer);
    this.drawHover(tile);
    this.ctrl.onHover(tile);
    if (this.panning) {
      const cam = this.cameras.main;
      cam.scrollX -= (pointer.x - this.lastPointer.x) / cam.zoom;
      cam.scrollY -= (pointer.y - this.lastPointer.y) / cam.zoom;
      this.lastPointer = { x: pointer.x, y: pointer.y };
      return;
    }
    if (!pointer.leftButtonDown()) return;
    if (this.stroke && this.stroke.tile) {
      for (const [x, y] of lineCells(
        this.stroke.last.x,
        this.stroke.last.y,
        tile.x,
        tile.y,
      )) {
        this.applyTileTool(x, y, this.stroke.erase);
      }
      this.stroke.last = tile;
    } else if (this.stroke && !this.stroke.erase) {
      const cells = lineCells(
        this.stroke.last.x,
        this.stroke.last.y,
        tile.x,
        tile.y,
      );
      const painted = [];
      for (const [x, y] of cells) {
        if (paintCell(this.level, x, y, this.stroke.value))
          painted.push([x, y]);
      }
      if (painted.length) {
        this.gridChanged = true;
        this.paintPreview(painted, this.stroke.value);
      }
      this.stroke.last = tile;
    } else if (this.stroke && this.stroke.erase) {
      if (removeEntitiesAt(this.level, tile.x, tile.y)) this.refreshOverlay();
    } else if (this.rectStart) {
      const g = this.strokeGfx;
      g.clear();
      const value = this.ctrl.tool === "rectFloor" ? 0 : 1;
      const tileRect = this.ctrl.tool === "tileRect";
      g.fillStyle(tileRect ? 0x3498db : value === 0 ? 0x2ecc71 : 0xc0392b, 0.4);
      const x0 = Math.min(this.rectStart.x, tile.x);
      const y0 = Math.min(this.rectStart.y, tile.y);
      g.fillRect(
        x0 * TILE_SIZE,
        y0 * TILE_SIZE,
        (Math.abs(tile.x - this.rectStart.x) + 1) * TILE_SIZE,
        (Math.abs(tile.y - this.rectStart.y) + 1) * TILE_SIZE,
      );
    }
  }

  onUp(pointer) {
    if (this.panning) {
      this.panning = false;
      return;
    }
    if (this.rectStart) {
      const tile = this.tileAt(pointer);
      if (this.ctrl.tool === "tileRect") {
        if (
          paintFloorRect(
            this.level,
            this.rectStart.x,
            this.rectStart.y,
            tile.x,
            tile.y,
            this.ctrl.tileSel,
            { solid: this.ctrl.tileSolid, overhead: this.ctrl.tileOverhead },
          )
        ) {
          this.tileChanged = true;
          this.syncPainted();
        }
      } else {
        const value = this.ctrl.tool === "rectFloor" ? 0 : 1;
        if (
          fillRect(
            this.level,
            this.rectStart.x,
            this.rectStart.y,
            tile.x,
            tile.y,
            value,
          )
        ) {
          this.gridChanged = true;
        }
      }
      this.rectStart = null;
    }
    if (this.stroke || this.gridChanged || this.tileChanged) {
      this.stroke = null;
      this.strokeGfx.clear();
      if (this.gridChanged) this.rebuildFloor(); // autotiles recalcules une fois le trait fini
      this.refreshOverlay();
      this.commit();
    }
  }

  onWheel(pointer, _objs, _dx, dy) {
    const cam = this.cameras.main;
    const before = cam.getWorldPoint(pointer.x, pointer.y);
    const factor = dy > 0 ? 0.88 : 1.14;
    cam.setZoom(Phaser.Math.Clamp(cam.zoom * factor, 0.15, 4));
    const after = cam.getWorldPoint(pointer.x, pointer.y);
    cam.scrollX += before.x - after.x; // le point sous la souris reste fixe
    cam.scrollY += before.y - after.y;
  }

  /** Fin d'une action : si le niveau a change, l'enregistre dans l'historique. */
  commit() {
    if (JSON.stringify(this.level) !== this.before) {
      this.ctrl.commitUndo(this.before);
    }
    this.before = null;
  }
}

// ---------------------------------------------------------------------------

const btn = (active) => ({
  padding: "5px 10px",
  fontSize: 12,
  borderRadius: 6,
  border: `1px solid ${active ? "#ffd700" : "#8a7050"}`,
  background: active ? "#3a3320" : "rgba(58,47,32,0.85)",
  color: "#f0e6d0",
  cursor: "pointer",
});

const inputStyle = {
  padding: "4px 6px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid #8a7050",
  background: "rgba(58,47,32,0.85)",
  color: "#f0e6d0",
  boxSizing: "border-box",
};

/**
 * Liste deroulante avec champ de recherche (meme principe que le choix du
 * tileset). options : [{ value, label }]. L'option actuellement choisie reste
 * toujours visible meme si elle ne correspond pas au filtre.
 */
function SearchSelect({
  value,
  options,
  onChange,
  placeholder = "Rechercher...",
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    const matches = options.filter(
      (o) =>
        o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q),
    );
    const current = options.find((o) => o.value === value);
    return current && !matches.includes(current)
      ? [current, ...matches]
      : matches;
  }, [query, options, value]);
  return (
    <div>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 4 }}
      />
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, width: "100%" }}
      >
        {shown.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ color: "#8a7050", marginTop: 2 }}>
        {shown.length}/{options.length}
      </div>
    </div>
  );
}

/**
 * Palette du sol peint : choix d'une feuille, puis clic (ou glisser pour un
 * rectangle) sur l'image pour selectionner une tuile ou un motif. Un motif
 * de plusieurs tuiles se repete sur la carte quand on remplit une zone.
 */
function TilePalette({ selection, onSelect }) {
  const sheets = useMemo(() => getPaintableSheets(), []);
  const [sheetKey, setSheetKey] = useState(
    (selection && selection.sheet) || (sheets[0] && sheets[0].key) || null,
  );
  const [natural, setNatural] = useState(null); // { w, h } de l'image chargee
  const [drag, setDrag] = useState(null); // { c0, r0, c1, r1 }
  const wrapRef = useRef(null);
  const sheet = getSheetByKey(sheetKey);

  useEffect(() => setNatural(null), [sheetKey]);

  if (!sheet)
    return (
      <div style={{ color: "#ffcc66" }}>
        Aucune feuille trouvée dans spriteRegistry.
      </div>
    );

  const zoom = Math.max(1, Math.round(32 / sheet.frameWidth));
  const cellW = sheet.frameWidth * zoom;
  const cellH = sheet.frameHeight * zoom;
  const cols = natural ? Math.floor(natural.w / sheet.frameWidth) : 0;
  const rows = natural ? Math.floor(natural.h / sheet.frameHeight) : 0;

  const cellAt = (e) => {
    const rect = wrapRef.current.getBoundingClientRect();
    return {
      c: Math.min(
        cols - 1,
        Math.max(0, Math.floor((e.clientX - rect.left) / cellW)),
      ),
      r: Math.min(
        rows - 1,
        Math.max(0, Math.floor((e.clientY - rect.top) / cellH)),
      ),
    };
  };

  const finishDrag = (d) => {
    if (!d) return;
    const col = Math.min(d.c0, d.c1);
    const row = Math.min(d.r0, d.r1);
    onSelect({
      sheet: sheet.key,
      col,
      row,
      w: Math.abs(d.c1 - d.c0) + 1,
      h: Math.abs(d.r1 - d.r0) + 1,
      cols,
    });
  };

  const shown = drag
    ? {
        col: Math.min(drag.c0, drag.c1),
        row: Math.min(drag.r0, drag.r1),
        w: Math.abs(drag.c1 - drag.c0) + 1,
        h: Math.abs(drag.r1 - drag.r0) + 1,
      }
    : selection && selection.sheet === sheet.key
      ? selection
      : null;

  return (
    <div>
      <SearchSelect
        value={sheetKey}
        options={sheets.map((sh) => ({
          value: sh.key,
          label: `${sh.name.replace(/_SPRITESHEET$/, "")} (${sh.frameWidth}px)`,
        }))}
        onChange={setSheetKey}
        placeholder="Rechercher une feuille..."
      />
      <div
        style={{
          marginTop: 6,
          maxHeight: 320,
          overflow: "auto",
          border: "1px solid rgba(138,112,80,0.5)",
          background: "#000",
        }}
      >
        <div
          ref={wrapRef}
          style={{
            position: "relative",
            width: natural ? natural.w * zoom : undefined,
            userSelect: "none",
            cursor: "crosshair",
          }}
          onMouseDown={(e) => {
            if (!natural || e.button !== 0) return;
            e.preventDefault();
            const { c, r } = cellAt(e);
            setDrag({ c0: c, r0: r, c1: c, r1: r });
          }}
          onMouseMove={(e) => {
            if (!drag) return;
            const { c, r } = cellAt(e);
            setDrag((d) => (d ? { ...d, c1: c, r1: r } : d));
          }}
          onMouseUp={() => {
            finishDrag(drag);
            setDrag(null);
          }}
          onMouseLeave={() => {
            finishDrag(drag);
            setDrag(null);
          }}
        >
          <img
            key={sheet.key}
            src={sheet.path}
            alt={sheet.key}
            draggable={false}
            onLoad={(e) =>
              setNatural({
                w: e.target.naturalWidth,
                h: e.target.naturalHeight,
              })
            }
            style={{
              display: "block",
              width: natural ? natural.w * zoom : undefined,
              imageRendering: "pixelated",
            }}
          />
          {shown && natural && (
            <div
              style={{
                position: "absolute",
                left: shown.col * cellW,
                top: shown.row * cellH,
                width: shown.w * cellW,
                height: shown.h * cellH,
                border: "2px solid #ffd700",
                background: "rgba(255,215,0,0.18)",
                boxSizing: "border-box",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
      <div style={{ color: "#8a7050", marginTop: 4 }}>
        {selection && selection.sheet === sheet.key
          ? selection.w * selection.h === 1
            ? `Tuile n° ${selection.row * selection.cols + selection.col}`
            : `Motif ${selection.w} × ${selection.h} (se répète sur la carte)`
          : "Clique une tuile, ou glisse pour un motif."}
      </div>
    </div>
  );
}

export default function HandmadeEditorScreen({ onClose }) {
  const defaultTileset = BIOME_REGISTRY[0]
    ? BIOME_REGISTRY[0].tilesetKey
    : null;

  // etat partage avec la scene Phaser (jamais recree entre deux rendus React)
  const ctrlRef = useRef(null);
  if (!ctrlRef.current) {
    ctrlRef.current = {
      level: createEmptyLevel(40, 30, defaultTileset),
      tool: "floor",
      enemyType: "enemyDefault",
      resource: null,
      resourceTier: 1,
      totalHits: 3,
      decorType: "rock_small",
      tileSel: null,
      tileSolid: false,
      tileOverhead: false,
      tileset: defaultTileset,
      depth: 1,
      scene: null,
      undo: [],
      redo: [],
      onChange: () => {},
      onMessage: () => {},
      onHover: () => {},
      commitUndo: () => {},
    };
  }
  const ctrl = ctrlRef.current;

  const containerRef = useRef(null);
  const hoverRef = useRef(null);
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);
  const [gameKey, setGameKey] = useState(0);
  const [tool, setToolState] = useState("floor");
  const [enemyType, setEnemyTypeState] = useState("enemyDefault");
  const [depthInput, setDepthInput] = useState("1");
  const [sizeInput, setSizeInput] = useState({ w: 40, h: 30 });
  const [tilesetSearch, setTilesetSearch] = useState("");
  const [message, setMessage] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [levels, setLevels] = useState([]);
  const [enemyTypes, setEnemyTypes] = useState(["enemyDefault"]);
  const [resources, setResources] = useState([]);
  const [decorTypes, setDecorTypes] = useState(KNOWN_DECOR_TYPES);
  const [resource, setResourceState] = useState(null);
  const [totalHits, setTotalHitsState] = useState(3);
  const [decorType, setDecorTypeState] = useState("rock_small");
  const [tileSel, setTileSelState] = useState(null);
  const [tileSolid, setTileSolidState] = useState(false);
  const [tileOverhead, setTileOverheadState] = useState(false);

  const showMessage = useCallback(
    (type, text) => setMessage({ type, text }),
    [],
  );

  ctrl.onChange = () => {
    setDirty(true);
    bump();
  };
  ctrl.onMessage = showMessage;
  ctrl.onHover = (tile) => {
    if (hoverRef.current)
      hoverRef.current.textContent = `x ${tile.x}, y ${tile.y}`;
  };
  ctrl.commitUndo = (beforeJson) => {
    ctrl.undo.push(beforeJson);
    if (ctrl.undo.length > 150) ctrl.undo.shift();
    ctrl.redo = [];
    ctrl.onChange();
  };

  const refreshLevelList = useCallback(() => {
    fetchEditorLevels()
      .then(
        ({
          depths,
          enemyTypes: types,
          miningResources,
          decorTypes: decors,
        }) => {
          setLevels(depths || []);
          if (miningResources && miningResources.length) {
            setResources(miningResources);
            if (!ctrl.resource) {
              ctrl.resource = miningResources[0].itemId;
              ctrl.resourceTier = miningResources[0].requiredTier;
              setResourceState(miningResources[0].itemId);
            }
          }
          if (decors && decors.length) {
            setDecorTypes([...new Set([...KNOWN_DECOR_TYPES, ...decors])]);
          }
          if (types && types.length) {
            setEnemyTypes(types);
            if (!types.includes(ctrl.enemyType)) {
              ctrl.enemyType = types[0];
              setEnemyTypeState(types[0]);
            }
          }
        },
      )
      .catch((err) =>
        showMessage("error", `Liste des niveaux : ${err.message}`),
      );
  }, [ctrl, showMessage]);

  useEffect(() => {
    refreshLevelList();
  }, [refreshLevelList]);

  // (re)cree la partie Phaser quand on charge/cree un niveau ou change de tileset
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const biome = BIOME_REGISTRY.find((b) => b.tilesetKey === ctrl.tileset);
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      pixelArt: true,
      backgroundColor: "#0b0c10",
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      scene: new EditorScene(ctrl, biome),
    });
    return () => {
      ctrl.scene = null;
      game.destroy(true);
    };
  }, [gameKey, ctrl]);

  const resetHistory = () => {
    ctrl.undo = [];
    ctrl.redo = [];
  };

  const applySnapshot = (json) => {
    ctrl.level = JSON.parse(json);
    ctrl.level.tileset = ctrl.tileset; // le tileset n'est pas dans l'historique
    if (ctrl.scene) ctrl.scene.refreshAll();
    setDirty(true);
    bump();
  };

  const handleUndo = useCallback(() => {
    if (ctrl.undo.length === 0) return;
    ctrl.redo.push(JSON.stringify(ctrl.level));
    applySnapshot(ctrl.undo.pop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleRedo = useCallback(() => {
    if (ctrl.redo.length === 0) return;
    ctrl.undo.push(JSON.stringify(ctrl.level));
    applySnapshot(ctrl.redo.pop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTool = (id) => {
    ctrl.tool = id;
    setToolState(id);
  };
  const setEnemyType = (t) => {
    ctrl.enemyType = t;
    setEnemyTypeState(t);
  };
  const setResource = (itemId) => {
    ctrl.resource = itemId;
    const entry = resources.find((r) => r.itemId === itemId);
    ctrl.resourceTier = entry ? entry.requiredTier : 1;
    setResourceState(itemId);
  };
  const setTotalHits = (n) => {
    ctrl.totalHits = n;
    setTotalHitsState(n);
  };
  const setTileOverhead = (v) => {
    ctrl.tileOverhead = v;
    setTileOverheadState(v);
  };
  const setTileSolid = (v) => {
    ctrl.tileSolid = v;
    setTileSolidState(v);
  };
  const setTileSel = (sel) => {
    ctrl.tileSel = sel;
    setTileSelState(sel);
  };
  const setDecorType = (t) => {
    ctrl.decorType = t;
    setDecorTypeState(t);
  };

  const parsedDepth = Number(depthInput);
  const depthOk =
    Number.isInteger(parsedDepth) && parsedDepth >= 0 && parsedDepth <= 9999;

  const handleSave = useCallback(async () => {
    const check = validateLevel(ctrl.level);
    if (check.errors.length > 0) {
      showMessage("error", `Enregistrement refusé : ${check.errors[0]}`);
      return;
    }
    if (!depthOk) {
      showMessage("error", "Numéro d'étage invalide (entier de 0 à 9999).");
      return;
    }
    setBusy(true);
    try {
      await saveEditorLevel(parsedDepth, levelToDef(ctrl.level));
      setDirty(false);
      showMessage(
        "ok",
        `Étage ${parsedDepth} enregistré (depth-${parsedDepth}.json).`,
      );
      refreshLevelList();
    } catch (err) {
      showMessage("error", err.message);
    } finally {
      setBusy(false);
    }
  }, [ctrl, depthOk, parsedDepth, refreshLevelList, showMessage]);

  const confirmDiscard = () =>
    !dirty ||
    window.confirm("Des modifications ne sont pas enregistrées. Continuer ?");

  const handleLoad = async (depth) => {
    if (!confirmDiscard()) return;
    setBusy(true);
    try {
      const { level } = await fetchEditorLevel(depth);
      if (!level) {
        showMessage("warn", `Aucun fichier pour l'étage ${depth}.`);
        return;
      }
      ctrl.level = levelFromDef(level);
      if (!ctrl.level.tileset) ctrl.level.tileset = defaultTileset;
      ctrl.tileset = ctrl.level.tileset;
      ctrl.depth = depth;
      setDepthInput(String(depth));
      resetHistory();
      setDirty(false);
      setGameKey((k) => k + 1);
      showMessage("ok", `Étage ${depth} chargé.`);
    } catch (err) {
      showMessage("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleNew = () => {
    if (!confirmDiscard()) return;
    const w = Math.min(150, Math.max(8, Number(sizeInput.w) || 40));
    const h = Math.min(150, Math.max(8, Number(sizeInput.h) || 30));
    ctrl.level = createEmptyLevel(w, h, ctrl.tileset);
    // une base utilisable tout de suite : sol a l'interieur, murs sur le bord
    fillRect(ctrl.level, 1, 1, w - 2, h - 2, 0);
    resetHistory();
    setDirty(true);
    setGameKey((k) => k + 1);
    showMessage("ok", `Nouveau niveau ${w}×${h}.`);
  };

  const handleResize = () => {
    const w = Math.min(150, Math.max(8, Number(sizeInput.w) || 40));
    const h = Math.min(150, Math.max(8, Number(sizeInput.h) || 30));
    const before = JSON.stringify(ctrl.level);
    resizeLevel(ctrl.level, w, h);
    ctrl.commitUndo(before);
    if (ctrl.scene) {
      ctrl.scene.refreshAll();
      ctrl.scene.fitCamera();
    }
  };

  const handleSurround = () => {
    const before = JSON.stringify(ctrl.level);
    surroundWithWalls(ctrl.level);
    if (JSON.stringify(ctrl.level) !== before) ctrl.commitUndo(before);
    if (ctrl.scene) ctrl.scene.refreshAll();
  };

  const handleDelete = async () => {
    if (!depthOk || !levels.includes(parsedDepth)) {
      showMessage("warn", "Aucun fichier à supprimer pour cet étage.");
      return;
    }
    if (
      !window.confirm(
        `Supprimer définitivement le fichier de l'étage ${parsedDepth} ?`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteEditorLevel(parsedDepth);
      showMessage(
        "ok",
        `Étage ${parsedDepth} supprimé : il sera de nouveau généré.`,
      );
      refreshLevelList();
    } catch (err) {
      showMessage("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleTilesetChange = (key) => {
    ctrl.tileset = key;
    ctrl.level.tileset = key;
    setDirty(true);
    setGameKey((k) => k + 1);
  };

  const handleClose = () => {
    if (confirmDiscard()) onClose();
  };

  const toggleGenerate = (key) => {
    const before = JSON.stringify(ctrl.level);
    ctrl.level.generate[key] = !ctrl.level.generate[key];
    ctrl.commitUndo(before);
  };

  // raccourcis : Ctrl+Z / Ctrl+Y / Ctrl+S (hors champs de saisie)
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        handleUndo();
      } else if (k === "y") {
        e.preventDefault();
        handleRedo();
      } else if (k === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo, handleSave]);

  const check = validateLevel(ctrl.level);
  const filteredBiomes = useMemo(() => {
    const q = tilesetSearch.trim().toLowerCase();
    if (!q) return BIOME_REGISTRY;
    return BIOME_REGISTRY.filter(
      (b) =>
        b.tilesetKey.toLowerCase().includes(q) ||
        b.displayName.toLowerCase().includes(q),
    );
  }, [tilesetSearch]);

  const groups = [...new Set(TOOLS.map((t) => t.group))];
  const msgColor =
    message &&
    (message.type === "error"
      ? "#ff8888"
      : message.type === "warn"
        ? "#ffcc66"
        : "#8fdc8f");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#0b0c10",
        color: "#f0e6d0",
        display: "flex",
      }}
    >
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
        <div
          ref={hoverRef}
          style={{
            position: "absolute",
            left: 8,
            bottom: 6,
            fontSize: 12,
            color: "#8a7050",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 6,
            fontSize: 11,
            color: "#8a7050",
            pointerEvents: "none",
          }}
        >
          Clic gauche : dessiner · Clic droit / molette cliquée : déplacer ·
          Molette : zoom · Ctrl+Z / Ctrl+Y / Ctrl+S
        </div>
      </div>

      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: "auto",
          padding: 10,
          boxSizing: "border-box",
          borderLeft: "1px solid rgba(138,112,80,0.5)",
          background: "rgba(20,18,15,0.95)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontSize: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong style={{ fontSize: 15 }}>Éditeur de niveaux</strong>
          <button style={btn(false)} onClick={handleClose}>
            Fermer
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>Étage</span>
          <input
            type="number"
            min={0}
            max={9999}
            value={depthInput}
            onChange={(e) => {
              setDepthInput(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n)) ctrl.depth = n;
            }}
            style={{ ...inputStyle, width: 70 }}
          />
          <button
            style={btn(false)}
            disabled={busy || !depthOk}
            onClick={() => handleLoad(parsedDepth)}
          >
            Charger
          </button>
          <button
            style={{ ...btn(dirty), opacity: busy ? 0.6 : 1 }}
            disabled={busy}
            onClick={handleSave}
          >
            Enregistrer{dirty ? " *" : ""}
          </button>
          <button style={btn(false)} disabled={busy} onClick={handleDelete}>
            Supprimer
          </button>
        </div>

        {levels.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <span style={{ color: "#8a7050" }}>Fichiers :</span>
            {levels.map((d) => (
              <button
                key={d}
                style={btn(d === parsedDepth)}
                disabled={busy}
                onClick={() => handleLoad(d)}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {message && (
          <div style={{ color: msgColor, lineHeight: 1.3 }}>{message.text}</div>
        )}

        <div
          style={{
            lineHeight: 1.35,
            padding: 6,
            borderRadius: 6,
            border: "1px solid rgba(138,112,80,0.5)",
            background: "rgba(58,47,32,0.35)",
          }}
        >
          {check.errors.map((e) => (
            <div key={e} style={{ color: "#ff8888" }}>
              ✖ {e}
            </div>
          ))}
          {check.warnings.map((w) => (
            <div key={w} style={{ color: "#ffcc66" }}>
              ⚠ {w}
            </div>
          ))}
          {check.errors.length === 0 && check.warnings.length === 0 && (
            <div style={{ color: "#8fdc8f" }}>✔ Niveau valide</div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span>Taille</span>
          <input
            type="number"
            value={sizeInput.w}
            onChange={(e) => setSizeInput((s) => ({ ...s, w: e.target.value }))}
            style={{ ...inputStyle, width: 52 }}
          />
          <span>×</span>
          <input
            type="number"
            value={sizeInput.h}
            onChange={(e) => setSizeInput((s) => ({ ...s, h: e.target.value }))}
            style={{ ...inputStyle, width: 52 }}
          />
          <button style={btn(false)} onClick={handleNew}>
            Nouveau
          </button>
          <button style={btn(false)} onClick={handleResize}>
            Redimensionner
          </button>
        </div>
        <div style={{ color: "#8a7050" }}>
          Niveau actuel : {gridWidth(ctrl.level)} × {gridHeight(ctrl.level)}
        </div>

        <div>
          <div style={{ marginBottom: 4 }}>Tileset</div>
          <input
            type="text"
            placeholder="Rechercher..."
            value={tilesetSearch}
            onChange={(e) => setTilesetSearch(e.target.value)}
            style={{ ...inputStyle, width: "100%", marginBottom: 4 }}
          />
          <select
            value={ctrl.tileset || ""}
            onChange={(e) => handleTilesetChange(e.target.value)}
            style={{ ...inputStyle, width: "100%" }}
          >
            {BIOME_REGISTRY.filter(
              (b) =>
                b.tilesetKey === ctrl.tileset && !filteredBiomes.includes(b),
            ).map((b) => (
              <option key={b.tilesetKey} value={b.tilesetKey}>
                {b.displayName} ({b.tilesetKey})
              </option>
            ))}
            {filteredBiomes.map((b) => (
              <option key={b.tilesetKey} value={b.tilesetKey}>
                {b.displayName} ({b.tilesetKey})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            style={btn(false)}
            disabled={ctrl.undo.length === 0}
            onClick={handleUndo}
          >
            ↶ Annuler
          </button>
          <button
            style={btn(false)}
            disabled={ctrl.redo.length === 0}
            onClick={handleRedo}
          >
            ↷ Rétablir
          </button>
          <button style={btn(false)} onClick={handleSurround}>
            Entourer de murs
          </button>
        </div>

        {groups.map((group) => (
          <div key={group}>
            <div style={{ marginBottom: 4, color: "#8a7050" }}>{group}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {TOOLS.filter((t) => t.group === group).map((t) => (
                <button
                  key={t.id}
                  style={btn(tool === t.id)}
                  onClick={() => setTool(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {tool === "enemy" && (
          <div>
            <div style={{ marginBottom: 4 }}>Type d'ennemi</div>
            <SearchSelect
              value={enemyType}
              options={enemyTypes.map((t) => ({ value: t, label: t }))}
              onChange={setEnemyType}
            />
          </div>
        )}

        {tool === "rock" && (
          <div>
            <div style={{ marginBottom: 4 }}>Ressource du gisement</div>
            {resources.length === 0 ? (
              <div style={{ color: "#ffcc66" }}>
                Aucune ressource trouvée dans biomeConfig.
              </div>
            ) : (
              <SearchSelect
                value={resource}
                options={resources.map((r) => ({
                  value: r.itemId,
                  label: `${r.itemId} (palier ${r.requiredTier})`,
                }))}
                onChange={setResource}
              />
            )}
            <div style={{ marginTop: 6 }}>
              Coups avant épuisement{" "}
              <input
                type="number"
                min={1}
                max={50}
                value={totalHits}
                onChange={(e) =>
                  setTotalHits(Math.max(1, Number(e.target.value) || 1))
                }
                style={{ ...inputStyle, width: 56 }}
              />
            </div>
          </div>
        )}

        {tool === "decor" && (
          <div>
            <div style={{ marginBottom: 4 }}>Type de décor</div>
            <SearchSelect
              value={decorType}
              options={decorTypes.map((t) => ({ value: t, label: t }))}
              onChange={setDecorType}
            />
          </div>
        )}

        {(tool === "tilePaint" || tool === "tileRect") && (
          <div>
            <div style={{ marginBottom: 4 }}>Palette du sol peint</div>
            <TilePalette selection={tileSel} onSelect={setTileSel} />
            <label
              style={{ display: "block", marginTop: 8, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={tileSolid}
                onChange={(e) => setTileSolid(e.target.checked)}
              />{" "}
              Non traversable (bloque le joueur et les ennemis)
            </label>
            <label
              style={{ display: "block", marginTop: 4, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={tileOverhead}
                onChange={(e) => setTileOverhead(e.target.checked)}
              />{" "}
              Au-dessus du joueur (on passe derrière)
            </label>
            <div style={{ color: "#8a7050", marginTop: 2, lineHeight: 1.3 }}>
              Repères dans l'éditeur (invisibles en jeu) : croix rouge = non
              traversable, cadre bleu = au-dessus du joueur.
            </div>
          </div>
        )}

        <div>
          <div style={{ marginBottom: 4 }}>
            Compléter par génération automatique
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px" }}>
            {GENERATE_KEYS.map((key) => (
              <label key={key} style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!ctrl.level.generate[key]}
                  onChange={() => toggleGenerate(key)}
                />{" "}
                {GENERATE_LABELS[key]}
              </label>
            ))}
          </div>
        </div>

        <div style={{ color: "#8a7050", lineHeight: 1.35 }}>
          Légende : croix rouge = tuile non traversable · cadre bleu = tuile
          au-dessus du joueur · D départ · S sortie · E escalier · V hub · B
          boutique · Q/a PNJ · C coffre · c caisse · rond rouge = ennemi · carré
          gris = gisement · rond gris = décor (2 premières lettres du type).
        </div>
      </div>
    </div>
  );
}
