// ===========================================================================
// CONFIGURATION DU JEU — fichier centralisé pour les valeurs ajustables sans
// avoir à chercher ailleurs dans le code.
//
// ⚠️ Ce fichier couvre les QUANTITÉS, FOURCHETTES et PRIX de ce qui existe
// déjà. Ajouter une nouvelle carte de coffre qui réutilise un objet déjà
// codé (ex : une deuxième potion) se fait entièrement ici. En revanche,
// un TOUT NOUVEAU type de monstre ou d'objet, avec un comportement inédit
// (nouveau sprite, nouvelle logique de combat, nouvel effet...) demande
// aussi du code dans GameController.js — ce fichier seul ne suffit pas
// dans ce cas-là.
//
// Pour les STATS DES ENNEMIS (PV/PC des rats, blobs, mimics, boss), voir
// enemyBalance.js — fichier séparé, dédié.
// ===========================================================================

// ---------------------------------------------------------------------------
// Mode Aventure : nombre de salles à générer, par difficulté. Une valeur est
// tirée aléatoirement entre min et max à chaque génération de donjon (pas
// une valeur fixe identique à chaque fois).
// ---------------------------------------------------------------------------
const ADVENTURE_ROOM_COUNT_RANGES = {
  facile: { min: 8, max: 15 },
  moyen: { min: 10, max: 18 },
  difficile: { min: 12, max: 20 },
  epique: { min: 15, max: 25 },
};

// ---------------------------------------------------------------------------
// Contenu du plateau par difficulté (mode Classique — plateau 8x8 fixe).
// Ces mêmes valeurs sont reprises et multipliées par ADVENTURE_CONTENT_SCALE
// pour le mode Aventure, vu que son plateau est bien plus grand.
// ---------------------------------------------------------------------------
const DIFFICULTY_CONFIG = {
  facile: { monstres: 3, rats: 3, herses: 3, gouffres: 0, tresor: 10 },
  moyen: { monstres: 6, rats: 6, herses: 3, gouffres: 2, tresor: 10 },
  difficile: { monstres: 9, rats: 9, herses: 5, gouffres: 5, tresor: 10 },
  epique: { monstres: 9, rats: 9, herses: 5, gouffres: 5, tresor: 10 },
};

const ADVENTURE_CONTENT_SCALE = 1.4;

// ---------------------------------------------------------------------------
// Deck de trésor : cartes piochées à l'ouverture d'un coffre. Le nombre
// associé à chaque carte détermine sa rareté relative dans le deck (plus il
// est élevé, plus la carte revient souvent). Pour ajouter une nouvelle carte
// qui réutilise un objet déjà codé, ajoute simplement une ligne ici — mais
// vérifie que GameController.js sait déjà gérer ce type de carte (recherche
// son nom dans le switch de resolveTreasureCard).
// ---------------------------------------------------------------------------
const TREASURE_CARD_POOL_CONFIG = {
  potion: 5,
  arme: 3,
  monstre: 3, // mimic
  bombe_carre: 2,
  bombe_ligne: 2,
};

// ---------------------------------------------------------------------------
// Boutique : prix et stock de départ de chaque objet, à chaque nouvelle
// partie ou nouvel étage.
// ---------------------------------------------------------------------------
const SHOP_CONFIG = {
  potionSimple: { price: 2, stock: 4 },
  potionTriple: { price: 10, stock: 2 },
  armeBonus: { price: 5, stock: 2 },
};

// ---------------------------------------------------------------------------
// Essais de dés à la création/recréation du héros, nombre de vies, et
// nombre d'étages à boucler pour gagner — identique pour les deux modes
// (Classique et Aventure), seule la structure du plateau diffère entre eux.
// ---------------------------------------------------------------------------
const DIFFICULTY_RULES = {
  facile: { maxRerolls: 4, maxLives: 4, maxFloors: 10 },
  moyen: { maxRerolls: 3, maxLives: 3, maxFloors: 6 },
  difficile: { maxRerolls: 2, maxLives: 2, maxFloors: 4 },
  epique: { maxRerolls: 1, maxLives: 1, maxFloors: 2 },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Tire une cible de salles à générer, dans la fourchette de la difficulté.
function getAdventureRoomCount(difficulty) {
  const range =
    ADVENTURE_ROOM_COUNT_RANGES[difficulty] ||
    ADVENTURE_ROOM_COUNT_RANGES.facile;
  return randInt(range.min, range.max);
}

// Reconstruit le deck de cartes trésor (à mélanger ensuite) à partir de la
// configuration ci-dessus.
function buildTreasureCardPool() {
  const pool = [];
  for (const [card, count] of Object.entries(TREASURE_CARD_POOL_CONFIG)) {
    for (let i = 0; i < count; i++) pool.push(card);
  }
  return pool;
}

module.exports = {
  ADVENTURE_ROOM_COUNT_RANGES,
  DIFFICULTY_CONFIG,
  ADVENTURE_CONTENT_SCALE,
  TREASURE_CARD_POOL_CONFIG,
  SHOP_CONFIG,
  DIFFICULTY_RULES,
  getAdventureRoomCount,
  buildTreasureCardPool,
};
