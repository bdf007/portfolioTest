import { SPRITE_REGISTRY } from "../spriteRegistry";
import { computeDamage, applyElementalResistance, createCooldown } from "../combat";
import { WALL } from "./floorRenderer";
import {
  getEffectivePlayerMeleeDamage,
  getEffectivePlayerRangedDamage,
} from "./statusEffects";

// Constantes dupliquees volontairement (identiques a celles de
// MainScene.js) - memes valeurs numeriques des deux cotes, meme logique
// que dans floorRenderer.js/floorEntities.js/abilities.js.
const TILE_SIZE = 32;
const MAX_SUMMONS = 3;
const ENEMY_ATTACK_COOLDOWN = 900;
const ENEMY_RANGED_STOP_DISTANCE = 180;
const ENEMY_RANGED_ATTACK_RANGE = 260;
const ENEMY_PROJECTILE_SPEED = 220;
const ENEMY_PROJECTILE_MAX_DISTANCE = 300;
const PROJECTILE_RADIUS = 5;
const ATTACK_ANIM_DURATION_MS = 400;

export function computeFamiliarGrowthScale(scene, growthConfig) {
  if (!growthConfig) return 1;
  const { maxLevel, minScaleMultiplier, maxScaleMultiplier } = growthConfig;
  const progress = Math.min(
    1,
    Math.max(0, (scene.playerLevel - 1) / (maxLevel - 1)),
  );
  return (
    minScaleMultiplier + (maxScaleMultiplier - minScaleMultiplier) * progress
  );
}

export function spawnSummonSprite(scene, spriteKey, x, y, scaleMultiplier = 1) {
  const summonSpriteInfo =
    SPRITE_REGISTRY[spriteKey] || SPRITE_REGISTRY.enemyDefault;
  const sprite = scene.summonGroup.create(
    x,
    y,
    summonSpriteInfo.key,
    summonSpriteInfo.animations.idleDown,
  );
  sprite.setScale(summonSpriteInfo.scale * scaleMultiplier);
  const hb = summonSpriteInfo.hitbox;
  sprite.body.setSize(hb.width, hb.height).setOffset(hb.offsetX, hb.offsetY);
  sprite.setDepth(8);
  sprite.anims.play(spriteKey + "-idle-down");
  scene.levelColliders.push(scene.physics.add.collider(sprite, scene.layer));
  scene.levelColliders.push(
    scene.physics.add.collider(sprite, scene.enemyGroup),
  );
  return sprite;
}

export function performSummonAbility(scene, def) {
  if (scene.summons.filter((s) => !s.isEscort).length >= MAX_SUMMONS) {
    const oldestIndex = scene.summons.findIndex((s) => !s.persistent);
    if (oldestIndex === -1) {
      scene.showLootToast("Toutes tes invocations sont déjà occupées");
      return;
    }
    const oldest = scene.summons.splice(oldestIndex, 1)[0];
    oldest.sprite.destroy();
  }

  const summonHp =
    def.hp ?? Math.round(scene.playerMaxHp * (def.hpScale || 0));
  const summonDamageSource =
    def.attackType === "ranged"
      ? getEffectivePlayerRangedDamage(scene)
      : getEffectivePlayerMeleeDamage(scene);
  const summonDamage =
    def.damage ?? Math.round(summonDamageSource * (def.damageScale || 0));
  const summonDefense =
    def.defense ?? Math.round(scene.playerDefense * (def.defenseScale || 0));

  const spawnX = scene.hero.x + (Math.random() - 0.5) * 40;
  const spawnY = scene.hero.y + (Math.random() - 0.5) * 40;
  const growthScale = computeFamiliarGrowthScale(scene, def.growthConfig);
  const sprite = spawnSummonSprite(scene,
    def.summonType,
    spawnX,
    spawnY,
    growthScale,
  );
  scene.summonIdCounter = (scene.summonIdCounter || 0) + 1;
  scene.summons.push({
    id: scene.summonIdCounter,
    sprite,
    spriteKey: def.summonType,
    sourceAbilityId: def.id,
    path: null,
    pathIndex: 0,
    nextPathRequestAt: 0,
    pathDestX: null,
    pathDestY: null,
    hp: summonHp,
    maxHp: summonHp,
    damage: summonDamage,
    defense: summonDefense,
    damageType: def.damageType || "physical",
    resistances: def.resistances || {},
    persistent: def.persistent || false,
    attackCooldown: createCooldown(ENEMY_ATTACK_COOLDOWN),
    expiresAt: def.durationMs ? scene.time.now + def.durationMs : null,
    lastDir: "down",
    growthConfig: def.growthConfig || null,
    stuckCheckPos: { x: spawnX, y: spawnY },
    stuckCheckAt: scene.time.now,
    stuckJitterUntil: 0,
    stuckStreak: 0,
    attackType: def.attackType || "melee",
  });

  scene.showLootToast(`${def.name} invoquée !`);
}

export function confirmResummon(scene) {
  scene.unpauseGame("resummon");
  scene.events.emit("resummon-prompt", null);

  const def = scene.pendingResummonDef;
  const existing = scene.pendingResummonTarget;
  scene.pendingResummonDef = null;
  scene.pendingResummonTarget = null;
  if (!def || !existing) return;

  if (def.staminaCost && scene.playerStamina < def.staminaCost) {
    scene.showLootToast("Pas assez de stamina !");
    return;
  }
  if (def.manaCost && scene.playerMana < def.manaCost) {
    scene.showLootToast("Pas assez de mana !");
    return;
  }

  const summonHp =
    def.hp ?? Math.round(scene.playerMaxHp * (def.hpScale || 0));
  const summonDamageSource =
    def.attackType === "ranged"
      ? getEffectivePlayerRangedDamage(scene)
      : getEffectivePlayerMeleeDamage(scene);
  const summonDamage =
    def.damage ?? Math.round(summonDamageSource * (def.damageScale || 0));
  const summonDefense =
    def.defense ?? Math.round(scene.playerDefense * (def.defenseScale || 0));

  existing.hp = summonHp;
  existing.maxHp = summonHp;
  existing.damage = summonDamage;
  existing.defense = summonDefense;
  existing.damageType = def.damageType || "physical";
  existing.resistances = def.resistances || {};

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
  const now = scene.time.now;
  scene.abilityCooldowns[def.id] = now + def.cooldownMs;
  scene.events.emit("hotbar-cooldown-started", {
    key: `ability:${def.id}`,
    cooldownMs: def.cooldownMs,
    startedAt: Date.now(),
  });

  scene.showLootToast(`${def.name} renouvelée !`);
}

export function cancelResummon(scene) {
  scene.unpauseGame("resummon");
  scene.events.emit("resummon-prompt", null);
  scene.pendingResummonDef = null;
  scene.pendingResummonTarget = null;
}

export function confirmSummonReplace(scene) {
  scene.unpauseGame("summonReplace");
  scene.events.emit("summon-replace-prompt", null);

  const def = scene.pendingSummonReplaceDef;
  const victim = scene.pendingSummonReplaceVictim;
  scene.pendingSummonReplaceDef = null;
  scene.pendingSummonReplaceVictim = null;
  if (!def || !victim) return;

  if (def.staminaCost && scene.playerStamina < def.staminaCost) {
    scene.showLootToast("Pas assez de stamina !");
    return;
  }
  if (def.manaCost && scene.playerMana < def.manaCost) {
    scene.showLootToast("Pas assez de mana !");
    return;
  }

  const idx = scene.summons.indexOf(victim);
  if (idx !== -1) scene.summons.splice(idx, 1);
  victim.sprite.destroy();

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
  scene.abilityCooldowns[def.id] = scene.time.now + def.cooldownMs;
  scene.events.emit("hotbar-cooldown-started", {
    key: `ability:${def.id}`,
    cooldownMs: def.cooldownMs,
    startedAt: Date.now(),
  });

  performSummonAbility(scene, def); // summons.length a deja baisse de 1 (victime retiree), donc pas de re-declenchement du prompt
}

export function cancelSummonReplace(scene) {
  scene.unpauseGame("summonReplace");
  scene.events.emit("summon-replace-prompt", null);
  scene.pendingSummonReplaceDef = null;
  scene.pendingSummonReplaceVictim = null;
}

export function computeSummonSeparation(scene, summon) {
  const SEPARATION_RADIUS = 30;
  const SEPARATION_STRENGTH = 80;
  let pushX = 0;
  let pushY = 0;

  for (const other of scene.summons) {
    if (other === summon) continue;
    const dx = summon.sprite.x - other.sprite.x;
    const dy = summon.sprite.y - other.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.001 && dist < SEPARATION_RADIUS) {
      const strength = (1 - dist / SEPARATION_RADIUS) * SEPARATION_STRENGTH;
      pushX += (dx / dist) * strength;
      pushY += (dy / dist) * strength;
    }
  }

  return { x: pushX, y: pushY };
}

export function updateSummons(scene, now) {
  const remaining = [];
  const SUMMON_SPEED_CHASE = 100;
  const SUMMON_SPEED_FOLLOW = 120;
  const PATH_REQUEST_COOLDOWN = 400;
  const PATH_RETARGET_DIST = 24;
  const ATTACK_RANGE = 34;

  // Phase 1 : chaque invocation active determine sa cible la plus proche
  const targets = new Map();
  for (const summon of scene.summons) {
    if (summon.expiresAt && now >= summon.expiresAt) continue;
    if (summon.hp <= 0) continue;
    if (now < (summon.attackAnimUntil || 0)) continue;
    if (summon.isEscort) continue; // passif - jamais de cible, tombe toujours sur "suit le heros" en phase 2

    let nearestEnemy = null;
    let nearestDist = Infinity;
    for (const enemy of scene.enemies) {
      if (!scene.isEnemyVisible(enemy)) continue;
      const dist = Math.hypot(
        enemy.sprite.x - summon.sprite.x,
        enemy.sprite.y - summon.sprite.y,
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }
    targets.set(
      summon,
      nearestEnemy && nearestDist < 250 ? nearestEnemy : null,
    );
  }

  const requestSummonPath = (summon, destX, destY) => {
    summon.pathDestX = destX;
    summon.pathDestY = destY;
    scene.requestPath(
      summon.sprite.x,
      summon.sprite.y,
      destX,
      destY,
      (path) => {
        summon.path = path;
        summon.pathIndex = 0;
      },
    );
  };

  for (const summon of scene.summons) {
    if (summon.expiresAt && now >= summon.expiresAt) {
      summon.sprite.destroy();
      scene.showLootToast("L'invocation s'est dissipée");
      continue;
    }
    if (summon.hp <= 0) {
      summon.sprite.destroy();
      if (summon.isEscort) {
        const qs = scene.quests[summon.escortQuestKey];
        if (qs) {
          qs.failed = true;
          scene.events.emit("quests-updated", { ...scene.quests });
        }
        scene.showLootToast(
          "La personne que tu escortais est morte... Échec de la quête.",
        );
        scene.persistProgress();
      } else {
        scene.showLootToast("L'invocation a été vaincue");
      }
      continue;
    }

    if (now < (summon.attackAnimUntil || 0)) {
      remaining.push(summon);
      continue;
    }

    const sep = computeSummonSeparation(scene, summon);
    const nearestEnemy = targets.get(summon);
    // Un summon "ranged" garde ses distances et tire des projectiles,
    // exactement comme l'ennemi dont il est issu (attackType copie sur
    // le summon a sa creation dans performSummonAbility, depuis la meme
    // entree ENEMY_STATS que celle utilisee pour le monstre "ennemi")
    const isRanged = summon.attackType === "ranged";
    const summonOrbitRadius = isRanged
      ? ENEMY_RANGED_STOP_DISTANCE
      : ATTACK_RANGE;
    const summonAttackRange = isRanged
      ? ENEMY_RANGED_ATTACK_RANGE
      : ATTACK_RANGE + 6;

    let destX, destY, speed, stopDist;

    if (nearestEnemy) {
      const curDist = Math.hypot(
        summon.sprite.x - nearestEnemy.sprite.x,
        summon.sprite.y - nearestEnemy.sprite.y,
      );

      if (isRanged && curDist < summonOrbitRadius * 0.6) {
        // trop proche de la cible (ex. invocation qui vient d'apparaitre
        // au contact, pres du heros lui-meme engage en melee) - on recule
        // d'abord tout droit dans l'axe ennemi -> invocation, plutot que
        // de viser directement le slot d'orbite assigne plus bas, qui
        // peut se trouver de l'autre cote de l'ennemi et forcer un
        // chemin qui longe ou traverse sa zone de corps a corps
        const awayAngle = Math.atan2(
          summon.sprite.y - nearestEnemy.sprite.y,
          summon.sprite.x - nearestEnemy.sprite.x,
        );
        destX =
          nearestEnemy.sprite.x + Math.cos(awayAngle) * summonOrbitRadius;
        destY =
          nearestEnemy.sprite.y + Math.sin(awayAngle) * summonOrbitRadius;
      } else {
        // repartit les invocations visant le meme ennemi en cercle autour
        // de lui (une "place" par invocation) au lieu de toutes converger
        // vers son centre - evite l'effet "petit train"
        const siblings = scene.summons.filter(
          (s) => targets.get(s) === nearestEnemy,
        );
        siblings.sort((a, b) => a.id - b.id);
        const slotIndex = siblings.indexOf(summon);
        const angle = (slotIndex / siblings.length) * Math.PI * 2;
        destX = nearestEnemy.sprite.x + Math.cos(angle) * summonOrbitRadius;
        destY = nearestEnemy.sprite.y + Math.sin(angle) * summonOrbitRadius;
      }
      speed = SUMMON_SPEED_CHASE;
      stopDist = 6;
    } else {
      destX = scene.hero.x;
      destY = scene.hero.y;
      speed = SUMMON_SPEED_FOLLOW;
      stopDist = 60;
    }

    const distToDest = Math.hypot(
      destX - summon.sprite.x,
      destY - summon.sprite.y,
    );

    // Detection de blocage : si l'invocation essaie d'atteindre une
    // destination mais n'a quasiment pas avance depuis le dernier
    // controle, on force un nouveau calcul de chemin et on applique une
    // breve poussee aleatoire pour desamorcer un clash physique avec une
    // autre invocation (deux chemins EasyStar qui exigent de partir dans
    // des directions opposees dans un couloir etroit, bloques par leurs
    // colliders mutuels - la separation seule ne suffit pas a les
    // decoincer dans ce cas)
    const STUCK_CHECK_INTERVAL = 500;
    const STUCK_MOVE_THRESHOLD = 10;
    const STUCK_TELEPORT_STREAK = 4; // ~2s de blocage continu malgre les relances de chemin
    const TELEPORT_MAX_DISTANCE = 500; // trop loin du joueur (ex : coincee dans une zone separee par un mur)
    let jitterX = 0;
    let jitterY = 0;

    if (distToDest <= stopDist) {
      summon.stuckCheckPos = { x: summon.sprite.x, y: summon.sprite.y };
      summon.stuckCheckAt = now;
      summon.stuckStreak = 0;
    } else if (now >= summon.stuckCheckAt + STUCK_CHECK_INTERVAL) {
      const movedDist = Math.hypot(
        summon.sprite.x - summon.stuckCheckPos.x,
        summon.sprite.y - summon.stuckCheckPos.y,
      );
      if (movedDist < STUCK_MOVE_THRESHOLD) {
        summon.stuckStreak = (summon.stuckStreak || 0) + 1;
        summon.path = null;
        summon.nextPathRequestAt = now;
        summon.stuckJitterUntil = now + 300;
      } else {
        summon.stuckStreak = 0;
      }
      summon.stuckCheckPos = { x: summon.sprite.x, y: summon.sprite.y };
      summon.stuckCheckAt = now;
    }

    const distToHero = Math.hypot(
      scene.hero.x - summon.sprite.x,
      scene.hero.y - summon.sprite.y,
    );
    if (
      summon.stuckStreak >= STUCK_TELEPORT_STREAK ||
      distToHero > TELEPORT_MAX_DISTANCE
    ) {
      // toujours bloquee malgre la relance de chemin + le coup de pouce
      // aleatoire, ou beaucoup trop loin du joueur - on la teleporte
      // pres de lui plutot que de la laisser rebondir indefiniment
      // contre un coin de mur (cf. retour utilisateur : ca ne se
      // debloquait qu'en rechargeant la partie). Pour un summon a
      // distance avec une cible connue, on evite de la lacher au corps
      // a corps a cote du heros (souvent lui-meme engage au contact) -
      // on la pose plutot a sa distance d'orbite habituelle, du cote du
      // heros oppose a l'ennemi.
      let tx, ty;
      if (isRanged && nearestEnemy) {
        const awayAngle = Math.atan2(
          scene.hero.y - nearestEnemy.sprite.y,
          scene.hero.x - nearestEnemy.sprite.x,
        );
        tx =
          scene.hero.x + Math.cos(awayAngle) * 80 + (Math.random() - 0.5) * 20;
        ty =
          scene.hero.y + Math.sin(awayAngle) * 80 + (Math.random() - 0.5) * 20;
      } else {
        tx = scene.hero.x + (Math.random() - 0.5) * 40;
        ty = scene.hero.y + (Math.random() - 0.5) * 40;
      }
      summon.sprite.setPosition(tx, ty);
      summon.sprite.setVelocity(0, 0);
      summon.path = null;
      summon.pathIndex = 0;
      summon.pathDestX = null;
      summon.pathDestY = null;
      summon.nextPathRequestAt = now;
      summon.stuckStreak = 0;
      summon.stuckJitterUntil = 0;
      summon.stuckCheckPos = { x: tx, y: ty };
      summon.stuckCheckAt = now;
      remaining.push(summon);
      continue;
    }

    if (now < summon.stuckJitterUntil) {
      const jitterAngle = Math.random() * Math.PI * 2;
      jitterX = Math.cos(jitterAngle) * SUMMON_SPEED_CHASE;
      jitterY = Math.sin(jitterAngle) * SUMMON_SPEED_CHASE;
    }

    if (distToDest > stopDist) {
      // (re)calcule un chemin si aucun chemin en cours, ou si la
      // destination a bouge de facon significative depuis le dernier calcul
      const destMoved =
        summon.pathDestX === null ||
        Math.hypot(destX - summon.pathDestX, destY - summon.pathDestY) >
          PATH_RETARGET_DIST;
      if ((destMoved || !summon.path) && now >= summon.nextPathRequestAt) {
        summon.nextPathRequestAt = now + PATH_REQUEST_COOLDOWN;
        requestSummonPath(summon, destX, destY);
      }

      const step = scene.followPathStep(summon, speed);
      let nx, ny, vx, vy;
      if (step) {
        ({ nx, ny, vx, vy } = step);
      } else {
        // chemin pas encore calcule (ou introuvable) - repli temporaire
        // en ligne droite pour eviter que l'invocation ne se fige
        const dx = destX - summon.sprite.x;
        const dy = destY - summon.sprite.y;
        const dist = Math.hypot(dx, dy);
        nx = dx / dist;
        ny = dy / dist;
        vx = nx * speed;
        vy = ny * speed;
      }

      summon.sprite.setVelocity(vx + sep.x + jitterX, vy + sep.y + jitterY);
      summon.lastDir =
        Math.abs(nx) > Math.abs(ny)
          ? nx > 0
            ? "right"
            : "left"
          : ny > 0
            ? "down"
            : "up";
      summon.sprite.anims.play(
        summon.spriteKey + "-walk-" + summon.lastDir,
        true,
      );
    } else {
      summon.sprite.setVelocity(sep.x, sep.y);
      summon.sprite.anims.play(
        summon.spriteKey + "-idle-" + summon.lastDir,
        true,
      );
    }

    if (nearestEnemy) {
      const realDist = Math.hypot(
        nearestEnemy.sprite.x - summon.sprite.x,
        nearestEnemy.sprite.y - summon.sprite.y,
      );
      if (
        realDist <= summonAttackRange &&
        summon.attackCooldown.isReady(now)
      ) {
        summon.attackCooldown.trigger(now);

        const hasAttackAnim = scene.anims.exists(
          summon.spriteKey + "-attack-" + summon.lastDir,
        );
        if (hasAttackAnim) {
          summon.sprite.anims.play(
            summon.spriteKey + "-attack-" + summon.lastDir,
            true,
          );
          summon.attackAnimUntil = now + ATTACK_ANIM_DURATION_MS;
        }

        if (isRanged) {
          // meme principe : le tir effectif est repousse a la fin de
          // l'anim (summon deja fige entre-temps par le check
          // attackAnimUntil plus haut dans cette meme fonction)
          scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
            if (!scene.enemies.includes(nearestEnemy)) return; // mort entre-temps

            const dx = nearestEnemy.sprite.x - summon.sprite.x;
            const dy = nearestEnemy.sprite.y - summon.sprite.y;
            const mag = Math.hypot(dx, dy) || 1;
            const vx = dx / mag;
            const vy = dy / mag;

            const projSprite = scene.add.circle(
              summon.sprite.x,
              summon.sprite.y,
              PROJECTILE_RADIUS,
              0x99ff66,
            );
            scene.physics.add.existing(projSprite);
            projSprite.setDepth(12);
            projSprite.body.setVelocity(
              vx * ENEMY_PROJECTILE_SPEED,
              vy * ENEMY_PROJECTILE_SPEED,
            );

            scene.summonProjectiles.push({
              sprite: projSprite,
              startX: summon.sprite.x,
              startY: summon.sprite.y,
              damage: summon.damage,
              damageType: summon.damageType,
            });
          });
        } else {
          // meme principe que pour l'ennemi/le heros : le summon est
          // fige par attackAnimUntil pendant l'anim, on resout les
          // degats a la fin pour laisser une chance d'esquive a la cible
          scene.time.delayedCall(ATTACK_ANIM_DURATION_MS, () => {
            if (!scene.enemies.includes(nearestEnemy)) return; // mort entre-temps
            const resolveDist = Math.hypot(
              nearestEnemy.sprite.x - summon.sprite.x,
              nearestEnemy.sprite.y - summon.sprite.y,
            );
            if (resolveDist > summonAttackRange) return; // esquive

            const rawDamage = applyElementalResistance(
              summon.damage,
              summon.damageType,
              nearestEnemy.resistances,
            );
            scene.damageEnemy(
              nearestEnemy,
              computeDamage(rawDamage, nearestEnemy.defense),
            );
          });
        }
      }
    }

    remaining.push(summon);
  }
  scene.summons = remaining;
}

export function updateSummonProjectiles(scene) {
  const grid = scene.fogGrid;
  const remaining = [];

  for (const proj of scene.summonProjectiles) {
    const traveled = Math.hypot(
      proj.sprite.x - proj.startX,
      proj.sprite.y - proj.startY,
    );
    const tileX = Math.floor(proj.sprite.x / TILE_SIZE);
    const tileY = Math.floor(proj.sprite.y / TILE_SIZE);
    const outOfBounds =
      tileX < 0 ||
      tileY < 0 ||
      tileY >= grid.length ||
      tileX >= grid[0].length;
    const hitWall = !outOfBounds && grid[tileY][tileX] === WALL;

    const fogState = scene.fogState.state;
    const projVisible = !outOfBounds && fogState[tileY][tileX] === 2;
    proj.sprite.setVisible(projVisible);

    if (traveled >= ENEMY_PROJECTILE_MAX_DISTANCE || outOfBounds || hitWall) {
      proj.sprite.destroy();
      continue;
    }

    let hit = false;
    for (const enemy of scene.enemies) {
      const dist = Math.hypot(
        enemy.sprite.x - proj.sprite.x,
        enemy.sprite.y - proj.sprite.y,
      );
      if (dist <= PROJECTILE_RADIUS + 14 && scene.isEnemyVisible(enemy)) {
        const rawDamage = applyElementalResistance(
          proj.damage,
          proj.damageType,
          enemy.resistances,
        );
        scene.damageEnemy(enemy, computeDamage(rawDamage, enemy.defense));
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

  scene.summonProjectiles = remaining;
}
