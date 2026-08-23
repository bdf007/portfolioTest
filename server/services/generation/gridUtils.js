const WALL = 1;
const FLOOR = 0;

/**
 * Élimine les pincements diagonaux : deux cases de sol qui ne se
 * touchent que par un coin, séparées par deux cases de mur qui elles
 * aussi ne se touchent que par ce même coin. Un artefact classique de
 * l'automate cellulaire (grottes), mais aussi très fréquent avec la
 * marche aléatoire et surtout Voronoï (testé - largement le générateur
 * le plus touché) - laisse le joueur se faufiler en diagonale là où
 * aucun chemin orthogonal n'existe vraiment, alors que le jeu ne bouge
 * qu'en 4 directions.
 *
 * On ouvre systématiquement l'un des deux murs du pincement plutôt que
 * de fermer le sol : ça ne fait qu'ajouter du sol, jamais en retirer,
 * donc ça ne peut jamais casser la connexité déjà garantie par les
 * générateurs (keepLargestRegion pour les grottes, construction par
 * blocs pour les salles/BSP).
 *
 * Répète jusqu'à stabilité (bug trouvé en testant : une seule passe
 * laissait resurgir de nouveaux pincements juste à côté d'un pincement
 * tout juste corrigé, la première version ne rescannait jamais le
 * résultat déjà modifié) - plafonné par `maxIterations` par sécurité,
 * même principe que widenNarrowPassages plus bas.
 *
 * La bordure extérieure (toujours un mur par construction) est
 * explicitement protégée - on ne l'ouvre jamais, même si un pincement
 * s'y trouve techniquement.
 */
function removeDiagonalPinches(grid, maxIterations = 10) {
  const height = grid.length;
  const width = grid[0].length;
  let result = grid.map((row) => row.slice());

  function isBorder(x, y) {
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const additions = [];

    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const a = result[y][x]; // haut-gauche
        const b = result[y][x + 1]; // haut-droite
        const c = result[y + 1][x]; // bas-gauche
        const d = result[y + 1][x + 1]; // bas-droite

        // diagonale \ en sol, diagonale / en mur -> ouvre un des deux murs
        if (a === FLOOR && d === FLOOR && b === WALL && c === WALL) {
          if (!isBorder(x + 1, y)) additions.push([x + 1, y]);
        }
        // diagonale / en sol, diagonale \ en mur -> ouvre un des deux murs
        else if (b === FLOOR && c === FLOOR && a === WALL && d === WALL) {
          if (!isBorder(x, y)) additions.push([x, y]);
        }
      }
    }

    if (additions.length === 0) break;

    let changed = false;
    for (const [ax, ay] of additions) {
      if (result[ay][ax] === WALL) {
        result[ay][ax] = FLOOR;
        changed = true;
      }
    }
    if (!changed) break;
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

/**
 * Élargit tout "goulot" strictement 1 case de large (sol des deux côtés
 * opposés, mur des deux côtés perpendiculaires) en ouvrant l'une des
 * deux cases perpendiculaires adjacentes. Nécessaire pour tout
 * générateur SANS garantie explicite de largeur minimale (automate
 * cellulaire, marche aléatoire, Voronoï) - contrairement aux générateurs
 * à salles (roomGenerator/caveChainGenerator/bspGenerator/mazeGenerator),
 * qui contrôlent déjà leur largeur de couloir via un paramètre dédié
 * (doorWidth/corridorWidth/passageWidth).
 *
 * Répète jusqu'à ce qu'aucun goulot ne subsiste (un élargissement peut
 * en révéler un autre juste à côté), plafonné par `maxIterations` par
 * sécurité. N'AJOUTE que du sol, jamais n'en retire - ne peut donc
 * jamais casser une connexité déjà garantie par le générateur, même
 * principe que removeDiagonalPinches ci-dessus.
 *
 * La bordure extérieure reste protégée : si le seul côté disponible pour
 * élargir un goulot est la bordure, on essaie le côté opposé à la place.
 */
function widenNarrowPassages(grid, maxIterations = 10) {
  const height = grid.length;
  const width = grid[0].length;
  let result = grid.map((row) => row.slice());

  function isBorder(x, y) {
    return x <= 0 || y <= 0 || x >= width - 1 || y >= height - 1;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const additions = [];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (result[y][x] !== FLOOR) continue;

        const horizontalPinch =
          result[y][x - 1] === FLOOR &&
          result[y][x + 1] === FLOOR &&
          result[y - 1][x] === WALL &&
          result[y + 1][x] === WALL;
        if (horizontalPinch) {
          if (!isBorder(x, y - 1)) additions.push([x, y - 1]);
          else if (!isBorder(x, y + 1)) additions.push([x, y + 1]);
          continue;
        }

        const verticalPinch =
          result[y - 1][x] === FLOOR &&
          result[y + 1][x] === FLOOR &&
          result[y][x - 1] === WALL &&
          result[y][x + 1] === WALL;
        if (verticalPinch) {
          if (!isBorder(x - 1, y)) additions.push([x - 1, y]);
          else if (!isBorder(x + 1, y)) additions.push([x + 1, y]);
        }
      }
    }

    if (additions.length === 0) break;

    let changed = false;
    for (const [ax, ay] of additions) {
      if (result[ay][ax] === WALL) {
        result[ay][ax] = FLOOR;
        changed = true;
      }
    }
    if (!changed) break;
  }

  return result;
}

/**
 * Applique removeDiagonalPinches et widenNarrowPassages EN ALTERNANCE
 * jusqu'à stabilité complète, pas une seule fois chacun - bug trouvé en
 * testant : chacun peut révéler un nouveau cas pour l'autre (élargir un
 * goulot droit peut créer un nouveau pincement diagonal juste à côté, et
 * inversement), une seule passe de chaque ne suffit pas toujours à tout
 * nettoyer. C'est CETTE fonction qu'il faut appeler depuis un générateur
 * (pas les deux fonctions séparément) pour une garantie complète.
 *
 * N'ajoute que du sol, ne peut donc jamais casser une connexité déjà
 * garantie par le générateur appelant.
 */
function ensureMinimumPassageWidth(grid, maxRounds = 8) {
  let result = grid;
  for (let round = 0; round < maxRounds; round++) {
    const before = JSON.stringify(result);
    result = removeDiagonalPinches(result);
    result = widenNarrowPassages(result);
    if (JSON.stringify(result) === before) break;
  }
  return result;
}

/**
 * Dilate le sol d'une case : tout mur adjacent (4-directions) a une case
 * de sol devient sol lui aussi. Necessaire en dernier recours pour
 * garantir qu'un bloc 2x2 (approximation de l'emprise reelle du heros)
 * puisse se deplacer PARTOUT ou le sol brut est connecte - contrairement
 * a widenNarrowPassages/removeDiagonalPinches (qui ne traitent que des
 * motifs de pincement precis, case par case), un enchainement de virages
 * chacun "large" localement peut rester impraticable pour un bloc plus
 * large sans qu'aucun pincement individuel ne soit detecte (bug trouve
 * en testant une vraie partie - screenshot a l'appui). Une approche
 * ciblee (elargir seulement le chemin le plus court reliant une poche
 * mal connectee) a ete tentee mais ne convergeait pas de facon fiable ;
 * la dilatation complete, elle, fonctionne a coup sur, au prix d'un
 * ratio de sol significativement plus eleve (~+35-40% observe) - un vrai
 * compromis assume : une grotte moins fine visuellement mais garantie
 * praticable partout, plutot que l'inverse.
 */
function dilateFloor(grid) {
  const height = grid.length;
  const width = grid[0].length;
  const result = grid.map((row) => row.slice());
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] !== WALL) continue;
      const hasFloorNeighbor =
        grid[y - 1][x] === FLOOR ||
        grid[y + 1][x] === FLOOR ||
        grid[y][x - 1] === FLOOR ||
        grid[y][x + 1] === FLOOR;
      if (hasFloorNeighbor) result[y][x] = FLOOR;
    }
  }
  return result;
}

/**
 * Garantit qu'un bloc 2x2 (l'emprise reelle du heros, hitbox ~18-24px
 * contre 16px/case) puisse se deplacer en continu sur toute la zone
 * connectee - pas seulement qu'aucun pincement classique n'existe (cf.
 * ensureMinimumPassageWidth, insuffisant a lui seul pour ce cas). Une
 * dilatation suivie d'un nouveau passage de ensureMinimumPassageWidth
 * (la dilatation peut elle-meme introduire de nouveaux pincements
 * diagonaux, teste). N'ajoute que du sol, ne peut donc jamais casser une
 * connexite deja garantie par le generateur appelant.
 */
function ensureHitboxClearance(grid) {
  return ensureMinimumPassageWidth(dilateFloor(grid));
}

module.exports = {
  removeDiagonalPinches,
  keepLargestRegion,
  widenNarrowPassages,
  ensureMinimumPassageWidth,
  ensureHitboxClearance,
};
