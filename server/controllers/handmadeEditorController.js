const {
  listHandmadeDepths,
  readHandmadeRaw,
  saveHandmadeLevel,
  deleteHandmadeLevel,
} = require("../services/generation/handmadeLevel");
const { ENEMY_TYPES } = require("../services/generation/enemyStats");
const { BIOMES, TOWN_BIOME } = require("../services/generation/biomeConfig");

/**
 * Ressources de gisement et types de decor connus, lus dans biomeConfig
 * (union de tous les biomes) : l'editeur propose ainsi ce que le jeu utilise
 * deja, sans liste a maintenir en double.
 */
function collectBiomeMeta() {
  const resources = new Map(); // itemId -> requiredTier
  const decorTypes = new Set();
  for (const biome of [...BIOMES, TOWN_BIOME].filter(Boolean)) {
    const pool = (biome.miningConfig && biome.miningConfig.resourcePool) || [];
    for (const entry of pool) {
      if (!resources.has(entry.itemId)) {
        resources.set(entry.itemId, entry.requiredTier ?? 1);
      }
    }
    const types =
      (biome.decorationConfig && biome.decorationConfig.decorTypes) || [];
    types.forEach((t) => decorTypes.add(t));
  }
  return {
    miningResources: [...resources].map(([itemId, requiredTier]) => ({
      itemId,
      requiredTier,
    })),
    decorTypes: [...decorTypes],
  };
}

/**
 * Routes de l'editeur de niveaux (cf. routes/arpg.js). Ecrivent des
 * fichiers sur le serveur : reservees aux comptes listes dans la variable
 * d'environnement ARPG_EDITOR_USERS (noms d'utilisateur separes par des
 * virgules). Variable absente/vide = editeur desactive pour tout le monde.
 */
function isEditor(req) {
  const allowed = (process.env.ARPG_EDITOR_USERS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const name = String((req.user && req.user.username) || "").toLowerCase();
  return allowed.length > 0 && allowed.includes(name);
}

function guard(handler) {
  return async (req, res) => {
    if (!isEditor(req)) {
      return res.status(403).json({ error: "Editeur non autorise" });
    }
    try {
      await handler(req, res);
    } catch (error) {
      // erreurs de validation (messages [handmadeLevel] ...) -> 400 lisible
      const isValidation = /^\[handmadeLevel\]/.test(error.message);
      if (!isValidation) console.error("[HandmadeEditor]", error);
      res
        .status(isValidation ? 400 : 500)
        .json({
          error: isValidation ? error.message : "Internal server error",
        });
    }
  };
}

const parseDepth = (req) => Number(req.params.depth);

// GET /api/arpg/editor/status - le client sait ainsi s'il faut afficher le bouton
async function status(req, res) {
  res.json({ allowed: isEditor(req) });
}

// GET /api/arpg/editor/levels -> { depths, enemyTypes, miningResources, decorTypes }
const listLevels = guard(async (req, res) => {
  res.json({
    depths: await listHandmadeDepths(),
    enemyTypes: Object.keys(ENEMY_TYPES),
    ...collectBiomeMeta(),
  });
});

// GET /api/arpg/editor/levels/:depth -> { level } (null si pas de fichier)
const getLevelFile = guard(async (req, res) => {
  res.json({ level: await readHandmadeRaw(parseDepth(req)) });
});

// PUT /api/arpg/editor/levels/:depth  body: { level }
const putLevelFile = guard(async (req, res) => {
  await saveHandmadeLevel(parseDepth(req), req.body && req.body.level);
  res.json({ ok: true });
});

// DELETE /api/arpg/editor/levels/:depth
const removeLevelFile = guard(async (req, res) => {
  res.json({ ok: true, existed: await deleteHandmadeLevel(parseDepth(req)) });
});

module.exports = {
  status,
  listLevels,
  getLevelFile,
  putLevelFile,
  removeLevelFile,
};
