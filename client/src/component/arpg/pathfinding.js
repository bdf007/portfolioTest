const WALL = 1;

/**
 * File de priorite (min-heap) simple, dediee a A*. Necessaire pour rester
 * performant sur des grilles de 50-60 cases de cote - une recherche
 * lineaire du minimum a chaque iteration serait O(n) par pop au lieu de
 * O(log n), sensible sur les grands niveaux (biome temple/BSP).
 */
class MinHeap {
  constructor() {
    this.items = [];
  }
  get size() {
    return this.items.length;
  }
  push(item, priority) {
    this.items.push({ item, priority });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }
  pop() {
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      while (true) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let smallest = i;
        if (left < this.items.length && this.items[left].priority < this.items[smallest].priority) smallest = left;
        if (right < this.items.length && this.items[right].priority < this.items[smallest].priority) smallest = right;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top ? top.item : undefined;
  }
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const NEIGHBOURS_4 = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

/**
 * A* en 4 directions (pas de diagonale - coherent avec le reste du jeu,
 * qui deplace le joueur en 4 directions et genere des niveaux sur grille
 * orthogonale).
 *
 * @param {number[][]} grid grille de tuiles (0=sol, 1=mur)
 * @param {{x:number, y:number}} start position de depart (case)
 * @param {{x:number, y:number}} goal position d'arrivee (case)
 * @param {number} [maxNodes=5000] plafond de noeuds explores, filet de
 *   securite si jamais un niveau futur n'etait pas connexe - evite un blocage
 * @returns {{x:number, y:number}[]|null} chemin (depart inclus) ou null si
 *   inatteignable / plafond depasse
 */
function findPath(grid, start, goal, maxNodes = 5000) {
  const height = grid.length;
  const width = grid[0].length;

  if (grid[start.y][start.x] === WALL || grid[goal.y][goal.x] === WALL) {
    return null;
  }
  if (start.x === goal.x && start.y === goal.y) {
    return [{ x: start.x, y: start.y }];
  }

  const key = (x, y) => y * width + x;

  const open = new MinHeap();
  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();

  gScore.set(key(start.x, start.y), 0);
  open.push(start, manhattan(start, goal));

  let explored = 0;

  while (open.size > 0) {
    if (explored++ > maxNodes) return null; // filet de securite

    const current = open.pop();
    const currentKey = key(current.x, current.y);

    if (current.x === goal.x && current.y === goal.y) {
      // reconstruit le chemin en remontant cameFrom
      const path = [current];
      let k = currentKey;
      while (cameFrom.has(k)) {
        const prev = cameFrom.get(k);
        path.push(prev);
        k = key(prev.x, prev.y);
      }
      path.reverse();
      return path;
    }

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    for (const { dx, dy } of NEIGHBOURS_4) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (grid[ny][nx] === WALL) continue;

      const nKey = key(nx, ny);
      if (closed.has(nKey)) continue;

      const tentativeG = gScore.get(currentKey) + 1;
      if (!gScore.has(nKey) || tentativeG < gScore.get(nKey)) {
        gScore.set(nKey, tentativeG);
        cameFrom.set(nKey, { x: current.x, y: current.y });
        const f = tentativeG + manhattan({ x: nx, y: ny }, goal);
        open.push({ x: nx, y: ny }, f);
      }
    }
  }

  return null; // aucun chemin trouve
}

export { findPath, MinHeap };
