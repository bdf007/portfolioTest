/**
 * Table des competences/pouvoirs - meme esprit qu'itemDefs.js (une
 * table statique, resolveAbilityDef gere le repli si une competence
 * cote serveur n'est pas encore connue du client).
 *
 * `archetype` : specifique a un heros (cf. HERO_STATS_PROFILES) - jamais
 * utilisable par un autre archetype, meme trouvee/achetee.
 *
 * `unlockLevel` : si defini, debloquee AUTOMATIQUEMENT des que le joueur
 * (du bon archetype) atteint ce niveau - cf. MainScene.checkLevelUp.
 * Absent/null = ne se debloque jamais toute seule, doit etre obtenue
 * autrement (loot, achat en boutique - representee comme un objet
 * "parchemin" dans l'inventaire, cf. itemDefs.js/category 'abilityScroll').
 *
 * `effectType` : 'aoe' (degats en zone, IMPLEMENTE), 'pierce' (transperce
 * plusieurs ennemis alignes, a construire), 'debuff' (ralentit/affaiblit
 * temporairement un ennemi, a construire), 'buff' (ameliore
 * temporairement une stat du heros, a construire) - les 3 derniers
 * reutiliseront le systeme de statusEffects deja construit pour
 * saignement/brulure, etendu pour porter des modificateurs de stat en
 * plus des degats par tic.
 */
export const ABILITY_DEFS = {
  fireball: {
    id: "fireball",
    name: "Boule de feu",
    archetypes: ["mage"],
    description:
      "Projectile qui explose en zone au contact d'un ennemi (18 degats). 15 mana.",
    manaCost: 15,
    cooldownMs: 3000,
    effectType: "projectileAoe", // voyage comme un projectile, explose au contact - distinct de 'aoe' (instantane, centre sur le heros)
    damage: 18, // degats a TOUS les ennemis dans le rayon de l'EXPLOSION, pas juste celui touche en premier
    radius: 70, // rayon de l'explosion au point d'impact
    projectileSpeed: 260,
    maxDistance: 400, // disparait sans exploser s'il ne touche rien avant cette distance
    unlockLevel: 2,
    inflictsEffect: {
      type: "burn",
      kind: "dot",
      chance: 0.3,
      damagePerTick: 3,
      tickIntervalMs: 1000,
      ticks: 3,
    },
  },
  whirlwind: {
    id: "whirlwind",
    name: "Tourbillon",
    archetypes: ["guerrier", "archer"],
    description:
      "Frappe tous les ennemis a portee de melee (14 degats). 20 stamina.",
    staminaCost: 20,
    cooldownMs: 4000,
    effectType: "aoe",
    damage: 14,
    radius: 55, // proche de playerMeleeRange - degats tout autour, contrairement au cone normal de l'attaque de base
    unlockLevel: 3,
  },

  haste: {
    id: "haste",
    name: "Hâte",
    archetypes: ["guerrier", "archer"], // utilisable par tous - restreins si tu veux la limiter
    description:
      "Augmente ta vitesse de déplacement pendant un court moment. 15 stamina.",
    staminaCost: 15,
    cooldownMs: 8000,
    effectType: "selfBuff",
    statModifiers: { moveSpeedPercent: 0.6 },
    durationMs: 4000,
    unlockLevel: 3, // a debloquer via parchemin/loot pour l'instant
  },
  slow: {
    id: "slow",
    name: "Ralentissement",
    archetypes: ["mage", "archer"],
    description: "Ralentit tous les ennemis à portée de mêlée. 15 mana.",
    manaCost: 15,
    cooldownMs: 6000,
    effectType: "aoeDebuff",
    radius: 55,
    statModifiers: { moveSpeedPercent: -0.5 },
    durationMs: 3000,
    unlockLevel: 2,
  },
  piercingArrow: {
    id: "piercingArrow",
    name: "Flèche perforante",
    archetypes: ["archer", "voleur"],
    description:
      "Tire une flèche qui transperce plusieurs ennemis alignés (14 degats). 15 stamina.",
    staminaCost: 15,
    cooldownMs: 3500,
    effectType: "pierce",
    damage: 14,
    projectileSpeed: 380,
    maxDistance: 450,
    maxPierceCount: 3, // touche au plus 3 ennemis avant de disparaitre - optionnel, absent = infini (transperce jusqu'a maxDistance)
    unlockLevel: 1,
  },
  flameWeapon: {
    id: "flameWeapon",
    name: "Lame enflammée",
    archetypes: ["guerrier"],
    description:
      "Le prochain coup porté inflige des dégâts supplémentaires (+10) et une forte chance de brûlure. 15 stamina.",
    staminaCost: 15,
    cooldownMs: 5000,
    effectType: "weaponImbue",
    bonusDamage: 10,
    inflictsEffect: {
      type: "burn",
      kind: "dot",
      chance: 0.8, // haute expres - c'est un coup DELIBEREMENT enchante, pas le taux passif habituel d'une arme
      damagePerTick: 3,
      tickIntervalMs: 1000,
      ticks: 3,
    },
    unlockLevel: 5,
  },
  fireWall: {
    id: "fireWall",
    name: "Mur de flammes",
    archetypes: ["mage"],
    description:
      "Crée un mur de flammes qui inflige des dégâts sur la durée aux ennemis qui le traversent (20 dégâts). 20 mana.",
    manaCost: 20,
    cooldownMs: 8000,
    effectType: "aoe",
    damage: 20,
    radius: 80,
    durationMs: 5000,
    inflictsEffect: {
      type: "burn",
      kind: "dot",
      chance: 0.8, // haute expres - c'est un coup DELIBEREMENT enchante, pas le taux passif habituel d'une arme
      damagePerTick: 3,
      tickIntervalMs: 1000,
      ticks: 3,
    },
    unlockLevel: 1,
  },
};

/**
 * Resout la definition d'une competence par son id - repli generique si
 * elle n'est pas (encore) connue du client, meme principe que
 * resolveItemDef.
 */
export function resolveAbilityDef(abilityId) {
  return (
    ABILITY_DEFS[abilityId] || {
      id: abilityId,
      name: abilityId,
      archetypes: [],
      staminaCost: 10,
      cooldownMs: 2000,
      effectType: "aoe",
      damage: 5,
      radius: 50,
      unlockLevel: null,
    }
  );
}
