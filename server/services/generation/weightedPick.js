/**
 * Tirage pondere pour les listes d'un biome (cf. biomeConfig.js) :
 * biome.tileset et biome.enemyTypes. Une entree est soit une simple
 * chaine (poids 1), soit { id, weight } - les deux formes peuvent etre
 * melangees dans la meme liste.
 *
 * Utilise par arpgController.js (tileset + types d'ennemis) et
 * secretRoomGenerator.js (ennemis de la salle secrete 'combat').
 */

function weightedEntryId(entry) {
  return typeof entry === "string" ? entry : entry.id;
}

function weightedEntryWeight(entry) {
  return typeof entry === "string" ? 1 : (entry.weight ?? 1);
}

/**
 * rngValue = UN tirage rng() dans [0,1) - meme nombre d'appels au rng
 * qu'avant, seul le calcul de l'index change (resultat identique a
 * l'ancien Math.floor(rng * length) quand tous les poids valent 1).
 * @returns {string} l'id de l'entree tiree
 */
function pickWeightedId(entries, rngValue) {
  const total = entries.reduce((sum, e) => sum + weightedEntryWeight(e), 0);
  let r = rngValue * total;
  for (const entry of entries) {
    r -= weightedEntryWeight(entry);
    if (r < 0) return weightedEntryId(entry);
  }
  return weightedEntryId(entries[entries.length - 1]);
}

/** Liste des ids de enemyTypes d'un biome, poids ignores. */
function getEnemyTypeIds(biome) {
  return (biome.enemyTypes || []).map(weightedEntryId);
}

module.exports = {
  weightedEntryId,
  weightedEntryWeight,
  pickWeightedId,
  getEnemyTypeIds,
};
