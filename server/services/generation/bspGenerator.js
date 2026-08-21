const { createRng } = require('./rng');

const WALL = 1;
const FLOOR = 0;

/**
 * Génération par partitionnement binaire de l'espace (BSP).
 *
 * Principe :
 * 1. On découpe récursivement la grille en deux régions (verticalement ou
 *    horizontalement, en alternant selon le ratio largeur/hauteur) jusqu'à
 *    atteindre une profondeur max ou une taille de région trop petite.
 * 2. Chaque région "feuille" reçoit une salle, plus petite que la région
 *    elle-même (marge aléatoire) - ça crée des salles de tailles et
 *    formes variées, à l'opposé des salles uniformes du random walk.
 * 3. En remontant l'arbre, chaque nœud connecte les salles de ses deux
 *    sous-régions par un couloir. La connexité est garantie par
 *    construction : il n'existe qu'un seul arbre, donc un seul graphe
 *    connexe, pas besoin de vérification a posteriori.
 *
 * Comparé au random walk (roomGenerator.js), le BSP produit des niveaux
 * plus ouverts et plus variés en taille de salle - adapté aux biomes de
 * fin de progression plutôt qu'aux couloirs répétitifs du début.
 */

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Découpe récursivement une région en un arbre BSP.
 * Chaque nœud est soit une feuille ({x,y,w,h}), soit un nœud interne avec
 * left/right (et pas de room propre).
 */
function splitNode(region, rng, minLeafSize, depth, maxDepth) {
  const { x, y, w, h } = region;
  const node = { x, y, w, h, left: null, right: null };

  const tooDeep = depth >= maxDepth;
  // une région ne peut être coupée que si les deux enfants resteraient
  // au moins à minLeafSize - sinon on la garde comme feuille
  const canSplitH = w >= minLeafSize * 2; // découpe verticale (coupe la largeur en deux)
  const canSplitV = h >= minLeafSize * 2; // découpe horizontale (coupe la hauteur en deux)

  if (tooDeep || (!canSplitH && !canSplitV)) {
    return node; // feuille
  }

  // on découpe selon le grand axe pour éviter des régions trop allongées,
  // avec un peu d'aléatoire si les proportions sont proches du carré
  let splitVertically; // true = on coupe la largeur (deux régions côte à côte)
  if (canSplitH && canSplitV) {
    if (w / h > 1.25) splitVertically = true;
    else if (h / w > 1.25) splitVertically = false;
    else splitVertically = rng() < 0.5;
  } else {
    splitVertically = canSplitH;
  }

  if (splitVertically) {
    const splitX = minLeafSize + Math.floor(rng() * (w - 2 * minLeafSize));
    node.left = splitNode({ x, y, w: splitX, h }, rng, minLeafSize, depth + 1, maxDepth);
    node.right = splitNode(
      { x: x + splitX, y, w: w - splitX, h },
      rng,
      minLeafSize,
      depth + 1,
      maxDepth
    );
  } else {
    const splitY = minLeafSize + Math.floor(rng() * (h - 2 * minLeafSize));
    node.left = splitNode({ x, y, w, h: splitY }, rng, minLeafSize, depth + 1, maxDepth);
    node.right = splitNode(
      { x, y: y + splitY, w, h: h - splitY },
      rng,
      minLeafSize,
      depth + 1,
      maxDepth
    );
  }

  return node;
}

/**
 * Place une salle à l'intérieur de chaque région feuille, avec une marge
 * aléatoire par rapport aux bords de la région - c'est cette marge
 * variable qui donne des salles de tailles différentes plutôt qu'un
 * pavage uniforme.
 */
function createRooms(node, rng, roomMargin) {
  if (!node.left && !node.right) {
    const maxMarginX = Math.max(1, Math.floor(node.w * 0.3));
    const maxMarginY = Math.max(1, Math.floor(node.h * 0.3));
    const marginLeft = roomMargin + Math.floor(rng() * maxMarginX);
    const marginTop = roomMargin + Math.floor(rng() * maxMarginY);
    const marginRight = roomMargin + Math.floor(rng() * maxMarginX);
    const marginBottom = roomMargin + Math.floor(rng() * maxMarginY);

    const roomW = Math.max(3, node.w - marginLeft - marginRight);
    const roomH = Math.max(3, node.h - marginTop - marginBottom);

    node.room = {
      x: node.x + marginLeft,
      y: node.y + marginTop,
      w: Math.min(roomW, node.w - marginLeft),
      h: Math.min(roomH, node.h - marginTop),
    };
    return;
  }

  if (node.left) createRooms(node.left, rng, roomMargin);
  if (node.right) createRooms(node.right, rng, roomMargin);
}

function roomCenter(room) {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

/**
 * Creuse un couloir en L entre deux points, épaisseur `corridorWidth`.
 * L'ordre horizontal-puis-vertical ou vertical-puis-horizontal est
 * choisi aléatoirement pour varier la silhouette des couloirs.
 */
function carveCorridor(grid, width, height, from, to, corridorWidth, rng) {
  function carveHorizontal(y, x1, x2) {
    const [xa, xb] = x1 <= x2 ? [x1, x2] : [x2, x1];
    for (let x = xa; x <= xb; x++) {
      for (let t = 0; t < corridorWidth; t++) {
        const ty = y + t;
        if (x >= 0 && x < width && ty >= 0 && ty < height) grid[ty][x] = FLOOR;
      }
    }
  }
  function carveVertical(x, y1, y2) {
    const [ya, yb] = y1 <= y2 ? [y1, y2] : [y2, y1];
    for (let y = ya; y <= yb; y++) {
      for (let t = 0; t < corridorWidth; t++) {
        const tx = x + t;
        if (tx >= 0 && tx < width && y >= 0 && y < height) grid[y][tx] = FLOOR;
      }
    }
  }

  if (rng() < 0.5) {
    carveHorizontal(from.y, from.x, to.x);
    carveVertical(to.x, from.y, to.y);
  } else {
    carveVertical(from.x, from.y, to.y);
    carveHorizontal(to.y, from.x, to.x);
  }
}

/**
 * Parcourt l'arbre en post-ordre : connecte les sous-régions gauche/droite
 * de chaque nœud interne, et renvoie un point représentatif (centre d'une
 * salle) pour que le nœud parent puisse à son tour s'y connecter.
 */
function connectRooms(node, grid, width, height, corridorWidth, rng) {
  if (!node.left && !node.right) {
    return roomCenter(node.room);
  }

  const leftPoint = node.left ? connectRooms(node.left, grid, width, height, corridorWidth, rng) : null;
  const rightPoint = node.right ? connectRooms(node.right, grid, width, height, corridorWidth, rng) : null;

  if (leftPoint && rightPoint) {
    carveCorridor(grid, width, height, leftPoint, rightPoint, corridorWidth, rng);
    return leftPoint;
  }

  return leftPoint || rightPoint;
}

function carveAllRooms(node, grid, width, height) {
  if (!node.left && !node.right) {
    const { x, y, w, h } = node.room;
    for (let ty = y; ty < y + h; ty++) {
      for (let tx = x; tx < x + w; tx++) {
        if (tx >= 0 && tx < width && ty >= 0 && ty < height) grid[ty][tx] = FLOOR;
      }
    }
    return;
  }
  if (node.left) carveAllRooms(node.left, grid, width, height);
  if (node.right) carveAllRooms(node.right, grid, width, height);
}

/**
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.minLeafSize=10] taille minimale d'une région avant qu'elle devienne une feuille
 * @param {number} [options.maxDepth=5] profondeur max de découpe
 * @param {number} [options.roomMargin=1] marge minimale entre une salle et les bords de sa région
 * @param {number} [options.corridorWidth=2] épaisseur des couloirs reliant les salles
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateBSP({
  width,
  height,
  seed,
  minLeafSize = 10,
  maxDepth = 5,
  roomMargin = 1,
  corridorWidth = 2,
}) {
  if (width < minLeafSize * 2 || height < minLeafSize * 2) {
    throw new Error(
      `generateBSP: grille (${width}x${height}) trop petite pour minLeafSize=${minLeafSize}`
    );
  }

  const rng = createRng(String(seed));
  const grid = createGrid(width, height, WALL);

  const root = splitNode({ x: 0, y: 0, w: width, h: height }, rng, minLeafSize, 0, maxDepth);
  createRooms(root, rng, roomMargin);
  carveAllRooms(root, grid, width, height);
  connectRooms(root, grid, width, height, corridorWidth, rng);

  return grid;
}

module.exports = { generateBSP, WALL, FLOOR };
