import { findPath } from "./pathfinding";

/**
 * Comportements d'ennemis au repos (avant detection du joueur). Chaque
 * type a un rayon d'aggro different - un garde en faction est plus
 * attentif qu'un ennemi qui se repose, ce qui donne une raison de jeu a
 * la distinction sans avoir besoin de sprites differents pour l'instant.
 */
const AGGRO_RADIUS_BY_TYPE = {
  guard: 8, // poste fixe, tres attentif
  patrol: 7, // en mouvement, attention normale
  rest: 4, // repos, reagit tard
};

const DEFAULT_TYPE_WEIGHTS = { guard: 0.35, patrol: 0.4, rest: 0.25 };

/**
 * Tire un type de comportement selon des poids, de facon seedee (meme rng
 * que le reste de la generation => reproductible).
 */
function pickBehaviorType(rng, weights = DEFAULT_TYPE_WEIGHTS) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [type, w] of entries) {
    if (roll < w) return type;
    roll -= w;
  }
  return entries[entries.length - 1][0];
}

/**
 * Cherche une case de sol a portee de patrouille du poste (`home`) et
 * verifie qu'un chemin raisonnable y mene. Retourne null si aucune case
 * convenable n'est trouvee (l'ennemi reste alors sur place, comme un
 * garde, meme s'il etait cense patrouiller) - degradation propre plutot
 * que de forcer une patrouille absurde sur une carte trop exigue.
 */
function pickPatrolRoute(
  grid,
  home,
  rng,
  { radius = 5, maxPathLength = 20, maxTries = 15 } = {},
) {
  const height = grid.length;
  const width = grid[0].length;
  const FLOOR = 0;

  const candidates = [];
  const minX = Math.max(0, home.x - radius);
  const maxX = Math.min(width - 1, home.x + radius);
  const minY = Math.max(0, home.y - radius);
  const maxY = Math.min(height - 1, home.y + radius);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (grid[y][x] !== FLOOR) continue;
      const dist = Math.hypot(x - home.x, y - home.y);
      if (dist >= 2 && dist <= radius) candidates.push({ x, y });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const tries = Math.min(maxTries, candidates.length);
  for (let i = 0; i < tries; i++) {
    const target = candidates[i];
    const path = findPath(grid, home, target, maxPathLength * 4);
    if (path && path.length - 1 <= maxPathLength) {
      return { target, path };
    }
  }

  return null; // pas de route convenable trouvee - l'ennemi restera immobile
}

/**
 * Construit l'etat de comportement complet d'un ennemi a sa creation.
 * `home` reste fixe pour toute la duree de vie de l'ennemi - c'est le
 * point de reference pour la patrouille et pour le retour apres une
 * chasse.
 */
function createEnemyBehavior(grid, home, rng, typeWeights) {
  const type = pickBehaviorType(rng, typeWeights);
  const behavior = {
    type,
    home,
    aggroRadius: AGGRO_RADIUS_BY_TYPE[type],
    state: type, // au repos, l'etat courant = le type (patrol/guard/rest)
    patrolPath: null,
    patrolDirection: 1, // 1 = vers la cible, -1 = retour vers home
    patrolIndex: 0,
  };

  if (type === "patrol") {
    const route = pickPatrolRoute(grid, home, rng);
    if (route) {
      behavior.patrolPath = route.path;
    } else {
      // aucune route trouvee : degrade en garde plutot que de laisser un
      // etat "patrol" sans jamais rien a patrouiller
      behavior.type = "guard";
      behavior.state = "guard";
      behavior.aggroRadius = AGGRO_RADIUS_BY_TYPE.guard;
    }
  }

  return behavior;
}

/**
 * Transition pure de machine a etats - ne depend d'aucun objet Phaser ni
 * de la grille, uniquement des faits fournis en entree. Facile a tester
 * exhaustivement sans avoir a simuler un vrai niveau.
 *
 * @param {string} currentState 'guard'|'patrol'|'rest'|'chase'|'returning'
 * @param {Object} ctx
 * @param {number} ctx.distanceToPlayer distance (en cases) au joueur
 * @param {boolean} ctx.losClear ligne de vue degagee vers le joueur
 * @param {number} ctx.aggroRadius rayon d'aggro de cet ennemi
 * @param {boolean} ctx.arrivedAtHome vrai si l'ennemi est revenu a son poste
 * @param {boolean} [ctx.isPlayerBehind] vrai si le joueur est dans l'angle
 *   mort (derriere) de cet ennemi, cf. MainScene (calcule a partir de
 *   enemy.lastDir) - bloque uniquement la DETECTION INITIALE (repos ->
 *   chase), jamais un ennemi DEJA en chase (une fois engage, il continue
 *   de suivre meme si le joueur passe brievement derriere lui - sinon
 *   "rester derriere un ennemi qui chasse" deviendrait un moyen trivial
 *   de ne jamais se faire toucher). Absent/`undefined` = jamais derriere
 *   (comportement inchange, compat ascendante).
 * @returns {string} le nouvel etat. 'home' est un signal special : le
 *   caller doit alors reprendre le type d'origine (patrol/guard/rest) et
 *   relancer sa patrouille le cas echeant - ce n'est pas un etat runtime
 *   qui persiste.
 */
function decideNextState(
  currentState,
  {
    distanceToPlayer,
    losClear,
    aggroRadius,
    arrivedAtHome,
    isPlayerBehind = false,
  },
) {
  const seesPlayer = losClear && distanceToPlayer <= aggroRadius;
  const detectsPlayer = seesPlayer && !isPlayerBehind;

  if (currentState === "chase") {
    return seesPlayer ? "chase" : "returning"; // deja engage - "derriere" ne compte plus, continue de suivre
  }

  if (currentState === "returning") {
    if (detectsPlayer) return "chase"; // re-aggro en chemin vers la maison
    if (arrivedAtHome) return "home"; // signal : reprendre l'activite d'origine
    return "returning";
  }

  // etats de repos (guard/patrol/rest) : seule une detection FRONTALE
  // (jamais dans l'angle mort) declenche l'aggro initiale
  return detectsPlayer ? "chase" : currentState;
}

export {
  AGGRO_RADIUS_BY_TYPE,
  DEFAULT_TYPE_WEIGHTS,
  pickBehaviorType,
  pickPatrolRoute,
  createEnemyBehavior,
  decideNextState,
};
