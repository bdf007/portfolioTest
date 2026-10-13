import Phaser from "phaser";

import { ENEMY_SPEED } from "./gameConstants";

const STATUS_EFFECT_COLORS = {
  burn: 0xff8800, // orange
  bleed: 0xcc0000, // rouge
  slow: 0x4488ff, // bleu - coherent avec l'explosion de performAoeDebuffAbility
  haste: 0x44ff88, // vert clair - pour un futur flash sur soi-meme si besoin
  acid: 0x88ff00, // vert
  stun: 0xffff00, // jaune
  poison: 0x8800ff, // violet
  freeze: 0x00ffff, // cyan
};

// teinte discrete du heros selon son etat de controle - une couleur
// legerement differente par etat (gel > etourdissement > immobilisation),
// ou null s'il n'y en a aucune
export function getPlayerControlTint(scene) {
  const types = scene.playerStatusEffects.map((e) => e.type);
  if (types.includes("freeze")) return 0x99ccff; // bleu glace
  if (types.includes("stun")) return 0xffee66; // jaune pale
  if (types.includes("root")) return 0xaacc66; // vert-brun, racines
  return null;
}

/**
 * Deplacee telle quelle depuis MainScene.js - fonction pure, ne touche
 * jamais a `scene`.
 */
export function rollStatusEffect(sourceDef) {
  if (!sourceDef || !sourceDef.inflictsEffect) return null;
  const inflict = sourceDef.inflictsEffect;
  if (Math.random() >= inflict.chance) return null;

  if (inflict.kind === "modifier") {
    return {
      type: inflict.type,
      kind: "modifier",
      statModifiers: inflict.statModifiers,
      durationMs: inflict.durationMs,
    };
  }

  // Les defs d'effets "dot" (itemDefs.js) expriment leur duree totale via
  // durationMs, jamais via un nombre de ticks direct - inflict.ticks n'existe
  // nulle part dans itemDefs.js. Le lire directement donnait ticksRemaining:
  // undefined, et updateStatusEffects rejetait aussitot l'effet (NaN/undefined
  // > 0 est faux), avant meme le premier tick : l'effet disparaissait sans
  // jamais infliger de degats. On derive donc le nombre de ticks depuis
  // durationMs / tickIntervalMs (avec inflict.ticks garde en priorite si
  // jamais une def future le fournit explicitement).
  const ticksRemaining =
    inflict.ticks ??
    Math.max(1, Math.round(inflict.durationMs / inflict.tickIntervalMs));

  return {
    type: inflict.type,
    kind: "dot",
    damagePerTick: inflict.damagePerTick,
    tickIntervalMs: inflict.tickIntervalMs,
    ticksRemaining,
  };
}

export function applyStatusEffect(scene, list, effect) {
  if (!effect) return;
  const existingIndex = list.findIndex((e) => e.type === effect.type);
  if (existingIndex !== -1) list.splice(existingIndex, 1);
  if (effect.kind === "modifier") {
    list.push({ ...effect, expiresAt: scene.time.now + effect.durationMs });
  } else {
    list.push({
      ...effect,
      nextTickAt: scene.time.now + effect.tickIntervalMs,
    });
  }
}

function flashStatusTint(scene, sprite, effectType) {
  if (!sprite || !sprite.active) return;
  const color = STATUS_EFFECT_COLORS[effectType] ?? 0xcc0000;
  sprite.setTint(color).setTintMode(Phaser.TintModes.FILL);
  scene.time.delayedCall(150, () => {
    if (sprite.active) {
      sprite.clearTint();
      sprite.setTintMode(Phaser.TintModes.MULTIPLY);
    }
  });
}

export function updateStatusEffects(scene, now) {
  for (const enemy of scene.enemies) {
    if (!enemy.statusEffects || enemy.statusEffects.length === 0) continue;
    const remaining = [];
    for (const effect of enemy.statusEffects) {
      if (effect.kind === "modifier") {
        if (now < effect.expiresAt) remaining.push(effect);
        continue;
      }
      if (now >= effect.nextTickAt) {
        scene.damageEnemy(enemy, effect.damagePerTick);
        effect.ticksRemaining -= 1;
        effect.nextTickAt = now + effect.tickIntervalMs;
        flashStatusTint(scene, enemy.sprite, effect.type);
      }
      if (effect.ticksRemaining > 0 && enemy.hp > 0) remaining.push(effect);
    }
    enemy.statusEffects = remaining;
  }

  if (scene.playerStatusEffects.length > 0 && !scene.isDead) {
    const remaining = [];
    for (const effect of scene.playerStatusEffects) {
      if (effect.kind === "modifier") {
        if (now < effect.expiresAt) remaining.push(effect);
        continue;
      }
      if (now >= effect.nextTickAt) {
        scene.playerHp = Math.max(0, scene.playerHp - effect.damagePerTick);
        scene.showDamageNumber(scene.hero, effect.damagePerTick, "#ff4444");
        scene.events.emit("player-hp-changed", {
          hp: scene.playerHp,
          maxHp: scene.playerMaxHp,
        });
        effect.ticksRemaining -= 1;
        effect.nextTickAt = now + effect.tickIntervalMs;
        flashStatusTint(scene, scene.hero, effect.type);
      }
      if (effect.ticksRemaining > 0) remaining.push(effect);
    }
    scene.playerStatusEffects = remaining;
  }
}

/**
 * Cree un emetteur de particules purement decoratif, attache et suivant
 * un sprite d'ennemi - fire/ice/gas selon enemy.visualEffect (optionnel,
 * cf. ENEMY_TYPES cote serveur). Aucun impact sur le gameplay - pure
 * decoration, independante de inflictsEffect/damageType.
 */
export function createEnemyVisualEffect(scene, sprite, effectType) {
  const configs = {
    fire: {
      texture: "particle-fire",
      speed: { min: 8, max: 20 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 2.0, end: 0 },
      lifespan: 450,
      frequency: 120,
    },
    ice: {
      texture: "particle-ice",
      speed: { min: 5, max: 15 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 700,
      frequency: 100,
    },
    gas: {
      texture: "particle-gas",
      speed: { min: 5, max: 20 },
      scale: { start: 1, end: 0.3 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 900,
      frequency: 80,
    },
    // bulles violettes qui montent doucement (poison)
    poison: {
      texture: "particle-poison",
      speed: { min: 4, max: 12 },
      scale: { start: 0.7, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 800,
      frequency: 110,
      gravityY: -15,
    },
    // gouttes rouges qui tombent (saignement) - blendMode NORMAL, sinon
    // le rouge fonce en ADD devient presque invisible sur un fond sombre
    blood: {
      texture: "particle-blood",
      speed: { min: 3, max: 10 },
      scale: { start: 0.6, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 600,
      frequency: 140,
      gravityY: 60,
      blendMode: "NORMAL",
    },
    // petites etincelles jaunes qui scintillent au-dessus de la tete (stun)
    stun: {
      texture: "particle-stun",
      speed: { min: 6, max: 18 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      frequency: 90,
    },
  };
  const config = configs[effectType];
  if (!config) return null;

  const emitter = scene.add.particles(sprite.x, sprite.y - 30, config.texture, {
    speed: config.speed,
    scale: config.scale,
    alpha: config.alpha,
    lifespan: config.lifespan,
    frequency: config.frequency,
    gravityY: config.gravityY ?? 0,
    blendMode: config.blendMode ?? "ADD",
  });
  emitter.setDepth(sprite.depth + 1);
  return emitter;
}

export function getEffectiveEnemySpeed(enemy) {
  let multiplier = 1;
  for (const effect of enemy.statusEffects) {
    if (effect.statModifiers?.moveSpeedPercent) {
      multiplier += effect.statModifiers.moveSpeedPercent;
    }
  }
  return Math.max(ENEMY_SPEED * 0.2, ENEMY_SPEED * multiplier);
}

export function getEffectiveEnemyDamage(enemy) {
  let multiplier = 1;
  for (const effect of enemy.statusEffects) {
    if (effect.statModifiers?.damagePercent)
      multiplier += effect.statModifiers.damagePercent;
  }
  return Math.max(0, enemy.damage * multiplier);
}

export function getEffectivePlayerMoveSpeed(scene) {
  let multiplier = 1;
  for (const effect of scene.playerStatusEffects) {
    if (effect.statModifiers?.moveSpeedPercent) {
      multiplier += effect.statModifiers.moveSpeedPercent;
    }
  }
  return Math.max(
    scene.playerMoveSpeed * 0.2,
    scene.playerMoveSpeed * multiplier,
  );
}

export function getEffectivePlayerMeleeDamage(scene) {
  let multiplier = 1;
  for (const effect of scene.playerStatusEffects) {
    if (effect.statModifiers?.meleeDamagePercent)
      multiplier += effect.statModifiers.meleeDamagePercent;
  }
  return scene.playerMeleeDamage * multiplier;
}

export function getEffectivePlayerRangedDamage(scene) {
  let multiplier = 1;
  for (const effect of scene.playerStatusEffects) {
    if (effect.statModifiers?.rangedDamagePercent)
      multiplier += effect.statModifiers.rangedDamagePercent;
  }
  return scene.playerRangedDamage * multiplier;
}

export function getEffectivePlayerDefense(scene) {
  let multiplier = 1;
  for (const effect of scene.playerStatusEffects) {
    if (effect.statModifiers?.defensePercent)
      multiplier += effect.statModifiers.defensePercent;
  }
  return scene.playerDefense * multiplier;
}

export function getEffectivePlayerVisionRadius(scene) {
  const bonus =
    scene.time.now < scene.visionBonusUntil ? scene.visionBonusAmount : 0;
  return scene.playerVisionRadius + bonus;
}
