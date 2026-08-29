const { createRng } = require("./rng");

const FLOOR = 0;

/**
 * Place des points de spawn ennemis sur les cases de sol d'un niveau déjà
 * généré, en respectant une distance minimale par rapport au spawn du
 * joueur (pas d'ennemi collé à l'arrivée) et entre eux (pas de paquet
 * compact au même endroit).
 *
 * Déterministe par seed, comme les générateurs de niveau : mêmes grille +
 * seed + paramètres => mêmes positions d'ennemis à chaque appel.
 *
 * Note d'architecture : cette fonction ne connaît rien de l'état "vivant/
 * mort" des ennemis - c'est volontaire. Le comportement "nettoyé tant que
 * le joueur reste sur l'étage, respawn au retour" (cf. /areas/phaser-arpg.md)
 * s'obtient simplement en NE PERSISTANT PAS l'état des kills au-delà de la
 * visite en cours : tant que le contrôleur ne sauvegarde pas quels ennemis
 * ont été tués, chaque nouvel appel à /api/arpg/level régénère une liste
 * fraîche et entièrement vivante - le respawn "gratuit", sans logique de
 * timer ni de nettoyage à écrire. Ça fonctionne à l'identique que le plan
 * du niveau (la seed du terrain) reste fixe ou soit re-tiré à chaque
 * entrée, donc pas besoin d'avoir tranché cette question pour commencer.
 *
 * @param {Object} options
 * @param {number[][]} options.grid grille de tuiles du niveau (0=sol, 1=mur)
 * @param {string} options.seed
 * @param {{x:number, y:number}} options.playerSpawn position de spawn du joueur (en cases)
 * @param {number} [options.enemyCount=6] nombre d'ennemis souhaité
 * @param {number} [options.minDistanceFromPlayer=5] distance minimale (en cases) par rapport au spawn joueur
 * @param {number} [options.maxDistanceFromPlayer] distance maximale (en cases) par rapport au spawn joueur (optionnel)
 * @param {number} [options.minDistanceBetweenEnemies=3] distance minimale entre deux ennemis
 * @param {Set<string>} [options.allowedTiles] si fourni, restreint les
 *   candidats a cet ensemble ("x,y") - sert a exclure une zone scellee
 *   (salle de boss non ouverte) : sans ca, un ennemi normal pourrait
 *   atterrir sur une case de sol injoignable, rendant impossible de
 *   nettoyer l'etage pour ouvrir la porte
 * @returns {{x:number, y:number}[]} positions de spawn (peut être < enemyCount si le niveau est trop petit/dense)
 */
function generateEnemySpawns({
  grid,
  seed,
  playerSpawn,
  enemyCount = 6,
  minDistanceFromPlayer = 5,
  minDistanceBetweenEnemies = 3,
  maxDistanceFromPlayer = Infinity,
  allowedTiles = null,
}) {
  const height = grid.length;
  const width = grid[0].length;
  const rng = createRng(String(seed));

  // 1. toutes les cases de sol suffisamment loin du joueur (et dans
  // allowedTiles si fourni)
  const candidates = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] !== FLOOR) continue;
      if (allowedTiles && !allowedTiles.has(`${x},${y}`)) continue;
      const dist = Math.hypot(x - playerSpawn.x, y - playerSpawn.y);
      if (dist >= minDistanceFromPlayer && dist <= maxDistanceFromPlayer) {
        candidates.push({ x, y });
      }
    }
  }

  // 2. melange seede (Fisher-Yates) pour ne pas toujours piocher dans le
  // meme ordre de balayage (qui favoriserait le haut-gauche de la grille)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // 3. selection gloutonne : on accepte un candidat s'il respecte la
  // distance minimale avec tous les spawns deja retenus
  const spawns = [];
  for (const candidate of candidates) {
    if (spawns.length >= enemyCount) break;
    const tooClose = spawns.some(
      (s) =>
        Math.hypot(s.x - candidate.x, s.y - candidate.y) <
        minDistanceBetweenEnemies,
    );
    if (!tooClose) spawns.push(candidate);
  }

  if (spawns.length < enemyCount) {
    console.warn(
      `[enemySpawner] seed "${seed}" : seulement ${spawns.length}/${enemyCount} spawns placés (niveau trop petit ou trop dense pour les contraintes de distance)`,
    );
  }

  return spawns;
}

module.exports = { generateEnemySpawns };
