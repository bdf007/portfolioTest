const { createRng } = require("./rng");
const { keepLargestRegion, ensureMinimumPassageWidth } = require("./gridUtils");

const WALL = 1;
const FLOOR = 0;

/**
 * Génération de ville : une place ouverte (tout en sol au départ), sur
 * laquelle on place plusieurs bâtiments rectangulaires (blocs de mur -
 * des obstacles à contourner, pas des salles à traverser pour l'instant,
 * aucun système de boutique/PNJ n'existe encore côté jeu). Pas d'ennemis
 * dans ce biome - géré entièrement via `enemyBaseCount: 0` dans
 * biomeConfig.js, ce générateur n'a rien à savoir sur les ennemis.
 *
 * Contrairement aux grottes (formes organiques) ou aux salles/BSP
 * (connexité garantie par construction), une ville est fondamentalement
 * un espace ouvert avec des obstacles ajoutés - la connexité est donc
 * quasi automatique (les rues subsistent partout où aucun bâtiment n'a
 * été placé), mais on applique quand même keepLargestRegion en filet de
 * sécurité : rien n'empêche mathématiquement deux bâtiments adjacents
 * aux bords opposés d'une grille trop petite de sceller un coin.
 */

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

function rectOverlapsWithMargin(a, b, margin) {
  return !(
    a.x + a.w + margin <= b.x ||
    b.x + b.w + margin <= a.x ||
    a.y + a.h + margin <= b.y ||
    b.y + b.h + margin <= a.y
  );
}

/**
 * Place jusqu'à `buildingCount` bâtiments rectangulaires, sans
 * chevauchement, avec un espacement minimal entre eux et par rapport à
 * la bordure (garantit des rues praticables tout autour). Si un
 * bâtiment ne trouve pas de place après `maxTriesPerBuilding` essais, on
 * continue simplement avec moins de bâtiments plutôt que d'échouer -
 * une ville légèrement moins dense que demandé n'est pas un problème,
 * contrairement à une grotte trop pauvre en sol.
 */
function placeBuildings(grid, width, height, buildingCount, rng, opts) {
  const { minSpacing, maxTriesPerBuilding } = opts;
  const placed = [];

  for (let i = 0; i < buildingCount; i++) {
    for (let attempt = 0; attempt < maxTriesPerBuilding; attempt++) {
      const footprint =
        HOUSE_FOOTPRINTS[Math.floor(rng() * HOUSE_FOOTPRINTS.length)];
      const w = footprint.tileW;
      const h = footprint.tileH;
      const x = 2 + Math.floor(rng() * Math.max(1, width - w - 4));
      const y = 2 + Math.floor(rng() * Math.max(1, height - h - 4));

      const rect = { x, y, w, h };
      const overlaps = placed.some((b) =>
        rectOverlapsWithMargin(rect, b, minSpacing),
      );
      if (overlaps) continue;

      placed.push({ ...rect, houseKey: footprint.key });
      for (let ty = y; ty < y + h; ty++) {
        for (let tx = x; tx < x + w; tx++) {
          grid[ty][tx] = WALL;
        }
      }
      break;
    }
  }

  return placed;
}

// gabarits des maisons disponibles (cf. CITY_HOUSES cote client,
// spriteRegistry.js) - tailles en TUILES, arrondies au superieur a
// partir des dimensions pixel reelles (ceil(px/16)) pour que le
// rectangle mural genere ici soit TOUJOURS au moins aussi grand que le
// sprite reellement dessine cote client, jamais plus petit
const HOUSE_FOOTPRINTS = [
  { key: "house_small_red_1", tileW: 5, tileH: 5 },
  { key: "house_small_orange_2", tileW: 5, tileH: 5 },
  { key: "house_small_red_3", tileW: 5, tileH: 5 },
  { key: "house_small_red_4", tileW: 5, tileH: 5 },
  { key: "house_small_green_1", tileW: 5, tileH: 5 },
  { key: "house_small_teal_2", tileW: 5, tileH: 5 },
  { key: "house_small_teal_3", tileW: 5, tileH: 5 },
  { key: "house_small_blue_4", tileW: 5, tileH: 5 },
  { key: "house_row_red_A", tileW: 5, tileH: 5 },
  { key: "house_row_red_B", tileW: 5, tileH: 5 },
  { key: "house_row_green_A", tileW: 5, tileH: 5 },
  { key: "house_row_teal_B", tileW: 5, tileH: 5 },
  { key: "house_tall_red_A", tileW: 7, tileH: 6 },
  { key: "house_tall_orange_B", tileW: 7, tileH: 6 },
  { key: "house_tall_green_A", tileW: 7, tileH: 6 },
  { key: "house_tall_teal_B", tileW: 7, tileH: 6 },
];

/**
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.buildingCount=8] nombre de bâtiments visés (peut être moins si la place est dense)
 * @param {number} [options.minBuildingSize=4] taille min d'un côté de bâtiment (tuiles)
 * @param {number} [options.maxBuildingSize=8] taille max d'un côté de bâtiment (tuiles)
 * @param {number} [options.minSpacing=3] espacement minimal entre bâtiments (largeur de rue garantie)
 * @param {number} [options.maxTriesPerBuilding=20] tentatives avant d'abandonner un bâtiment
 * @returns {number[][]} grille 2D, 0 = sol (place/rues), 1 = mur (bordure + bâtiments)
 */
function generateTown({
  width,
  height,
  seed,
  buildingCount = 8,
  // minBuildingSize = 4,
  // maxBuildingSize = 8,
  minSpacing = 3,
  maxTriesPerBuilding = 20,
}) {
  if (width < 20 || height < 20) {
    throw new Error("generateTown: width/height trop petits (minimum 20x20)");
  }

  const rng = createRng(String(seed));

  let grid = createGrid(width, height, FLOOR);
  // bordure en mur, meme convention que les autres generateurs
  for (let x = 0; x < width; x++) {
    grid[0][x] = WALL;
    grid[height - 1][x] = WALL;
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = WALL;
    grid[y][width - 1] = WALL;
  }

  const buildings = placeBuildings(grid, width, height, buildingCount, rng, {
    minSpacing,
    maxTriesPerBuilding,
  });

  // cases protegees = tout le pourtour mural des batiments - ne doivent
  // JAMAIS etre converties en sol par ensureMinimumPassageWidth, sinon le
  // rectangle mural retrecit d'un cote sans que building.x/y/w/h (utilisees
  // pour positionner le SPRITE cote client) ne le sachent, causant un
  // debordement visuel du sprite hors de son mur
  const protectedCells = new Set();
  for (const b of buildings) {
    for (let ty = b.y; ty < b.y + b.h; ty++) {
      for (let tx = b.x; tx < b.x + b.w; tx++) {
        protectedCells.add(`${tx},${ty}`);
      }
    }
  }

  // filet de securite : garantit la connexite meme si un placement
  // improbable de batiments avait scelle une poche (cf. commentaire en tete)
  grid = keepLargestRegion(grid, width, height);
  // corrige les pincements droits/diagonaux (cf. gridUtils.js) - a
  // 32px/case, une seule case de large suffit deja largement pour la
  // hitbox du heros, pas besoin de la dilatation plus agressive utilisee
  // un temps a l'echelle 16px. N'ajoute que du sol, ne peut donc jamais
  // casser la connexite garantie juste au-dessus.
  grid = ensureMinimumPassageWidth(grid, 8, protectedCells);

  // renvoie aussi les rectangles de batiments (pas seulement la grille)
  // - sert par ex. a placer "l'entree" de la boutique juste devant un
  // batiment plutot qu'a une case de sol quelconque, cf.
  // findBuildingFrontTile ci-dessous
  return { grid, buildings };
}

/**
 * Trouve une case de sol juste devant un batiment - sert a positionner
 * un point d'interaction ("entree") de facon coherente visuellement,
 * plutot qu'a une case de sol quelconque sans rapport avec la
 * disposition de la ville. "Devant" = le cote bas du batiment en
 * PRIORITE (convention habituelle en vue du dessus : la facade/porte
 * fait face au joueur, pas un cote ou l'arriere) - les 3 autres cotes ne
 * servent que de repli si le bas n'a pas de case de sol valide (bord de
 * carte, bloque par un autre element).
 *
 * @param {number[][]} grid
 * @param {{x:number,y:number,w:number,h:number}} building
 * @param {Function} rng generateur seede (cf. rng.js) - utilise seulement pour l'ordre des cotes de repli
 * @returns {{x:number,y:number}|null}
 */
function findBuildingFrontTile(grid, building, rng) {
  const height = grid.length;
  const width = grid[0].length;

  const fallbackSides = ["top", "left", "right"];
  for (let i = fallbackSides.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [fallbackSides[i], fallbackSides[j]] = [fallbackSides[j], fallbackSides[i]];
  }
  const sides = ["bottom", ...fallbackSides];

  for (const side of sides) {
    let x;
    let y;
    if (side === "top") {
      x = building.x + Math.floor(building.w / 2);
      y = building.y - 1;
    } else if (side === "bottom") {
      x = building.x + Math.floor(building.w / 2);
      y = building.y + building.h;
    } else if (side === "left") {
      x = building.x - 1;
      y = building.y + Math.floor(building.h / 2);
    } else {
      x = building.x + building.w;
      y = building.y + Math.floor(building.h / 2);
    }

    if (
      y > 0 &&
      y < height - 1 &&
      x > 0 &&
      x < width - 1 &&
      grid[y][x] === FLOOR
    ) {
      return { x, y };
    }
  }
  return null;
}

module.exports = { generateTown, findBuildingFrontTile, WALL, FLOOR };
