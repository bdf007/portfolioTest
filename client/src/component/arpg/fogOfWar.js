/**
 * Calcul de visibilité par ligne de vue (raycasting), pour le brouillard
 * de guerre. Contrairement à un simple rayon, une case n'est visible que
 * si la ligne droite qui la relie au joueur n'est pas coupée par un mur
 * avant d'y arriver - on ne "voit" donc jamais à travers les murs.
 *
 * C'est un calcul client (ce que le joueur voit à l'écran), pas une donnée
 * qui a besoin de vivre côté serveur - contrairement à la génération de
 * niveau, la visibilité n'a pas d'enjeu d'anti-triche ou de cohérence
 * multi-joueurs tant que chaque joueur ne voit que son propre écran.
 */

const WALL = 1;

/**
 * Tracé de Bresenham entre deux cases, bornes incluses. Utilisé pour
 * suivre la ligne droite entre le joueur et chaque case candidate.
 */
function bresenhamLine(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

/**
 * Une case est visible si aucun mur ne coupe la ligne droite entre le
 * joueur et cette case, murs et cible exclus du test (un mur reste
 * visible - c'est sa face qu'on voit - mais ce qui est derrière ne l'est
 * pas, et le mur en question ne se bloque pas lui-même).
 *
 * Verifie aussi les coins : quand le trace de Bresenham avance en
 * diagonale (x ET y changent entre deux points echantillonnes), il peut
 * sauter directement d'une case de sol a l'autre sans jamais visiter les
 * deux cases "coin" adjacentes - si ces deux coins sont des murs qui se
 * touchent en diagonale, la ligne les traverse sans les voir, et on
 * "voit" a travers un angle de mur qui devrait boucher la vue. Coherent
 * avec le reste du jeu (deplacement et pathfinding 100% orthogonaux,
 * jamais de diagonale permise nulle part ailleurs) : si l'un des deux
 * coins est un mur, la diagonale ne doit pas laisser passer la vue.
 */
function hasClearLineOfSight(grid, width, height, fromX, fromY, toX, toY) {
  const line = bresenhamLine(fromX, fromY, toX, toY);
  const isWallAt = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return true;
    return grid[y][x] === WALL;
  };

  // contrairement a une premiere version, la verification de coin doit
  // s'appliquer a CHAQUE pas du trace, y compris le dernier (qui atteint
  // la cible) - deux cases immediatement adjacentes en diagonale ne
  // produisent que 2 points au total (depart+arrivee, rien entre les
  // deux), c'est justement le cas le plus frequent du bug rapporte. La
  // cible elle-meme reste exemptee du test "est-ce un mur" (on voit
  // toujours la face d'un mur qu'on regarde), mais pas du test de coin :
  // un vrai coin de mur bloque la diagonale meme si ce qu'il y a
  // derriere serait normalement visible.
  for (let i = 1; i < line.length; i++) {
    const { x, y } = line[i];
    const isTarget = i === line.length - 1;

    if (!isTarget) {
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      if (grid[y][x] === WALL) return false;
    }

    const prev = line[i - 1];
    const dx = x - prev.x;
    const dy = y - prev.y;
    if (dx !== 0 && dy !== 0) {
      if (isWallAt(prev.x + dx, prev.y) || isWallAt(prev.x, prev.y + dy)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Calcule l'ensemble des cases visibles depuis une position, dans un
 * rayon donné, en tenant compte des murs.
 *
 * @param {number[][]} grid grille de tuiles (0=sol, 1=mur)
 * @param {number} originX position du joueur (case, pas pixel)
 * @param {number} originY
 * @param {number} radius rayon de vision en cases
 * @returns {Set<string>} clés "x,y" des cases visibles
 */
function computeVisibleTiles(grid, originX, originY, radius) {
  const height = grid.length;
  const width = grid[0].length;
  const visible = new Set();

  const minX = Math.max(0, originX - radius);
  const maxX = Math.min(width - 1, originX + radius);
  const minY = Math.max(0, originY - radius);
  const maxY = Math.min(height - 1, originY + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dist = Math.hypot(x - originX, y - originY);
      if (dist > radius) continue;
      if (hasClearLineOfSight(grid, width, height, originX, originY, x, y)) {
        visible.add(x + "," + y);
      }
    }
  }

  return visible;
}

/**
 * État de visibilité à maintenir au fil de la partie. 0 = jamais vu,
 * 1 = déjà vu (mémoire, assombri), 2 = visible actuellement.
 *
 * `update` ne recalcule que si le joueur a changé de case (ou si c'est
 * le premier appel) - inutile de refaire le raycasting à chaque frame
 * si le joueur ne bouge pas d'une case.
 */
function createFogState(grid) {
  const height = grid.length;
  const width = grid[0].length;
  const state = Array.from({ length: height }, () => new Array(width).fill(0));
  let lastOrigin = null;

  return {
    state,

    /**
     * @returns {{x:number, y:number}[]} les cases dont l'état a changé
     *   depuis le dernier appel, pour ne redessiner que ce qui bouge
     */
    update(originX, originY, radius) {
      if (lastOrigin && lastOrigin.x === originX && lastOrigin.y === originY) {
        return [];
      }
      lastOrigin = { x: originX, y: originY };

      const changed = [];
      const newlyVisible = computeVisibleTiles(grid, originX, originY, radius);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const wasVisible = state[y][x] === 2;
          const isVisible = newlyVisible.has(x + "," + y);

          if (isVisible && !wasVisible) {
            state[y][x] = 2;
            changed.push({ x, y });
          } else if (!isVisible && wasVisible) {
            state[y][x] = 1; // repasse en "déjà vu" plutôt que "jamais vu"
            changed.push({ x, y });
          }
        }
      }

      return changed;
    },
  };
}

export {
  computeVisibleTiles,
  hasClearLineOfSight,
  bresenhamLine,
  createFogState,
};
