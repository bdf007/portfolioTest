// ===========================================================================
// ÉQUILIBRAGE DES ENNEMIS — fichier unique, modifiable sans chercher ailleurs
// dans le code. Chaque table ci-dessous correspond à un type d'ennemi ; les
// fonctions plus bas les consomment pour générer les stats réelles en jeu.
//
// Correspondance avec les noms internes du jeu :
//   Rat              -> "rat"
//   Blob              -> "monstre"
//   Horde de rats     -> "horde-rats"      (fusion de 3 rats)
//   Blob géant        -> "monstre-gelatineux" (fusion de 3 blobs)
//   Mimic             -> "monstre-tresor"
//   Boss              -> "boss"
// ===========================================================================

// --- Rat : PV et PC (points de combat / dé d'arme) tirés dans cette
// fourchette selon la difficulté. ----------------------------------------
const RAT_STATS = {
  facile: { pvMin: 1, pvMax: 3, pcMin: 1, pcMax: 1 },
  moyen: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 1 },
  difficile: { pvMin: 1, pvMax: 5, pcMin: 1, pcMax: 2 },
  epique: { pvMin: 1, pvMax: 6, pcMin: 1, pcMax: 2 },
};

// --- Blob ("monstre" en interne) -----------------------------------------
const BLOB_STATS = {
  facile: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 1 },
  moyen: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 1 },
  difficile: { pvMin: 1, pvMax: 6, pcMin: 1, pcMax: 2 },
  epique: { pvMin: 1, pvMax: 6, pcMin: 1, pcMax: 2 },
};

// --- Mimic ("monstre-tresor" en interne) — stats par partie du corps -----
const MIMIC_STATS = {
  facile: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 2 },
  moyen: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 2 },
  difficile: { pvMin: 1, pvMax: 6, pcMin: 1, pcMax: 3 },
  epique: { pvMin: 1, pvMax: 6, pcMin: 1, pcMax: 3 },
};

// --- Boss — stats par partie du corps -------------------------------------
const BOSS_STATS = {
  facile: { pvMin: 1, pvMax: 4, pcMin: 1, pcMax: 2 },
  moyen: { pvMin: 2, pvMax: 4, pcMin: 1, pcMax: 2 },
  difficile: { pvMin: 2, pvMax: 5, pcMin: 1, pcMax: 3 },
  epique: { pvMin: 3, pvMax: 6, pcMin: 2, pcMax: 3 },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function statsFor(table, difficulty) {
  return table[difficulty] || table.facile;
}

// Rat / Blob : un seul PV (pas de parties du corps) + un PC.
function generateRatStats(difficulty) {
  const cfg = statsFor(RAT_STATS, difficulty);
  return {
    pv: randInt(cfg.pvMin, cfg.pvMax),
    weaponDie: randInt(cfg.pcMin, cfg.pcMax),
  };
}

function generateBlobStats(difficulty) {
  const cfg = statsFor(BLOB_STATS, difficulty);
  return {
    pv: randInt(cfg.pvMin, cfg.pvMax),
    weaponDie: randInt(cfg.pcMin, cfg.pcMax),
  };
}

// Mimic / Boss : 3 parties du corps (tête/torse/jambes), chacune tirée
// indépendamment dans la même fourchette, + un PC.
function generateMimicStats(difficulty) {
  const cfg = statsFor(MIMIC_STATS, difficulty);
  return {
    bodyParts: {
      tete: randInt(cfg.pvMin, cfg.pvMax),
      torse: randInt(cfg.pvMin, cfg.pvMax),
      jambes: randInt(cfg.pvMin, cfg.pvMax),
    },
    weaponDie: randInt(cfg.pcMin, cfg.pcMax),
  };
}

function generateBossStats(difficulty) {
  const cfg = statsFor(BOSS_STATS, difficulty);
  return {
    bodyParts: {
      tete: randInt(cfg.pvMin, cfg.pvMax),
      torse: randInt(cfg.pvMin, cfg.pvMax),
      jambes: randInt(cfg.pvMin, cfg.pvMax),
    },
    weaponDie: randInt(cfg.pcMin, cfg.pcMax),
  };
}

// Fusion (horde de rats / blob géant) : PAS de nouveau tirage — les 3 PV
// individuels des ennemis fusionnés sont répartis aléatoirement sur les 3
// parties du corps du résultat, et le PC est la moyenne des 3, arrondie au
// nombre entier SUPÉRIEUR.
function mergeStats(individualPvList, individualPcList) {
  const shuffledPv = [...individualPvList].sort(() => Math.random() - 0.5);
  const totalPc = individualPcList.reduce((a, b) => a + b, 0);
  const mergedPc = Math.ceil(totalPc / individualPcList.length);
  return {
    bodyParts: {
      tete: shuffledPv[0],
      torse: shuffledPv[1],
      jambes: shuffledPv[2],
    },
    weaponDie: mergedPc,
  };
}

module.exports = {
  generateRatStats,
  generateBlobStats,
  generateMimicStats,
  generateBossStats,
  mergeStats,
};
