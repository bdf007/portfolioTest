/**
 * PRNG déterministe (mulberry32) à partir d'une seed texte.
 *
 * Miroir de server/services/generation/rng.js - dupliqué plutôt que
 * partagé, parce que client et serveur ne partagent pas de module Node
 * commun sans mettre en place un package partagé (hors scope pour
 * l'instant). Utilisé ici uniquement pour dériver localement la seed des
 * comportements d'ennemis (patrol/guard/rest) à partir de la seed de
 * niveau renvoyée par le serveur - ces comportements sont un détail de
 * rendu client, pas une donnée qui doit transiter par l'API (cf.
 * enemyBehavior.js).
 */
export function createRng(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  return function rng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
