/**
 * Configuration des boss - à QUELLES profondeurs un boss apparaît, et
 * QUELLE configuration (type + stats FIXES, jamais dérivées d'une
 * formule de croissance) pour chacune.
 *
 * Contrairement aux ennemis normaux (cf. enemyStats.js), un boss
 * n'apparaît qu'UNE seule fois dans toute une partie - inutile de le
 * faire grandir avec la profondeur comme un ennemi qu'on re-rencontre
 * sans cesse. Chaque boss a donc ses PROPRES stats choisies à la main,
 * une entrée par profondeur precise plutôt qu'une plage avec un type
 * réutilisé et mis à l'échelle.
 *
 * Séparé de biomeConfig.js volontairement : un biome (temple, 18-100)
 * peut couvrir PLUSIEURS profondeurs de boss (19, 25, 29, 35...) - les
 * deux notions ne se découpent pas selon les mêmes plages, les mélanger
 * dans un seul fichier aurait forcé soit à dupliquer l'information, soit
 * à caler artificiellement les plages de biomes sur celles des boss.
 */

/**
 * Un boss apparaît à CHAQUE étage se terminant par 5 ou 9 (5, 9, 15, 19,
 * 25, 29, 35, 39...) - un motif qui se répète indéfiniment jusqu'à
 * MAX_DEPTH, jamais une liste figée de profondeurs précises. Étendre la
 * progression du jeu (repousser MAX_DEPTH) ne nécessite donc AUCUN
 * changement ici.
 */
function isBossDepth(depth) {
  const lastDigit = depth % 10;
  return lastDigit === 5 || lastDigit === 9;
}

// plus petite profondeur que le motif ci-dessus peut jamais produire -
// sert de repère fixe (ex: seuil d'éligibilité aux quêtes "récupérer sur
// le boss", cf. ArpgController.js) sans avoir à chercher dynamiquement
const EARLIEST_BOSS_DEPTH = 5;

/**
 * Une entrée par profondeur de boss CONNUE - `stats` est directement ce
 * que le joueur affrontera, sans transformation ni mise à l'echelle.
 * Ajouter un nouveau boss = ajouter une entrée ici avec sa propre
 * profondeur exacte, sans toucher au reste du système.
 *
 * Toute profondeur de boss (cf. isBossDepth) SANS entrée explicite ici
 * retombe sur la DERNIERE entrée connue a une profondeur <= la
 * profondeur courante (cf. getBossConfigForDepth) - une simple
 * reutilisation temporaire, jamais une extrapolation ni un calcul :
 * signal volontairement visible ("meme boss, memes stats qu'avant")
 * qu'aucun boss dedie n'a encore ete concu pour cette profondeur.
 */
const BOSS_ASSIGNMENTS = [
  {
    depth: 5,
    type: "bigbat",
    // valeurs directement reprises de l'ancien calcul par formule a
    // depth=5 (cf. l'historique de enemyStats.js) - preserve le
    // comportement actuel a l'identique pour ce boss precis, seul a
    // exister pour l'instant
    stats: { hp: 100, damage: 10, defense: 2, speed: 62, xpReward: 50 },
  },
  {
    depth: 9,
    type: "bigbat",
    stats: { hp: 200, damage: 20, defense: 4, speed: 62, xpReward: 70 },
    // valeurs directement reprises de l'ancien calcul par formule a
  },
  // Exemple pour un futur boss, une fois son sprite + ses stats prets :
  // {
  //   depth: 9,
  //   type: "autreBoss",
  //   stats: { hp: 450, damage: 30, defense: 3, speed: 70, xpReward: 220 },
  // },
];

/**
 * @param {number} depth
 * @returns {{depth:number, type:string, stats:{hp:number,damage:number,defense:number,speed:number,xpReward:number}}}
 */
function getBossConfigForDepth(depth) {
  const exact = BOSS_ASSIGNMENTS.find((a) => a.depth === depth);
  if (exact) return exact;

  // pas d'entree exacte : reutilise la DERNIERE connue a une profondeur
  // <= celle-ci (jamais la plus proche dans l'absolu - toujours en
  // arriere, jamais en avance sur un boss pas encore atteint)
  const eligible = BOSS_ASSIGNMENTS.filter((a) => a.depth <= depth);
  if (eligible.length > 0) return eligible[eligible.length - 1];

  // filet de securite ultime (ne devrait jamais arriver tant qu'une
  // entree existe a EARLIEST_BOSS_DEPTH) - evite un crash si jamais
  // BOSS_ASSIGNMENTS etait un jour vide
  return BOSS_ASSIGNMENTS[0];
}

/**
 * Les deux profondeurs de boss de la DIZAINE EN COURS pour une ville a
 * `townDepth` (toujours un multiple de 10, cf. TOWN_INTERVAL dans
 * biomeConfig.js - une ville n'apparait jamais ailleurs). Sert a limiter
 * les quetes "recuperer sur le boss" aux boss RECEMMENT affrontes -
 * jamais aux dizaines precedentes, meme si ces boss ont bien ete vaincus
 * plus tot dans la partie : a l'etage 20, seuls 15 et 19 sont
 * references, plus jamais 5 ni 9.
 *
 * @param {number} townDepth doit etre un multiple de 10
 * @returns {number[]} les 2 profondeurs de boss de cette dizaine, ordre croissant (ex: [15, 19] pour townDepth=20)
 */
function getBossDepthsInCurrentDecade(townDepth) {
  return [townDepth - 5, townDepth - 1];
}

module.exports = {
  isBossDepth,
  getBossConfigForDepth,
  getBossDepthsInCurrentDecade,
  EARLIEST_BOSS_DEPTH,
  BOSS_ASSIGNMENTS,
};
