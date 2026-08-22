const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Structure union-find (disjoint-set) minimaliste - sert à construire un
 * arbre couvrant aléatoire sur le graphe d'adjacence des régions
 * (algorithme de Kruskal : parcourt les arêtes dans un ordre aléatoire,
 * n'en garde que celles qui relient deux composantes encore séparées).
 */
function createUnionFind(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]; // compression de chemin
      i = parent[i];
    }
    return i;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false; // deja dans la meme composante
    parent[ra] = rb;
    return true;
  }
  return { find, union };
}

/**
 * Génère un niveau par diagramme de Voronoï - N points ("graines")
 * dispersés aléatoirement, chaque case appartient à la région de la
 * graine la plus proche, donnant des salles aux formes polygonales
 * organiques (ni carrées comme roomGenerator.js, ni arrondies comme
 * caveChainGenerator.js - des arêtes droites mais irrégulières).
 *
 * POINT DELICAT (bug trouve en testant - premiere version echouait a
 * 100%, 40/40 seeds deconnectees) : murer une case des qu'un voisin
 * quelconque appartient a une autre region mure les DEUX cotes de
 * chaque frontiere, creant une zone de separation d'au moins 2 cases
 * d'epaisseur - la detection d'adjacence (qui cherchait une paire
 * sol/sol immediatement adjacente a travers un seul mur) ne trouvait
 * alors quasiment jamais de candidat valide. Corrige en ne sacrifiant
 * QU'UN SEUL cote de chaque frontiere (verifie seulement droite/bas,
 * jamais gauche/haut) - garantit une frontiere d'exactement UNE case
 * d'epaisseur partout, et la detection d'adjacence se fait dans la
 * MEME passe que la construction de la grille.
 *
 * Connexité : contrairement aux trois autres nouveaux générateurs
 * (connectés par construction ou réductibles à "garder la plus grande
 * région"), les régions de Voronoï sont des salles VRAIMENT distinctes
 * qu'il faut relier explicitement via un ARBRE COUVRANT ALÉATOIRE
 * (Kruskal : parcourt les paires adjacentes dans un ordre seedé, ne
 * garde que celles qui relient deux composantes encore séparées via
 * union-find) - garantit la connexité totale avec le MINIMUM de portes,
 * contrairement à connecter toutes les paires adjacentes (bien trop ouvert).
 *
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.cellCount=14] nombre de régions (graines) visées
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateVoronoi({ width, height, seed, cellCount = 14 }) {
  const rng = createRng(String(seed));

  // 1. disperse les graines (jamais sur la bordure exterieure)
  const sites = [];
  for (let i = 0; i < cellCount; i++) {
    sites.push({
      x: 2 + Math.floor(rng() * (width - 4)),
      y: 2 + Math.floor(rng() * (height - 4)),
    });
  }

  // 2. assigne chaque case a la region de la graine la plus proche
  const regionOf = createGrid(width, height, -1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < sites.length; i++) {
        const dx = x - sites[i].x;
        const dy = y - sites[i].y;
        const dist = dx * dx + dy * dy; // distance au carre suffit pour comparer, evite les racines carrees inutiles
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      regionOf[y][x] = best;
    }
  }

  // 3. trace les frontieres - UN SEUL cote sacrifie par frontiere (cf.
  // commentaire de la fonction) - et detecte l'adjacence dans la MEME
  // passe : chaque frontiere detectee (x,y) vs son voisin droit/bas
  // donne directement un point de porte candidat pour cette paire de
  // regions, puisqu'on connait deja les deux cases concernees
  const grid = createGrid(width, height, WALL);
  const adjacency = new Map(); // cle "i-j" (i<j) -> tableau de {x,y} candidats (case murale a ouvrir)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isBorder =
        x === 0 || y === 0 || x === width - 1 || y === height - 1;
      if (isBorder) continue; // reste mur

      const r = regionOf[y][x];
      const rightRegion = regionOf[y][x + 1]; // x+1 toujours valide (bordure exclue ci-dessus)
      const downRegion = regionOf[y + 1][x]; // idem pour y+1

      const rightDiffers = rightRegion !== r;
      const downDiffers = downRegion !== r;

      if (!rightDiffers && !downDiffers) {
        grid[y][x] = FLOOR;
      } else {
        // cette case reste MUR - c'est elle qui separe (x,y) de son
        // voisin different. Le point de porte candidat, c'est CETTE
        // case murale elle-meme, une fois qu'on saura que ses deux
        // voisins opposes sont bien du sol (verifie apres coup, une
        // fois la grille entierement construite - cf. etape 4)
        if (rightDiffers) {
          const key =
            r < rightRegion ? `${r}-${rightRegion}` : `${rightRegion}-${r}`;
          if (!adjacency.has(key)) adjacency.set(key, []);
          adjacency.get(key).push({ x, y, otherX: x + 1, otherY: y });
        }
        if (downDiffers) {
          const key =
            r < downRegion ? `${r}-${downRegion}` : `${downRegion}-${r}`;
          if (!adjacency.has(key)) adjacency.set(key, []);
          adjacency.get(key).push({ x, y, otherX: x, otherY: y + 1 });
        }
      }
    }
  }

  // 4. filtre les candidats : ne garde que ceux dont les DEUX cotes
  // (la case murale elle-meme une fois ouverte, ET son voisin oppose)
  // seraient bien du sol reel - ecarte les coins ou 3+ regions se
  // touchent, ou le voisin oppose pourrait lui-meme etre reste mur
  for (const [key, candidates] of adjacency) {
    const valid = candidates.filter((c) => grid[c.otherY][c.otherX] === FLOOR);
    adjacency.set(key, valid);
  }
  for (const key of [...adjacency.keys()]) {
    if (adjacency.get(key).length === 0) adjacency.delete(key);
  }

  // 5. arbre couvrant aleatoire (Kruskal) sur le graphe d'adjacence -
  // connexite totale garantie avec le minimum d'aretes retenues
  const uf = createUnionFind(sites.length);
  const edges = [...adjacency.keys()];
  // melange seede (Fisher-Yates) pour un ordre de parcours aleatoire mais reproductible
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  for (const key of edges) {
    const [ra, rb] = key.split("-").map(Number);
    if (uf.union(ra, rb)) {
      const candidates = adjacency.get(key);
      const doorPoint = candidates[Math.floor(rng() * candidates.length)];
      grid[doorPoint.y][doorPoint.x] = FLOOR;
    }
  }

  // 6. filet de securite : meme avec l'arbre couvrant ci-dessus, une
  // case-porte ouverte peut se reveler elle-meme isolee de sa propre
  // region d'origine (typiquement a un point ou 3+ regions se touchent)
  // - verifie par BFS, et repare directement si necessaire plutot que
  // de continuer a peaufiner la geometrie. Meme principe de repli que
  // bossRoom.js : un connecteur droit qui n'AJOUTE que du sol, jamais
  // n'en retire, ne peut donc jamais casser une connexite deja acquise.
  return repairConnectivity(grid, width, height);
}

/**
 * Verifie par BFS que toutes les cases de sol sont mutuellement
 * atteignables - si une poche isolee existe, la relie a la region
 * principale par le connecteur droit le plus court possible entre les
 * deux (n'ajoute que du sol, ne retire jamais).
 */
function repairConnectivity(grid, width, height) {
  function reachableFrom(start) {
    const visited = new Set([`${start.x},${start.y}`]);
    const stack = [start];
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (grid[ny][nx] !== FLOOR) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        stack.push({ x: nx, y: ny });
      }
    }
    return visited;
  }

  let firstFloor = null;
  const allFloor = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === FLOOR) {
        if (!firstFloor) firstFloor = { x, y };
        allFloor.push({ x, y });
      }
    }
  }
  if (!firstFloor) return grid;

  let reachable = reachableFrom(firstFloor);
  let unreached = allFloor.filter((p) => !reachable.has(`${p.x},${p.y}`));

  // repete tant qu'il reste des poches isolees - chaque reparation peut
  // en reveler une autre plus loin, rare mais possible avec beaucoup de
  // regions
  let guard = 0;
  while (unreached.length > 0 && guard < 50) {
    guard++;
    // relie la case isolee la plus proche du corps principal, via le
    // connecteur droit le plus court (d'abord horizontal, puis vertical)
    const target = unreached[0];
    let closest = null;
    let closestDist = Infinity;
    for (const key of reachable) {
      const [rx, ry] = key.split(",").map(Number);
      const dist = Math.abs(rx - target.x) + Math.abs(ry - target.y);
      if (dist < closestDist) {
        closestDist = dist;
        closest = { x: rx, y: ry };
      }
    }

    const xStart = Math.min(target.x, closest.x);
    const xEnd = Math.max(target.x, closest.x);
    for (let x = xStart; x <= xEnd; x++) grid[target.y][x] = FLOOR;
    const yStart = Math.min(target.y, closest.y);
    const yEnd = Math.max(target.y, closest.y);
    for (let y = yStart; y <= yEnd; y++) grid[y][closest.x] = FLOOR;

    reachable = reachableFrom(firstFloor);
    unreached = allFloor.filter((p) => !reachable.has(`${p.x},${p.y}`));
  }

  return grid;
}

module.exports = { generateVoronoi, WALL, FLOOR };
