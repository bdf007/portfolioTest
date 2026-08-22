const { createRng } = require("./rng");

const WALL = 1;
const FLOOR = 0;

function createGrid(width, height, fill) {
  return Array.from({ length: height }, () => new Array(width).fill(fill));
}

/**
 * Marche aléatoire pure ("drunkard's walk") - un ou plusieurs marcheurs
 * se déplacent case par case dans une direction aléatoire, creusant du
 * sol au fil de leur passage. Aucune salle distincte, aucune structure
 * géométrique - juste des tunnels sinueux et organiques. La forme la
 * plus "brute" de génération procédurale, à l'opposé des salles-en-
 * chaîne (roomGenerator/caveChainGenerator).
 *
 * Connexité GARANTIE par construction, pas par vérification a posteriori :
 * chaque case creusée l'est par un pas orthogonal depuis une case déjà
 * creusée (le premier marcheur part de l'origine ; chaque marcheur
 * suivant démarre sur une case DÉJÀ creusée par un précédent) - la
 * structure entière ne peut donc être qu'un seul bloc connecté, quel que
 * soit le nombre de marcheurs ou la seed.
 *
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {string} options.seed
 * @param {number} [options.targetFloorRatio=0.35] proportion de sol visée (0 à 1) - le/les marcheurs s'arrêtent une fois atteinte
 * @param {number} [options.maxSteps=60000] filet de sécurité absolu (évite une boucle infinie si le ratio cible est irréaliste)
 * @param {number} [options.walkerCount=4] nombre de marcheurs - plus il y en a, plus la structure se ramifie (plusieurs marcheurs partant de points déjà connectés, jamais de points isolés)
 * @returns {number[][]} grille 2D, 0 = sol, 1 = mur
 */
function generateDrunkardWalk({
  width,
  height,
  seed,
  targetFloorRatio = 0.35,
  maxSteps = 60000,
  walkerCount = 4,
}) {
  const grid = createGrid(width, height, WALL);
  const rng = createRng(String(seed));

  const startX = Math.floor(width / 2);
  const startY = Math.floor(height / 2);
  grid[startY][startX] = FLOOR;

  const floorTiles = [{ x: startX, y: startY }]; // sert a choisir un point de depart deja connecte pour chaque marcheur suivant
  const targetFloorCount = Math.floor(width * height * targetFloorRatio);
  const stepsPerWalker = Math.floor(maxSteps / walkerCount);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  let floorCount = 1;

  for (let w = 0; w < walkerCount && floorCount < targetFloorCount; w++) {
    // le tout premier marcheur part de l'origine ; les suivants partent
    // d'une case DEJA creusee (choisie au hasard parmi celles connues) -
    // c'est ce qui garantit que rien ne peut jamais se retrouver isole
    let pos =
      w === 0
        ? { x: startX, y: startY }
        : floorTiles[Math.floor(rng() * floorTiles.length)];

    for (
      let step = 0;
      step < stepsPerWalker && floorCount < targetFloorCount;
      step++
    ) {
      const [dx, dy] = directions[Math.floor(rng() * directions.length)];
      // clamp a l'interieur de la bordure (jamais sur le contour exterieur, qui doit rester mur)
      const nx = Math.max(1, Math.min(width - 2, pos.x + dx));
      const ny = Math.max(1, Math.min(height - 2, pos.y + dy));
      pos = { x: nx, y: ny };

      if (grid[ny][nx] === WALL) {
        grid[ny][nx] = FLOOR;
        floorCount++;
        floorTiles.push({ x: nx, y: ny });
      }
    }
  }

  return grid;
}

module.exports = { generateDrunkardWalk, WALL, FLOOR };
