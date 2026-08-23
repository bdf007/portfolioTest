const { createRng } = require("./rng");
const { keepLargestRegion, ensureMinimumPassageWidth } = require("./gridUtils");

const WALL = 1;
const FLOOR = 0;

/**
 * Lissage cubique (smoothstep) - courbe d'interpolation plus douce
 * qu'une simple interpolation linéaire, évite les arêtes visibles aux
 * jonctions entre cellules du bruit.
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Bruit de valeur ("value noise") seedé, lissé par interpolation - dans
 * l'esprit d'un bruit de Perlin/Simplex (continu, organique) sans
 * réimplémenter l'algorithme exact de Perlin (vecteurs de gradient,
 * produits scalaires) : une grille grossière de valeurs aléatoires,
 * interpolée en douceur entre chaque point, donne un résultat visuel
 * très proche pour un seuillage de terrain, avec beaucoup moins de
 * risques d'erreur d'implémentation.
 *
 * @param {number} width largeur en cases
 * @param {number} height hauteur en cases
 * @param {Function} rng generateur seede (cf. rng.js)
 * @param {number} noiseScale taille (en cases) d'une cellule du bruit grossier - plus grand = formes plus larges et plus lisses
 * @returns {number[][]} grille de valeurs continues, approx entre 0 et 1
 */
function generateNoiseField(width, height, rng, noiseScale) {
  const coarseCols = Math.ceil(width / noiseScale) + 1;
  const coarseRows = Math.ceil(height / noiseScale) + 1;

  const coarse = Array.from({ length: coarseRows }, () =>
    Array.from({ length: coarseCols }, () => rng()),
  );

  const field = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = x / noiseScale;
      const gy = y / noiseScale;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = smoothstep(gx - x0);
      const ty = smoothstep(gy - y0);

      const v00 = coarse[y0][x0];
      const v10 = coarse[y0][x0 + 1];
      const v01 = coarse[y0 + 1][x0];
      const v11 = coarse[y0 + 1][x0 + 1];

      const top = lerp(v00, v10, tx);
      const bottom = lerp(v01, v11, tx);
      field[y][x] = lerp(top, bottom, ty);
    }
  }

  return field;
}

/**
 * Génère un niveau par bruit continu seuillé - contrairement à
 * l'automate cellulaire (caveGenerator.js, qui lisse itérativement un
 * bruit initial DISCRET par des règles de voisinage), ici le bruit
 * lui-même est déjà continu et lisse par construction (interpolation) -
 * donne des formes plus douces, moins "grumeleuses", avec des transitions
 * graduelles plutôt que des règles de voisinage strictes.
 *
 * Comme tout seuillage de bruit peut produire plusieurs zones de sol
 * déconnectées, `keepLargestRegion` (gridUtils.js, déjà utilisée
 * ailleurs dans le projet) élimine tout ce qui n'est pas la plus grande
 * région - garantit la connexité sans jamais avoir à y penser
 * manuellement. Si le ratio de sol final est trop faible (seuil trop
 * agressif pour cette seed), réessaie avec une variante de seed - même
 * filet de sécurité que caveGenerator.js.
 *
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.noiseScale=8] taille d'une cellule de bruit grossier (en cases) - plus grand = formes plus larges/lisses, plus petit = plus de détail/bruit
 * @param {number} [options.threshold=0.5] seuil de conversion sol/mur (0 à 1) - plus bas = plus de sol, plus haut = plus de mur
 * @param {number} [options.minFloorRatio=0.25] en dessous de ce ratio de sol (apres nettoyage de connexite), la tentative est rejetee
 * @param {number} [options.maxAttempts=5] nombre max de tentatives avant d'abandonner
 * @returns {number[][]|null} grille 2D (0=sol, 1=mur), ou null si aucune tentative n'a satisfait minFloorRatio
 */
function generateNoiseCave({
  width,
  height,
  seed,
  noiseScale = 8,
  threshold = 0.5,
  minFloorRatio = 0.25,
  maxAttempts = 5,
}) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed = attempt === 0 ? String(seed) : `${seed}#${attempt}`;
    const rng = createRng(attemptSeed);

    const field = generateNoiseField(width, height, rng, noiseScale);

    let grid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => {
        const isBorder =
          x === 0 || y === 0 || x === width - 1 || y === height - 1;
        if (isBorder) return WALL; // bordure exterieure toujours muree, comme les autres generateurs
        return field[y][x] >= threshold ? FLOOR : WALL;
      }),
    );

    grid = keepLargestRegion(grid, width, height);
    // le seuillage de bruit n'a pas de garantie de largeur minimale -
    // corrige les pincements droits/diagonaux (cf. gridUtils.js) ; a
    // 32px/case, une seule case de large suffit deja largement pour la
    // hitbox du heros (~18-24px), pas besoin de la dilatation plus
    // agressive utilisee un temps a l'echelle 16px. N'ajoute que du sol,
    // ne peut donc jamais casser la connexite garantie par
    // keepLargestRegion.
    grid = ensureMinimumPassageWidth(grid);

    let floorCount = 0;
    for (const row of grid) for (const v of row) if (v === FLOOR) floorCount++;
    const floorRatio = floorCount / (width * height);

    if (floorRatio >= minFloorRatio) {
      return grid;
    }
  }

  console.warn(
    `[noiseGenerator] seed "${seed}" : ratio de sol minimal (${minFloorRatio}) non atteint après ${maxAttempts} tentatives`,
  );
  return null;
}

module.exports = { generateNoiseCave, WALL, FLOOR };
