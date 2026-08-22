const { createRng } = require("./rng");
const { ITEM_TYPES, getPurchasableItemIds } = require("./itemTypes");

/**
 * Génère le stock d'une boutique de ville - un SOUS-ENSEMBLE des objets
 * achetables (pas forcément tous), tiré de façon seedée (même seed =
 * même boutique, comme le reste de la génération - une ville donnée a
 * toujours le même stock, pour toujours).
 *
 * Stock volontairement ILLIMITÉ (pas de suivi "combien reste-t-il") -
 * plus simple, pas de nouvel état à persister. Si un jour tu veux un
 * stock limité, il faudra suivre les achats comme currentFloorOpenedChests
 * suit les coffres ouverts (cf. le mode d'emploi objets/butin).
 *
 * @param {string} seed
 * @param {number} [stockSizeMin=3]
 * @param {number} [stockSizeMax=5]
 * @returns {{itemId: string, price: number}[]}
 */
function generateShopStock(seed, stockSizeMin = 3, stockSizeMax = 5) {
  const rng = createRng(String(seed) + "-shop-stock");
  const candidates = getPurchasableItemIds();

  // melange Fisher-Yates seede (pas de tri par fonction de comparaison
  // aleatoire, statistiquement biaise et deja evite ailleurs dans le projet)
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const stockSize = Math.min(
    shuffled.length,
    stockSizeMin + Math.floor(rng() * (stockSizeMax - stockSizeMin + 1)),
  );

  return shuffled.slice(0, stockSize).map((itemId) => ({
    itemId,
    price: ITEM_TYPES[itemId].price,
  }));
}

module.exports = { generateShopStock };
