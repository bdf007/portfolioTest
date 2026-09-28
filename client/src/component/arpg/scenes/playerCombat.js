/**
 * Combat de base du joueur : attaque au corps a corps, attaque a
 * distance et gestion des projectiles, charge/bousculade (shield
 * bash), projectiles/zones/pieges lies aux competences, boomerangs
 * et declenchement de la fureur.
 */
import { WALL } from "./floorRenderer";
import {
  computeDamage,
  rollCritical,
  CRIT_MULTIPLIER,
  applyDiceVariance,
  applyElementalResistance,
} from "../combat";
import {
  rollStatusEffect,
  applyStatusEffect,
  getEffectivePlayerMeleeDamage,
  getEffectivePlayerRangedDamage,
} from "./statusEffects";
import { resolveItemDef } from "../itemDefs";
import { resolveHeroStatsOverride } from "../spriteRegistry";
import { resolveFuryDef } from "../furyDefs";
import { resolveAllEquippedGemEffectSources } from "../gemSockets";

import {
  TILE_SIZE,
  PROJECTILE_RADIUS,
  FURY_KILLS_REQUIRED,
  ATTACK_ANIM_DURATION_MS,
} from "./gameConstants";

const MELEE_CONE_DOT_THRESHOLD = 0.5;
const PROJECTILE_SPEED = 320;

/**
 * scene.equipped[slot] stocke desormais un instanceId (cf.
 * inventory.equipItem) - il faut retrouver l'exemplaire complet dans
 * this.inventory pour connaitre a la fois son itemId (def de base) ET
 * ses sockets/gemmes (cf. gemSockets.js). Ne s'applique pas a "quiver"
 * (munitions, jamais instanciees - reste un itemId direct).
 */
function resolveEquippedInstance(scene, slot) {
  const ref = scene.equipped[slot];
  if (!ref) return null;
  return scene.inventory.find((entry) => entry.instanceId === ref) || null;
}

export function performMeleeAttack(scene, now) {
  if (!scene.meleeCooldown.isReady(now)) return;
  scene.meleeCooldown.trigger(now);

  const meleeWeaponInstance = resolveEquippedInstance(scene, "mainHand");
  const meleeWeaponDef = meleeWeaponInstance
    ? resolveItemDef(meleeWeaponInstance.itemId)
    : null;
  // cumule les gemmes a effet de TOUT l'equipement porte (pas seulement
  // l'arme) - certaines gemmes de combat (slowGem, stunGem) sont plutot
  // destinees a une armure/botte pour leur bonus de stat mais doivent
  // quand meme pouvoir declencher leur effet au corps a corps de la, cf.
  // resolveAllEquippedGemEffectSources dans gemSockets.js.
  const meleeGemEffectSources = resolveAllEquippedGemEffectSources(scene);

  scene.playAttackAnim(now);

  const imbue = scene.pendingWeaponImbue;
  scene.pendingWeaponImbue = null;
  // direction figee au moment du swing (celle utilisee par l'anim
  // lancee dans playAttackAnim) - pas celle au moment de la resolution,
  // sinon tourner sur soi pendant l'anim changerait retroactivement le cone de frappe
  const aimVector = { x: scene.lastAimVector.x, y: scene.lastAimVector.y };

  // les degats sont resolus a la FIN de l'anim (pas au lancer du coup),
  // pour laisser le temps a la cible de sortir de portee/du cone et
  // esquiver - coherent avec le mouvement de l'animation d'attaque
  scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
    if (!scene.hero) return; // scene/etage change entre-temps

    let anyHit = false;

    for (const enemy of scene.enemies) {
      const dx = enemy.sprite.x - scene.hero.x;
      const dy = enemy.sprite.y - scene.hero.y;
      const dist = Math.hypot(dx, dy);
      if (dist > scene.playerMeleeRange || !scene.isEnemyVisible(enemy))
        continue;

      if (dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = nx * aimVector.x + ny * aimVector.y;
        if (dot < MELEE_CONE_DOT_THRESHOLD) continue;
      }

      const isCrit = rollCritical(
        enemy.state !== "chase",
        imbue?.critChanceBonus || 0,
      );
      let rawDamage =
        getEffectivePlayerMeleeDamage(scene) * (isCrit ? CRIT_MULTIPLIER : 1);

      if (meleeWeaponDef?.varianceDice) {
        rawDamage = applyDiceVariance(rawDamage, meleeWeaponDef.varianceDice);
      }
      rawDamage = applyElementalResistance(
        rawDamage,
        meleeWeaponDef?.damageType,
        enemy.resistances,
      );
      if (
        imbue?.executeThreshold &&
        enemy.hp / enemy.maxHp <= imbue.executeThreshold
      ) {
        rawDamage *= imbue.executeBonusMultiplier;
      }
      if (imbue) rawDamage += imbue.bonusDamage;

      const dealt = computeDamage(rawDamage, enemy.defense);
      scene.damageEnemy(enemy, dealt);
      anyHit = true;

      if (imbue?.healPercent) {
        scene.playerHp = Math.min(
          scene.playerMaxHp,
          scene.playerHp + dealt * imbue.healPercent,
        );
        scene.events.emit("player-hp-changed", {
          hp: scene.playerHp,
          maxHp: scene.playerMaxHp,
        });
      }

      if (enemy.hp > 0) {
        applyStatusEffect(
          scene,
          enemy.statusEffects,
          rollStatusEffect(meleeWeaponDef),
        );
        // effet(s) elementaire(s) des gemmes socketees - se CUMULE avec
        // celui de l'arme elle-meme (une gemme ne remplace jamais
        // l'effet propre de l'arme, cf. gemSockets.js).
        for (const gemSource of meleeGemEffectSources) {
          applyStatusEffect(
            scene,
            enemy.statusEffects,
            rollStatusEffect(gemSource),
          );
        }
        if (imbue) {
          applyStatusEffect(
            scene,
            enemy.statusEffects,
            rollStatusEffect(imbue),
          );
        }
      }
    }

    if (imbue && !anyHit) {
      scene.pendingWeaponImbue = imbue;
    }
  });
}

export function getActiveRangedWeaponInstance(scene) {
  const mainInstance = resolveEquippedInstance(scene, "mainHand");
  const mainDef = mainInstance ? resolveItemDef(mainInstance.itemId) : null;
  if (mainDef && mainDef.grantsRanged) return mainInstance;
  const offInstance = resolveEquippedInstance(scene, "offHand");
  const offDef = offInstance ? resolveItemDef(offInstance.itemId) : null;
  if (offDef && offDef.grantsRanged) return offInstance;
  return null;
}

export function getActiveRangedWeaponDef(scene) {
  const instance = getActiveRangedWeaponInstance(scene);
  return instance ? resolveItemDef(instance.itemId) : null;
}

export function canUseRangedAttack(scene) {
  return !!getActiveRangedWeaponDef(scene);
}

export function performRangedAttack(scene, now) {
  if (!scene.rangedCooldown.isReady(now)) return;
  const weaponInstance = getActiveRangedWeaponInstance(scene);
  const weaponDef = weaponInstance
    ? resolveItemDef(weaponInstance.itemId)
    : null;
  if (!weaponDef) {
    scene.showLootToast("Aucune arme à distance équipée");
    return;
  }
  // meme principe qu'en melee ci-dessus : cumule les gemmes a effet de
  // TOUT l'equipement porte, pas seulement l'arme a distance active.
  const weaponGemEffectSources = resolveAllEquippedGemEffectSources(scene);

  if (weaponDef.requiresAmmo) {
    const requiredAmmoId = weaponDef.requiresAmmo;

    if (!scene.equipped.quiver) {
      scene.showLootToast("Aucune munition équipée");
      return;
    }

    const ammoAllowed = Array.isArray(requiredAmmoId)
      ? requiredAmmoId.includes(scene.equipped.quiver)
      : scene.equipped.quiver === requiredAmmoId;

    if (!ammoAllowed) {
      scene.showLootToast("Mauvaise munition équipée");
      return;
    }

    const ammoEntry = scene.inventory.find(
      (i) => i.itemId === scene.equipped.quiver,
    );

    if (!ammoEntry || ammoEntry.quantity <= 0) {
      scene.showLootToast("Plus de munitions !");
      return;
    }

    ammoEntry.quantity -= 1;

    if (ammoEntry.quantity <= 0) {
      const idx = scene.inventory.indexOf(ammoEntry);
      scene.inventory.splice(idx, 1);
      scene.equipped.quiver = null;

      const oldMaxHp = scene.playerMaxHp;
      scene.recalculatePlayerStats();
      scene.adjustHpAfterMaxHpChange(oldMaxHp);
      scene.events.emit("equipment-updated", { ...scene.equipped });
    }

    scene.events.emit("inventory-updated", [...scene.inventory]);
  }

  if (weaponDef.manaCost) {
    if (scene.playerMana < weaponDef.manaCost) {
      scene.showLootToast("Plus assez de mana !");
      return;
    }
    scene.playerMana -= weaponDef.manaCost;
    scene.events.emit("player-mana-changed", {
      mana: scene.playerMana,
      maxMana: scene.playerMaxMana,
    });
  }

  scene.rangedCooldown.trigger(now);
  const hasAttackAnim = scene.anims.exists(
    scene.heroSpriteKey + "-attack-" + scene.lastDir,
  );
  if (hasAttackAnim) {
    scene.hero.anims.play(
      scene.heroSpriteKey + "-attack-" + scene.lastDir,
      true,
    );
    scene.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
  }

  const ammoDef = scene.equipped.quiver
    ? resolveItemDef(scene.equipped.quiver)
    : null;
  const imbue = scene.pendingWeaponImbue;
  scene.pendingWeaponImbue = null;

  // munitions/mana/cooldown deja consommes ci-dessus (l'action est
  // engagee des le debut de l'anim) - seul le TIR effectif (spawn du
  // projectile) est repousse a la fin de l'anim, pour que la fleche/le
  // sort parte visuellement au moment ou le geste se termine plutot
  // qu'instantanement au clic
  scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
    if (!scene.hero) return; // scene/etage change entre-temps

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

    const sprite = scene.add.circle(
      scene.hero.x,
      scene.hero.y,
      PROJECTILE_RADIUS,
      0x66ccff,
    );
    scene.physics.add.existing(sprite);
    sprite.setDepth(12);
    sprite.body.setVelocity(v.x * PROJECTILE_SPEED, v.y * PROJECTILE_SPEED);

    scene.projectiles.push({
      sprite,
      startX: scene.hero.x,
      startY: scene.hero.y,
      weaponDef,
      ammoDef,
      imbue,
      weaponGemEffectSources,
    });
  });
}

export function updateProjectiles(scene) {
  const grid = scene.fogGrid;
  const remaining = [];

  for (const proj of scene.projectiles) {
    const traveled = Math.hypot(
      proj.sprite.x - proj.startX,
      proj.sprite.y - proj.startY,
    );
    const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
    const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
    const outOfBounds =
      tileX < 0 || tileY < 0 || tileY >= grid.length || tileX >= grid[0].length;
    const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

    const fogState = scene.fogState.state;
    const projVisible = !outOfBounds && fogState[tileY][tileX] === 2;
    proj.sprite.setVisible(projVisible);

    if (traveled >= scene.playerRangedRange || outOfBounds || hitWall) {
      proj.sprite.destroy();
      if (proj.imbue && !scene.pendingWeaponImbue) {
        scene.pendingWeaponImbue = proj.imbue;
      }
      continue;
    }

    let hit = false;
    for (const enemy of scene.enemies) {
      const dist = Math.hypot(
        enemy.sprite.x - proj.sprite.x,
        enemy.sprite.y - proj.sprite.y,
      );
      if (dist <= PROJECTILE_RADIUS + 14 && scene.isEnemyVisible(enemy)) {
        const isCrit = rollCritical(
          enemy.state !== "chase",
          proj.imbue?.critChanceBonus || 0,
        );
        let rawDamage =
          getEffectivePlayerRangedDamage(scene) *
          (isCrit ? CRIT_MULTIPLIER : 1);

        if (proj.weaponDef?.varianceDice) {
          rawDamage = applyDiceVariance(rawDamage, proj.weaponDef.varianceDice);
        }

        rawDamage = applyElementalResistance(
          rawDamage,
          proj.weaponDef?.damageType,
          enemy.resistances,
        );

        scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));

        if (enemy.hp > 0) {
          applyStatusEffect(
            scene,
            enemy.statusEffects,
            rollStatusEffect(proj.weaponDef),
          );
          applyStatusEffect(
            scene,
            enemy.statusEffects,
            rollStatusEffect(proj.ammoDef),
          );
          // effet(s) elementaire(s) des gemmes socketees sur l'arme a
          // distance - se CUMULE avec celui de l'arme et celui de la
          // munition (meme logique qu'au corps a corps).
          for (const gemSource of proj.weaponGemEffectSources || []) {
            applyStatusEffect(
              scene,
              enemy.statusEffects,
              rollStatusEffect(gemSource),
            );
          }
          if (proj.imbue)
            applyStatusEffect(
              scene,
              enemy.statusEffects,
              rollStatusEffect(proj.imbue),
            );
        }
        hit = true;
        break;
      }
    }
    if (hit) {
      proj.sprite.destroy();
      continue;
    }

    remaining.push(proj);
  }

  scene.projectiles = remaining;
}

export function knockbackEnemyIfClear(scene, enemy, dx, dy) {
  const newX = enemy.sprite.x + dx;
  const newY = enemy.sprite.y + dy;
  const tileX = Math.floor(newX / TILE_SIZE);
  const tileY = Math.floor(newY / TILE_SIZE);
  const grid = scene.fogGrid;
  if (tileY < 0 || tileX < 0 || tileY >= grid.length || tileX >= grid[0].length)
    return;
  if (grid[tileY][tileX] === WALL) return;
  enemy.sprite.x = newX;
  enemy.sprite.y = newY;
}

export function updateShieldBash(scene) {
  const ds = scene.dashState;
  const traveled = Math.hypot(
    scene.hero.x - ds.startX,
    scene.hero.y - ds.startY,
  );
  const abilityDamage = scene.computeAbilityDamage(ds.def);

  for (const enemy of scene.enemies) {
    if (ds.hitEnemyIds.has(enemy)) continue;
    const dist = Math.hypot(
      enemy.sprite.x - scene.hero.x,
      enemy.sprite.y - scene.hero.y,
    );
    if (dist <= 24) {
      const rawDamage = applyElementalResistance(
        abilityDamage,
        ds.def.damageType,
        enemy.resistances,
      );
      scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
      ds.hitEnemyIds.add(enemy);
      knockbackEnemyIfClear(
        scene,
        enemy,
        ds.dirX * ds.def.knockbackDistance,
        ds.dirY * ds.def.knockbackDistance,
      );
    }
  }

  const stoppedByWall =
    scene.hero.body.velocity.x === 0 && scene.hero.body.velocity.y === 0;
  if (traveled >= ds.def.dashDistance || stoppedByWall) {
    scene.hero.setVelocity(0, 0);
    scene.dashState = null;
  }
}

export function computeReachableFloorTiles(scene, originX, originY) {
  const grid = scene.fogGrid;
  const height = grid.length;
  const width = grid[0].length;
  const visited = new Set();
  const queue = [{ x: originX, y: originY }];
  visited.add(originX + "," + originY);

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const key = nx + "," + ny;
      if (visited.has(key) || grid[ny][nx] === WALL) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return visited;
}

export function explodeAbilityProjectile(scene, def, x, y) {
  const abilityDamage = scene.computeAbilityDamage(def);
  for (const enemy of scene.enemies) {
    if (!scene.isEnemyVisible(enemy)) continue;
    const dist = Math.hypot(enemy.sprite.x - x, enemy.sprite.y - y);
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

  const circle = scene.add.circle(x, y, 10, 0xff6600, 0.5);
  circle.setDepth(14);
  scene.tweens.add({
    targets: circle,
    radius: def.radius,
    alpha: 0,
    duration: 300,
    onComplete: () => circle.destroy(),
  });
}

export function computeBossRoomTiles(scene) {
  if (!scene.bossDoorTile || scene.bossRoomOpen) return new Set();

  const centerTileX = Math.floor(scene.hero.x / TILE_SIZE);
  const centerTileY = Math.floor(scene.hero.y / TILE_SIZE);

  const reachableNow = computeReachableFloorTiles(
    scene,
    centerTileX,
    centerTileY,
  );

  const { x: dx, y: dy } = scene.bossDoorTile;
  const original = scene.fogGrid[dy][dx];
  scene.fogGrid[dy][dx] = 0;
  const reachableIfOpen = computeReachableFloorTiles(
    scene,
    centerTileX,
    centerTileY,
  );
  scene.fogGrid[dy][dx] = original;

  const bossRoomTiles = new Set();
  for (const key of reachableIfOpen) {
    if (!reachableNow.has(key)) bossRoomTiles.add(key);
  }
  return bossRoomTiles;
}

export function updateAbilityProjectiles(scene) {
  const grid = scene.fogGrid;
  const remaining = [];

  for (const proj of scene.abilityProjectiles) {
    const traveled = Math.hypot(
      proj.sprite.x - proj.startX,
      proj.sprite.y - proj.startY,
    );
    const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
    const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
    const outOfBounds =
      tileX < 0 || tileY < 0 || tileY >= grid.length || tileX >= grid[0].length;
    const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

    const fogState = scene.fogState.state;
    proj.sprite.setVisible(!outOfBounds && fogState[tileY][tileX] === 2);

    if (
      traveled >= (proj.def.maxDistance ?? scene.playerRangedRange) ||
      outOfBounds ||
      hitWall
    ) {
      proj.sprite.destroy();
      continue;
    }

    if (proj.def.effectType === "pierce") {
      for (const enemy of scene.enemies) {
        if (proj.hitEnemyIds.has(enemy)) continue;
        const dist = Math.hypot(
          enemy.sprite.x - proj.sprite.x,
          enemy.sprite.y - proj.sprite.y,
        );
        if (dist <= 14 && scene.isEnemyVisible(enemy)) {
          const abilityDamage = scene.computeAbilityDamage(proj.def);
          const rawDamage = applyElementalResistance(
            abilityDamage,
            proj.def.damageType,
            enemy.resistances,
          );
          scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
          if (enemy.hp > 0) {
            applyStatusEffect(
              scene,
              enemy.statusEffects,
              rollStatusEffect(proj.def),
            );
          }
          proj.hitEnemyIds.add(enemy);
          proj.pierceCount++;
        }
      }
      if (
        proj.def.maxPierceCount &&
        proj.pierceCount >= proj.def.maxPierceCount
      ) {
        proj.sprite.destroy();
        continue;
      }
      remaining.push(proj);
      continue;
    }

    let hit = false;
    for (const enemy of scene.enemies) {
      const dist = Math.hypot(
        enemy.sprite.x - proj.sprite.x,
        enemy.sprite.y - proj.sprite.y,
      );
      if (dist <= 14 && scene.isEnemyVisible(enemy)) {
        explodeAbilityProjectile(scene, proj.def, proj.sprite.x, proj.sprite.y);
        hit = true;
        break;
      }
    }
    if (hit) {
      proj.sprite.destroy();
      continue;
    }

    remaining.push(proj);
  }

  scene.abilityProjectiles = remaining;
}

export function updateZones(scene, now) {
  const remaining = [];
  for (const zone of scene.zones) {
    if (now >= zone.expiresAt) {
      zone.sprite.destroy();
      continue;
    }
    if (now >= zone.nextTickAt) {
      zone.nextTickAt = now + zone.tickIntervalMs;
      for (const enemy of scene.enemies) {
        const dist = Math.hypot(
          enemy.sprite.x - zone.x,
          enemy.sprite.y - zone.y,
        );
        if (dist <= zone.radius) {
          const dmg = applyElementalResistance(
            zone.damagePerTick,
            zone.damageType,
            enemy.resistances,
          );
          scene.damageEnemy(enemy, dmg);
        }
      }
    }
    remaining.push(zone);
  }
  scene.zones = remaining;
}

export function updateTraps(scene, now) {
  const remaining = [];
  for (const trap of scene.traps) {
    if (now >= trap.expiresAt) {
      trap.sprite.destroy();
      continue;
    }
    let triggered = false;
    for (const enemy of scene.enemies) {
      const dist = Math.hypot(enemy.sprite.x - trap.x, enemy.sprite.y - trap.y);
      if (dist <= trap.triggerRadius) {
        applyStatusEffect(
          scene,
          enemy.statusEffects,
          rollStatusEffect({ inflictsEffect: trap.inflictsEffect }),
        );
        trap.sprite.destroy();
        triggered = true;
        break;
      }
    }
    if (!triggered) remaining.push(trap);
  }
  scene.traps = remaining;
}

export function updateBoomerangs(scene) {
  const remaining = [];
  for (const b of scene.boomerangs) {
    if (!b.returning) {
      const traveled = Math.hypot(b.sprite.x - b.startX, b.sprite.y - b.startY);
      if (traveled >= b.def.maxDistance) b.returning = true;
    } else {
      const dx = scene.hero.x - b.sprite.x;
      const dy = scene.hero.y - b.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 20) {
        b.sprite.destroy();
        continue;
      }
      const mag = dist || 1;
      b.sprite.body.setVelocity(
        (dx / mag) * b.def.projectileSpeed,
        (dy / mag) * b.def.projectileSpeed,
      );
    }
    for (const enemy of scene.enemies) {
      if (b.hitEnemyIds.has(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - b.sprite.x,
        enemy.sprite.y - b.sprite.y,
      );
      if (dist <= 14 && scene.isEnemyVisible(enemy)) {
        const abilityDamage = scene.computeAbilityDamage(b.def);
        const rawDamage = applyElementalResistance(
          abilityDamage,
          b.def.damageType,
          enemy.resistances,
        );
        scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
        b.hitEnemyIds.add(enemy);
      }
    }
    remaining.push(b);
  }
  scene.boomerangs = remaining;
}

export function useFury(scene) {
  if (scene.furyKillCount < FURY_KILLS_REQUIRED) {
    scene.showLootToast(
      `Furie pas encore prête (${scene.furyKillCount}/${FURY_KILLS_REQUIRED} ennemis)`,
    );
    return;
  }

  const heroArchetype = resolveHeroStatsOverride(
    scene.heroSpriteKey,
  )?.archetype;
  const fury = resolveFuryDef(heroArchetype);
  if (!fury) {
    scene.showLootToast("Aucune furie pour cet archétype");
    return;
  }

  scene.furyKillCount = 0;
  scene.events.emit("fury-progress", {
    count: 0,
    required: FURY_KILLS_REQUIRED,
  });

  if (fury.aoeDamage) {
    for (const enemy of scene.enemies) {
      if (!scene.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - scene.hero.x,
        enemy.sprite.y - scene.hero.y,
      );
      if (dist > fury.aoeRadius) continue;
      const rawDamage = applyElementalResistance(
        fury.aoeDamage,
        fury.damageType,
        enemy.resistances,
      );
      scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
    }
    const circle = scene.add.circle(
      scene.hero.x,
      scene.hero.y,
      10,
      0xff2200,
      0.5,
    );
    circle.setDepth(14);
    scene.tweens.add({
      targets: circle,
      radius: fury.aoeRadius,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  if (fury.buffStatModifiers) {
    applyStatusEffect(scene, scene.playerStatusEffects, {
      type: fury.id,
      kind: "modifier",
      statModifiers: fury.buffStatModifiers,
      durationMs: fury.buffDurationMs,
    });
  }

  if (fury.healPercent) {
    scene.playerHp = Math.min(
      scene.playerMaxHp,
      scene.playerHp + (scene.playerMaxHp - scene.playerHp) * fury.healPercent,
    );
    scene.playerMana = Math.min(
      scene.playerMaxMana,
      scene.playerMana +
        (scene.playerMaxMana - scene.playerMana) * fury.healPercent,
    );
    scene.playerStamina = Math.min(
      scene.playerMaxStamina,
      scene.playerStamina +
        (scene.playerMaxStamina - scene.playerStamina) * fury.healPercent,
    );
    scene.events.emit("player-hp-changed", {
      hp: scene.playerHp,
      maxHp: scene.playerMaxHp,
    });
    scene.events.emit("player-mana-changed", {
      mana: scene.playerMana,
      maxMana: scene.playerMaxMana,
    });
    scene.events.emit("player-stamina-changed", {
      stamina: scene.playerStamina,
      maxStamina: scene.playerMaxStamina,
    });
  }

  scene.showLootToast(`${fury.name} déclenchée !`);
}
