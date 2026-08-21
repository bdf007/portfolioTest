const WALL = 1;
const FLOOR = 0;

/**
 * Élimine les pincements diagonaux : deux cases de sol qui ne se
 * touchent que par un coin, séparées par deux cases de mur qui elles
 * aussi ne se touchent que par ce même coin. Un artefact classique de
 * l'automate cellulaire (grottes) - plus rarement des corridors BSP -
 * qui laisse le joueur se faufiler en diagonale là où aucun chemin
 * orthogonal n'existe vraiment, alors que le jeu ne bouge qu'en 4
 * directions.
 *
 * On ouvre systématiquement l'un des deux murs du pincement plutôt que
 * de fermer le sol : ça ne fait qu'ajouter du sol, jamais en retirer,
 * donc ça ne peut jamais casser la connexité déjà garantie par les
 * générateurs (keepLargestRegion pour les grottes, construction par
 * blocs pour les salles/BSP).
 *
 * La bordure extérieure (toujours un mur par construction) est
 * explicitement protégée - on ne l'ouvre jamais, même si un pincement
 * s'y trouve techniquement.
 */
function removeDiagonalPinches(grid) {
  const height = grid.length;
  const width = grid[0].length;
  const result = grid.map((row) => row.slice());

  function isBorder(x, y) {
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  }

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = grid[y][x]; // haut-gauche
      const b = grid[y][x + 1]; // haut-droite
      const c = grid[y + 1][x]; // bas-gauche
      const d = grid[y + 1][x + 1]; // bas-droite

      // diagonale \ en sol, diagonale / en mur -> ouvre un des deux murs
      if (a === FLOOR && d === FLOOR && b === WALL && c === WALL) {
        if (!isBorder(x + 1, y)) result[y][x + 1] = FLOOR;
      }
      // diagonale / en sol, diagonale \ en mur -> ouvre un des deux murs
      else if (b === FLOOR && c === FLOOR && a === WALL && d === WALL) {
        if (!isBorder(x, y)) result[y][x] = FLOOR;
      }
    }
  }

  return result;
}

/**
 * Repère toutes les régions de sol connectées (4-directions) et ne garde
 * que la plus grande - le reste est comblé en mur.
 *
 * Extraite de caveGenerator.js (comportement identique, testé) pour être
 * réutilisée par tout générateur qui produit du sol par un procédé
 * pouvant accidentellement isoler des poches (comme townGenerator.js,
 * où des bâtiments placés trop densément pourraient sceller un coin de
 * la place) - les générateurs qui construisent leur connexité par
 * construction (salles/BSP) n'en ont pas besoin.
 */
function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

function keepLargestRegion(grid, width, height) {
  const visited = createGrid(width, height, false);
  let bestRegion = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== FLOOR || visited[y][x]) continue;

      const region = [];
      const stack = [[x, y]];
      visited[y][x] = true;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        region.push([cx, cy]);

        const neighbours = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbours) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (visited[ny][nx] || grid[ny][nx] !== FLOOR) continue;
          visited[ny][nx] = true;
          stack.push([nx, ny]);
        }
      }

      if (!bestRegion || region.length > bestRegion.length) {
        bestRegion = region;
      }
    }
  }

  if (!bestRegion) {
    return grid;
  }

  const cleaned = createGrid(width, height, WALL);
  for (const [x, y] of bestRegion) {
    cleaned[y][x] = FLOOR;
  }
  return cleaned;
}

module.exports = { removeDiagonalPinches, keepLargestRegion };
