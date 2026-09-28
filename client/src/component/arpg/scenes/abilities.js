import { resolveAbilityDef, ABILITY_DEFS } from "../abilityDefs";
import { resolveItemDef } from "../itemDefs";
import {
  computeDamage,
  applyElementalResistance,
} from "../combat";
import { hasClearLineOfSight, computeVisibleTiles } from "../fogOfWar";
import { WALL } from "./floorRenderer";
import {
  rollStatusEffect,
  applyStatusEffect,
} from "./statusEffects";
import { performSummonAbility } from "./summons";

import { TILE_SIZE, MAX_SUMMONS } from "./gameConstants";

export function performAbility(scene, abilityId) {
  if (!scene.unlockedAbilities.includes(abilityId)) return;

  const def = resolveAbilityDef(abilityId);
  if (
    def.hpThresholdPercent != null &&
    scene.playerHp / scene.playerMaxHp > def.hpThresholdPercent
  ) {
    scene.showLootToast(
      `Nécessite d'être sous ${Math.round(def.hpThresholdPercent * 100)}% PV`,
    );
    return;
  }
  if (
    def.disabledBiomes &&
    def.disabledBiomes.includes(scene.currentBiomeId)
  ) {
    scene.showLootToast(`${def.name} est désactivée sur ce type de niveau`);
    return;
  }

  const now = scene.time.now;
  const readyAt = scene.abilityCooldowns[abilityId] || 0;
  if (now < readyAt) {
    scene.showLootToast("Compétence en recharge");
    return;
  }

  if (def.effectType === "summon" && def.persistent) {
    const existing = scene.summons.find(
      (s) => s.persistent && s.sourceAbilityId === def.id,
    );
    if (existing) {
      scene.pendingResummonDef = def;
      scene.pendingResummonTarget = existing;
      scene.pauseGame("resummon");
      scene.events.emit("resummon-prompt", { name: def.name });
      return;
    }
  }

  if (
    def.effectType === "summon" &&
    scene.summons.filter((s) => !s.isEscort).length >= MAX_SUMMONS
  ) {
    const oldest = scene.summons.find((s) => !s.persistent);
    if (oldest) {
      scene.pendingSummonReplaceDef = def;
      scene.pendingSummonReplaceVictim = oldest;
      scene.pauseGame("summonReplace");
      scene.events.emit("summon-replace-prompt", {
        victimName:
          ABILITY_DEFS[oldest.sourceAbilityId]?.name || oldest.spriteKey,
        newName: def.name,
      });
      return;
    }
    // sinon (toutes les invocations restantes sont persistantes) :
    // performSummonAbility gerera l'affichage du toast "toutes occupees"
  }

  if (def.staminaCost && scene.playerStamina < def.staminaCost) {
    scene.showLootToast("Pas assez de stamina !");
    return;
  }
  if (def.manaCost && scene.playerMana < def.manaCost) {
    scene.showLootToast("Pas assez de mana !");
    return;
  }

  if (def.effectType === "aoe") {
    performAoeAbility(scene, def);
  } else if (def.effectType === "projectileAoe") {
    performProjectileAoeAbility(scene, def);
  } else if (def.effectType === "selfBuff") {
    performSelfBuffAbility(scene, def);
  } else if (def.effectType === "aoeDebuff") {
    performAoeDebuffAbility(scene, def);
  } else if (def.effectType === "pierce") {
    performPierceAbility(scene, def);
  } else if (def.effectType === "weaponImbue") {
    performWeaponImbueAbility(scene, def);
  } else if (def.effectType === "fogPulse") {
    performFogPulseAbility(scene, def);
  } else if (def.effectType === "shieldBash") {
    performShieldBashAbility(scene, def);
  } else if (def.effectType === "taunt") {
    performTauntAbility(scene, def);
  } else if (def.effectType === "repel") {
    performRepelAbility(scene, def);
  } else if (def.effectType === "aoeStun") {
    performAoeStunAbility(scene, def);
  } else if (def.effectType === "summon") {
    performSummonAbility(scene, def);
  } else if (def.effectType === "teleportDash") {
    performTeleportDashAbility(scene, def);
  } else if (def.effectType === "randomTeleport") {
    performRandomTeleportAbility(scene, def);
  } else if (def.effectType === "stealth") {
    performStealthAbility(scene, def);
  } else if (def.effectType === "chainLightning") {
    performChainLightningAbility(scene, def);
  } else if (def.effectType === "zone") {
    performZoneAbility(scene, def);
  } else if (def.effectType === "aoeCurse") {
    performAoeCurseAbility(scene, def);
  } else if (def.effectType === "riposte") {
    performRiposteAbility(scene, def);
  } else if (def.effectType === "parry") {
    performParryAbility(scene, def);
  } else if (def.effectType === "trap") {
    performTrapAbility(scene, def);
  } else if (def.effectType === "cone") {
    performConeAbility(scene, def);
  } else if (def.effectType === "aoeRoot") {
    performAoeRootAbility(scene, def);
  } else if (def.effectType === "boomerang") {
    performBoomerangAbility(scene, def);
  } else if (def.effectType === "vortex") {
    performVortexAbility(scene, def);
  } else if (def.effectType === "visionBuff") {
    performVisionBuffAbility(scene, def);
  } else if (def.effectType === "bloodPact") {
    performBloodPactAbility(scene, def);
  } else if (def.effectType === "conditionalBuff") {
    performConditionalBuffAbility(scene, def);
  } else if (def.effectType === "detectTrap") {
    performDetectTrapAbility(scene, def);
  } else if (def.effectType === "detectSecret") {
    performDetectSecretAbility(scene, def);
  } else {
    scene.showLootToast(`${def.name} : effet pas encore implémenté`);
    return;
  }

  if (def.staminaCost) {
    scene.playerStamina -= def.staminaCost;
    scene.events.emit("player-stamina-changed", {
      stamina: scene.playerStamina,
      maxStamina: scene.playerMaxStamina,
    });
  }
  if (def.manaCost) {
    scene.playerMana -= def.manaCost;
    scene.events.emit("player-mana-changed", {
      mana: scene.playerMana,
      maxMana: scene.playerMaxMana,
    });
  }

  scene.abilityCooldowns[abilityId] = now + def.cooldownMs;
  scene.events.emit("hotbar-cooldown-started", {
    key: `ability:${abilityId}`,
    cooldownMs: def.cooldownMs,
    startedAt: Date.now(),
  });
}

export function performAoeStunAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    applyStatusEffect(scene, enemy.statusEffects, {
      type: "stun",
      kind: "modifier",
      statModifiers: {},
      durationMs: def.durationMs,
    });
  }

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0xffff00, 0.4);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 400,
    onComplete: () => circle.destroy(),
  });
}

export function performRepelAbility(scene, def) {
  const abilityDamage = scene.computeAbilityDamage(def);
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dx = enemy.sprite.x - scene.hero.x;
    const dy = enemy.sprite.y - scene.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > def.radius) continue;

    if (abilityDamage) {
      const rawDamage = applyElementalResistance(
        abilityDamage,
        def.damageType,
        enemy.resistances,
      );
      scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
    }

    const mag = dist || 1;
    scene.knockbackEnemyIfClear(
      enemy,
      (dx / mag) * def.knockbackDistance,
      (dy / mag) * def.knockbackDistance,
    );
  }

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0xaaaaff, 0.4);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 400,
    onComplete: () => circle.destroy(),
  });
}

export function performShieldBashAbility(scene, def) {
  const shieldDef = scene.equipped.offHand
    ? resolveItemDef(scene.equipped.offHand)
    : null;
  if (def.requiresShield && (!shieldDef || !shieldDef.isShield)) {
    scene.showLootToast("Nécessite un bouclier équipé");
    return;
  }

  const dir = scene.lastAimVector;
  scene.dashState = {
    def,
    dirX: dir.x,
    dirY: dir.y,
    hitEnemyIds: new Set(),
    startX: scene.hero.x,
    startY: scene.hero.y,
  };
  scene.hero.setVelocity(dir.x * def.dashSpeed, dir.y * def.dashSpeed);
}

export function performTauntAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    if (enemy.state !== "chase") {
      enemy.state = "chase";
      scene.requestPath(
        enemy.sprite.x,
        enemy.sprite.y,
        scene.hero.x,
        scene.hero.y,
        (path) => {
          enemy.path = path;
          enemy.pathIndex = 0;
        },
      );
    }
  }

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0xffcc00, 0.4);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 400,
    onComplete: () => circle.destroy(),
  });
}

export function performAoeAbility(scene, def) {
  const abilityDamage = scene.computeAbilityDamage(def);
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    const rawDamage = applyElementalResistance(
      abilityDamage,
      def.damageType,
      enemy.resistances,
    );
    scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
    if (enemy.hp > 0) {
      applyStatusEffect(scene, enemy.statusEffects, rollStatusEffect(def));
    }
  }

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0xff6600, 0.5);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 300,
    onComplete: () => circle.destroy(),
  });
}

export function performProjectileAoeAbility(scene, def) {
  let v = scene.lastAimVector;
  let nearestDist = Infinity;
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dx = enemy.sprite.x - scene.hero.x;
    const dy = enemy.sprite.y - scene.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > scene.playerRangedRange || dist >= nearestDist) continue;
    nearestDist = dist;
    const mag = dist || 1;
    v = { x: dx / mag, y: dy / mag };
  }

  const sprite = scene.add.circle(scene.hero.x, scene.hero.y, 8, 0xff6600);
  scene.physics.add.existing(sprite);
  sprite.setDepth(12);
  sprite.body.setVelocity(
    v.x * def.projectileSpeed,
    v.y * def.projectileSpeed,
  );

  scene.abilityProjectiles.push({
    sprite,
    startX: scene.hero.x,
    startY: scene.hero.y,
    def,
  });
}

export function performWeaponImbueAbility(scene, def) {
  scene.pendingWeaponImbue = def;
  scene.showLootToast(
    `${def.name} activée - le prochain coup sera renforcé !`,
  );
}

export function performPierceAbility(scene, def) {
  let v = scene.lastAimVector;
  let nearestDist = Infinity;
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dx = enemy.sprite.x - scene.hero.x;
    const dy = enemy.sprite.y - scene.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > scene.playerRangedRange || dist >= nearestDist) continue;
    nearestDist = dist;
    const mag = dist || 1;
    v = { x: dx / mag, y: dy / mag };
  }

  const sprite = scene.add.circle(scene.hero.x, scene.hero.y, 6, 0xffdd44);
  scene.physics.add.existing(sprite);
  sprite.setDepth(12);
  sprite.body.setVelocity(
    v.x * def.projectileSpeed,
    v.y * def.projectileSpeed,
  );

  scene.abilityProjectiles.push({
    sprite,
    startX: scene.hero.x,
    startY: scene.hero.y,
    def,
    hitEnemyIds: new Set(),
    pierceCount: 0,
  });
}

export function performSelfBuffAbility(scene, def) {
  applyStatusEffect(scene, scene.playerStatusEffects, {
    type: def.id,
    kind: "modifier",
    statModifiers: def.statModifiers,
    durationMs: def.durationMs,
  });
  scene.showLootToast(`${def.name} activé !`);
}

export function performAoeDebuffAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    applyStatusEffect(scene, enemy.statusEffects, {
      type: def.id,
      kind: "modifier",
      statModifiers: def.statModifiers,
      durationMs: def.durationMs,
    });
  }

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0x4488ff, 0.4);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 300,
    onComplete: () => circle.destroy(),
  });
}

export function performFogPulseAbility(scene, def) {
  const centerTileX = Math.floor(scene.hero.x / TILE_SIZE);
  const centerTileY = Math.floor(scene.hero.y / TILE_SIZE);

  let revealed;
  if (def.ignoresWalls) {
    const bossRoomTiles = scene.computeBossRoomTiles();
    revealed = new Set();
    const height = scene.fogGrid.length;
    const width = scene.fogGrid[0].length;
    const minX = Math.max(0, centerTileX - def.radius);
    const maxX = Math.min(width - 1, centerTileX + def.radius);
    const minY = Math.max(0, centerTileY - def.radius);
    const maxY = Math.min(height - 1, centerTileY + def.radius);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = x + "," + y;
        if (Math.hypot(x - centerTileX, y - centerTileY) > def.radius)
          continue;
        if (bossRoomTiles.has(key)) continue;
        revealed.add(key);
      }
    }
  } else {
    revealed = computeVisibleTiles(
      scene.fogGrid,
      centerTileX,
      centerTileY,
      def.radius,
    );
  }

  const changes = [];
  for (const key of revealed) {
    const [x, y] = key.split(",").map(Number);
    if (scene.fogState.state[y][x] < 2) {
      scene.fogState.state[y][x] = 2;
      changes.push({ x, y });
    }
  }
  scene.applyFogChanges(changes);

  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0x66ddff, 0);
  circle.setStrokeStyle(3, 0x66ddff, 0.8);
  circle.setDepth(6);
  scene.tweens.add({
    targets: circle,
    radius: def.radius * TILE_SIZE,
    alpha: 0,
    duration: 600,
    onComplete: () => circle.destroy(),
  });
}

export function performTeleportDashAbility(scene, def) {
  const dir = scene.lastAimVector;
  const targetX = scene.hero.x + dir.x * def.distance;
  const targetY = scene.hero.y + dir.y * def.distance;
  const tileX = Math.floor(targetX / TILE_SIZE);
  const tileY = Math.floor(targetY / TILE_SIZE);
  const grid = scene.fogGrid;
  if (
    tileY < 0 ||
    tileX < 0 ||
    tileY >= grid.length ||
    tileX >= grid[0].length ||
    grid[tileY][tileX] === WALL
  ) {
    scene.showLootToast("Pas assez de place pour se téléporter");
    return;
  }
  scene.hero.x = targetX;
  scene.hero.y = targetY;

  for (const summon of scene.summons) {
    summon.sprite.x = targetX + (Math.random() - 0.5) * 40;
    summon.sprite.y = targetY + (Math.random() - 0.5) * 40;
  }
}

export function performRandomTeleportAbility(scene, def) {
  const grid = scene.fogGrid;
  const floorTiles = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] !== WALL) floorTiles.push({ x, y });
    }
  }
  if (floorTiles.length === 0) return;
  const target = floorTiles[Math.floor(Math.random() * floorTiles.length)];
  const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
  const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;

  scene.hero.x = targetX;
  scene.hero.y = targetY;

  for (const summon of scene.summons) {
    summon.sprite.x = targetX + (Math.random() - 0.5) * 40;
    summon.sprite.y = targetY + (Math.random() - 0.5) * 40;
  }

  scene.showLootToast("Téléportation !");
}

export function performStealthAbility(scene, def) {
  scene.stealthUntil = scene.time.now + def.durationMs;

  scene.tweens.add({
    targets: scene.hero,
    alpha: 0.4,
    duration: 250,
    ease: "Cubic.easeOut",
  });

  scene.showLootToast(`${def.name} activée !`);
}

export function performChainLightningAbility(scene, def) {
  let currentX = scene.hero.x;
  let currentY = scene.hero.y;
  const hit = new Set();
  let jumps = 0;
  const abilityDamage = scene.computeAbilityDamage(def);

  while (jumps < def.maxJumps) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const enemy of scene.enemies) {
      if (hit.has(enemy) || !scene.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - currentX,
        enemy.sprite.y - currentY,
      );
      if (dist <= def.jumpRange && dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }
    if (!nearest) break;

    const rawDamage = applyElementalResistance(
      abilityDamage,
      def.damageType,
      nearest.resistances,
    );
    scene.damageEnemy(nearest, computeDamage(rawDamage, nearest.defense));

    hit.add(nearest);
    const line = scene.add
      .line(
        0,
        0,
        currentX,
        currentY,
        nearest.sprite.x,
        nearest.sprite.y,
        0x66ddff,
      )
      .setLineWidth(2)
      .setDepth(15);
    scene.time.delayedCall(200, () => line.destroy());
    currentX = nearest.sprite.x;
    currentY = nearest.sprite.y;
    jumps++;
  }
}

export function performZoneAbility(scene, def) {
  const circle = scene.add.circle(
    scene.hero.x,
    scene.hero.y,
    def.radius,
    def.color,
    0.3,
  );
  circle.setDepth(6);
  scene.zones.push({
    sprite: circle,
    x: scene.hero.x,
    y: scene.hero.y,
    radius: def.radius,
    damagePerTick: scene.computeAbilityDamage({
      damage: def.damagePerTick,
      damagePercent: def.damagePercent,
      scalesFrom: def.scalesFrom,
    }),
    damageType: def.damageType || "physical",
    tickIntervalMs: def.tickIntervalMs,
    nextTickAt: scene.time.now,
    expiresAt: scene.time.now + def.durationMs,
  });
}

export function performAoeCurseAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    applyStatusEffect(scene, enemy.statusEffects, {
      type: "curse",
      kind: "modifier",
      statModifiers: { damagePercent: def.damagePercent },
      durationMs: def.durationMs,
    });
  }
  const circle = scene.add.circle(scene.hero.x, scene.hero.y, 10, 0x882299, 0.4);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 400,
    onComplete: () => circle.destroy(),
  });
}

export function performRiposteAbility(scene, def) {
  scene.riposteUntil = scene.time.now + def.durationMs;
  scene.riposteReflectPercent = def.reflectPercent;
  scene.showLootToast(`${def.name} activée !`);
}

export function performParryAbility(scene, def) {
  scene.parryUntil = scene.time.now + def.durationMs;
  scene.parryDamageReduction = def.damageReduction;
  scene.showLootToast(`${def.name} activée !`);
}

export function performTrapAbility(scene, def) {
  const sprite = scene.add.circle(scene.hero.x, scene.hero.y, 6, 0x884400, 0.8);
  sprite.setDepth(6);
  scene.traps.push({
    sprite,
    x: scene.hero.x,
    y: scene.hero.y,
    triggerRadius: def.triggerRadius,
    inflictsEffect: def.inflictsEffect,
    expiresAt: scene.time.now + def.expiresAfterMs,
  });
}

export function performConeAbility(scene, def) {
  const dir = scene.lastAimVector;
  const angleRad = (def.angleDegrees * Math.PI) / 180;
  const baseAngle = Math.atan2(dir.y, dir.x);
  const abilityDamage = scene.computeAbilityDamage(def);

  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dx = enemy.sprite.x - scene.hero.x;
    const dy = enemy.sprite.y - scene.hero.y;
    const dist = Math.hypot(dx, dy);
    if (dist > def.distance) continue;
    const angleToEnemy = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angleToEnemy - baseAngle);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff > angleRad / 2) continue;

    const rawDamage = applyElementalResistance(
      abilityDamage,
      def.damageType,
      enemy.resistances,
    );
    scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));

    if (enemy.hp > 0) {
      applyStatusEffect(scene, enemy.statusEffects, rollStatusEffect(def));
    }
  }
}

export function performAoeRootAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist > def.radius) continue;
    applyStatusEffect(scene, enemy.statusEffects, {
      type: "root",
      kind: "modifier",
      statModifiers: {},
      durationMs: def.durationMs,
    });
  }
}

export function performBoomerangAbility(scene, def) {
  const dir = scene.lastAimVector;
  const sprite = scene.add.circle(scene.hero.x, scene.hero.y, 7, 0x996633);
  scene.physics.add.existing(sprite);
  sprite.body.setVelocity(
    dir.x * def.projectileSpeed,
    dir.y * def.projectileSpeed,
  );
  scene.boomerangs.push({
    sprite,
    def,
    startX: scene.hero.x,
    startY: scene.hero.y,
    returning: false,
    hitEnemyIds: new Set(),
  });
}

export function performVortexAbility(scene, def) {
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dx = scene.hero.x - enemy.sprite.x;
    const dy = scene.hero.y - enemy.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > def.radius || dist < 1) continue;
    scene.knockbackEnemyIfClear(
      enemy,
      (dx / dist) * def.pullDistance,
      (dy / dist) * def.pullDistance,
    );
  }
  const circle = scene.add.circle(
    scene.hero.x,
    scene.hero.y,
    def.radius,
    0x8844ff,
    0.2,
  );
  circle.setDepth(6);
  scene.tweens.add({
    targets: circle,
    alpha: 0,
    duration: 500,
    onComplete: () => circle.destroy(),
  });
}

export function performVisionBuffAbility(scene, def) {
  scene.visionBonusUntil = scene.time.now + def.durationMs;
  scene.visionBonusAmount = def.visionBonus;
}

export function performBloodPactAbility(scene, def) {
  if (scene.playerHp <= def.hpCost) {
    scene.showLootToast("Pas assez de PV pour ce pacte");
    return;
  }
  scene.playerHp -= def.hpCost;
  scene.events.emit("player-hp-changed", {
    hp: scene.playerHp,
    maxHp: scene.playerMaxHp,
  });
  if (def.resourceType === "mana") {
    scene.playerMana = Math.min(
      scene.playerMaxMana,
      scene.playerMana + def.resourceGain,
    );
    scene.events.emit("player-mana-changed", {
      mana: scene.playerMana,
      maxMana: scene.playerMaxMana,
    });
  } else {
    scene.playerStamina = Math.min(
      scene.playerMaxStamina,
      scene.playerStamina + def.resourceGain,
    );
    scene.events.emit("player-stamina-changed", {
      stamina: scene.playerStamina,
      maxStamina: scene.playerMaxStamina,
    });
  }
}

export function performConditionalBuffAbility(scene, def) {
  applyStatusEffect(scene, scene.playerStatusEffects, {
    type: def.id,
    kind: "modifier",
    statModifiers: def.buffStatModifiers,
    durationMs: def.durationMs,
  });
  scene.showLootToast(`${def.name} activée !`);
}

export function performDetectTrapAbility(scene, def) {
  const radius = def.radius || scene.playerVisionRadius;
  const heroTileX = Math.floor(scene.hero.x / TILE_SIZE);
  const heroTileY = Math.floor(scene.hero.y / TILE_SIZE);
  const grid = scene.fogGrid;
  const width = grid[0].length;
  const height = grid.length;

  let anyRevealed = false;
  for (const trap of scene.floorTraps) {
    if (trap.triggered || trap.revealed) continue;
    const dist = Math.hypot(trap.x - heroTileX, trap.y - heroTileY);
    if (dist > radius) continue;
    if (
      !hasClearLineOfSight(
        grid,
        width,
        height,
        heroTileX,
        heroTileY,
        trap.x,
        trap.y,
      )
    )
      continue;
    trap.revealed = true;
    trap.sprite.setVisible(true);
    scene.currentFloorRevealedTraps.push(trap.index);
    anyRevealed = true;
  }

  scene.showLootToast(
    anyRevealed ? "Pièges détectés !" : "Aucun piège à proximité",
  );
}

export function performDetectSecretAbility(scene, def) {
  const radius = def.radius || scene.playerVisionRadius;
  const heroTileX = Math.floor(scene.hero.x / TILE_SIZE);
  const heroTileY = Math.floor(scene.hero.y / TILE_SIZE);
  const grid = scene.fogGrid;
  const width = grid[0].length;
  const height = grid.length;

  let anyRevealed = false;

  for (const lever of scene.secretLevers) {
    if (lever.activated) continue;
    const dist = Math.hypot(lever.x - heroTileX, lever.y - heroTileY);
    if (dist > radius) continue;
    if (
      !hasClearLineOfSight(
        grid,
        width,
        height,
        heroTileX,
        heroTileY,
        lever.x,
        lever.y,
      )
    )
      continue;
    lever.sprite.setAlpha(1);
    anyRevealed = true;
  }

  if (
    scene.secretWallMarker &&
    scene.secretRoomData &&
    !scene.secretDoorOpened
  ) {
    const door = scene.secretRoomData.doorTile;
    const dist = Math.hypot(door.x - heroTileX, door.y - heroTileY);
    if (
      dist <= radius &&
      hasClearLineOfSight(
        grid,
        width,
        height,
        heroTileX,
        heroTileY,
        door.x,
        door.y,
      )
    ) {
      scene.secretWallMarker.setAlpha(1);
      anyRevealed = true;
    }
  }

  scene.showLootToast(
    anyRevealed ? "Quelque chose se révèle..." : "Rien de caché à proximité",
  );
}
