/**
 * Appels vers l'API ARPG. Regroupés ici pour que le jour d'une publication
 * séparée sur les stores, seul ce fichier a besoin de changer (URL absolue
 * vers un serveur dédié au lieu d'un chemin relatif /api/arpg/...).
 *
 * Toutes les routes sont protégées par authMiddleware (cookie JWT
 * httpOnly, cf. server/routes/arpg.js) - credentials:'include' est donc
 * obligatoire sur CHAQUE appel, sinon le navigateur n'envoie pas le
 * cookie et le serveur répond 403.
 */

/**
 * Charge (ou genere) un niveau.
 * @param {string} [lootSeed] seed distincte pour le CONTENU du butin
 *   (ennemis/coffres/boss) - varie a chaque nouvelle visite d'un etage,
 *   contrairement a `seed` (position/disposition, fixe pour toujours) -
 *   cf. MainScene.js, this.currentFloorLootSeed
 */
export async function fetchLevel(depth, seed, lootSeed) {
  const params = new URLSearchParams({
    depth,
    ...(seed ? { seed } : {}),
    ...(lootSeed ? { lootSeed } : {}),
  });
  const res = await fetch(`/api/arpg/level?${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`fetchLevel: ${res.status}`);
  }
  return res.json();
}

/**
 * Liste toutes les parties en cours du joueur connecté (plusieurs
 * parties en pause peuvent coexister) - alimente l'écran "Reprendre /
 * Nouvelle partie".
 * @returns {Promise<{games: {gameId, depth, seed, playerState, updatedAt}[]}>}
 */
export async function fetchMyGames() {
  const res = await fetch("/api/arpg/my-games", { credentials: "include" });
  if (!res.ok) {
    throw new Error(`fetchMyGames: ${res.status}`);
  }
  return res.json();
}

/**
 * Sauvegarde (crée ou met à jour) la progression du joueur connecté.
 * @param {string|null} gameId id de la partie a mettre a jour, ou null
 *   pour en creer une nouvelle (l'id créé est renvoyé dans la réponse -
 *   a retenir cote appelant pour les sauvegardes suivantes de cette
 *   meme partie).
 * @param {{depth:number, seed:string}[]} floors historique des etages
 *   deja visites (permet de regenerer le meme plan en y retournant)
 */
export async function saveProgress(gameId, depth, seed, floors, playerState) {
  const res = await fetch("/api/arpg/save", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameId: gameId || undefined,
      depth,
      seed,
      floors,
      playerState,
    }),
  });
  if (!res.ok) {
    throw new Error(`saveProgress: ${res.status}`);
  }
  return res.json();
}

/**
 * Abandonne une partie (retrait de la liste des parties en cours).
 */
export async function abandonGame(gameId) {
  const res = await fetch("/api/arpg/abandon", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) {
    throw new Error(`abandonGame: ${res.status}`);
  }
  return res.json();
}

// suppression d'une partie
export async function deleteGame(gameId) {
  const res = await fetch("/api/arpg/delete", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  });
  if (!res.ok) {
    throw new Error(`deleteGame: ${res.status}`);
  }
  return res.json();
}
