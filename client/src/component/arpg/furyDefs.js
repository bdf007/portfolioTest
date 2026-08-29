/**
 * Table des furies - UNE par archetype, jamais un pool de plusieurs a
 * choisir (contrairement aux competences normales). Se declenche via
 * une touche dediee (X) une fois this.furyKillCount >= FURY_KILLS_REQUIRED
 * (cf. MainScene.js) - AUCUN cout en mana/stamina, AUCUN cooldown
 * temporel : la seule "recharge" est de re-accumuler des kills depuis
 * zero apres declenchement.
 *
 * `category` est purement informatif/thematique - chaque furie definit
 * son propre comportement via les champs presents (aoeDamage = volet
 * offensif instantane, buffStatModifiers = buff temporaire reutilisant
 * exactement le systeme deja construit pour haste/slow, healPercent =
 * volet regeneratif instantane).
 */
export const FURY_DEFS = {
  guerrier: {
    id: "berserkerRage",
    name: "Rage berserker",
    category: "offensive",
    description:
      "Explosion de dégâts en zone autour de toi, puis buff de dégâts de mêlée temporaire.",
    aoeDamage: 30,
    aoeRadius: 80,
    buffDurationMs: 6000,
    buffStatModifiers: { meleeDamagePercent: 0.6 },
  },
  archer: {
    id: "huntersFocus",
    name: "Concentration du chasseur",
    category: "offensive",
    description: "Buff de dégâts à distance temporaire.",
    buffDurationMs: 6000,
    buffStatModifiers: { rangedDamagePercent: 0.6 },
  },
  mage: {
    id: "arcaneBarrier",
    name: "Barrière arcanique",
    category: "defensive",
    description: "Réduit fortement les dégâts subis pendant un court moment.",
    buffDurationMs: 6000,
    buffStatModifiers: { defensePercent: 1.5 },
  },
  voleur: {
    id: "shadowRenewal",
    name: "Renouveau furtif",
    category: "regenerative",
    description:
      "Restaure une grosse partie de tes PV, mana et stamina instantanément.",
    healPercent: 0.5, // 50% du manquant sur chaque ressource
  },
};

export function resolveFuryDef(archetype) {
  return FURY_DEFS[archetype] || null;
}
